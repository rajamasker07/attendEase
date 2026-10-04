
"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Printer, Wallet, PiggyBank, RotateCcw, Loader2 } from "lucide-react";
import { useCollection, useDoc, useFirebase, useMemoFirebase, type WithId, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Payroll, Payslip } from "@/types";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PayslipDetailDialog, RecordPaymentDialog, StoreSavingsAlert, storeRemainingSavings, finalizePayroll, unfinalizePayroll, UnfinalizePayrollAlert } from "../actions";
import { useToast } from "@/hooks/use-toast";

export default function PayrollDetailPage() {
  const params = useParams<{ payrollId: string }>();
  const payrollId = params.payrollId;
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedPayslip, setSelectedPayslip] = useState<WithId<Payslip> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isStoreSavingsAlertOpen, setIsStoreSavingsAlertOpen] = useState(false);
  const [isUnfinalizeAlertOpen, setIsUnfinalizeAlertOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isUnfinalizing, setIsUnfinalizing] = useState(false);
  const [isStoringSavings, setIsStoringSavings] = useState(false);

  const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const payrollDocRef = useMemoFirebase(
    () => (firestore && payrollId ? doc(firestore, "payrolls", payrollId) : null),
    [firestore, payrollId]
  );
  const { data: payroll, isLoading: isLoadingPayroll } = useDoc<Payroll>(payrollDocRef);

  const payslipsCollectionRef = useMemoFirebase(
    () => (firestore && payrollId ? collection(firestore, "payrolls", payrollId, "payslips") : null),
    [firestore, payrollId]
  );
  const { data: payslips, isLoading: isLoadingPayslips } = useCollection<Payslip>(payslipsCollectionRef);

  const handleViewDetails = (payslip: WithId<Payslip>) => {
    setSelectedPayslip(payslip);
    setIsDetailOpen(true);
  };

  const handleRecordPayment = (payslip: WithId<Payslip>) => {
    setSelectedPayslip(payslip);
    setIsPaymentDialogOpen(true);
  };

  const handleStoreSavingsClick = (payslip: WithId<Payslip>) => {
    setSelectedPayslip(payslip);
    setIsStoreSavingsAlertOpen(true);
  };
  
  const handleConfirmStoreSavings = async () => {
    if (!firestore || !selectedPayslip || !payroll) return;
    setIsStoringSavings(true);
    try {
        await storeRemainingSavings(firestore, selectedPayslip, payrollId, payroll.period);
        setIsStoreSavingsAlertOpen(false);
        toast({
            title: "Berhasil",
            description: `Sisa gaji ${selectedPayslip.employeeName} telah disimpan ke tabungan.`
        });
    } catch (e: any) {
        toast({
            title: "Gagal Menyimpan",
            description: e.message || "Terjadi kesalahan saat menyimpan sisa gaji.",
            variant: "destructive"
        });
    } finally {
        setIsStoringSavings(false);
    }
  };

  const handleSavePayment = (payslipId: string, amount: number) => {
    if (!firestore || !payslips) return;
    const payslipToUpdate = payslips.find(p => p.id === payslipId);
    if (!payslipToUpdate) return;
    
    const docRef = doc(firestore, "payrolls", payrollId, "payslips", payslipId);
    
    const newPaidAmount = Math.round((payslipToUpdate.paidAmount + amount) * 100) / 100;
    const rawRemaining = payslipToUpdate.netSalary - newPaidAmount;
    const newRemainingAmount = rawRemaining <= 0.01 ? 0 : Math.round(rawRemaining * 100) / 100;
    const newStatus: Payslip['paymentStatus'] = newRemainingAmount <= 0.01 ? 'lunas' : 'sebagian';
    
    const updateData = {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newStatus
    };
    
    setDocumentNonBlocking(docRef, updateData, { merge: true });
  };
  
  const handleFinalize = async () => {
    if (!firestore || !payrollId || !payslips) return;
    setIsFinalizing(true);
    try {
        await finalizePayroll(firestore, payrollId, payslips, payroll?.period);
        toast({
            title: "Penggajian Diselesaikan",
            description: `Periode penggajian ${payroll ? format(parseISO(payroll.period), "MMMM yyyy", { locale: id }) : ''} telah diselesaikan dan hutang telah ditandai lunas.`,
        });
    } catch (e: any) {
        toast({ title: "Gagal Finalisasi", description: e.message, variant: "destructive" });
    } finally {
        setIsFinalizing(false);
    }
  };

  const handleUnfinalize = async () => {
    if (!firestore || !payrollId || !payslips || !payroll) return;
    setIsUnfinalizing(true);
    try {
        await unfinalizePayroll(firestore, payrollId, payroll.period, payslips);
        setIsUnfinalizeAlertOpen(false);
        toast({
            title: "Finalisasi Dibatalkan",
            description: `Periode penggajian ${format(parseISO(payroll.period), "MMMM yyyy", { locale: id })} telah dikembalikan ke status Draf dan potongan hutang telah dikembalikan.`,
        });
    } catch (e: any) {
        toast({ title: "Gagal Membatalkan Finalisasi", description: e.message, variant: "destructive" });
    } finally {
        setIsUnfinalizing(false);
    }
  };

  const totals = useMemo(() => {
    if (!payslips) return { base: 0, bonus: 0, deduction: 0, net: 0, paid: 0, remaining: 0 };
    const res = payslips.reduce((acc, p) => ({
        base: acc.base + p.baseSalary,
        bonus: acc.bonus + p.bonusTotal,
        deduction: acc.deduction + p.lateDeduction + p.sanctionDeduction + p.unpaidAbsenceDeduction + (p.loanDeduction || 0),
        net: acc.net + p.netSalary,
        paid: acc.paid + p.paidAmount,
        remaining: acc.remaining + p.remainingAmount,
    }), { base: 0, bonus: 0, deduction: 0, net: 0, paid: 0, remaining: 0 });

    return {
        base: Math.round(res.base * 100) / 100,
        bonus: Math.round(res.bonus * 100) / 100,
        deduction: Math.round(res.deduction * 100) / 100,
        net: Math.round(res.net * 100) / 100,
        paid: Math.round(res.paid * 100) / 100,
        remaining: Math.round(res.remaining * 100) / 100,
    };
  }, [payslips]);

  const isLoading = isLoadingPayroll || isLoadingPayslips;

  const getStatusBadge = (status: Payslip['paymentStatus']) => {
    switch (status) {
      case "lunas":
        return <Badge variant="default" className="capitalize">{status}</Badge>;
      case "sebagian":
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
      case "belum dibayar":
        return <Badge variant="secondary" className="capitalize">Belum Dibayar</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <div className="flex items-center gap-2 mb-2">
                 <Button asChild variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border/80">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                 </Button>
                 {isLoadingPayroll ? (
                    <Skeleton className="h-8 w-48" />
                 ) : payroll ? (
                    <CardTitle className="text-2xl font-bold font-headline tracking-tight text-foreground">
                        Penggajian {format(parseISO(payroll.period), "MMMM yyyy", { locale: id })}
                    </CardTitle>
                 ) : null}
              </div>
              <CardDescription className="text-muted-foreground text-xs">Rincian penggajian untuk periode yang dipilih.</CardDescription>
            </div>
             <div className="flex items-center gap-2 flex-shrink-0">
                {payroll?.status === "draft" && (
                    <Button onClick={handleFinalize} disabled={isFinalizing} className="shadow-sm">
                        {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Finalisasi
                    </Button>
                )}
                {payroll?.status === "finalized" && (
                    <Button 
                        variant="outline" 
                        className="text-amber-600 dark:text-amber-400 border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => setIsUnfinalizeAlertOpen(true)}
                        disabled={isUnfinalizing}
                    >
                        {isUnfinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>}
                        Batalkan Finalisasi
                    </Button>
                )}
                 <Button asChild variant="outline" className="border-border/80 shadow-sm">
                    <Link href={`/payroll/${payrollId}/report`}>
                        <Printer className="mr-2 h-4 w-4" />
                        Laporan
                    </Link>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-center md:text-left">
                <div className="rounded-xl border border-border/70 p-4 bg-surface-container-low/40 dark:bg-slate-900/50">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</div>
                    {isLoadingPayroll ? <Skeleton className="h-6 w-20 mt-1 mx-auto md:mx-0" /> : (
                        <div className="text-lg font-bold mt-1">
                            <Badge variant={payroll?.status === 'draft' ? 'secondary' : 'default'} className="capitalize">
                                {payroll?.status}
                            </Badge>
                        </div>
                    )}
                </div>
                <div className="rounded-xl border border-border/70 p-4 bg-surface-container-low/40 dark:bg-slate-900/50">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Gaji Bersih</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-32 mt-1 mx-auto md:mx-0" /> : <div className="text-lg font-bold font-mono text-foreground mt-1">{formatCurrency(totals.net)}</div>}
                </div>
                 <div className="rounded-xl border border-border/70 p-4 bg-surface-container-low/40 dark:bg-slate-900/50">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Dibayar</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-28 mt-1 mx-auto md:mx-0" /> : <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totals.paid)}</div>}
                </div>
                <div className="rounded-xl border border-border/70 p-4 bg-surface-container-low/40 dark:bg-slate-900/50">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sisa Gaji</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-28 mt-1 mx-auto md:mx-0" /> : <div className="text-lg font-bold font-mono text-destructive mt-1">{formatCurrency(totals.remaining)}</div>}
                </div>
            </div>
          <div className="rounded-xl border border-border/80 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-100/90 dark:bg-slate-900/95 border-b border-border/80">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Nama Karyawan</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Gaji Bersih</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Total Potongan</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Sisa Gaji</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Status Pembayaran</TableHead>
                  <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-9 w-40 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : payslips && payslips.length > 0 ? (
                  payslips.map((payslip) => {
                    const totalDeduction = payslip.lateDeduction + payslip.sanctionDeduction + payslip.unpaidAbsenceDeduction + (payslip.loanDeduction || 0);
                    return (
                    <TableRow key={payslip.id} className="border-border/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <TableCell className="font-medium text-foreground">
                          <button onClick={() => handleViewDetails(payslip)} className="hover:underline font-semibold text-foreground">
                            {payslip.employeeName}
                          </button>
                      </TableCell>
                      <TableCell className="font-bold font-mono text-foreground">{formatCurrency(payslip.netSalary)}</TableCell>
                      <TableCell className="text-destructive font-mono">{formatCurrency(totalDeduction)}</TableCell>
                      <TableCell className="text-destructive font-mono">{formatCurrency(payslip.remainingAmount)}</TableCell>
                      <TableCell>{getStatusBadge(payslip.paymentStatus)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(payslip)} className="border-border/80 text-xs">Rincian</Button>
                        {payslip.paymentStatus !== 'lunas' && payslip.remainingAmount > 0.01 && payroll?.status === 'draft' && (
                           <>
                            <Button size="sm" onClick={() => handleRecordPayment(payslip)} className="text-xs">
                                <Wallet className="mr-1.5 h-3.5 w-3.5"/>
                                Bayar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleStoreSavingsClick(payslip)} className="border-border/80 text-xs">
                                <PiggyBank className="mr-1.5 h-3.5 w-3.5"/>
                                Simpan Sisa
                            </Button>
                           </>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm italic">
                      Tidak ada data slip gaji untuk periode ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PayslipDetailDialog 
        isOpen={isDetailOpen} 
        setIsOpen={setIsDetailOpen} 
        payslip={selectedPayslip} 
        payrollId={payrollId}
      />
      <RecordPaymentDialog
        isOpen={isPaymentDialogOpen}
        setIsOpen={setIsPaymentDialogOpen}
        payslip={selectedPayslip}
        onSave={handleSavePayment}
      />
      <StoreSavingsAlert 
        isOpen={isStoreSavingsAlertOpen}
        setIsOpen={setIsStoreSavingsAlertOpen}
        onConfirm={handleConfirmStoreSavings}
        payslip={selectedPayslip}
        isLoading={isStoringSavings}
      />
      <UnfinalizePayrollAlert
        isOpen={isUnfinalizeAlertOpen}
        setIsOpen={setIsUnfinalizeAlertOpen}
        onConfirm={handleUnfinalize}
        payrollPeriod={payroll ? format(parseISO(payroll.period), "MMMM yyyy", { locale: id }) : ''}
        isLoading={isUnfinalizing}
      />
    </div>
  );
}

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
import { ArrowLeft, CheckCircle, Printer, Wallet, PiggyBank } from "lucide-react";
import { useCollection, useDoc, useFirebase, useMemoFirebase, WithId, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, Firestore } from "firebase/firestore";
import type { Payroll, Payslip } from "@/types";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PayslipDetailDialog, RecordPaymentDialog, StoreSavingsAlert, storeRemainingSavings } from "../actions";
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
    try {
        await storeRemainingSavings(firestore, selectedPayslip, payrollId, payroll.period);
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
    }
  }


  const handleSavePayment = (payslipId: string, amount: number) => {
    if (!firestore || !payslips) return;
    const payslipToUpdate = payslips.find(p => p.id === payslipId);
    if (!payslipToUpdate) return;
    
    const docRef = doc(firestore, "payrolls", payrollId, "payslips", payslipId);
    
    const newPaidAmount = payslipToUpdate.paidAmount + amount;
    const newRemainingAmount = payslipToUpdate.netSalary - newPaidAmount;
    const newStatus: Payslip['paymentStatus'] = newRemainingAmount <= 0.01 ? 'lunas' : 'sebagian';
    
    const updateData = {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newStatus
    };
    
    setDocumentNonBlocking(docRef, updateData, { merge: true });
  };
  
  const handleFinalize = () => {
    if (!payrollDocRef) return;
    setDocumentNonBlocking(payrollDocRef, { status: "finalized" }, { merge: true });
    toast({
        title: "Penggajian Diselesaikan",
        description: `Periode penggajian ${payroll ? format(parseISO(payroll.period), "MMMM yyyy", { locale: id }) : ''} telah diselesaikan.`,
    });
  }

  const totals = useMemo(() => {
    if (!payslips) return { base: 0, bonus: 0, deduction: 0, net: 0, paid: 0, remaining: 0 };
    return payslips.reduce((acc, p) => ({
        base: acc.base + p.baseSalary,
        bonus: acc.bonus + p.bonusTotal,
        deduction: acc.deduction + p.lateDeduction + p.sanctionDeduction + p.unpaidAbsenceDeduction,
        net: acc.net + p.netSalary,
        paid: acc.paid + p.paidAmount,
        remaining: acc.remaining + p.remainingAmount,
    }), { base: 0, bonus: 0, deduction: 0, net: 0, paid: 0, remaining: 0 });
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
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
               <div className="flex items-center gap-2 mb-2">
                 <Button asChild variant="outline" size="icon" className="h-7 w-7">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                 </Button>
                 {isLoadingPayroll ? (
                    <Skeleton className="h-8 w-48" />
                 ) : payroll ? (
                    <CardTitle className="text-2xl">
                        Penggajian {format(parseISO(payroll.period), "MMMM yyyy", { locale: id })}
                    </CardTitle>
                 ) : null}
              </div>
              <CardDescription>Rincian penggajian untuk periode yang dipilih.</CardDescription>
            </div>
             <div className="flex items-center gap-2 flex-shrink-0">
                {payroll?.status === "draft" && (
                    <Button onClick={handleFinalize}>
                        <CheckCircle className="mr-2 h-4 w-4"/>
                        Finalisasi
                    </Button>
                )}
                 <Button asChild variant="outline">
                    <Link href={`/payroll/${payrollId}/report`}>
                        <Printer className="mr-2 h-4 w-4" />
                        Laporan
                    </Link>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-center md:text-left">
                <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Status</div>
                    {isLoadingPayroll ? <Skeleton className="h-6 w-20 mt-1 mx-auto md:mx-0" /> : (
                        <div className="text-lg font-bold">
                            <Badge variant={payroll?.status === 'draft' ? 'secondary' : 'default'} className="capitalize">
                                {payroll?.status}
                            </Badge>
                        </div>
                    )}
                </div>
                <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Total Gaji Bersih</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-32 mt-1 mx-auto md:mx-0" /> : <div className="text-lg font-bold">{formatCurrency(totals.net)}</div>}
                </div>
                 <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Total Dibayar</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-28 mt-1 mx-auto md:mx-0" /> : <div className="text-lg font-bold text-green-600">{formatCurrency(totals.paid)}</div>}
                </div>
                <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Total Sisa Gaji</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-28 mt-1 mx-auto md:mx-0" /> : <div className="text-lg font-bold text-destructive">{formatCurrency(totals.remaining)}</div>}
                </div>
            </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Gaji Bersih</TableHead>
                  <TableHead>Telah Dibayar</TableHead>
                  <TableHead>Sisa Gaji</TableHead>
                  <TableHead>Status Pembayaran</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
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
                  payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">
                          <button onClick={() => handleViewDetails(payslip)} className="hover:underline">
                            {payslip.employeeName}
                          </button>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(payslip.netSalary)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(payslip.paidAmount)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(payslip.remainingAmount)}</TableCell>
                      <TableCell>{getStatusBadge(payslip.paymentStatus)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(payslip)}>Rincian</Button>
                        {payslip.paymentStatus !== 'lunas' && payroll?.status === 'draft' && (
                           <>
                            <Button size="sm" onClick={() => handleRecordPayment(payslip)}>
                                <Wallet className="mr-2 h-4 w-4"/>
                                Bayar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleStoreSavingsClick(payslip)}>
                                <PiggyBank className="mr-2 h-4 w-4"/>
                                Simpan Sisa
                            </Button>
                           </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
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
      />
    </div>
  );
}

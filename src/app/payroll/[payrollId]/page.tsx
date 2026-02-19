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
import { ArrowLeft, CheckCircle, Printer } from "lucide-react";
import { useCollection, useDoc, useFirebase, useMemoFirebase, WithId, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Payroll, Payslip } from "@/types";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PayslipDetailDialog } from "../actions";
import { useToast } from "@/hooks/use-toast";

export default function PayrollDetailPage() {
  const params = useParams<{ payrollId: string }>();
  const payrollId = params.payrollId;
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedPayslip, setSelectedPayslip] = useState<WithId<Payslip> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
  
  const handleFinalize = () => {
    if (!payrollDocRef) return;
    setDocumentNonBlocking(payrollDocRef, { status: "finalized" }, { merge: true });
    toast({
        title: "Penggajian Diselesaikan",
        description: `Periode penggajian ${payroll ? format(parseISO(payroll.period), "MMMM yyyy", { locale: id }) : ''} telah diselesaikan.`,
    });
  }

  const totals = useMemo(() => {
    if (!payslips) return { base: 0, late: 0, sanction: 0, unpaidAbsence: 0, net: 0 };
    return payslips.reduce((acc, p) => ({
        base: acc.base + p.baseSalary,
        late: acc.late + p.lateDeduction,
        sanction: acc.sanction + p.sanctionDeduction,
        unpaidAbsence: acc.unpaidAbsence + p.unpaidAbsenceDeduction,
        net: acc.net + p.netSalary,
    }), { base: 0, late: 0, sanction: 0, unpaidAbsence: 0, net: 0 });
  }, [payslips]);

  const isLoading = isLoadingPayroll || isLoadingPayslips;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
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
             <div className="flex items-center gap-2">
                {payroll?.status === "draft" && (
                    <Button onClick={handleFinalize}>
                        <CheckCircle className="mr-2 h-4 w-4"/>
                        Finalisasi Penggajian
                    </Button>
                )}
                 <Button asChild variant="outline">
                    <Link href={`/payroll/${payrollId}/report`}>
                        <Printer className="mr-2 h-4 w-4" />
                        Cetak Laporan
                    </Link>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 text-center md:text-left">
                <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Status</div>
                    {isLoadingPayroll ? <Skeleton className="h-6 w-20 mt-1" /> : (
                        <div className="text-lg font-bold">
                            <Badge variant={payroll?.status === 'draft' ? 'secondary' : 'default'}>
                                {payroll?.status === 'draft' ? 'Draf' : 'Selesai'}
                            </Badge>
                        </div>
                    )}
                </div>
                <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Total Gaji Pokok</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-32 mt-1" /> : <div className="text-lg font-bold">{formatCurrency(totals.base)}</div>}
                </div>
                <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Potongan Absen</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-28 mt-1" /> : <div className="text-lg font-bold text-destructive">{formatCurrency(totals.unpaidAbsence)}</div>}
                </div>
                <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Potongan Telat</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-28 mt-1" /> : <div className="text-lg font-bold text-destructive">{formatCurrency(totals.late)}</div>}
                </div>
                 <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Potongan Sanksi</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-28 mt-1" /> : <div className="text-lg font-bold text-destructive">{formatCurrency(totals.sanction)}</div>}
                </div>
                 <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Total Gaji Bersih</div>
                    {isLoadingPayslips ? <Skeleton className="h-6 w-36 mt-1" /> : <div className="text-lg font-bold text-primary">{formatCurrency(totals.net)}</div>}
                </div>
            </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Gaji Pokok</TableHead>
                  <TableHead>Potongan Absen</TableHead>
                  <TableHead>Potongan Telat</TableHead>
                  <TableHead>Potongan Sanksi</TableHead>
                  <TableHead>Gaji Bersih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    </TableRow>
                  ))
                ) : payslips && payslips.length > 0 ? (
                  payslips.map((payslip) => (
                    <TableRow key={payslip.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(payslip)}>
                      <TableCell className="font-medium">{payslip.employeeName}</TableCell>
                      <TableCell>{formatCurrency(payslip.baseSalary)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(payslip.unpaidAbsenceDeduction)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(payslip.lateDeduction)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(payslip.sanctionDeduction)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(payslip.netSalary)}</TableCell>
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
      <PayslipDetailDialog isOpen={isDetailOpen} setIsOpen={setIsDetailOpen} payslip={selectedPayslip} payrollId={payrollId}/>
    </div>
  );
}

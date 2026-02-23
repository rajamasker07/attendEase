"use client";

import { useParams } from "next/navigation";
import { useDoc, useCollection, useFirebase, useMemoFirebase, WithId } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import type { Payslip, Payroll } from "@/types";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

function PayrollReportPageContent({
  payslips,
  payroll,
  totals,
}: {
  payslips: WithId<Payslip>[];
  payroll: WithId<Payroll>;
  totals: { base: number; bonus: number; deduction: number; net: number; paid: number; remaining: number; };
}) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
    
  const getStatusBadge = (status: Payslip['paymentStatus']) => {
    switch (status) {
      case "lunas":
        return <Badge variant="default" className="capitalize print:bg-green-100 print:text-green-800 print:border-green-300">{status}</Badge>;
      case "sebagian":
        return <Badge variant="outline" className="capitalize print:bg-yellow-100 print:text-yellow-800 print:border-yellow-300">{status}</Badge>;
      case "belum dibayar":
        return <Badge variant="secondary" className="capitalize print:bg-gray-100 print:text-gray-800 print:border-gray-300">Belum Dibayar</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-5xl bg-white p-8 shadow-lg print:shadow-none">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">Laporan Penggajian</h1>
          <p className="text-muted-foreground">AttendEase</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">Periode</p>
          <p className="text-muted-foreground">
            {format(parseISO(payroll.period), "MMMM yyyy", { locale: id })}
          </p>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Ringkasan Penggajian Periode {format(parseISO(payroll.period), "MMMM yyyy", { locale: id })}</h2>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead className="text-right">Gaji Pokok</TableHead>
                    <TableHead className="text-right">Bonus</TableHead>
                    <TableHead className="text-right">Potongan</TableHead>
                    <TableHead className="text-right">Gaji Bersih</TableHead>
                    <TableHead className="text-right">Telah Dibayar</TableHead>
                    <TableHead className="text-right">Sisa Gaji</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {payslips.map(p => (
                    <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.employeeName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.baseSalary)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.bonusTotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.unpaidAbsenceDeduction + p.lateDeduction + p.sanctionDeduction)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.netSalary)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.paidAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.remainingAmount)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(p.paymentStatus)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.base)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.bonus)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.deduction)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.net)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.paid)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.remaining)}</TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableFooter>
        </Table>
      </section>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <p>Laporan ini dibuat secara otomatis oleh sistem pada {format(new Date(), "d MMMM yyyy, HH:mm", { locale: id })}.</p>
      </footer>
    </div>
  );
}

export default function PayrollReportPage() {
  const params = useParams<{ payrollId: string }>();
  const { payrollId } = params;
  const { firestore } = useFirebase();

  const payrollDocRef = useMemoFirebase(
    () => (firestore && payrollId ? doc(firestore, "payrolls", payrollId) : null),
    [firestore, payrollId]
  );
  const { data: payroll, isLoading: isLoadingPayroll, error: errorPayroll } = useDoc<Payroll>(payrollDocRef);

  const payslipsCollectionRef = useMemoFirebase(
    () => (firestore && payrollId ? collection(firestore, "payrolls", payrollId, "payslips") : null),
    [firestore, payrollId]
  );
  const { data: payslips, isLoading: isLoadingPayslips, error: errorPayslips } = useCollection<Payslip>(payslipsCollectionRef);

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
  const error = errorPayroll || errorPayslips;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-muted/40 py-6 sm:py-12 print:bg-white print:py-0">
      <div className="fixed top-4 right-4 print:hidden">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Cetak / Simpan PDF
        </Button>
      </div>

      {isLoading && (
        <div className="mx-auto max-w-5xl bg-white p-8 shadow-lg">
          <Skeleton className="h-[700px] w-full" />
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-destructive">Gagal memuat laporan penggajian.</p>
          <p className="text-sm text-muted-foreground">
            Tautan mungkin tidak valid atau Anda tidak memiliki izin.
          </p>
        </div>
      )}

      {payslips && payroll && (
        <PayrollReportPageContent payslips={payslips} payroll={payroll} totals={totals} />
      )}
      
      {!isLoading && !error && !payroll && (
        <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-xl font-semibold">Laporan Penggajian Tidak Ditemukan</h1>
            <p className="text-muted-foreground">Pastikan tautan yang Anda masukkan sudah benar.</p>
        </div>
      )}
    </div>
  );
}

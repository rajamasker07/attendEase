"use client";

import { useParams } from "next/navigation";
import { useDoc, useCollection, useFirebase, useMemoFirebase, WithId } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import type { Payslip, Payroll } from "@/types";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
    <div className="mx-auto max-w-5xl bg-card text-card-foreground border border-border/80 rounded-2xl p-8 shadow-xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
      <header className="flex items-center justify-between border-b border-border/80 pb-6 print:border-slate-300">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground print:text-black">Laporan Penggajian</h1>
          <p className="text-sm text-muted-foreground mt-0.5 print:text-slate-600">AttendEase Management System</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground print:text-slate-600">Periode</p>
          <p className="text-lg font-bold text-foreground print:text-black">
            {format(parseISO(payroll.period), "MMMM yyyy", { locale: id })}
          </p>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold font-headline text-foreground print:text-black">
          Ringkasan Penggajian Periode {format(parseISO(payroll.period), "MMMM yyyy", { locale: id })}
        </h2>
        <div className="rounded-xl border border-border/80 overflow-hidden print:border-slate-300">
          <Table>
            <TableHeader className="bg-slate-100/90 dark:bg-slate-900/95 border-b border-border/80 print:bg-slate-100 print:border-slate-300">
              <TableRow className="border-border/50 hover:bg-transparent print:border-slate-300">
                <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider print:text-black">Nama Karyawan</TableHead>
                <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider print:text-black">Gaji Pokok</TableHead>
                <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider print:text-black">Bonus</TableHead>
                <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider print:text-black">Potongan</TableHead>
                <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider print:text-black">Gaji Bersih</TableHead>
                <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider print:text-black">Telah Dibayar</TableHead>
                <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider print:text-black">Sisa Gaji</TableHead>
                <TableHead className="text-center font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider print:text-black">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map(p => {
                const totalDeduction = p.unpaidAbsenceDeduction + p.lateDeduction + p.sanctionDeduction + (p.loanDeduction || 0);
                return (
                  <TableRow key={p.id} className="border-border/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 print:border-slate-200">
                    <TableCell className="font-medium text-foreground print:text-black">{p.employeeName}</TableCell>
                    <TableCell className="text-right font-mono text-foreground print:text-black">{formatCurrency(p.baseSalary)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400 print:text-black">{formatCurrency(p.bonusTotal)}</TableCell>
                    <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400 print:text-black">{formatCurrency(totalDeduction)}</TableCell>
                    <TableCell className="text-right font-bold font-mono text-foreground print:text-black">{formatCurrency(p.netSalary)}</TableCell>
                    <TableCell className="text-right font-mono text-foreground print:text-black">{formatCurrency(p.paidAmount)}</TableCell>
                    <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400 print:text-black">{formatCurrency(p.remainingAmount)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(p.paymentStatus)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold bg-slate-100/90 dark:bg-slate-900/95 border-t border-border/80 print:bg-slate-100 print:border-slate-300">
                <TableCell className="text-foreground print:text-black">Total</TableCell>
                <TableCell className="text-right font-mono text-foreground print:text-black">{formatCurrency(totals.base)}</TableCell>
                <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400 print:text-black">{formatCurrency(totals.bonus)}</TableCell>
                <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400 print:text-black">{formatCurrency(totals.deduction)}</TableCell>
                <TableCell className="text-right font-mono text-foreground print:text-black">{formatCurrency(totals.net)}</TableCell>
                <TableCell className="text-right font-mono text-foreground print:text-black">{formatCurrency(totals.paid)}</TableCell>
                <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400 print:text-black">{formatCurrency(totals.remaining)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-muted-foreground print:text-slate-500">
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
        deduction: acc.deduction + p.lateDeduction + p.sanctionDeduction + p.unpaidAbsenceDeduction + (p.loanDeduction || 0),
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
    <div className="min-h-screen bg-background text-foreground py-6 sm:py-12 print:bg-white print:text-black print:py-0">
      <div className="fixed top-4 right-4 flex items-center gap-2 print:hidden z-10">
        <Button asChild variant="outline" className="shadow-sm bg-card/80 backdrop-blur-md border-border/80">
          <Link href={`/payroll/${payrollId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <Button onClick={handlePrint} className="shadow-sm">
          <Printer className="mr-2 h-4 w-4" />
          Cetak / Simpan PDF
        </Button>
      </div>

      {isLoading && (
        <div className="mx-auto max-w-5xl bg-card border border-border/80 rounded-2xl p-8 shadow-xl">
          <Skeleton className="h-[700px] w-full" />
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-5xl text-center p-8 bg-card border border-border/80 rounded-2xl">
          <p className="text-destructive font-semibold">Gagal memuat laporan penggajian.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tautan mungkin tidak valid atau Anda tidak memiliki izin.
          </p>
        </div>
      )}

      {payslips && payroll && (
        <PayrollReportPageContent payslips={payslips} payroll={payroll} totals={totals} />
      )}
      
      {!isLoading && !error && !payroll && (
        <div className="mx-auto max-w-5xl text-center p-8 bg-card border border-border/80 rounded-2xl">
          <h1 className="text-xl font-semibold">Laporan Penggajian Tidak Ditemukan</h1>
          <p className="text-muted-foreground mt-1">Pastikan tautan yang Anda masukkan sudah benar.</p>
        </div>
      )}
    </div>
  );
}

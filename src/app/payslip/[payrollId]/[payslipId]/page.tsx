"use client";

import { useParams } from "next/navigation";
import { useDoc, useFirebase, useMemoFirebase, WithId } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Payslip, Payroll } from "@/types";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function PayslipPageContent({
  payslip,
  payroll,
}: {
  payslip: WithId<Payslip>;
  payroll: WithId<Payroll>;
}) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const totalDeductions = payslip.lateDeduction + payslip.sanctionDeduction + payslip.unpaidAbsenceDeduction;
  const totalIncome = payslip.baseSalary + payslip.bonusTotal;

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 shadow-lg print:shadow-none">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">Slip Gaji</h1>
          <p className="text-muted-foreground">AttendEase</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">Periode</p>
          <p className="text-muted-foreground">
            {format(parseISO(payroll.period), "MMMM yyyy", { locale: id })}
          </p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="font-semibold text-muted-foreground">Karyawan</p>
          <p className="text-lg font-bold">{payslip.employeeName}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-muted-foreground">Tanggal Cetak</p>
          <p>{format(new Date(), "d MMMM yyyy", { locale: id })}</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Rincian Pendapatan</h2>
        <div className="flex justify-between border-t py-2">
          <p>Gaji Pokok</p>
          <p className="font-medium">{formatCurrency(payslip.baseSalary)}</p>
        </div>
        {payslip.bonusTotal > 0 && (
            <div className="border-t py-2">
              <div className="flex justify-between">
                <p>Bonus</p>
                <p className="font-medium text-green-600">
                  + {formatCurrency(payslip.bonusTotal)}
                </p>
              </div>
              <div className="pl-4 mt-1 space-y-1 text-sm text-muted-foreground">
                {payslip.bonuses?.map((b, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="pr-4 capitalize">- {b.type} ({format(parseISO(b.date), "d MMM yyyy", { locale: id })})</span>
                    <span>{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        <div className="flex justify-between border-t py-2 font-bold">
          <p>Total Pendapatan</p>
          <p>{formatCurrency(totalIncome)}</p>
        </div>
      </section>

      {totalDeductions > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Rincian Potongan</h2>
           {payslip.unpaidAbsenceDeduction > 0 && (
            <div className="flex justify-between border-t py-2">
              <p>Potongan Hari Tidak Masuk ({payslip.unpaidAbsenceCount} hari)</p>
              <p className="font-medium text-destructive">
                - {formatCurrency(payslip.unpaidAbsenceDeduction)}
              </p>
            </div>
          )}
          {payslip.lateDeduction > 0 && (
            <div className="flex justify-between border-t py-2">
              <p>Potongan Keterlambatan ({payslip.lateCount}x)</p>
              <p className="font-medium text-destructive">
                - {formatCurrency(payslip.lateDeduction)}
              </p>
            </div>
          )}
          {payslip.sanctionDeduction > 0 && (
            <div className="border-t py-2">
              <div className="flex justify-between">
                <p>Potongan Sanksi</p>
                <p className="font-medium text-destructive">
                  - {formatCurrency(payslip.sanctionDeduction)}
                </p>
              </div>
              <div className="pl-4 mt-1 space-y-1 text-sm text-muted-foreground">
                {payslip.sanctions?.map((s, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="pr-4">- {s.violation} ({format(parseISO(s.date), "d MMM yyyy", { locale: id })})</span>
                    <span>{formatCurrency(s.deduction)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between border-t py-2 font-bold">
            <p>Total Potongan</p>
            <p className="text-destructive">
              - {formatCurrency(totalDeductions)}
            </p>
          </div>
        </section>
      )}

      <Separator className="my-6" />

      <section>
        <div className="flex justify-between rounded-md bg-muted/50 p-4 text-lg font-bold">
          <p>Gaji Bersih (Take Home Pay)</p>
          <p>{formatCurrency(payslip.netSalary)}</p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 rounded-md border p-4 text-sm">
        <h2 className="col-span-2 mb-2 text-base font-semibold">Status Pembayaran</h2>
        <div className="text-muted-foreground">Jumlah Telah Dibayar</div>
        <div className="text-right font-medium">{formatCurrency(payslip.paidAmount)}</div>
        <div className="text-muted-foreground">Sisa Gaji Periode Ini</div>
        <div className="text-right font-medium text-destructive">{formatCurrency(payslip.remainingAmount)}</div>
        <div className="text-muted-foreground">Status</div>
        <div className="text-right">
            <Badge variant={payslip.paymentStatus === 'lunas' ? 'default' : (payslip.paymentStatus === 'sebagian' ? 'outline' : 'secondary')} className="capitalize">
                {payslip.paymentStatus === 'belum dibayar' ? 'Belum Dibayar' : payslip.paymentStatus}
            </Badge>
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <p>Ini adalah slip gaji yang dibuat secara otomatis oleh sistem.</p>
      </footer>
    </div>
  );
}

export default function PayslipPage() {
  const params = useParams<{ payrollId: string; payslipId: string }>();
  const { payrollId, payslipId } = params;
  const { firestore } = useFirebase();

  const payslipDocRef = useMemoFirebase(
    () =>
      firestore && payrollId && payslipId
        ? doc(firestore, "payrolls", payrollId, "payslips", payslipId)
        : null,
    [firestore, payrollId, payslipId]
  );
  const {
    data: payslip,
    isLoading: isLoadingPayslip,
    error: errorPayslip,
  } = useDoc<Payslip>(payslipDocRef);

  const payrollDocRef = useMemoFirebase(
    () => (firestore && payrollId ? doc(firestore, "payrolls", payrollId) : null),
    [firestore, payrollId]
  );
  const {
    data: payroll,
    isLoading: isLoadingPayroll,
    error: errorPayroll,
  } = useDoc<Payroll>(payrollDocRef);

  const isLoading = isLoadingPayslip || isLoadingPayroll;
  const error = errorPayslip || errorPayroll;

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
        <div className="mx-auto max-w-2xl bg-white p-8 shadow-lg">
          <Skeleton className="h-[700px] w-full" />
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-destructive">Gagal memuat slip gaji.</p>
          <p className="text-sm text-muted-foreground">
            Tautan mungkin tidak valid atau Anda tidak memiliki izin.
          </p>
        </div>
      )}

      {payslip && payroll && (
        <PayslipPageContent payslip={payslip} payroll={payroll} />
      )}
      
      {!isLoading && !error && !payslip && (
        <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-xl font-semibold">Slip Gaji Tidak Ditemukan</h1>
            <p className="text-muted-foreground">Pastikan tautan yang Anda masukkan sudah benar.</p>
        </div>
      )}
    </div>
  );
}

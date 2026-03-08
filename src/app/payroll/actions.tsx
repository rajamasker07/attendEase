
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, WithId } from "@/firebase";
import type { Employee, AttendanceRecord, Payroll, Payslip, Sanction, Bonus, PayslipSanctionDetail, PayslipBonusDetail, AbsenceRecord, Savings, SavingsTransaction, Setting, Loan, PayslipLoanDetail, LoanPayment } from "@/types";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  runTransaction,
  Firestore,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";
import {
  format,
  parseISO,
  isAfter,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Copy, Wallet, CheckCheck } from "lucide-react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CreatePayrollDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function CreatePayrollDialog({ isOpen, setIsOpen }: CreatePayrollDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState(new Date().getMonth().toString());

  const handleCreatePayroll = async () => {
    setIsLoading(true);
    if (!firestore) {
      toast({
        title: "Error",
        description: "Koneksi database gagal.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const periodDate = new Date(parseInt(year), parseInt(month));
    const payrollPeriod = format(periodDate, "yyyy-MM");
    const daysInMonth = getDaysInMonth(periodDate);

    try {
      const existingPayrollQuery = query(
        collection(firestore, "payrolls"),
        where("period", "==", payrollPeriod)
      );
      const existingPayrollSnap = await getDocs(existingPayrollQuery);
      if (!existingPayrollSnap.empty) {
        toast({
          title: "Gagal",
          description: `Penggajian untuk periode ${format(
            periodDate,
            "MMMM yyyy"
          )} sudah ada.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 1. Get active employees
      const employeesQuery = query(
        collection(firestore, "employees"),
        where("status", "==", "aktif")
      );
      const employeesSnap = await getDocs(employeesQuery);
      const activeEmployees = employeesSnap.docs.map((d) => ({
        ...(d.data() as Employee),
        id: d.id,
      }));
      
      if (activeEmployees.length === 0) {
        toast({
            title: "Tidak Ada Karyawan",
            description: "Tidak ada karyawan aktif untuk digaji.",
            variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const startDate = startOfMonth(periodDate);
      const endDate = endOfMonth(periodDate);
      const startDateString = format(startDate, "yyyy-MM-dd");
      const endDateString = format(endDate, "yyyy-MM-dd");

      // Fetch all relevant data
      const attendanceQuery = query(
        collection(firestore, "attendance"),
        where("clockIn", ">=", startDate.toISOString()),
        where("clockIn", "<=", endDate.toISOString())
      );
      const sanctionsQuery = query(
        collection(firestore, "sanctions"),
        where("date", ">=", startDateString),
        where("date", "<=", endDateString)
      );
      const bonusesQuery = query(
        collection(firestore, "bonuses"),
        where("date", ">=", startDateString),
        where("date", "<=", endDateString)
      );
      const absencesQuery = query(
        collection(firestore, "absences"),
        where("date", ">=", startDateString),
        where("date", "<=", endDateString)
      );
      const loansQuery = query(
        collection(firestore, "loans"),
        where("status", "==", "active")
      );
      const settingsRef = doc(firestore, "settings", "payroll");

      const [
          attendanceSnap, 
          sanctionsSnap, 
          bonusesSnap, 
          absencesSnap, 
          loansSnap,
          settingsSnap
      ] = await Promise.all([
          getDocs(attendanceQuery),
          getDocs(sanctionsQuery),
          getDocs(bonusesQuery),
          getDocs(absencesQuery),
          getDocs(loansQuery),
          getDoc(settingsRef)
      ]);
      
      const attendanceRecords = attendanceSnap.docs.map((d) => d.data() as AttendanceRecord);
      const periodSanctions = sanctionsSnap.docs.map((d) => d.data() as Sanction);
      const periodBonuses = bonusesSnap.docs.map((d) => d.data() as Bonus);
      const periodAbsences = absencesSnap.docs.map((d) => d.data() as AbsenceRecord);
      const activeLoans = loansSnap.docs.map(d => ({ ...d.data() as Loan, id: d.id }));
      const settings = settingsSnap.exists() ? settingsSnap.data() as Setting : {};
      
      const LATE_DEDUCTION_AMOUNT = settings?.lateDeductionAmount ?? 10000;
      const DEDUCT_UNPAID_ABSENCE = settings?.deductUnpaidAbsence ?? false;
      const LATE_THRESHOLD_TIME = settings?.lateThresholdTime ?? "07:35";

      // Create Payroll document
      const newPayrollRef = doc(collection(firestore, "payrolls"));
      const newPayrollData: Payroll = {
        period: payrollPeriod,
        createdAt: new Date().toISOString(),
        status: "draft",
      };
      await setDoc(newPayrollRef, newPayrollData);

      // Create Payslip for each employee
      for (const employee of activeEmployees) {
        // Late deductions
        const employeeAttendance = attendanceRecords.filter((r) => r.employeeId === employee.id);
        let lateCount = 0;
        employeeAttendance.forEach((record) => {
          const clockInTime = parseISO(record.clockIn);
          const [hours, minutes] = LATE_THRESHOLD_TIME.split(':').map(Number);
          const lateTime = new Date(clockInTime);
          lateTime.setHours(hours, minutes, 0, 0);
          if (isAfter(clockInTime, lateTime)) {
            lateCount++;
          }
        });
        const lateDeduction = lateCount * LATE_DEDUCTION_AMOUNT;
        
        // Sanction deductions
        const employeeSanctions = periodSanctions.filter((s) => s.employeeId === employee.id);
        const sanctionCount = employeeSanctions.length;
        const sanctionDeduction = employeeSanctions.reduce((total, s) => total + s.deduction, 0);
        const sanctionDetails: PayslipSanctionDetail[] = employeeSanctions.map(s => ({
            violation: s.violation, date: s.date, deduction: s.deduction,
        }));

        // Bonus additions
        const employeeBonuses = periodBonuses.filter((b) => b.employeeId === employee.id);
        const bonusTotal = employeeBonuses.reduce((total, b) => total + b.amount, 0);
        const bonusDetails: PayslipBonusDetail[] = employeeBonuses.map(b => ({
            type: b.type, date: b.date, amount: b.amount, description: b.description
        }));

        // Unpaid absence deduction
        let unpaidAbsenceCount = 0;
        let unpaidAbsenceDeduction = 0;
        if (DEDUCT_UNPAID_ABSENCE) {
            const employeeAbsences = periodAbsences.filter((a) => a.employeeId === employee.id);
            unpaidAbsenceCount = employeeAbsences.length;
            const dailyWage = (employee.salary || 0) / daysInMonth;
            unpaidAbsenceDeduction = Math.round(unpaidAbsenceCount * dailyWage);
        }

        // Calculate available balance for loans
        const earnings = (employee.salary || 0) + bonusTotal;
        const deductionsExcludingLoans = lateDeduction + sanctionDeduction + unpaidAbsenceDeduction;
        
        let availableForLoans = Math.max(0, earnings - deductionsExcludingLoans);
        let actualLoanDeduction = 0;
        const loanDetails: PayslipLoanDetail[] = [];

        // Loan deductions (Process loans one by one until available balance is exhausted)
        const employeeLoans = activeLoans.filter(l => l.employeeId === employee.id);
        for (const loan of employeeLoans) {
            if (availableForLoans <= 0) break;
            const currentDebt = loan.remainingAmount ?? loan.amount;
            const toDeduct = Math.min(currentDebt, availableForLoans);
            
            if (toDeduct > 0) {
                loanDetails.push({
                    loanId: loan.id,
                    amount: toDeduct,
                    description: loan.description,
                    date: loan.date
                });
                actualLoanDeduction += toDeduct;
                availableForLoans -= toDeduct;
            }
        }

        // Final net salary calculation (Guaranteed >= 0)
        const netSalary = Math.max(0, earnings - deductionsExcludingLoans - actualLoanDeduction);

        const newPayslipData: Payslip = {
          employeeId: employee.id,
          employeeName: employee.name,
          baseSalary: employee.salary || 0,
          bonusTotal,
          bonuses: bonusDetails,
          lateCount,
          lateDeduction,
          unpaidAbsenceCount,
          unpaidAbsenceDeduction,
          sanctionCount,
          sanctionDeduction,
          sanctions: sanctionDetails,
          loanDeduction: actualLoanDeduction,
          loanDetails,
          netSalary,
          paidAmount: 0,
          remainingAmount: netSalary,
          paymentStatus: netSalary <= 0.01 ? 'lunas' : 'belum dibayar',
        };

        const newPayslipRef = doc(collection(firestore, "payrolls", newPayrollRef.id, "payslips"));
        await setDoc(newPayslipRef, newPayslipData);
      }

      toast({
        title: "Berhasil",
        description: `Penggajian untuk ${format(periodDate, "MMMM yyyy")} berhasil dibuat.`,
      });
      setIsOpen(false);
      router.push(`/payroll/${newPayrollRef.id}`);
    } catch (error) {
      console.error("Error creating payroll:", error);
      toast({
        title: "Terjadi Kesalahan",
        description: "Gagal membuat penggajian. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM", { locale: localeId }),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={(e) => { e.preventDefault(); handleCreatePayroll(); }}>
          <DialogHeader>
            <DialogTitle>Buat Penggajian Baru</DialogTitle>
            <DialogDescription>
              Pilih periode bulan dan tahun untuk membuat laporan penggajian.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="month">Bulan</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="year">Tahun</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Buat Penggajian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

interface PayslipDetailDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    payslip: WithId<Payslip> | null;
    payrollId: string;
}

export function PayslipDetailDialog({ isOpen, setIsOpen, payslip, payrollId }: PayslipDetailDialogProps) {
    const [copied, setCopied] = useState(false);
    
    if (!payslip) return null;
    
    const payslipUrl = typeof window !== 'undefined' ? `${window.location.origin}/payslip/${payrollId}/${payslip.id}` : '';

    const handleCopyLink = () => {
        navigator.clipboard.writeText(payslipUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }

    const totalDeductions = payslip.lateDeduction + payslip.sanctionDeduction + payslip.unpaidAbsenceDeduction + (payslip.loanDeduction || 0);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Detail Slip Gaji</DialogTitle>
                    <DialogDescription>
                        Rincian gaji untuk {payslip.employeeName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Gaji Pokok</span>
                        <span className="font-medium">{formatCurrency(payslip.baseSalary)}</span>
                    </div>

                    {payslip.bonusTotal > 0 && (
                      <div>
                        <div className="flex justify-between items-center">
                            <p className="text-muted-foreground">Bonus</p>
                            <span className="font-medium text-green-600">
                                + {formatCurrency(payslip.bonusTotal)}
                            </span>
                        </div>
                        <div className="pl-2 mt-1 text-xs text-muted-foreground space-y-1">
                            {payslip.bonuses?.map((b, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="pr-2 capitalize">- {b.type} ({format(parseISO(b.date), "d MMM", { locale: localeId })})</span>
                                    <span>{formatCurrency(b.amount)}</span>
                                </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {(totalDeductions > 0) && <hr />}

                    {payslip.unpaidAbsenceDeduction > 0 && (
                      <div className="flex justify-between items-center">
                          <div>
                              <p className="text-muted-foreground">Potongan Hari Tidak Masuk</p>
                              <p className="text-xs text-muted-foreground">({payslip.unpaidAbsenceCount} hari)</p>
                          </div>
                          <span className="font-medium text-destructive">
                             - {formatCurrency(payslip.unpaidAbsenceDeduction)}
                          </span>
                      </div>
                    )}
                    
                    {payslip.lateDeduction > 0 && (
                      <div className="flex justify-between items-center">
                          <div>
                              <p className="text-muted-foreground">Potongan Keterlambatan</p>
                              <p className="text-xs text-muted-foreground">({payslip.lateCount} kali)</p>
                          </div>
                          <span className="font-medium text-destructive">
                             - {formatCurrency(payslip.lateDeduction)}
                          </span>
                      </div>
                    )}
                    
                    {(payslip.loanDeduction || 0) > 0 && (
                      <div>
                        <div className="flex justify-between items-center">
                            <p className="text-muted-foreground">Potongan Pinjaman/Kasbon</p>
                            <span className="font-medium text-destructive">
                                - {formatCurrency(payslip.loanDeduction || 0)}
                            </span>
                        </div>
                        <div className="pl-2 mt-1 text-xs text-muted-foreground space-y-1">
                            {payslip.loanDetails?.map((l, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="pr-2">- {l.description} ({format(parseISO(l.date), "d MMM", { locale: localeId })})</span>
                                    <span>{formatCurrency(l.amount)}</span>
                                </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {payslip.sanctionDeduction > 0 && (
                      <div>
                        <div className="flex justify-between items-center">
                            <p className="text-muted-foreground">Potongan Sanksi</p>
                            <span className="font-medium text-destructive">
                                - {formatCurrency(payslip.sanctionDeduction)}
                            </span>
                        </div>
                        <div className="pl-2 mt-1 text-xs text-muted-foreground space-y-1">
                            {payslip.sanctions?.map((s, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="pr-2">- {s.violation} ({format(parseISO(s.date), "d MMM", { locale: localeId })})</span>
                                    <span>{formatCurrency(s.deduction)}</span>
                                </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <hr/>
                    <div className="flex justify-between font-bold text-base">
                        <span>Gaji Bersih</span>
                        <span>{formatCurrency(payslip.netSalary)}</span>
                    </div>

                    <Separator className="my-2" />

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Telah Dibayar</span>
                        <span className="font-medium">{formatCurrency(payslip.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Sisa Gaji</span>
                        <span className="font-medium">{formatCurrency(payslip.remainingAmount)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status Pembayaran</span>
                        <Badge variant={payslip.paymentStatus === 'lunas' ? 'default' : (payslip.paymentStatus === 'sebagian' ? 'outline' : 'secondary')} className="capitalize">
                            {payslip.paymentStatus}
                        </Badge>
                    </div>

                    {payslipUrl && (
                      <div className="space-y-2 pt-4">
                          <Label htmlFor="payslip-link">Tautan Slip Gaji</Label>
                          <div className="flex items-center space-x-2">
                              <Input id="payslip-link" value={payslipUrl} readOnly />
                              <Button type="button" size="sm" onClick={handleCopyLink}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  {copied ? 'Disalin!' : 'Salin'}
                              </Button>
                          </div>
                      </div>
                    )}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Jumlah pembayaran harus lebih dari 0."),
});
type PaymentFormData = z.infer<typeof paymentSchema>;

interface RecordPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  payslip: WithId<Payslip> | null;
  onSave: (payslipId: string, amount: number) => void;
}

export function RecordPaymentDialog({ isOpen, setIsOpen, payslip, onSave }: RecordPaymentDialogProps) {
  const { toast } = useToast();
  
  const resolver = zodResolver(paymentSchema.refine(
    (data) => !payslip || data.amount <= payslip.remainingAmount + 0.01, {
      message: "Pembayaran tidak boleh melebihi sisa gaji.",
      path: ["amount"],
    }
  ));
  
  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<PaymentFormData>({
    resolver,
    defaultValues: { amount: 0 },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ amount: 0 });
    }
  }, [isOpen, reset]);
  
  if (!payslip) return null;

  const onSubmit: SubmitHandler<PaymentFormData> = (data) => {
    onSave(payslip.id, data.amount);
    toast({
      title: "Pembayaran Dicatat",
      description: `Pembayaran untuk ${payslip.employeeName} telah dicatat.`,
    });
    setIsOpen(false);
  };

  const handleFillFull = () => {
    setValue("amount", payslip.remainingAmount);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran Gaji</DialogTitle>
          <DialogDescription>Untuk: {payslip.employeeName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Gaji Bersih</span>
                    <span className="font-medium">{formatCurrency(payslip.netSalary)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Sisa Gaji</span>
                    <span className="font-medium">{formatCurrency(payslip.remainingAmount)}</span>
                </div>
                <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="amount">Jumlah Pembayaran Baru</Label>
                        <Button 
                            type="button" 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-xs text-primary"
                            onClick={handleFillFull}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Bayar Semua
                        </Button>
                    </div>
                    <Controller
                        name="amount"
                        control={control}
                        render={({ field }) => (
                            <CurrencyInput
                            id="amount"
                            placeholder="0"
                            value={field.value}
                            onValueChange={field.onChange}
                            onBlur={field.onBlur}
                            />
                        )}
                    />
                    {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
                </div>
            </div>
            <DialogFooter>
                <Button type="submit">Simpan Pembayaran</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeletePayrollAlertProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onConfirm: () => void;
    payrollPeriod?: string;
    isFinalized?: boolean;
}

export function DeletePayrollAlert({ isOpen, setIsOpen, onConfirm, payrollPeriod, isFinalized }: DeletePayrollAlertProps) {
    const { toast } = useToast();
    
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
        toast({
            title: "Riwayat Penggajian Dihapus",
            description: `Penggajian untuk periode ${payrollPeriod} telah dihapus.`,
            variant: "destructive"
        })
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {isFinalized ? (
                            <span className="text-destructive font-bold block mb-2 underline">PERINGATAN: Penggajian ini sudah SELESAI (Finalized).</span>
                        ) : null}
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus riwayat penggajian untuk
                        <strong> periode {payrollPeriod}</strong> dan semua data slip gaji terkait secara permanen.
                        {isFinalized ? " Hutang yang sudah terlanjur terpotong tidak akan otomatis kembali." : ""}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
                      Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export async function finalizePayroll(firestore: Firestore, payrollId: string, payslips: WithId<Payslip>[]) {
    const payrollRef = doc(firestore, "payrolls", payrollId);
    
    await runTransaction(firestore, async (transaction) => {
        // 1. READ PHASE: Ambil semua data hutang yang akan dipotong
        // Sesuai aturan Firestore, semua pembacaan (get) harus dilakukan sebelum penulisan (update/set)
        const loanSnaps = new Map<string, any>();
        for (const payslip of payslips) {
            if (payslip.loanDetails && payslip.loanDetails.length > 0) {
                for (const loanDetail of payslip.loanDetails) {
                    if (!loanSnaps.has(loanDetail.loanId)) {
                        const loanRef = doc(firestore, "loans", loanDetail.loanId);
                        const snap = await transaction.get(loanRef);
                        loanSnaps.set(loanDetail.loanId, snap);
                    }
                }
            }
        }

        // 2. WRITE PHASE: Update data hutang dan status payroll
        for (const payslip of payslips) {
            if (payslip.loanDetails && payslip.loanDetails.length > 0) {
                for (const loanDetail of payslip.loanDetails) {
                    const loanSnap = loanSnaps.get(loanDetail.loanId);
                    
                    if (loanSnap && loanSnap.exists()) {
                        const loanData = loanSnap.data() as Loan;
                        const currentRemaining = loanData.remainingAmount ?? loanData.amount;
                        const newRemaining = Math.max(0, currentRemaining - loanDetail.amount);
                        
                        const paymentRecord: LoanPayment = {
                          date: new Date().toISOString(),
                          amount: loanDetail.amount,
                          method: 'payroll',
                          description: `Potongan dari Gaji Periode ${format(new Date(), 'yyyy-MM')}`
                        };

                        transaction.update(loanSnap.ref, { 
                          remainingAmount: newRemaining,
                          status: newRemaining <= 0 ? 'paid' : 'active', 
                          repaidAt: newRemaining <= 0 ? new Date().toISOString() : null,
                          payslipId: payslip.id,
                          payments: arrayUnion(paymentRecord)
                        });
                    }
                }
            }
        }

        // Tandai payroll sebagai selesai
        transaction.update(payrollRef, { status: "finalized" });
    });
}

export async function storeRemainingSavings(
  firestore: Firestore,
  payslip: WithId<Payslip>,
  payrollId: string,
  payrollPeriod: string,
) {
  if (!payslip || payslip.remainingAmount <= 0) {
    throw new Error("Tidak ada sisa gaji untuk disimpan.");
  }

  const savingsRef = doc(firestore, "savings", payslip.employeeId);
  const payslipRef = doc(firestore, "payrolls", payrollId, "payslips", payslip.id);
  const transactionRef = doc(collection(firestore, "savings-transactions"));

  await runTransaction(firestore, async (transaction) => {
    const savingsDoc = await transaction.get(savingsRef);
    const currentBalance = savingsDoc.exists() ? savingsDoc.data().balance : 0;
    const newBalance = currentBalance + payslip.remainingAmount;

    // 1. Update savings balance
    transaction.set(savingsRef, {
      employeeId: payslip.employeeId,
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });

    // 2. Create savings transaction record
    transaction.set(transactionRef, {
      employeeId: payslip.employeeId,
      date: new Date().toISOString(),
      type: 'deposit',
      amount: payslip.remainingAmount,
      description: `Setoran dari Gaji ${format(parseISO(payrollPeriod), "MMMM yyyy", { locale: localeId })}`,
      sourcePayslipId: payslip.id,
    } as SavingsTransaction);
    
    // 3. Update the payslip to be fully settled
    transaction.update(payslipRef, {
      paidAmount: payslip.netSalary, 
      remainingAmount: 0,
      paymentStatus: 'lunas',
    });
  });
}

interface StoreSavingsAlertProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onConfirm: () => void;
    payslip: WithId<Payslip> | null;
}

export function StoreSavingsAlert({ isOpen, setIsOpen, onConfirm, payslip }: StoreSavingsAlertProps) {
    if (!payslip) return null;
    
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Simpan Sisa Gaji ke Tabungan?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Anda akan memindahkan sisa gaji sebesar{' '}
                        <strong>{formatCurrency(payslip.remainingAmount)}</strong> untuk{' '}
                        <strong>{payslip.employeeName}</strong> ke dalam saldo tabungannya.
                        Slip gaji ini akan ditandai sebagai lunas.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm}>
                      Ya, Simpan ke Tabungan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

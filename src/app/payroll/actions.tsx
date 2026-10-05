
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
import { useFirebase, type WithId } from "@/firebase";
import type { 
  Employee, 
  AttendanceRecord, 
  Payroll, 
  Payslip, 
  Sanction, 
  Bonus, 
  PayslipSanctionDetail, 
  PayslipBonusDetail, 
  AbsenceRecord, 
  SavingsTransaction, 
  Setting, 
  Loan, 
  PayslipLoanDetail, 
  PayslipEarlyDepartureDetail,
  LoanPayment 
} from "@/types";
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
  type Firestore,
  arrayUnion,
} from "firebase/firestore";
import {
  format,
  parseISO,
  isAfter,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  differenceInMinutes,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Copy, Wallet, CheckCheck, Loader2 } from "lucide-react";
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
      const settings = (settingsSnap.exists() ? settingsSnap.data() : {}) as Partial<Setting>;
      
      const LATE_DEDUCTION_AMOUNT = settings?.lateDeductionAmount ?? 10000;
      const DEDUCT_UNPAID_ABSENCE = settings?.deductUnpaidAbsence ?? false;
      const LATE_THRESHOLD_TIME = settings?.lateThresholdTime ?? "07:35";
      const STANDARD_WORK_HOURS_PER_DAY = settings?.standardWorkHoursPerDay ?? 10.5;
      const DEDUCT_EARLY_DEPARTURE = settings?.deductEarlyDeparture ?? true;

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

        // Early departure deduction (Pulang Awal / Sakit di Tengah Hari)
        let earlyDepartureCount = 0;
        let earlyDepartureDeduction = 0;
        const earlyDepartureDetails: PayslipEarlyDepartureDetail[] = [];

        if (DEDUCT_EARLY_DEPARTURE) {
            const dailyWage = (employee.salary || 0) / daysInMonth;
            const hourlyRate = dailyWage / STANDARD_WORK_HOURS_PER_DAY;

            employeeAttendance.forEach((record) => {
              if (record.clockOut && record.earlyDepartureReason) {
                // Dinas / Tugas Luar tidak dipotong jam kerja (dianggap penuh)
                if (record.earlyDepartureReason === 'dinas') {
                  return;
                }

                const inTime = parseISO(record.clockIn);
                const outTime = parseISO(record.clockOut);
                const minutesWorked = differenceInMinutes(outTime, inTime);
                const hoursWorked = Math.max(0, Number((minutesWorked / 60).toFixed(2)));

                if (hoursWorked < STANDARD_WORK_HOURS_PER_DAY) {
                  const unworkedHours = STANDARD_WORK_HOURS_PER_DAY - hoursWorked;
                  const deduction = Math.round(hourlyRate * unworkedHours);

                  if (deduction > 0) {
                    earlyDepartureCount++;
                    earlyDepartureDeduction += deduction;
                    earlyDepartureDetails.push({
                      date: format(inTime, "yyyy-MM-dd"),
                      clockIn: format(inTime, "HH:mm"),
                      clockOut: format(outTime, "HH:mm"),
                      hoursWorked,
                      standardHours: STANDARD_WORK_HOURS_PER_DAY,
                      reason: record.earlyDepartureReason,
                      deduction,
                    });
                  }
                }
              }
            });
        }

        // Calculate available balance for loans
        const earnings = (employee.salary || 0) + bonusTotal;
        const deductionsExcludingLoans = lateDeduction + sanctionDeduction + unpaidAbsenceDeduction + earlyDepartureDeduction;
        
        let availableForLoans = Math.max(0, earnings - deductionsExcludingLoans);
        let actualLoanDeduction = 0;
        const loanDetails: PayslipLoanDetail[] = [];

        // Urutkan pinjaman: Kasbon biasa diprioritaskan terlebih dahulu, disusul Kredit (FIFO berdasarkan tanggal tertua)
        const employeeLoans = activeLoans.filter(l => l.employeeId === employee.id);
        const sortedLoans = [...employeeLoans].sort((a, b) => {
            if (a.type !== 'kredit' && b.type === 'kredit') return -1;
            if (a.type === 'kredit' && b.type !== 'kredit') return 1;
            return a.date.localeCompare(b.date);
        });

        for (const loan of sortedLoans) {
            if (availableForLoans <= 0) break;
            const currentDebt = loan.remainingAmount ?? loan.amount;
            const isKredit = loan.type === 'kredit';

            if (isKredit) {
                // Check if this kredit is marked to skip this period
                if (loan.skipPeriod === payrollPeriod) {
                    continue; // Skip deduction — employee requested relief this month
                }
                const installmentTarget = Math.min(loan.installmentAmount ?? currentDebt, currentDebt);
                // Potong semaksimal sisa gaji yang tersedia (walaupun kurang dari cicilan bulanan normal)
                const toDeduct = Math.min(installmentTarget, availableForLoans);

                if (toDeduct > 0) {
                    const isPartial = toDeduct < installmentTarget;
                    const paidSoFar = loan.paidInstallments ?? 0;
                    const formattedToDeduct = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(toDeduct);
                    const formattedTarget = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(installmentTarget);

                    const description = isPartial
                        ? `${loan.description} (Cicilan ${paidSoFar + 1}/${loan.totalInstallments ?? '?'} - Sebagian: ${formattedToDeduct} dari ${formattedTarget})`
                        : `${loan.description} (Cicilan ${paidSoFar + 1}/${loan.totalInstallments ?? '?'})`;

                    loanDetails.push({
                        loanId: loan.id,
                        amount: toDeduct,
                        description,
                        date: loan.date
                    });
                    actualLoanDeduction += toDeduct;
                    availableForLoans -= toDeduct;
                }
            } else {
                // Kasbon reguler — potong semaksimal saldo yang ada
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
          earlyDepartureCount,
          earlyDepartureDeduction,
          earlyDepartureDetails,
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

    const totalDeductions = payslip.lateDeduction + payslip.sanctionDeduction + payslip.unpaidAbsenceDeduction + (payslip.earlyDepartureDeduction || 0) + (payslip.loanDeduction || 0);

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

                    {(payslip.earlyDepartureDeduction || 0) > 0 && (
                      <div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-muted-foreground">Potongan Pulang Awal / Sakit Tengah Hari</p>
                            <p className="text-xs text-muted-foreground">({payslip.earlyDepartureCount || 0} hari)</p>
                          </div>
                          <span className="font-medium text-destructive">
                            - {formatCurrency(payslip.earlyDepartureDeduction || 0)}
                          </span>
                        </div>
                        <div className="pl-2 mt-1 text-xs text-muted-foreground space-y-1">
                          {payslip.earlyDepartureDetails?.map((d, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="pr-2 capitalize">
                                - {format(parseISO(d.date), "d MMM", { locale: localeId })} ({d.hoursWorked} jam dari {d.standardHours} jam • {d.reason})
                              </span>
                              <span>{formatCurrency(d.deduction)}</span>
                            </div>
                          ))}
                        </div>
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
                        {isFinalized ? " Hutang yang sudah terlanjur terpotong tidak akan otomatis kembali. Disarankan untuk membatalkan finalisasi terlebih dahulu jika ingin mengembalikan saldo hutang." : ""}
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

interface UnfinalizePayrollAlertProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onConfirm: () => void;
    payrollPeriod?: string;
    isLoading?: boolean;
}

export function UnfinalizePayrollAlert({ isOpen, setIsOpen, onConfirm, payrollPeriod, isLoading }: UnfinalizePayrollAlertProps) {
    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Batalkan Finalisasi Penggajian?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3 text-sm text-muted-foreground">
                            <p>
                                Penggajian untuk <strong>periode {payrollPeriod}</strong> akan dikembalikan ke status <strong>Draf</strong>.
                            </p>
                            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs space-y-1">
                                <p className="font-semibold text-amber-800 dark:text-amber-400">⚠ Dampak Pembatalan:</p>
                                <ul className="list-disc pl-4 text-amber-700 dark:text-amber-400 space-y-0.5">
                                    <li>Saldo pinjaman/kasbon yang terpotong pada periode ini akan dikembalikan ke akun karyawan.</li>
                                    <li>Status pinjaman yang sebelumnya lunas akan diaktifkan kembali.</li>
                                    <li>Jumlah cicilan kredit terbayar akan dikurangi 1.</li>
                                    <li>Riwayat potongan gaji pada pinjaman akan dihapus.</li>
                                    <li>Anda dapat kembali mengedit, mencatat ulang pembayaran, atau menghapus draf penggajian ini.</li>
                                </ul>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={isLoading}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            "Ya, Batalkan Finalisasi"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export async function finalizePayroll(
    firestore: Firestore, 
    payrollId: string, 
    payslips: WithId<Payslip>[],
    payrollPeriod?: string
) {
    if (!payslips || payslips.length === 0) {
        throw new Error("Tidak ada data slip gaji untuk difinalisasi.");
    }

    // Validasi: pastikan semua slip gaji sudah lunas
    const unpaidPayslips = payslips.filter(p => p.paymentStatus !== 'lunas');
    if (unpaidPayslips.length > 0) {
        throw new Error("Tidak dapat memfinalisasi laporan karena masih ada gaji karyawan yang belum lunas.");
    }

    const payrollRef = doc(firestore, "payrolls", payrollId);
    const periodLabel = payrollPeriod ? payrollPeriod.slice(0, 7) : format(new Date(), 'yyyy-MM');
    
    await runTransaction(firestore, async (transaction) => {
        // Agregasi potongan pinjaman per unik loanId untuk mencegah multiple writes dalam satu transaksi
        const loanDeductionMap = new Map<string, {
            totalAmount: number;
            count: number;
            payslipId: string;
            details: { amount: number; description?: string }[];
        }>();

        for (const payslip of payslips) {
            if (payslip.loanDetails && payslip.loanDetails.length > 0) {
                for (const loanDetail of payslip.loanDetails) {
                    const existing = loanDeductionMap.get(loanDetail.loanId) || {
                        totalAmount: 0,
                        count: 0,
                        payslipId: payslip.id,
                        details: []
                    };
                    existing.totalAmount += loanDetail.amount;
                    existing.count += 1;
                    existing.details.push({
                        amount: loanDetail.amount,
                        description: loanDetail.description
                    });
                    loanDeductionMap.set(loanDetail.loanId, existing);
                }
            }
        }

        // 1. READ PHASE: Ambil semua data hutang unik yang akan dipotong
        const loanSnaps = new Map<string, any>();
        for (const loanId of loanDeductionMap.keys()) {
            const loanRef = doc(firestore, "loans", loanId);
            const snap = await transaction.get(loanRef);
            loanSnaps.set(loanId, snap);
        }

        // 2. WRITE PHASE: Update data hutang dan status payroll
        for (const [loanId, item] of loanDeductionMap.entries()) {
            const loanSnap = loanSnaps.get(loanId);
            
            if (loanSnap && loanSnap.exists()) {
                const loanData = loanSnap.data() as Loan;
                const currentRemaining = loanData.remainingAmount ?? loanData.amount;
                const rawRemaining = currentRemaining - item.totalAmount;
                const newRemaining = rawRemaining <= 0.01 ? 0 : Math.round(rawRemaining * 100) / 100;
                const isKredit = loanData.type === 'kredit';

                const newPayments: LoanPayment[] = item.details.map(d => ({
                    date: new Date().toISOString(),
                    amount: d.amount,
                    method: 'payroll',
                    description: `Potongan dari Gaji Periode ${periodLabel}`
                }));

                // Hitung jumlah cicilan penuh yang telah terbayarkan
                const totalPaidSoFar = Math.max(0, loanData.amount - newRemaining);
                const fullInstallmentsCovered = loanData.installmentAmount && loanData.installmentAmount > 0
                    ? Math.floor(totalPaidSoFar / loanData.installmentAmount)
                    : 0;
                const newPaidInstallments = newRemaining <= 0.01
                    ? (loanData.totalInstallments ?? fullInstallmentsCovered)
                    : Math.min(loanData.totalInstallments ?? Infinity, fullInstallmentsCovered);

                // For kredit: perbarui counter cicilan yang telah tertutup
                const kreditUpdates = isKredit ? {
                    paidInstallments: newPaidInstallments,
                } : {};

                // Pinjaman kredit/kasbon HANYA dianggap lunas jika sisa hutang benar-benar habis (<= 0.01)
                const isFullyPaid = newRemaining <= 0.01;

                const existingPayments = loanData.payments ?? [];

                transaction.update(loanSnap.ref, { 
                    remainingAmount: newRemaining,
                    status: isFullyPaid ? 'paid' : 'active',
                    repaidAt: isFullyPaid ? new Date().toISOString() : null,
                    payslipId: item.payslipId,
                    payments: [...existingPayments, ...newPayments],
                    ...kreditUpdates,
                });
            }
        }

        // Tandai payroll sebagai selesai
        transaction.update(payrollRef, { status: "finalized" });
    });
}

export async function unfinalizePayroll(
    firestore: Firestore,
    payrollId: string,
    payrollPeriod: string,
    payslips: WithId<Payslip>[]
) {
    const payrollRef = doc(firestore, "payrolls", payrollId);

    await runTransaction(firestore, async (transaction) => {
        // Validasi: pastikan data payroll ada dan statusnya finalized
        const payrollSnap = await transaction.get(payrollRef);
        if (!payrollSnap.exists()) {
            throw new Error("Data penggajian tidak ditemukan.");
        }
        if (payrollSnap.data().status !== "finalized") {
            throw new Error("Penggajian ini belum difinalisasi atau sudah berstatus draf.");
        }

        // Kumpulkan total pemotongan dan frekuensi pemotongan per loanId dari seluruh payslips
        const loanDeductionMap = new Map<string, { totalAmount: number; count: number }>();
        for (const payslip of payslips) {
            if (payslip.loanDetails && payslip.loanDetails.length > 0) {
                for (const loanDetail of payslip.loanDetails) {
                    const existing = loanDeductionMap.get(loanDetail.loanId) || { totalAmount: 0, count: 0 };
                    loanDeductionMap.set(loanDetail.loanId, {
                        totalAmount: existing.totalAmount + loanDetail.amount,
                        count: existing.count + 1,
                    });
                }
            }
        }

        // 1. READ PHASE: Ambil snapshot setiap dokumen pinjaman unik yang bersangkutan
        const loanSnaps = new Map<string, any>();
        for (const loanId of loanDeductionMap.keys()) {
            const loanRef = doc(firestore, "loans", loanId);
            const snap = await transaction.get(loanRef);
            loanSnaps.set(loanId, snap);
        }

        // 2. WRITE PHASE: Kembalikan saldo, status, cicilan, dan bersihkan riwayat payments per loanId
        const periodStr = payrollPeriod ? payrollPeriod.slice(0, 7) : '';

        for (const [loanId, { totalAmount, count }] of loanDeductionMap.entries()) {
            const loanSnap = loanSnaps.get(loanId);

            if (loanSnap && loanSnap.exists()) {
                const loanData = loanSnap.data() as Loan;
                const isKredit = loanData.type === 'kredit';

                // Kembalikan sisa saldo hutang (dibatasi agar tidak melebihi plafon pinjaman awal)
                const currentRemaining = loanData.remainingAmount ?? 0;
                const rawRestored = currentRemaining + totalAmount;
                const roundedRestored = Math.round(rawRestored * 100) / 100;
                const restoredRemaining = Math.min(loanData.amount, roundedRestored);

                // Kembalikan counter cicilan kredit sesuai sisa hutang yang dipulihkan
                const restoredPaidSoFar = Math.max(0, loanData.amount - restoredRemaining);
                const restoredPaidInstallments = loanData.installmentAmount && loanData.installmentAmount > 0
                    ? Math.min(loanData.totalInstallments ?? Infinity, Math.floor(restoredPaidSoFar / loanData.installmentAmount))
                    : 0;

                // Bersihkan riwayat pembayaran: buang entri 'payroll' terkait periode ini
                const existingPayments = loanData.payments ?? [];
                let removedCount = 0;

                // Urutkan dari belakang (paling baru) untuk menghapus transaksi pemotongan gaji periode ini
                let updatedPayments = [...existingPayments].reverse().filter((p) => {
                    if (removedCount < count && p.method === 'payroll') {
                        const descMatch = periodStr ? (p.description && p.description.includes(periodStr)) : true;
                        if (descMatch) {
                            removedCount++;
                            return false;
                        }
                    }
                    return true;
                }).reverse();

                // Jika deskripsi tidak memuat periodStr (misal dibuat dengan timestamp beda bulan),
                // fallback buang pembayaran payroll terakhir sebanyak selisih yang belum terhapus
                if (removedCount < count) {
                    let remainingToRemove = count - removedCount;
                    updatedPayments = [...updatedPayments].reverse().filter((p) => {
                        if (remainingToRemove > 0 && p.method === 'payroll') {
                            remainingToRemove--;
                            return false;
                        }
                        return true;
                    }).reverse();
                }

                const kreditUpdates = isKredit ? {
                    paidInstallments: restoredPaidInstallments,
                } : {};

                transaction.update(loanSnap.ref, {
                    remainingAmount: restoredRemaining,
                    status: 'active',
                    repaidAt: null,
                    payslipId: null,
                    payments: updatedPayments,
                    ...kreditUpdates,
                });
            }
        }

        // Kembalikan status payroll ke draft
        transaction.update(payrollRef, { status: "draft" });
    });
}

export async function storeRemainingSavings(
  firestore: Firestore,
  payslip: WithId<Payslip>,
  payrollId: string,
  payrollPeriod: string,
) {
  if (!payslip || payslip.remainingAmount <= 0.01) {
    throw new Error("Tidak ada sisa gaji untuk disimpan.");
  }

  const remainingToStore = Math.round(payslip.remainingAmount * 100) / 100;
  const savingsRef = doc(firestore, "savings", payslip.employeeId);
  const payslipRef = doc(firestore, "payrolls", payrollId, "payslips", payslip.id);
  const transactionRef = doc(collection(firestore, "savings-transactions"));

  await runTransaction(firestore, async (transaction) => {
    const savingsDoc = await transaction.get(savingsRef);
    const currentBalance = savingsDoc.exists() ? (savingsDoc.data().balance || 0) : 0;
    const newBalance = Math.round((currentBalance + remainingToStore) * 100) / 100;

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
      amount: remainingToStore,
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
    isLoading?: boolean;
}

export function StoreSavingsAlert({ isOpen, setIsOpen, onConfirm, payslip, isLoading }: StoreSavingsAlertProps) {
    if (!payslip) return null;

    return (
        <AlertDialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
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
                    <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            "Ya, Simpan ke Tabungan"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

"use client";

import { useState } from "react";
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
import type { Employee, AttendanceRecord, Payroll, Payslip, Sanction, PayslipSanctionDetail, AbsenceRecord } from "@/types";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
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
import { Copy } from "lucide-react";

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

    // Check if payroll for this period already exists
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

      // 2. Get attendance for the period
      const attendanceQuery = query(
        collection(firestore, "attendance"),
        where("clockIn", ">=", startDate.toISOString()),
        where("clockIn", "<=", endDate.toISOString())
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const attendanceRecords = attendanceSnap.docs.map((d) => ({
        ...(d.data() as AttendanceRecord),
        id: d.id,
      }));

      // 3. Get sanctions for the period
      const sanctionsQuery = query(
        collection(firestore, "sanctions"),
        where("date", ">=", startDateString),
        where("date", "<=", endDateString)
      );
      const sanctionsSnap = await getDocs(sanctionsQuery);
      const periodSanctions = sanctionsSnap.docs.map((d) => ({
        ...(d.data() as Sanction),
        id: d.id,
      }));

      // 4. Get absences for the period
      const absencesQuery = query(
        collection(firestore, "absences"),
        where("date", ">=", startDateString),
        where("date", "<=", endDateString)
      );
      const absencesSnap = await getDocs(absencesQuery);
      const periodAbsences = absencesSnap.docs.map((d) => d.data() as AbsenceRecord);


      // 5. Get settings
      const settingsRef = doc(firestore, "settings", "payroll");
      const settingsSnap = await getDoc(settingsRef);
      const settings = settingsSnap.exists() ? settingsSnap.data() : {};
      const LATE_DEDUCTION_AMOUNT = settings?.lateDeductionAmount ?? 10000;
      const DEDUCT_UNPAID_ABSENCE = settings?.deductUnpaidAbsence ?? false;

      // 6. Create Payroll document
      const newPayrollRef = doc(collection(firestore, "payrolls"));
      const newPayrollData: Payroll = {
        period: payrollPeriod,
        createdAt: new Date().toISOString(),
        status: "draft",
      };
      await setDoc(newPayrollRef, newPayrollData);

      // 7. Create Payslip for each employee
      for (const employee of activeEmployees) {
        // Calculate late deductions
        const employeeAttendance = attendanceRecords.filter(
          (r) => r.employeeId === employee.id
        );
        let lateCount = 0;
        employeeAttendance.forEach((record) => {
          const clockInTime = parseISO(record.clockIn);
          const lateTime = new Date(clockInTime);
          lateTime.setHours(7, 35, 0, 0);
          if (isAfter(clockInTime, lateTime)) {
            lateCount++;
          }
        });
        const lateDeduction = lateCount * LATE_DEDUCTION_AMOUNT;
        
        // Calculate sanction deductions
        const employeeSanctions = periodSanctions.filter(
          (s) => s.employeeId === employee.id
        );
        const sanctionCount = employeeSanctions.length;
        const sanctionDeduction = employeeSanctions.reduce(
            (total, s) => total + s.deduction,
            0
        );
        const sanctionDetails: PayslipSanctionDetail[] = employeeSanctions.map(s => ({
            violation: s.violation,
            date: s.date,
            deduction: s.deduction,
        }));

        // Calculate unpaid absence deduction
        let unpaidAbsenceCount = 0;
        let unpaidAbsenceDeduction = 0;
        if (DEDUCT_UNPAID_ABSENCE) {
            const employeeAbsences = periodAbsences.filter(
                (a) => a.employeeId === employee.id
            );
            unpaidAbsenceCount = employeeAbsences.length;
            const dailyWage = (employee.salary || 0) / daysInMonth;
            unpaidAbsenceDeduction = Math.round(unpaidAbsenceCount * dailyWage);
        }

        // Calculate net salary
        const netSalary = (employee.salary || 0) - lateDeduction - sanctionDeduction - unpaidAbsenceDeduction;

        const newPayslipData: Payslip = {
          employeeId: employee.id,
          employeeName: employee.name,
          baseSalary: employee.salary || 0,
          lateCount: lateCount,
          lateDeduction: lateDeduction,
          unpaidAbsenceCount: unpaidAbsenceCount,
          unpaidAbsenceDeduction: unpaidAbsenceDeduction,
          sanctionCount: sanctionCount,
          sanctionDeduction: sanctionDeduction,
          sanctions: sanctionDetails,
          netSalary: netSalary,
        };

        const newPayslipRef = doc(
          collection(firestore, "payrolls", newPayrollRef.id, "payslips")
        );
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
          <Button onClick={handleCreatePayroll} disabled={isLoading}>
            {isLoading ? "Memproses..." : "Buat Penggajian"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PayslipDetailDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    payslip: WithId<Payslip> | null;
    payrollId: string;
}

export function PayslipDetailDialog({ isOpen, setIsOpen, payslip, payrollId }: PayslipDetailDialogProps) {
    const [copied, setCopied] = useState(false);
    
    if (!payslip) return null;

    const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
    
    const payslipUrl = `${window.location.origin}/payslip/${payrollId}/${payslip.id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(payslipUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }

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

                    {(payslip.lateDeduction > 0 || payslip.sanctionDeduction > 0 || payslip.unpaidAbsenceDeduction > 0) && <hr />}

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
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface DeletePayrollAlertProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onConfirm: () => void;
    payrollPeriod?: string;
}

export function DeletePayrollAlert({ isOpen, setIsOpen, onConfirm, payrollPeriod }: DeletePayrollAlertProps) {
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
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus riwayat penggajian untuk
                        <strong> periode {payrollPeriod}</strong> dan semua data slip gaji terkait secara permanen.
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

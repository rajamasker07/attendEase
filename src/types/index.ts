export interface Employee {
  name: string;
  position: string;
  joinDate: string; // YYYY-MM-DD
  phone: string;
  salary: number;
  status: 'aktif' | 'tidak aktif';
}

export interface AttendanceRecord {
  employeeId: string;
  clockIn: string; // ISO String
  clockOut?: string; // ISO String
  notes?: string;
}

export interface AbsenceRecord {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: 'sakit' | 'izin' | 'alpa';
  notes?: string;
}

export interface Sanction {
  employeeId: string;
  date: string; // YYYY-MM-DD
  violation: string;
  description?: string;
  deduction: number;
}

export interface Bonus {
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: 'lembur' | 'penjualan' | 'tunjangan' | 'lainnya';
  amount: number;
  description?: string;
}

export interface Payroll {
  period: string; // YYYY-MM
  createdAt: string; // ISO String
  status: 'draft' | 'finalized';
}

export interface PayslipSanctionDetail {
  violation: string;
  date: string; // YYYY-MM-DD
  deduction: number;
}

export interface PayslipBonusDetail {
  type: 'lembur' | 'penjualan' | 'tunjangan' | 'lainnya';
  date: string; // YYYY-MM-DD
  amount: number;
  description?: string;
}

export interface Payslip {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  bonusTotal: number;
  bonuses: PayslipBonusDetail[];
  lateCount: number;
  lateDeduction: number;
  unpaidAbsenceCount: number;
  unpaidAbsenceDeduction: number;
  sanctionCount: number;
  sanctionDeduction: number;
  sanctions: PayslipSanctionDetail[];
  netSalary: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'lunas' | 'sebagian' | 'belum dibayar';
}

export interface Setting {
  lateDeductionAmount: number;
  alpaDeductionAmount?: number;
  deductUnpaidAbsence?: boolean;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  description: string;
}

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

export interface Sanction {
  employeeId: string;
  date: string; // YYYY-MM-DD
  violation: string;
  description?: string;
  deduction: number;
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

export interface Payslip {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  lateCount: number;
  lateDeduction: number;
  sanctionCount: number;
  sanctionDeduction: number;
  sanctions: PayslipSanctionDetail[];
  netSalary: number;
}

export interface Setting {
  lateDeductionAmount: number;
}

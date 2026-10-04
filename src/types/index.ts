
export interface PaymentAccount {
  provider: string;
  accountNumber: string;
  accountName: string;
}

export interface Employee {
  name: string;
  position: string;
  joinDate: string; // YYYY-MM-DD
  phone: string;
  salary: number;
  loanLimit?: number; // Optional loan limit, defaults to base salary
  status: 'aktif' | 'tidak aktif';
  paymentAccounts?: PaymentAccount[];
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

export interface LoanPayment {
  date: string; // ISO String
  amount: number;
  method: 'payroll' | 'manual';
  description: string;
}

export interface Loan {
  employeeId: string;
  date: string; // YYYY-MM-DD
  amount: number; // Original amount
  remainingAmount?: number; // Current unpaid balance
  description: string;
  status: 'active' | 'paid';
  repaidAt?: string; // ISO String - When the loan was fully settled
  payslipId?: string; // latest payslip that paid this loan
  payments?: LoanPayment[]; // Payment history
  // Kredit fields (optional - backward compatible with existing kasbon data)
  type?: 'kasbon' | 'kredit'; // defaults to 'kasbon' behavior if absent
  installmentAmount?: number;  // Fixed monthly deduction (kredit only)
  totalInstallments?: number;  // Agreed tenor in months (kredit only)
  paidInstallments?: number;   // Number of installments already paid (kredit only)
  skipPeriod?: string;         // Format "YYYY-MM" — skip deduction for this payroll period (kredit only)
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

export interface PayslipLoanDetail {
  loanId: string;
  amount: number; // Amount deducted in this specific payslip
  description: string;
  date: string;
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
  loanDeduction?: number;
  loanDetails?: PayslipLoanDetail[];
  netSalary: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'lunas' | 'sebagian' | 'belum dibayar';
}

export interface Setting {
  lateDeductionAmount: number;
  lateThresholdTime?: string; // e.g., "07:35"
  alpaDeductionAmount?: number;
  deductUnpaidAbsence?: boolean;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  description: string;
}

export interface Savings {
  employeeId: string;
  balance: number;
  lastUpdated: string; // ISO String
}

export interface SavingsTransaction {
  employeeId: string;
  date: string; // ISO String
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  sourcePayslipId?: string;
}

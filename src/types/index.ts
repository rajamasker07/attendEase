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

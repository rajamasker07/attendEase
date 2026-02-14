export interface Employee {
  name: string;
  position: string;
}

export interface AttendanceRecord {
  employeeId: string;
  clockIn: string; // ISO String
  clockOut?: string; // ISO String
}

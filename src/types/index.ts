export interface Employee {
  id: string;
  name: string;
  position: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  clockIn: string; // ISO String
  clockOut?: string; // ISO String
}

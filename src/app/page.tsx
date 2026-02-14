"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Employee, AttendanceRecord } from "@/lib/types";
import { format, isToday, parseISO } from "date-fns";
import { Clock as ClockIcon, LogIn, LogOut } from "lucide-react";
import { Clock } from "@/components/clock";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [employees] = useLocalStorage<Employee[]>("employees", []);
  const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>(
    "attendance",
    []
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { toast } = useToast();

  const todayAttendance = useMemo(() => {
    return attendance
      .filter((record) => isToday(parseISO(record.clockIn)))
      .sort((a, b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime());
  }, [attendance]);

  const currentEmployeeRecord = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return todayAttendance.find(
      (record) => record.employeeId === selectedEmployeeId && !record.clockOut
    );
  }, [selectedEmployeeId, todayAttendance]);
  
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);


  const handleClockIn = () => {
    if (!selectedEmployeeId) {
      toast({
        title: "Error",
        description: "Please select an employee first.",
        variant: "destructive",
      });
      return;
    }
    if (currentEmployeeRecord) {
      toast({
        title: "Error",
        description: "This employee is already clocked in.",
        variant: "destructive",
      });
      return;
    }

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      employeeId: selectedEmployeeId,
      clockIn: new Date().toISOString(),
    };

    setAttendance([...attendance, newRecord]);
    toast({
      title: "Success",
      description: `${selectedEmployee?.name} clocked in at ${format(new Date(), "p")}.`,
    });
  };

  const handleClockOut = () => {
    if (!selectedEmployeeId || !currentEmployeeRecord) {
      toast({
        title: "Error",
        description: "This employee is not clocked in.",
        variant: "destructive",
      });
      return;
    }

    const updatedAttendance = attendance.map((record) =>
      record.id === currentEmployeeRecord.id
        ? { ...record, clockOut: new Date().toISOString() }
        : record
    );

    setAttendance(updatedAttendance);
    toast({
      title: "Success",
      description: `${selectedEmployee?.name} clocked out at ${format(new Date(), "p")}.`,
    });
  };

  const getEmployeeName = (employeeId: string) => {
    return employees.find((e) => e.id === employeeId)?.name || "Unknown";
  };
  
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Clock in or out for an employee.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Clock />
            <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length > 0 ? (
                    employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">No employees found. Add one on the Employees page.</div>
                  )}
                </SelectContent>
              </Select>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button onClick={handleClockIn} disabled={!selectedEmployeeId || !!currentEmployeeRecord} className="w-full">
                  <LogIn className="mr-2 h-4 w-4" /> Clock In
                </Button>
                <Button onClick={handleClockOut} disabled={!selectedEmployeeId || !currentEmployeeRecord} variant="outline" className="w-full">
                  <LogOut className="mr-2 h-4 w-4" /> Clock Out
                </Button>
              </div>
            </div>
             {selectedEmployeeId && (
                <div className="pt-4 text-center text-sm text-muted-foreground">
                    {currentEmployeeRecord ? (
                        <span>
                            <strong>{selectedEmployee?.name}</strong> is currently clocked in since <strong>{format(parseISO(currentEmployeeRecord.clockIn), 'p')}</strong>.
                        </span>
                    ) : (
                        <span>
                            <strong>{selectedEmployee?.name}</strong> is currently clocked out.
                        </span>
                    )}
                </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Today's Activity</CardTitle>
            <CardDescription>
              A log of all attendance records for today.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="max-h-[300px] overflow-y-auto">
                {todayAttendance.length > 0 ? (
                    <ul className="space-y-3">
                        {todayAttendance.map((record) => (
                            <li key={record.id} className="flex items-center justify-between text-sm">
                                <div className="font-medium">{getEmployeeName(record.employeeId)}</div>
                                <div className="text-muted-foreground">
                                    {record.clockOut ? `In: ${format(parseISO(record.clockIn), 'p')} - Out: ${format(parseISO(record.clockOut), 'p')}` : `In: ${format(parseISO(record.clockIn), 'p')}`}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">No attendance records for today.</div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Full Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayAttendance.length > 0 ? (
                todayAttendance.map((record) => {
                  const employee = employees.find(e => e.id === record.employeeId);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{employee?.name || 'Unknown'}</TableCell>
                      <TableCell>{employee?.position || 'N/A'}</TableCell>
                      <TableCell>{format(parseISO(record.clockIn), "p")}</TableCell>
                      <TableCell>{record.clockOut ? format(parseISO(record.clockOut), "p") : " - "}</TableCell>
                      <TableCell>
                        {record.clockOut ? (
                           <Badge variant="secondary">Clocked Out</Badge>
                        ) : (
                          <Badge>Clocked In</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No attendance records for today.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

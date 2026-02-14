"use client";

import { useState, useMemo, useEffect } from "react";
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
import { format, isToday, parseISO, subDays, isAfter } from "date-fns";
import { Calendar as CalendarIcon, LogIn, LogOut } from "lucide-react";
import { Clock } from "@/components/clock";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [employees] = useLocalStorage<Employee[]>("employees", []);
  const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>(
    "attendance",
    []
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { toast } = useToast();
  const [manualDate, setManualDate] = useState<Date | undefined>(new Date());
  const [manualTime, setManualTime] = useState<string>(format(new Date(), "HH:mm"));
  const [historyFilter, setHistoryFilter] = useState<string>("7");

  useEffect(() => {
    setIsClient(true);
  }, []);

  const todayAttendance = useMemo(() => {
    if (!isClient) return [];
    return attendance
      .filter((record) => isToday(parseISO(record.clockIn)))
      .sort((a, b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime());
  }, [attendance, isClient]);

  const historyAttendance = useMemo(() => {
    if (!isClient) return [];
    
    if (historyFilter === 'all') {
        return attendance.sort((a, b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime());
    }

    const days = parseInt(historyFilter, 10);
    const filterDate = subDays(new Date(), days);
    
    return attendance
        .filter(record => isAfter(parseISO(record.clockIn), filterDate))
        .sort((a, b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime());
  }, [attendance, historyFilter, isClient]);

  const currentEmployeeRecord = useMemo(() => {
    if (!selectedEmployeeId || !isClient) return null;
    return todayAttendance.find(
      (record) => record.employeeId === selectedEmployeeId && !record.clockOut
    );
  }, [selectedEmployeeId, todayAttendance, isClient]);
  
  const selectedEmployee = useMemo(() => {
    if (!isClient) return undefined;
    return employees.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId, isClient]);

  const getManualDateTime = () => {
    if (!manualDate || !manualTime) return new Date();
    const [hours, minutes] = manualTime.split(':').map(Number);
    const newDate = new Date(manualDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  }

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

    const clockInTime = getManualDateTime();

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      employeeId: selectedEmployeeId,
      clockIn: clockInTime.toISOString(),
    };

    setAttendance([...attendance, newRecord]);
    toast({
      title: "Success",
      description: `${selectedEmployee?.name} clocked in at ${format(clockInTime, "p")}.`,
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

    const clockOutTime = getManualDateTime();
    const clockInDate = parseISO(currentEmployeeRecord.clockIn);

    if (clockOutTime < clockInDate) {
        toast({
            title: "Error",
            description: "Clock out time cannot be earlier than clock in time.",
            variant: "destructive",
        });
        return;
    }

    const updatedAttendance = attendance.map((record) =>
      record.id === currentEmployeeRecord.id
        ? { ...record, clockOut: clockOutTime.toISOString() }
        : record
    );

    setAttendance(updatedAttendance);
    toast({
      title: "Success",
      description: `${selectedEmployee?.name} clocked out at ${format(clockOutTime, "p")}.`,
    });
  };

  const getEmployeeName = (employeeId: string) => {
    if (!isClient) return "Unknown";
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
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="employee-select">Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={!isClient}>
                  <SelectTrigger id="employee-select" className="w-full">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {!isClient ? (
                      <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                    ) : employees.length > 0 ? (
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
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="attendance-date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="attendance-date"
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                        disabled={!isClient}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {manualDate ? format(manualDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={manualDate}
                        onSelect={setManualDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance-time">Time</Label>
                  <Input
                    id="attendance-time"
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full"
                    disabled={!isClient}
                  />
                </div>
              </div>

              <div className="flex w-full gap-2">
                <Button onClick={handleClockIn} disabled={!isClient || !selectedEmployeeId || !!currentEmployeeRecord} className="w-full">
                  <LogIn className="mr-2 h-4 w-4" /> Clock In
                </Button>
                <Button onClick={handleClockOut} disabled={!isClient || !selectedEmployeeId || !currentEmployeeRecord} variant="outline" className="w-full">
                  <LogOut className="mr-2 h-4 w-4" /> Clock Out
                </Button>
              </div>

              {isClient && selectedEmployeeId && (
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
            </div>
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
                {!isClient ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
                ) : todayAttendance.length > 0 ? (
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
              {!isClient ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : todayAttendance.length > 0 ? (
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
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>History Activity</CardTitle>
                <CardDescription>View historical attendance records.</CardDescription>
            </div>
            <Select value={historyFilter} onValueChange={setHistoryFilter} disabled={!isClient}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="3">Last 3 days</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
            </Select>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!isClient ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                            Loading...
                            </TableCell>
                        </TableRow>
                    ) : historyAttendance.length > 0 ? (
                    historyAttendance.map((record) => {
                        const employee = employees.find(e => e.id === record.employeeId);
                        return (
                        <TableRow key={record.id}>
                            <TableCell className="font-medium">{employee?.name || 'Unknown'}</TableCell>
                            <TableCell>{format(parseISO(record.clockIn), "MMM d, yyyy")}</TableCell>
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
                        No records found for the selected period.
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

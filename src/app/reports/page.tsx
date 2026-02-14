"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Employee, AttendanceRecord } from "@/lib/types";
import { format, differenceInHours, parseISO, isWithinInterval } from "date-fns";
import type { DateRange } from "react-day-picker";

export default function ReportsPage() {
  const [employees] = useLocalStorage<Employee[]>("employees", []);
  const [attendance] = useLocalStorage<AttendanceRecord[]>("attendance", []);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();

  const getEmployeeName = (employeeId: string) => {
    return employees.find((e) => e.id === employeeId)?.name || "Unknown";
  };

  const filteredAttendance = useMemo(() => {
    let filtered = attendance;

    if (selectedEmployeeId !== "all") {
      filtered = filtered.filter(
        (record) => record.employeeId === selectedEmployeeId
      );
    }
    
    if (date?.from && date?.to) {
        filtered = filtered.filter(record => 
            isWithinInterval(parseISO(record.clockIn), { start: date.from!, end: date.to! })
        );
    } else if (date?.from) {
        filtered = filtered.filter(record => 
            format(parseISO(record.clockIn), 'yyyy-MM-dd') === format(date.from!, 'yyyy-MM-dd')
        );
    }


    return filtered.sort((a,b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime());
  }, [attendance, selectedEmployeeId, date]);

  const calculateDuration = (clockIn: string, clockOut?: string): string => {
    if (!clockOut) return "-";
    const hours = differenceInHours(parseISO(clockOut), parseISO(clockIn));
    return `${hours} hour(s)`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Report</CardTitle>
        <CardDescription>
          View and filter attendance records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className="w-full justify-start text-left font-normal sm:w-[300px]"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={() => { setDate(undefined); setSelectedEmployeeId("all")}}>Clear Filters</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length > 0 ? (
                filteredAttendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {getEmployeeName(record.employeeId)}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(record.clockIn), "MMMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(record.clockIn), "p")}
                    </TableCell>
                    <TableCell>
                      {record.clockOut ? format(parseISO(record.clockOut), "p") : "-"}
                    </TableCell>
                    <TableCell>
                      {calculateDuration(record.clockIn, record.clockOut)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No results found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

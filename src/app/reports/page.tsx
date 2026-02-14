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
import { format, differenceInMinutes, parseISO, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

export default function ReportsPage() {
  const [employees] = useLocalStorage<Employee[]>("employees", []);
  const [attendance] = useLocalStorage<AttendanceRecord[]>("attendance", []);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();

  const getEmployeeName = (employeeId: string) => {
    return employees.find((e) => e.id === employeeId)?.name || "Tidak diketahui";
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
    const minutes = differenceInMinutes(parseISO(clockOut), parseISO(clockIn));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} jam ${remainingMinutes} menit`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Kehadiran</CardTitle>
        <CardDescription>
          Lihat dan saring catatan kehadiran.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Pilih seorang karyawan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Karyawan</SelectItem>
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
                      {format(date.from, "LLL dd, y", { locale: id })} -{" "}
                      {format(date.to, "LLL dd, y", { locale: id })}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y", { locale: id })
                  )
                ) : (
                  <span>Pilih rentang tanggal</span>
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
                locale={id}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={() => { setDate(undefined); setSelectedEmployeeId("all")}}>Hapus Filter</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead>Pulang</TableHead>
                <TableHead>Durasi</TableHead>
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
                      {format(parseISO(record.clockIn), "MMMM d, yyyy", { locale: id })}
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
                    Tidak ada hasil ditemukan untuk filter yang dipilih.
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

"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Employee, AttendanceRecord } from "@/lib/types";
import { format, differenceInMinutes, parseISO, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export default function ReportsPage() {
  const [isClient, setIsClient] = useState(false);
  const [employees] = useLocalStorage<Employee[]>("employees", []);
  const [attendance] = useLocalStorage<AttendanceRecord[]>("attendance", []);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredAttendance = useMemo(() => {
    if (!isClient) return [];
    let filtered = attendance.filter(record => record.clockOut); // Only include completed records

    if (selectedEmployeeId !== "all") {
      filtered = filtered.filter(
        (record) => record.employeeId === selectedEmployeeId
      );
    }
    
    if (date?.from && date?.to) {
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999); // Include the whole end day
        filtered = filtered.filter(record => 
            isWithinInterval(parseISO(record.clockIn), { start: date.from!, end: toDate })
        );
    } else if (date?.from) {
        filtered = filtered.filter(record => 
            format(parseISO(record.clockIn), 'yyyy-MM-dd') === format(date.from!, 'yyyy-MM-dd')
        );
    }

    return filtered.sort((a,b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime());
  }, [attendance, selectedEmployeeId, date, isClient]);

  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes < 0) totalMinutes = 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} jam ${minutes} menit`;
  };

  const reportData = useMemo(() => {
    if (!isClient || !filteredAttendance.length) return [];

    const employeeDataMap = new Map<string, { employee: Employee; records: AttendanceRecord[]; totalMinutes: number }>();

    filteredAttendance.forEach(record => {
        const employee = employees.find(e => e.id === record.employeeId);
        if (!employee) return;

        if (!employeeDataMap.has(employee.id)) {
            employeeDataMap.set(employee.id, {
                employee,
                records: [],
                totalMinutes: 0
            });
        }

        const data = employeeDataMap.get(employee.id)!;
        data.records.push(record);
        if (record.clockOut) {
            data.totalMinutes += differenceInMinutes(parseISO(record.clockOut), parseISO(record.clockIn));
        }
    });

    return Array.from(employeeDataMap.values()).sort((a,b) => b.totalMinutes - a.totalMinutes);
  }, [filteredAttendance, employees, isClient]);

  const chartData = useMemo(() => {
    return reportData.map(data => ({
        name: data.employee.name.split(" ")[0], // Use first name for brevity
        fullName: data.employee.name,
        totalHours: parseFloat((data.totalMinutes / 60).toFixed(1)),
    }));
  }, [reportData]);

  const chartConfig = {
    totalHours: {
        label: "Total Jam Kerja",
        color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const calculateDuration = (clockIn: string, clockOut?: string): string => {
    if (!clockOut) return "-";
    const minutes = differenceInMinutes(parseISO(clockOut), parseISO(clockIn));
    return formatDuration(minutes);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>
            Saring catatan kehadiran berdasarkan karyawan dan rentang tanggal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={!isClient}>
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
                  disabled={!isClient}
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
            <Button onClick={() => { setDate(undefined); setSelectedEmployeeId("all")}} disabled={!isClient}>Hapus Filter</Button>
          </div>
        </CardContent>
      </Card>
      
      {!isClient ? (
        <Card>
          <CardHeader><CardTitle>Memuat Laporan...</CardTitle></CardHeader>
          <CardContent className="h-96 flex items-center justify-center">
            <div className="text-center text-muted-foreground">Memuat data...</div>
          </CardContent>
        </Card>
      ) : reportData.length > 0 ? (
        <>
          <Card>
            <CardHeader>
                <CardTitle>Total Jam Kerja Karyawan</CardTitle>
                <CardDescription>Visualisasi total jam kerja untuk periode yang dipilih.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <YAxis />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                labelFormatter={(_, payload) => payload?.[0]?.payload.fullName}
                                formatter={(value) => `${value} jam`} 
                            />}
                        />
                        <Bar dataKey="totalHours" fill="var(--color-totalHours)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
          </Card>
          
          <Accordion type="multiple" className="w-full space-y-4">
            {reportData.map(({ employee, records, totalMinutes }) => (
                <Card key={employee.id} className="overflow-hidden">
                    <AccordionItem value={employee.id} className="border-none">
                        <AccordionTrigger className="p-6 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/50">
                            <div className="flex w-full items-center justify-between">
                                <div className="text-left">
                                    <h3 className="text-lg font-semibold">{employee.name}</h3>
                                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                                </div>
                                <div className="text-right flex items-center gap-2 text-primary">
                                    <Clock className="h-5 w-5" />
                                    <span className="text-lg font-bold">{formatDuration(totalMinutes)}</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="px-6 pb-6 pt-0">
                             <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Masuk</TableHead>
                                    <TableHead>Pulang</TableHead>
                                    <TableHead className="text-right">Durasi</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {records.map((record) => (
                                    <TableRow key={record.id}>
                                    <TableCell>
                                        {format(parseISO(record.clockIn), "MMMM d, yyyy", { locale: id })}
                                    </TableCell>
                                    <TableCell>
                                        {format(parseISO(record.clockIn), "p")}
                                    </TableCell>
                                    <TableCell>
                                        {record.clockOut ? format(parseISO(record.clockOut), "p") : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {calculateDuration(record.clockIn, record.clockOut)}
                                    </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            ))}
          </Accordion>
        </>
      ) : (
        <Card>
            <CardHeader><CardTitle>Tidak Ada Data</CardTitle></CardHeader>
            <CardContent>
                <div className="h-48 flex items-center justify-center">
                    <p className="text-center text-muted-foreground">Tidak ada hasil ditemukan untuk filter yang dipilih.</p>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Employee, AttendanceRecord } from "@/types";
import { format, differenceInMinutes, parseISO, isWithinInterval, isAfter } from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useCollection, useFirebase, useMemoFirebase, WithId } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const { firestore } = useFirebase();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();

  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);

  const activeEmployees = useMemo(() => {
    return employees?.filter(e => e.status !== 'tidak aktif');
  }, [employees]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, "attendance"), where("clockOut", "!=", null));
    
    if (selectedEmployeeId !== "all") {
        q = query(q, where("employeeId", "==", selectedEmployeeId));
    }
    
    if (date?.from) {
        const startDate = date.from;
        const endDate = date.to ? new Date(date.to) : new Date(startDate);
        endDate.setHours(23, 59, 59, 999); // Include the whole end day

        q = query(q, where("clockIn", ">=", startDate.toISOString()), where("clockIn", "<=", endDate.toISOString()));
    }
    
    return q;
  }, [firestore, selectedEmployeeId, date]);

  const { data: attendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes < 0) totalMinutes = 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}j ${minutes}m`;
  };

  const reportData = useMemo(() => {
    if (!attendance || !employees) return [];

    const employeeDataMap = new Map<string, { 
        employee: WithId<Employee>; 
        records: (WithId<AttendanceRecord> & {isLate: boolean})[]; 
        totalMinutes: number;
        totalLateMinutes: number;
        lateCount: number;
    }>();

    attendance.forEach(record => {
        const employee = employees.find(e => e.id === record.employeeId);
        if (!employee) return;

        if (!employeeDataMap.has(employee.id)) {
            employeeDataMap.set(employee.id, {
                employee,
                records: [],
                totalMinutes: 0,
                totalLateMinutes: 0,
                lateCount: 0,
            });
        }

        const data = employeeDataMap.get(employee.id)!;

        const clockInTime = parseISO(record.clockIn);
        const lateTime = new Date(clockInTime);
        lateTime.setHours(7, 35, 0, 0); // 07:35 threshold
        
        const isRecordLate = isAfter(clockInTime, lateTime);
        
        if (isRecordLate) {
            data.lateCount += 1;
            const lateMinutes = differenceInMinutes(clockInTime, lateTime);
            if (lateMinutes > 0) {
              data.totalLateMinutes += lateMinutes;
            }
        }

        data.records.push({...record, isLate: isRecordLate});

        if (record.clockOut) {
            data.totalMinutes += differenceInMinutes(parseISO(record.clockOut), clockInTime);
        }
    });

    return Array.from(employeeDataMap.values()).sort((a,b) => b.totalMinutes - a.totalMinutes);
  }, [attendance, employees]);

  const chartData = useMemo(() => {
    return reportData.map(data => ({
        name: data.employee.name.split(" ")[0], // Use first name for brevity
        fullName: data.employee.name,
        totalHours: parseFloat((data.totalMinutes / 60).toFixed(1)),
    })).filter(item => item.totalHours > 0);
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
  
  const isLoading = isLoadingEmployees || isLoadingAttendance;
  
  if (isLoading && !attendance) {
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
                        <Select disabled={true}>
                            <SelectTrigger className="w-full sm:w-[280px]">
                                <SelectValue placeholder="Pilih seorang karyawan" />
                            </SelectTrigger>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className="w-full justify-start text-left font-normal sm:w-[300px]"
                                    disabled={true}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span>Pilih rentang tanggal</span>
                                </Button>
                            </PopoverTrigger>
                        </Popover>
                        <Button disabled={true}>Hapus Filter</Button>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Memuat Laporan...</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </CardContent>
            </Card>
        </div>
    );
  }

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
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Pilih seorang karyawan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Karyawan</SelectItem>
                {activeEmployees?.map((employee) => (
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
                  disabled={isLoading}
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
            <Button onClick={() => { setDate(undefined); setSelectedEmployeeId("all")}} disabled={isLoading}>Hapus Filter</Button>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
         <Card>
            <CardHeader><CardTitle>Memuat Laporan...</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
        </Card>
      ) : reportData.length > 0 ? (
        <>
          {chartData.length > 0 && (
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
          )}
          
          <Accordion type="multiple" className="w-full space-y-4">
            {reportData.map(({ employee, records, totalMinutes, totalLateMinutes, lateCount }) => (
                <Card key={employee.id} className="overflow-hidden">
                    <AccordionItem value={employee.id} className="border-none">
                        <AccordionTrigger className="p-6 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/50">
                            <div className="flex w-full items-center justify-between">
                                <div className="text-left">
                                    <h3 className="text-lg font-semibold">{employee.name}</h3>
                                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                                </div>
                                <div className="flex items-center gap-6 text-right">
                                    {totalLateMinutes > 0 && (
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-destructive">{formatDuration(totalLateMinutes)}</div>
                                            <div className="text-xs text-destructive/80">({lateCount}x) Terlambat</div>
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-primary">{formatDuration(totalMinutes)}</div>
                                        <div className="text-xs text-muted-foreground">Total Jam Kerja</div>
                                    </div>
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
                                    <TableHead>Catatan</TableHead>
                                    <TableHead className="text-right">Durasi</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {records.map((record) => (
                                    <TableRow key={record.id} className={record.isLate ? "bg-destructive/10" : ""}>
                                    <TableCell>
                                        {format(parseISO(record.clockIn), "MMMM d, yyyy", { locale: id })}
                                    </TableCell>
                                    <TableCell>
                                        {format(parseISO(record.clockIn), "p")}
                                    </TableCell>
                                    <TableCell>
                                        {record.clockOut ? format(parseISO(record.clockOut), "p") : "-"}
                                    </TableCell>
                                    <TableCell>{record.notes || "-"}</TableCell>
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

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
import { Calendar } from "@/components/ui/calendar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Employee, AttendanceRecord, AbsenceRecord } from "@/types";
import { format, differenceInMinutes, parseISO, isAfter } from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useCollection, useFirebase, useMemoFirebase, WithId } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { firestore } = useFirebase();

  const [date, setDate] = useState<DateRange | undefined>();

  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, "attendance"), where("clockOut", "!=", null));
    
    if (date?.from) {
        const startDate = date.from;
        const endDate = date.to ? new Date(date.to) : new Date(startDate);
        endDate.setHours(23, 59, 59, 999);

        q = query(q, where("clockIn", ">=", startDate.toISOString()), where("clockIn", "<=", endDate.toISOString()));
    }
    
    return q;
  }, [firestore, date]);

  const { data: attendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

  const absenceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, "absences"));
    
    if (date?.from) {
        const startDate = date.from;
        const endDate = date.to ? new Date(date.to) : new Date(startDate);
        endDate.setHours(23, 59, 59, 999);

        q = query(q, 
            where("date", ">=", format(startDate, "yyyy-MM-dd")), 
            where("date", "<=", format(endDate, "yyyy-MM-dd"))
        );
    }
    
    return q;
  }, [firestore, date]);

  const { data: absences, isLoading: isLoadingAbsences } = useCollection<AbsenceRecord>(absenceQuery);
  
  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes < 0) totalMinutes = 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}j ${minutes}m`;
  };

  const reportData = useMemo(() => {
    if (!employees) return [];

    const employeeDataMap = new Map<string, { 
        employee: WithId<Employee>; 
        records: (WithId<AttendanceRecord> & {isLate: boolean})[]; 
        absenceRecords: WithId<AbsenceRecord>[];
        totalMinutes: number;
        totalLateMinutes: number;
        lateCount: number;
        sakitCount: number;
        izinCount: number;
        alpaCount: number;
    }>();

    employees.forEach(employee => {
        employeeDataMap.set(employee.id, {
            employee,
            records: [],
            absenceRecords: [],
            totalMinutes: 0,
            totalLateMinutes: 0,
            lateCount: 0,
            sakitCount: 0,
            izinCount: 0,
            alpaCount: 0,
        });
    });
    
    attendance?.forEach(record => {
        if (!employeeDataMap.has(record.employeeId)) return;

        const data = employeeDataMap.get(record.employeeId)!;

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

    absences?.forEach(record => {
        if (!employeeDataMap.has(record.employeeId)) return;
        const data = employeeDataMap.get(record.employeeId)!;
        data.absenceRecords.push(record);
        if (record.status === 'sakit') data.sakitCount++;
        if (record.status === 'izin') data.izinCount++;
        if (record.status === 'alpa') data.alpaCount++;
    });

    return Array.from(employeeDataMap.values())
      .filter(d => d.records.length > 0 || d.absenceRecords.length > 0)
      .sort((a,b) => b.totalMinutes - a.totalMinutes);
  }, [attendance, employees, absences]);

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

  const getAbsenceStatusBadge = (status: AbsenceRecord['status']) => {
    switch (status) {
        case 'sakit': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 capitalize">Sakit</Badge>;
        case 'izin': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 capitalize">Izin</Badge>;
        case 'alpa': return <Badge variant="destructive" className="capitalize">Alpa</Badge>;
    }
  }
  
  const isLoading = isLoadingEmployees || isLoadingAttendance || isLoadingAbsences;
  
  if (isLoading && !attendance) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Filter Laporan</CardTitle>
                    <CardDescription>
                        Saring catatan kehadiran berdasarkan rentang tanggal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row">
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
            Saring catatan kehadiran berdasarkan rentang tanggal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
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
            <Button onClick={() => { setDate(undefined); }} disabled={isLoading || !date}>Hapus Filter</Button>
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
            {reportData.map(({ employee, records, totalMinutes, totalLateMinutes, lateCount, sakitCount, izinCount, alpaCount, absenceRecords }) => (
                <Card key={employee.id} className="overflow-hidden">
                    <AccordionItem value={employee.id} className="border-none">
                        <AccordionTrigger className="p-6 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/50">
                            <div className="flex w-full items-center justify-between">
                                <div className="text-left">
                                    <h3 className="text-lg font-semibold">{employee.name}</h3>
                                    <p className="text-sm text-muted-foreground capitalize">{employee.position}</p>
                                </div>
                                <div className="grid grid-flow-col gap-4 text-right">
                                    {sakitCount > 0 && (
                                        <div className="text-center">
                                            <div className="text-lg font-bold">{sakitCount}</div>
                                            <div className="text-xs text-muted-foreground">Sakit</div>
                                        </div>
                                    )}
                                    {izinCount > 0 && (
                                        <div className="text-center">
                                            <div className="text-lg font-bold">{izinCount}</div>
                                            <div className="text-xs text-muted-foreground">Izin</div>
                                        </div>
                                    )}
                                    {alpaCount > 0 && (
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-destructive">{alpaCount}</div>
                                            <div className="text-xs text-destructive/80">Alpa</div>
                                        </div>
                                    )}
                                    {lateCount > 0 && (
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-destructive">{formatDuration(totalLateMinutes)}</div>
                                            <div className="text-xs text-destructive/80">{lateCount}x Terlambat</div>
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-primary">{formatDuration(totalMinutes)}</div>
                                        <div className="text-xs text-muted-foreground">Total Jam</div>
                                    </div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="px-6 pb-6 pt-0 space-y-6">
                            {records.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2 text-sm">Catatan Kehadiran</h4>
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
                            )}
                            {absenceRecords.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2 text-sm">Catatan Ketidakhadiran</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tanggal</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Catatan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {absenceRecords.map((record) => (
                                                <TableRow key={record.id} className="bg-muted/50">
                                                    <TableCell>{format(parseISO(record.date), "MMMM d, yyyy", { locale: id })}</TableCell>
                                                    <TableCell>{getAbsenceStatusBadge(record.status)}</TableCell>
                                                    <TableCell>{record.notes || "-"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
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
                    <p className="text-center text-muted-foreground">
                        {date?.from ? "Tidak ada hasil ditemukan untuk rentang tanggal yang dipilih." : "Pilih rentang tanggal untuk melihat laporan."}
                    </p>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

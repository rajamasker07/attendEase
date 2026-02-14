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
import type { Employee, AttendanceRecord } from "@/types";
import { format, isToday, parseISO, subDays, isAfter } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, LogIn, LogOut } from "lucide-react";
import { Clock } from "@/components/clock";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCollection, useFirebase, WithId, addDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const { firestore } = useFirebase();
  
  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);
  
  const attendanceCollection = useMemoFirebase(() => firestore ? collection(firestore, "attendance") : null, [firestore]);
  const { data: attendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceCollection);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { toast } = useToast();
  const [manualDate, setManualDate] = useState<Date | undefined>();
  const [manualTime, setManualTime] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("7");
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState<string>("all");

  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setManualDate(now);
    setManualTime(format(now, "HH:mm"));
  }, []);

  const todayAttendance = useMemo(() => {
    if (!attendance) return [];
    return attendance
      .filter((record) => isToday(parseISO(record.clockIn)))
      .sort((a, b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime());
  }, [attendance]);

  const historyAttendance = useMemo(() => {
    if (!attendance) return [];

    let filteredRecords = attendance;

    if (historyEmployeeFilter !== "all") {
      filteredRecords = filteredRecords.filter(
        (record) => record.employeeId === historyEmployeeFilter
      );
    }

    if (historyFilter !== 'all') {
        const days = parseInt(historyFilter, 10);
        const filterDate = subDays(new Date(), days);
        filteredRecords = filteredRecords.filter(record => isAfter(parseISO(record.clockIn), filterDate));
    }
    
    return filteredRecords.sort((a, b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime());
  }, [attendance, historyFilter, historyEmployeeFilter]);

  const currentEmployeeRecord = useMemo(() => {
    if (!selectedEmployeeId || !todayAttendance) return null;
    return todayAttendance.find(
      (record) => record.employeeId === selectedEmployeeId && !record.clockOut
    );
  }, [selectedEmployeeId, todayAttendance]);
  
  const selectedEmployee = useMemo(() => {
    return employees?.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

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
    if (!firestore || !selectedEmployeeId) {
      toast({
        title: "Error",
        description: "Silakan pilih karyawan terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    if (currentEmployeeRecord) {
      toast({
        title: "Error",
        description: "Karyawan ini sudah absen masuk.",
        variant: "destructive",
      });
      return;
    }

    const clockInTime = getManualDateTime();

    const newRecord: AttendanceRecord = {
      employeeId: selectedEmployeeId,
      clockIn: clockInTime.toISOString(),
    };
    
    addDocumentNonBlocking(collection(firestore, "attendance"), newRecord);

    toast({
      title: "Berhasil",
      description: `${selectedEmployee?.name} absen masuk pada ${format(clockInTime, "p")}.`,
    });
  };

  const handleClockOut = () => {
    if (!firestore || !selectedEmployeeId || !currentEmployeeRecord) {
      toast({
        title: "Error",
        description: "Karyawan ini belum absen masuk.",
        variant: "destructive",
      });
      return;
    }

    const clockOutTime = getManualDateTime();
    const clockInDate = parseISO(currentEmployeeRecord.clockIn);

    if (clockOutTime < clockInDate) {
        toast({
            title: "Error",
            description: "Waktu absen pulang tidak boleh lebih awal dari waktu absen masuk.",
            variant: "destructive",
        });
        return;
    }
    
    const docRef = doc(firestore, "attendance", currentEmployeeRecord.id);
    setDocumentNonBlocking(docRef, { clockOut: clockOutTime.toISOString() }, { merge: true });

    toast({
      title: "Berhasil",
      description: `${selectedEmployee?.name} absen pulang pada ${format(clockOutTime, "p")}.`,
    });
  };

  const getEmployeeName = (employeeId: string) => {
    return employees?.find((e) => e.id === employeeId)?.name || "Tidak diketahui";
  };
  
  const isLoading = isLoadingEmployees || isLoadingAttendance;
  
  if (!isClient || isLoading) {
    return <div className="flex h-full items-center justify-center"><p>Memuat data...</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Absensi</CardTitle>
            <CardDescription>Catat waktu masuk atau pulang karyawan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Clock />
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="employee-select">Karyawan</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger id="employee-select" className="w-full">
                    <SelectValue placeholder="Pilih seorang karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees && employees.length > 0 ? (
                      employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">Tidak ada karyawan ditemukan. Tambahkan di halaman Karyawan.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="attendance-date">Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="attendance-date"
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {manualDate ? format(manualDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={manualDate}
                        onSelect={setManualDate}
                        initialFocus
                        locale={id}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance-time">Waktu</Label>
                  <Input
                    id="attendance-time"
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex w-full gap-2">
                <Button onClick={handleClockIn} disabled={!selectedEmployeeId || !!currentEmployeeRecord} className="w-full">
                  <LogIn className="mr-2 h-4 w-4" /> Absen Masuk
                </Button>
                <Button onClick={handleClockOut} disabled={!selectedEmployeeId || !currentEmployeeRecord} variant="outline" className="w-full">
                  <LogOut className="mr-2 h-4 w-4" /> Absen Pulang
                </Button>
              </div>

              {selectedEmployeeId && (
                <div className="pt-4 text-center text-sm text-muted-foreground">
                    {currentEmployeeRecord ? (
                        <span>
                            <strong>{selectedEmployee?.name}</strong> saat ini sudah absen masuk sejak <strong>{format(parseISO(currentEmployeeRecord.clockIn), 'p')}</strong>.
                        </span>
                    ) : (
                        <span>
                            <strong>{selectedEmployee?.name}</strong> saat ini sedang tidak di tempat.
                        </span>
                    )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Hari Ini</CardTitle>
            <CardDescription>
              Catatan semua absensi untuk hari ini.
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
                                    {record.clockOut ? `Masuk: ${format(parseISO(record.clockIn), 'p')} - Pulang: ${format(parseISO(record.clockOut), 'p')}` : `Masuk: ${format(parseISO(record.clockIn), 'p')}`}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">Tidak ada catatan absensi untuk hari ini.</div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Lengkap Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead>Pulang</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayAttendance.length > 0 ? (
                todayAttendance.map((record) => {
                  const employee = employees?.find(e => e.id === record.employeeId);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{employee?.name || 'Tidak diketahui'}</TableCell>
                      <TableCell>{employee?.position || 'N/A'}</TableCell>
                      <TableCell>{format(parseISO(record.clockIn), "p")}</TableCell>
                      <TableCell>{record.clockOut ? format(parseISO(record.clockOut), "p") : " - "}</TableCell>
                      <TableCell>
                        {record.clockOut ? (
                           <Badge variant="secondary">Sudah Pulang</Badge>
                        ) : (
                          <Badge>Sudah Masuk</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Tidak ada catatan absensi untuk hari ini.
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
                <CardTitle>Riwayat Aktivitas</CardTitle>
                <CardDescription>Lihat riwayat catatan absensi.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={historyEmployeeFilter} onValueChange={setHistoryEmployeeFilter}>
                  <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter berdasarkan karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Semua Karyawan</SelectItem>
                      {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Select value={historyFilter} onValueChange={setHistoryFilter}>
                  <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter berdasarkan periode" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="3">3 hari terakhir</SelectItem>
                      <SelectItem value="7">7 hari terakhir</SelectItem>
                      <SelectItem value="30">30 hari terakhir</SelectItem>
                      <SelectItem value="all">Semua Waktu</SelectItem>
                  </SelectContent>
              </Select>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Masuk</TableHead>
                    <TableHead>Pulang</TableHead>
                    <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {historyAttendance.length > 0 ? (
                    historyAttendance.map((record) => {
                        const employee = employees?.find(e => e.id === record.employeeId);
                        return (
                        <TableRow key={record.id}>
                            <TableCell className="font-medium">{employee?.name || 'Tidak diketahui'}</TableCell>
                            <TableCell>{format(parseISO(record.clockIn), "MMM d, yyyy", { locale: id })}</TableCell>
                            <TableCell>{format(parseISO(record.clockIn), "p")}</TableCell>
                            <TableCell>{record.clockOut ? format(parseISO(record.clockOut), "p") : " - "}</TableCell>
                            <TableCell>
                            {record.clockOut ? (
                                <Badge variant="secondary">Sudah Pulang</Badge>
                            ) : (
                                <Badge>Sudah Masuk</Badge>
                            )}
                            </TableCell>
                        </TableRow>
                        );
                    })
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                        Tidak ada catatan ditemukan untuk periode yang dipilih.
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

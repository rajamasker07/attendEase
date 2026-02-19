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
import { format, isSameDay, parseISO, subDays, isAfter, startOfDay, endOfDay } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, LogIn, LogOut, PlusCircle } from "lucide-react";
import { Clock } from "@/components/clock";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCollection, useFirebase, WithId, addDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeFormDialog, type EmployeeFormData } from "@/app/employees/employee-actions";

export default function DashboardPage() {
  const { firestore } = useFirebase();
  
  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { toast } = useToast();
  const [manualDate, setManualDate] = useState<Date | undefined>();
  const [manualTime, setManualTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("7");
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState<string>("all");
  
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);


  useEffect(() => {
    const now = new Date();
    if (!manualDate) {
      setManualDate(now);
    }
    if (!manualTime) {
      setManualTime(format(now, "HH:mm"));
    }
  }, [manualDate, manualTime]);

  const activeEmployees = useMemo(() => {
    return employees?.filter(e => e.status !== 'tidak aktif');
  }, [employees]);

  // --- Firestore Queries ---
  const selectedDateQuery = useMemoFirebase(() => {
    if (!firestore || !manualDate) return null;
    const start = startOfDay(manualDate);
    const end = endOfDay(manualDate);
    return query(
      collection(firestore, "attendance"),
      where("clockIn", ">=", start.toISOString()),
      where("clockIn", "<=", end.toISOString()),
      orderBy("clockIn", "desc")
    );
  }, [firestore, manualDate]);
  const { data: selectedDateAttendance, isLoading: isLoadingSelectedDate } = useCollection<AttendanceRecord>(selectedDateQuery);

  const historyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const attendanceRef = collection(firestore, "attendance");
    
    let q;

    if (historyEmployeeFilter !== "all") {
      // Composite query
      q = query(attendanceRef, where("employeeId", "==", historyEmployeeFilter));
    } else {
      q = query(attendanceRef);
    }
    
    if (historyFilter !== 'all') {
        const days = parseInt(historyFilter, 10);
        const filterDate = subDays(new Date(), days);
        q = query(q, where("clockIn", ">=", filterDate.toISOString()));
    }

    q = query(q, orderBy("clockIn", "desc"));
    
    return q;
  }, [firestore, historyFilter, historyEmployeeFilter]);
  const { data: historyAttendance, isLoading: isLoadingHistory } = useCollection<AttendanceRecord>(historyQuery);
  
  // --- Derived State ---
  const currentEmployeeRecord = useMemo(() => {
    if (!selectedEmployeeId || !selectedDateAttendance) return null;
    return selectedDateAttendance.find(
      (record) => record.employeeId === selectedEmployeeId && !record.clockOut
    );
  }, [selectedEmployeeId, selectedDateAttendance]);
  
  const selectedEmployee = useMemo(() => {
    return employees?.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const hasCompletedAttendanceOnSelectedDate = useMemo(() => {
    if (!selectedEmployeeId || !selectedDateAttendance) return false;
    return selectedDateAttendance.some(
      (record) => record.employeeId === selectedEmployeeId && record.clockOut
    );
  }, [selectedEmployeeId, selectedDateAttendance]);
  
  useEffect(() => {
    if (currentEmployeeRecord) {
      setNotes(currentEmployeeRecord.notes || '');
      setManualTime("18:00");
    } else if (!selectedEmployeeId) {
      setNotes('');
      setManualTime(format(new Date(), "HH:mm"));
    }
  }, [currentEmployeeRecord, selectedEmployeeId]);

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

    const newRecord: Omit<AttendanceRecord, 'clockOut'> = {
      employeeId: selectedEmployeeId,
      clockIn: clockInTime.toISOString(),
      notes: notes,
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
    setDocumentNonBlocking(docRef, { clockOut: clockOutTime.toISOString(), notes: notes }, { merge: true });

    toast({
      title: "Berhasil",
      description: `${selectedEmployee?.name} absen pulang pada ${format(clockOutTime, "p")}.`,
    });
  };

  const handleSaveEmployee = (employeeData: EmployeeFormData) => {
    if (!firestore) return;

    const newId = doc(collection(firestore, "employees")).id;
    const docRef = doc(firestore, "employees", newId);
    setDocumentNonBlocking(docRef, employeeData, {});

    setSelectedEmployeeId(newId);
    toast({
      title: "Karyawan Ditambahkan",
      description: `${employeeData.name} telah ditambahkan dan dipilih.`,
    });
  };

  const getEmployeeName = (employeeId: string) => {
    return employees?.find((e) => e.id === employeeId)?.name || "Tidak diketahui";
  };
  
  const getStatus = (record: WithId<AttendanceRecord>) => {
    const clockInTime = parseISO(record.clockIn);
    
    // Create a date object for 07:35 on the same day as clock-in
    const lateTime = new Date(clockInTime);
    lateTime.setHours(7, 35, 0, 0); // 07:30 + 5 minutes grace period

    if (record.clockOut) {
        return <Badge variant="secondary">Sudah Pulang</Badge>;
    }
    if (isAfter(clockInTime, lateTime)) {
        return <Badge variant="destructive">Terlambat</Badge>;
    }
    return <Badge>Sudah Masuk</Badge>;
  };
  
  if (isLoadingEmployees) {
    return (
       <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Absensi</CardTitle>
                    <CardDescription>Catat waktu masuk atau pulang karyawan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-[108px] w-full" />
                    <div className="space-y-6 pt-4">
                        <Skeleton className="h-10 w-full" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-20 w-full" />
                        <div className="flex w-full gap-2">
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Aktivitas pada Tanggal Dipilih</CardTitle>
                    <CardDescription>Catatan absensi untuk tanggal yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Memuat data...</p>
                    </div>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader><CardTitle>Log Lengkap pada Tanggal Dipilih</CardTitle></CardHeader>
            <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Riwayat Aktivitas</CardTitle></CardHeader>
            <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
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
                  <div className="flex items-center gap-2">
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={isLoadingEmployees}>
                      <SelectTrigger id="employee-select" className="w-full">
                        <SelectValue placeholder="Pilih seorang karyawan" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEmployees && activeEmployees.length > 0 ? (
                          activeEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-sm text-muted-foreground">Tidak ada karyawan aktif. Tambahkan di halaman Karyawan.</div>
                        )}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setIsEmployeeFormOpen(true)} disabled={isLoadingEmployees} aria-label="Tambah Karyawan Baru">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
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
                
                <div className="space-y-2">
                  <Label htmlFor="attendance-notes">Catatan</Label>
                  <Textarea
                    id="attendance-notes"
                    placeholder="Tambahkan catatan (opsional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!selectedEmployeeId}
                  />
                </div>

                <div className="flex w-full gap-2">
                  <Button 
                    onClick={handleClockIn} 
                    disabled={!selectedEmployeeId || !!currentEmployeeRecord || hasCompletedAttendanceOnSelectedDate} 
                    className="w-full"
                  >
                    <LogIn className="mr-2 h-4 w-4" /> Absen Masuk
                  </Button>
                  <Button 
                    onClick={handleClockOut} 
                    disabled={!selectedEmployeeId || !currentEmployeeRecord} 
                    variant="outline" 
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Absen Pulang
                  </Button>
                </div>

                {selectedEmployeeId && (
                  <div className="pt-4 text-center text-sm text-muted-foreground">
                      {currentEmployeeRecord ? (
                          <span>
                              <strong>{selectedEmployee?.name}</strong> tercatat masuk pada <strong>{format(parseISO(currentEmployeeRecord.clockIn), 'p')}</strong> dan belum absen pulang.
                          </span>
                      ) : hasCompletedAttendanceOnSelectedDate ? (
                          <span>
                              <strong>{selectedEmployee?.name}</strong> telah menyelesaikan absensi pada tanggal ini.
                          </span>
                      ) : (
                          <span>
                              <strong>{selectedEmployee?.name}</strong> belum memiliki catatan absensi pada tanggal ini.
                          </span>
                      )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Aktivitas pada Tanggal Dipilih</CardTitle>
              <CardDescription>
                Catatan absensi untuk tanggal yang dipilih.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto">
                  {isLoadingSelectedDate ? (
                    <div className="text-center text-sm text-muted-foreground py-8">Memuat aktivitas...</div>
                  ) : selectedDateAttendance && selectedDateAttendance.length > 0 ? (
                      <ul className="space-y-3">
                          {selectedDateAttendance.map((record) => (
                              <li key={record.id} className="flex items-center justify-between text-sm">
                                  <div className="font-medium">{getEmployeeName(record.employeeId)}</div>
                                  <div className="text-muted-foreground">
                                      {record.clockOut ? `Masuk: ${format(parseISO(record.clockIn), 'p')} - Pulang: ${format(parseISO(record.clockOut), 'p')}` : `Masuk: ${format(parseISO(record.clockIn), 'p')}`}
                                  </div>
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">Tidak ada catatan absensi untuk tanggal yang dipilih.</div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Log Lengkap pada Tanggal Dipilih</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Masuk</TableHead>
                  <TableHead>Pulang</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSelectedDate ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Memuat log...</TableCell>
                  </TableRow>
                ) : selectedDateAttendance && selectedDateAttendance.length > 0 ? (
                  selectedDateAttendance.map((record) => {
                    const employee = employees?.find(e => e.id === record.employeeId);
                    const clockInTime = parseISO(record.clockIn);
                    const lateTime = new Date(clockInTime);
                    lateTime.setHours(7, 35, 0, 0);
                    const isRecordLate = isAfter(clockInTime, lateTime);

                    return (
                      <TableRow key={record.id} className={isRecordLate ? "bg-destructive/10" : ""}>
                        <TableCell className="font-medium">{employee?.name || 'Tidak diketahui'}</TableCell>
                        <TableCell>{employee?.position || 'N/A'}</TableCell>
                        <TableCell>{format(parseISO(record.clockIn), "p")}</TableCell>
                        <TableCell>{record.clockOut ? format(parseISO(record.clockOut), "p") : " - "}</TableCell>
                        <TableCell>{record.notes || "-"}</TableCell>
                        <TableCell>
                          {getStatus(record)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Tidak ada catatan absensi untuk tanggal yang dipilih.
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
                      <TableHead>Catatan</TableHead>
                      <TableHead>Status</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {isLoadingHistory ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                            Memuat riwayat...
                            </TableCell>
                        </TableRow>
                      ) : historyAttendance && historyAttendance.length > 0 ? (
                      historyAttendance.map((record) => {
                          const employee = employees?.find(e => e.id === record.employeeId);
                          const clockInTime = parseISO(record.clockIn);
                          const lateTime = new Date(clockInTime);
                          lateTime.setHours(7, 35, 0, 0);
                          const isRecordLate = isAfter(clockInTime, lateTime);

                          return (
                          <TableRow key={record.id} className={isRecordLate ? "bg-destructive/10" : ""}>
                              <TableCell className="font-medium">{employee?.name || 'Tidak diketahui'}</TableCell>
                              <TableCell>{format(parseISO(record.clockIn), "MMM d, yyyy", { locale: id })}</TableCell>
                              <TableCell>{format(parseISO(record.clockIn), "p")}</TableCell>
                              <TableCell>{record.clockOut ? format(parseISO(record.clockOut), "p") : " - "}</TableCell>
                              <TableCell>{record.notes || "-"}</TableCell>
                              <TableCell>
                                {getStatus(record)}
                              </TableCell>
                          </TableRow>
                          );
                      })
                      ) : (
                      <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                          Tidak ada catatan ditemukan untuk filter yang dipilih.
                          </TableCell>
                      </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
      <EmployeeFormDialog
        isOpen={isEmployeeFormOpen}
        setIsOpen={setIsEmployeeFormOpen}
        onSave={handleSaveEmployee}
        employee={null}
      />
    </>
  );
}

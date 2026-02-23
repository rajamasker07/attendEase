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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { Employee, AttendanceRecord, AbsenceRecord, Sanction } from "@/types";
import { format, isSameDay, parseISO, subDays, isAfter, startOfDay, endOfDay } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, LogIn, LogOut, PlusCircle, UserX } from "lucide-react";
import { Clock } from "@/components/clock";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useCollection, useFirebase, WithId, addDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, orderBy, getDocs, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeFormDialog, type EmployeeFormData } from "@/app/employees/employee-actions";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";


const absenceSchema = z.object({
  employeeId: z.string().min(1, "Karyawan harus dipilih."),
  date: z.string().min(1, "Tanggal harus diisi."),
  status: z.enum(['sakit', 'izin', 'alpa'], { required_error: "Status harus dipilih."}),
  notes: z.string().optional(),
});
type AbsenceFormData = z.infer<typeof absenceSchema>;

function MarkAbsenceDialog({
  isOpen,
  setIsOpen,
  employees,
  onSave
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  employees: WithId<Employee>[] | null;
  onSave: (data: AbsenceFormData) => Promise<void>;
}) {
    const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
  });

  useEffect(() => {
    if (isOpen) {
        reset({ date: format(new Date(), "yyyy-MM-dd"), employeeId: '', status: undefined, notes: '' });
    }
  }, [isOpen, reset]);

  const onSubmit: SubmitHandler<AbsenceFormData> = async (data) => {
    await onSave(data);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Tandai Ketidakhadiran</DialogTitle>
            <DialogDescription>
              Catat status ketidakhadiran untuk seorang karyawan pada tanggal tertentu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="employeeId" className="text-right">Karyawan</Label>
                <div className="col-span-3">
                    <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="employeeId"><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                        <SelectContent>
                            {employees?.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    )}
                    />
                    {errors.employeeId && <p className="text-destructive text-sm mt-1">{errors.employeeId.message}</p>}
                </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="absence-date" className="text-right">Tanggal</Label>
                <div className="col-span-3">
                    <Input id="absence-date" type="date" {...register("date")} />
                    {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <div className="col-span-3">
                    <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="status"><SelectValue placeholder="Pilih status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sakit">Sakit</SelectItem>
                            <SelectItem value="izin">Izin</SelectItem>
                            <SelectItem value="alpa">Alpa (Tanpa Keterangan)</SelectItem>
                        </SelectContent>
                        </Select>
                    )}
                    />
                    {errors.status && <p className="text-destructive text-sm mt-1">{errors.status.message}</p>}
                </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Catatan</Label>
                <div className="col-span-3">
                    <Textarea id="notes" {...register("notes")} placeholder="Catatan tambahan (opsional)" />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { toast } = useToast();
  const [manualDate, setManualDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [manualTime, setManualTime] = useState<string>(format(new Date(), "HH:mm"));
  const [notes, setNotes] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("7");
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState<string>("all");
  
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isAbsenceFormOpen, setIsAbsenceFormOpen] = useState(false);
  
  // --- Firestore Queries ---
  const employeesCollection = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(collection(firestore, "employees"), orderBy("name", "asc"));
  }, [firestore, isUserLoading, user]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);

  const activeEmployees = useMemo(() => {
    return employees?.filter(e => e.status !== 'tidak aktif');
  }, [employees]);

  const selectedDateAsDateObj = useMemo(() => {
    if (!manualDate) return null;
    const [year, month, day] = manualDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [manualDate]);

  const selectedDateQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user || !selectedDateAsDateObj) return null;
    const start = startOfDay(selectedDateAsDateObj);
    const end = endOfDay(selectedDateAsDateObj);
    return query(
      collection(firestore, "attendance"),
      where("clockIn", ">=", start.toISOString()),
      where("clockIn", "<=", end.toISOString()),
      orderBy("clockIn", "desc")
    );
  }, [firestore, isUserLoading, user, selectedDateAsDateObj]);
  const { data: selectedDateAttendance, isLoading: isLoadingSelectedDate } = useCollection<AttendanceRecord>(selectedDateQuery);

  const selectedDateAbsenceQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user || !manualDate) return null;
    return query(
      collection(firestore, "absences"),
      where("date", "==", manualDate)
    );
  }, [firestore, isUserLoading, user, manualDate]);
  const { data: selectedDateAbsences, isLoading: isLoadingAbsences } = useCollection<AbsenceRecord>(selectedDateAbsenceQuery);


  const historyQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    
    let q = query(collection(firestore, "attendance"));
    
    if (historyFilter !== 'all') {
        const days = parseInt(historyFilter, 10);
        const filterDate = subDays(new Date(), days);
        q = query(q, where("clockIn", ">=", filterDate.toISOString()));
    }

    q = query(q, orderBy("clockIn", "desc"));
    
    return q;
  }, [firestore, historyFilter, isUserLoading, user]);
  const { data: historyAttendance, isLoading: isLoadingHistory } = useCollection<AttendanceRecord>(historyQuery);

  const historyAbsenceQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    let q = query(collection(firestore, "absences"));

    if (historyFilter !== 'all') {
        const days = parseInt(historyFilter, 10);
        const filterDate = subDays(new Date(), days);
        q = query(q, where("date", ">=", format(filterDate, "yyyy-MM-dd")));
    }

    q = query(q, orderBy("date", "desc"));

    return q;
  }, [firestore, historyFilter, isUserLoading, user]);
  const { data: historyAbsences, isLoading: isLoadingHistoryAbsences } = useCollection<AbsenceRecord>(historyAbsenceQuery);
  
  // --- Client-side filtering ---
  const filteredHistoryAttendance = useMemo(() => {
    if (!historyAttendance) return null;
    if (historyEmployeeFilter === 'all') return historyAttendance;
    return historyAttendance.filter(item => item.employeeId === historyEmployeeFilter);
  }, [historyAttendance, historyEmployeeFilter]);

  const filteredHistoryAbsences = useMemo(() => {
    if (!historyAbsences) return null;
    if (historyEmployeeFilter === 'all') return historyAbsences;
    return historyAbsences.filter(item => item.employeeId === historyEmployeeFilter);
  }, [historyAbsences, historyEmployeeFilter]);


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
  
  const hasAbsenceOnSelectedDate = useMemo(() => {
    if (!selectedEmployeeId || !selectedDateAbsences) return false;
    return selectedDateAbsences.some(
      (record) => record.employeeId === selectedEmployeeId
    );
  }, [selectedEmployeeId, selectedDateAbsences]);

  useEffect(() => {
    if (currentEmployeeRecord) {
      setNotes(currentEmployeeRecord.notes || '');
    } else {
      setNotes('');
    }
  }, [currentEmployeeRecord]);

  const getManualDateTime = () => {
    if (!manualDate || !manualTime) return new Date();
    const [hours, minutes] = manualTime.split(':').map(Number);
    const [year, month, day] = manualDate.split('-').map(Number);
    const newDate = new Date(year, month - 1, day, hours, minutes);
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

  const handleSaveAbsence = async (data: AbsenceFormData) => {
    if (!firestore) return;
    const { employeeId, date, status, notes } = data;
    const dateStr = date;
    const dateObj = parseISO(date);

    // Check for conflicts
    const attendanceConflictQuery = query(collection(firestore, "attendance"), where("employeeId", "==", employeeId));
    const attendanceSnap = await getDocs(attendanceConflictQuery);
    const hasAttendance = attendanceSnap.docs.some(d => isSameDay(parseISO(d.data().clockIn), dateObj));

    const absenceConflictQuery = query(collection(firestore, "absences"), where("employeeId", "==", employeeId), where("date", "==", dateStr));
    const absenceSnap = await getDocs(absenceConflictQuery);
    const hasAbsence = !absenceSnap.empty;

    if(hasAttendance || hasAbsence) {
        toast({ title: "Gagal", description: "Karyawan ini sudah memiliki catatan kehadiran atau ketidakhadiran pada tanggal yang dipilih.", variant: "destructive"});
        return;
    }

    const newRecord: Omit<AbsenceRecord, 'id'> = { employeeId, date: dateStr, status, notes };
    addDocumentNonBlocking(collection(firestore, "absences"), newRecord);
    
    if (status === 'alpa') {
      const settingsRef = doc(firestore, "settings", "payroll");
      const settingsSnap = await getDoc(settingsRef);
      const alpaDeduction = settingsSnap.exists() ? settingsSnap.data().alpaDeductionAmount || 0 : 0;

      if (alpaDeduction > 0) {
        const employee = employees?.find(e => e.id === employeeId);
        const sanctionRecord: Omit<Sanction, 'id'> = {
          employeeId,
          date: dateStr,
          violation: "Alpa (mangkir kerja)",
          description: `Tidak masuk tanpa keterangan pada tanggal ${format(dateObj, "d MMMM yyyy", { locale: id })}.`,
          deduction: alpaDeduction,
        };
        addDocumentNonBlocking(collection(firestore, "sanctions"), sanctionRecord);
        toast({
          title: "Sanksi Dibuat",
          description: `Sanksi Alpa untuk ${employee?.name} telah dibuat.`,
        });
      }
    }
    toast({
      title: "Berhasil",
      description: `Ketidakhadiran karyawan berhasil ditandai.`
    });
  };

  const getEmployeeName = (employeeId: string) => {
    return employees?.find((e) => e.id === employeeId)?.name || "Tidak diketahui";
  };
  
  const getStatus = (record: WithId<AttendanceRecord>) => {
    const clockInTime = parseISO(record.clockIn);
    
    const lateTime = new Date(clockInTime);
    lateTime.setHours(7, 35, 0, 0); 

    if (record.clockOut) {
        return <Badge variant="secondary">Sudah Pulang</Badge>;
    }
    if (isAfter(clockInTime, lateTime)) {
        return <Badge variant="destructive">Terlambat</Badge>;
    }
    return <Badge>Sudah Masuk</Badge>;
  };

  const getAbsenceStatusBadge = (status: AbsenceRecord['status']) => {
    switch (status) {
        case 'sakit': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Sakit</Badge>;
        case 'izin': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Izin</Badge>;
        case 'alpa': return <Badge variant="destructive">Alpa</Badge>;
    }
  }
  
  const dailyLogItems = useMemo(() => {
    if (!selectedDateAttendance && !selectedDateAbsences) return [];
    
    const attendanceItems = (selectedDateAttendance || []).map(item => ({ ...item, type: 'attendance' as const, sortKey: item.clockIn }));
    const absenceItems = (selectedDateAbsences || []).map(item => ({ ...item, type: 'absence' as const, sortKey: item.date }));

    const combined = [...attendanceItems, ...absenceItems];
    combined.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return combined;
  }, [selectedDateAttendance, selectedDateAbsences]);

  const historyLogItems = useMemo(() => {
    if (!filteredHistoryAttendance && !filteredHistoryAbsences) return [];

    const attendanceItems = (filteredHistoryAttendance || []).map(item => ({ ...item, type: 'attendance' as const, sortDate: parseISO(item.clockIn) }));
    const absenceItems = (filteredHistoryAbsences || []).map(item => ({ ...item, type: 'absence' as const, sortDate: startOfDay(parseISO(item.date)) }));
    
    const combined = [...attendanceItems, ...absenceItems];
    combined.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    return combined;

  }, [filteredHistoryAttendance, filteredHistoryAbsences]);

  const isLoading = isUserLoading || isLoadingEmployees || isLoadingSelectedDate || isLoadingAbsences || isLoadingHistory || isLoadingHistoryAbsences;
  
  if (isLoading) {
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
              <CardDescription>Catat waktu masuk/pulang atau tandai ketidakhadiran karyawan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Clock />
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-select">Karyawan</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedEmployeeId}
                      onValueChange={setSelectedEmployeeId}
                      disabled={isLoadingEmployees}
                    >
                      <SelectTrigger id="employee-select">
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
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada karyawan aktif.</div>
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
                    <Input
                      id="attendance-date"
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full"
                    />
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

                <div className="flex w-full flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={handleClockIn} 
                    disabled={!selectedEmployeeId || !!currentEmployeeRecord || hasCompletedAttendanceOnSelectedDate || hasAbsenceOnSelectedDate} 
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
                <Button 
                    onClick={() => setIsAbsenceFormOpen(true)}
                    disabled={isLoadingEmployees}
                    variant="secondary"
                    className="w-full"
                  >
                    <UserX className="mr-2 h-4 w-4" /> Tandai Ketidakhadiran
                </Button>

                {selectedEmployeeId && (
                  <div className="pt-4 text-center text-sm text-muted-foreground">
                      {hasAbsenceOnSelectedDate ? (
                         <span>
                            <strong>{selectedEmployee?.name}</strong> tercatat tidak hadir pada tanggal ini.
                         </span>
                      ) : currentEmployeeRecord ? (
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
                  {isLoading ? (
                    <div className="text-center text-sm text-muted-foreground py-8">Memuat aktivitas...</div>
                  ) : dailyLogItems.length > 0 ? (
                      <ul className="space-y-3">
                          {dailyLogItems.map((record) => (
                              <li key={record.id} className="flex items-center justify-between text-sm">
                                  <div className="font-medium">{getEmployeeName(record.employeeId)}</div>
                                  {record.type === 'attendance' ? (
                                    <div className="text-muted-foreground">
                                        {record.clockOut ? `Masuk: ${format(parseISO(record.clockIn), 'p')} - Pulang: ${format(parseISO(record.clockOut), 'p')}` : `Masuk: ${format(parseISO(record.clockIn), 'p')}`}
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground">
                                        {getAbsenceStatusBadge(record.status)}
                                    </div>
                                  )}
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">Tidak ada catatan untuk tanggal yang dipilih.</div>
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Memuat log...</TableCell>
                  </TableRow>
                ) : dailyLogItems.length > 0 ? (
                  dailyLogItems.map((record) => {
                    const employee = employees?.find(e => e.id === record.employeeId);
                    if (record.type === 'attendance') {
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
                    } else { // type is 'absence'
                         return (
                          <TableRow key={record.id} className="bg-muted/50">
                            <TableCell className="font-medium">{employee?.name || 'Tidak diketahui'}</TableCell>
                            <TableCell>{employee?.position || 'N/A'}</TableCell>
                            <TableCell colSpan={2} className="text-center"> - </TableCell>
                            <TableCell>{record.notes || "-"}</TableCell>
                            <TableCell>
                              {getAbsenceStatusBadge(record.status)}
                            </TableCell>
                          </TableRow>
                        );
                    }
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Tidak ada catatan untuk tanggal yang dipilih.
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
                  <CardDescription>Lihat riwayat catatan kehadiran dan ketidakhadiran.</CardDescription>
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
                      {isLoadingHistory || isLoadingHistoryAbsences ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                            Memuat riwayat...
                            </TableCell>
                        </TableRow>
                      ) : historyLogItems.length > 0 ? (
                      historyLogItems.map((record) => {
                          const employee = employees?.find(e => e.id === record.employeeId);
                          if (record.type === 'attendance') {
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
                                  <TableCell>{getStatus(record)}</TableCell>
                              </TableRow>
                              );
                          } else { // type is 'absence'
                               return (
                                <TableRow key={record.id} className="bg-muted/50">
                                    <TableCell className="font-medium">{employee?.name || 'Tidak diketahui'}</TableCell>
                                    <TableCell>{format(parseISO(record.date), "MMM d, yyyy", { locale: id })}</TableCell>
                                    <TableCell colSpan={2} className="text-center">-</TableCell>
                                    <TableCell>{record.notes || "-"}</TableCell>
                                    <TableCell>{getAbsenceStatusBadge(record.status)}</TableCell>
                                </TableRow>
                               );
                          }
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
      <MarkAbsenceDialog
        isOpen={isAbsenceFormOpen}
        setIsOpen={setIsAbsenceFormOpen}
        employees={activeEmployees || null}
        onSave={handleSaveAbsence}
      />
    </>
  );
}

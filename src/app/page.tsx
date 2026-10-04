
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import type { Employee, AttendanceRecord, AbsenceRecord, Sanction, Holiday, Setting } from "@/types";
import { format, isSameDay, parseISO, subDays, isAfter, startOfDay, endOfDay } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  LogIn, 
  LogOut, 
  PlusCircle, 
  UserCheck, 
  AlarmClock, 
  Users, 
  UserX, 
  Check, 
  ChevronsUpDown,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Sparkles,
  Pencil,
  Trash2
} from "lucide-react";
import { Clock } from "@/components/clock";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCollection,
  useDoc,
  useFirebase,
  WithId,
  addDocumentNonBlocking,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useMemoFirebase,
} from "@/firebase";
import { collection, doc, query, where, orderBy, getDocs, getDoc, deleteField } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeFormDialog, type EmployeeFormData } from "@/app/employees/employee-actions";
import {
  EditAttendanceDialog,
  EditAbsenceDialog,
  DeleteLogItemAlert,
  type AttendanceEditData,
  type AbsenceEditData,
  type ItemToDelete,
} from "@/app/attendance-actions";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";


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
                          <SelectTrigger id="employeeId">
                            <SelectValue placeholder="Pilih karyawan..." />
                          </SelectTrigger>
                          <SelectContent>
                            {employees?.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name}
                              </SelectItem>
                            ))}
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
  const [manualTime, setManualTime] = useState<string>("07:30");
  const [notes, setNotes] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("7");
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState<string>("all");
  
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isAbsenceFormOpen, setIsAbsenceFormOpen] = useState(false);
  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);

  // States for Edit & Delete Attendance / Absence
  const [editAttendanceRecord, setEditAttendanceRecord] = useState<WithId<AttendanceRecord> | null>(null);
  const [isEditAttendanceOpen, setIsEditAttendanceOpen] = useState(false);
  const [editAbsenceRecord, setEditAbsenceRecord] = useState<WithId<AbsenceRecord> | null>(null);
  const [isEditAbsenceOpen, setIsEditAbsenceOpen] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEmployeePickerOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isEmployeePickerOpen]);

  // --- Firestore Queries ---
  const employeesCollection = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(collection(firestore, "employees"), orderBy("name", "asc"));
  }, [firestore, isUserLoading, user]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);
  
  const holidaysCollection = useMemoFirebase(() => firestore ? collection(firestore, "holidays") : null, [firestore]);
  const { data: holidays, isLoading: isLoadingHolidays } = useCollection<Holiday>(holidaysCollection);

  const settingsDocRef = useMemoFirebase(() => (firestore ? doc(firestore, "settings", "payroll") : null), [firestore]);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDocRef);

  const activeEmployees = useMemo(() => {
    return employees?.filter(e => e.status !== 'tidak aktif');
  }, [employees]);

  const selectedDateAsDateObj = useMemo(() => {
    if (!manualDate) return null;
    const [year, month, day] = manualDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [manualDate]);

  const isSelectedDateHoliday = useMemo(() => {
    if (!selectedDateAsDateObj || !holidays) return false;
    try {
        return holidays.some(h => isSameDay(parseISO(h.date), selectedDateAsDateObj));
    } catch (e) {
        console.error("Invalid date format in holidays data", e);
        return false;
    }
  }, [selectedDateAsDateObj, holidays]);

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

  // Catatan absensi lengkap (masuk & pulang) karyawan terpilih pada tanggal ini
  const currentCompletedAttendanceRecord = useMemo(() => {
    if (!selectedEmployeeId || !selectedDateAttendance) return null;
    return selectedDateAttendance.find(
      (record) => record.employeeId === selectedEmployeeId && record.clockOut
    );
  }, [selectedEmployeeId, selectedDateAttendance]);

  const hasCompletedAttendanceOnSelectedDate = useMemo(() => {
    return !!currentCompletedAttendanceRecord;
  }, [currentCompletedAttendanceRecord]);

  // Catatan ketidakhadiran karyawan terpilih (jika ada)
  const currentEmployeeAbsence = useMemo(() => {
    if (!selectedEmployeeId || !selectedDateAbsences) return null;
    return selectedDateAbsences.find((record) => record.employeeId === selectedEmployeeId);
  }, [selectedEmployeeId, selectedDateAbsences]);

  const hasAbsenceOnSelectedDate = useMemo(() => {
    return !!currentEmployeeAbsence;
  }, [currentEmployeeAbsence]);

  const dailySummary = useMemo(() => {
    const totalActiveEmployees = activeEmployees?.length ?? 0;
    const presentEmployees = new Set(selectedDateAttendance?.map(a => a.employeeId) ?? []).size;
    const absentEmployees = selectedDateAbsences?.length ?? 0;
    
    let lateEmployees = 0;
    if (selectedDateAttendance && settings?.lateThresholdTime) {
        const [lateHours, lateMinutes] = settings.lateThresholdTime.split(':').map(Number);
        const uniqueLateEmployees = new Set<string>();
        selectedDateAttendance.forEach(record => {
            const clockInTime = parseISO(record.clockIn);
            const lateTime = new Date(clockInTime);
            lateTime.setHours(lateHours, lateMinutes, 0, 0);
            if (isAfter(clockInTime, lateTime)) {
                uniqueLateEmployees.add(record.employeeId);
            }
        });
        lateEmployees = uniqueLateEmployees.size;
    }
    
    const attendancePercentage = totalActiveEmployees > 0 ? (presentEmployees / totalActiveEmployees) * 100 : 0;

    return {
        totalActiveEmployees,
        presentEmployees,
        lateEmployees,
        absentEmployees,
        attendancePercentage,
    }
  }, [activeEmployees, selectedDateAttendance, selectedDateAbsences, settings]);

  // Otomatis sinkronisasi jam masuk (07:30) atau jam pulang (18:00) sesuai status karyawan
  const lastSyncedRef = useRef<string>("");

  useEffect(() => {
    if (!selectedEmployeeId) {
      setManualTime("07:30");
      lastSyncedRef.current = "";
      return;
    }
    if (isLoadingSelectedDate || isLoadingAbsences) return;

    const statusKey = hasCompletedAttendanceOnSelectedDate
      ? `completed_${currentCompletedAttendanceRecord?.clockOut || ''}`
      : currentEmployeeRecord
      ? `clocked-in_${currentEmployeeRecord.id}`
      : hasAbsenceOnSelectedDate
      ? "absent"
      : "not-clocked-in";

    const syncKey = `${selectedEmployeeId}_${manualDate}_${statusKey}`;

    if (lastSyncedRef.current !== syncKey) {
      lastSyncedRef.current = syncKey;

      if (hasCompletedAttendanceOnSelectedDate) {
        // Karyawan sudah selesai absensi (masuk & pulang)
        if (currentCompletedAttendanceRecord?.clockOut) {
          setManualTime(format(parseISO(currentCompletedAttendanceRecord.clockOut), "HH:mm"));
        } else {
          setManualTime("18:00");
        }
      } else if (currentEmployeeRecord) {
        // Sudah absen masuk dan belum ada jam pulang -> Otomatis set 06.00 PM (18:00)
        setManualTime("18:00");
      } else {
        // Belum absen masuk -> Otomatis set 07.30 AM (07:30)
        setManualTime("07:30");
      }
    }
  }, [
    selectedEmployeeId,
    manualDate,
    currentEmployeeRecord,
    hasCompletedAttendanceOnSelectedDate,
    hasAbsenceOnSelectedDate,
    currentCompletedAttendanceRecord,
    isLoadingSelectedDate,
    isLoadingAbsences,
  ]);

  // Helper deskripsi waktu & AM/PM untuk mengeliminasi kebingungan format
  const timeInfo = useMemo(() => {
    if (!manualTime || !manualTime.includes(':')) return null;
    const [hStr, mStr] = manualTime.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return null;

    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const formatted12 = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;

    let partOfDay = 'Pagi';
    if (h >= 0 && h < 4) partOfDay = 'Dini Hari';
    else if (h >= 4 && h < 11) partOfDay = 'Pagi';
    else if (h >= 11 && h < 15) partOfDay = 'Siang';
    else if (h >= 15 && h < 18) partOfDay = 'Sore';
    else partOfDay = 'Malam';

    return {
      hours24: `${hStr.padStart(2, '0')}:${mStr.padStart(2, '0')}`,
      hours12: formatted12,
      partOfDay,
      period,
      hour: h,
      minute: m,
      isNightOrEvening: h >= 12,
      isMorning: h < 12,
    };
  }, [manualTime]);

  // Status form disabled jika karyawan sudah selesai absen, tidak hadir, atau hari libur
  const isTimeInputDisabled = 
    !selectedEmployeeId || 
    hasCompletedAttendanceOnSelectedDate || 
    hasAbsenceOnSelectedDate || 
    isSelectedDateHoliday;

  // Peringatan jika jam masuk dipilih di malam hari (kemungkinan salah pilih PM di browser)
  const showClockInWarning = 
    !isTimeInputDisabled && 
    !currentEmployeeRecord && 
    !hasCompletedAttendanceOnSelectedDate && 
    timeInfo !== null && 
    timeInfo.hour >= 12;

  // Peringatan jika jam pulang dipilih di pagi hari (kemungkinan salah pilih AM di browser)
  const showClockOutWarning = 
    !isTimeInputDisabled && 
    !!currentEmployeeRecord && 
    timeInfo !== null && 
    timeInfo.hour < 12;

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
    const { employeeId, date, status, notes: absenceNotes } = data;
    const dateStr = date;
    const dateObj = parseISO(date);

    // Check if the date is a holiday
    if (holidays?.some(h => isSameDay(parseISO(h.date), dateObj))) {
        toast({
            title: "Gagal: Hari Libur",
            description: "Tidak dapat mencatat ketidakhadiran pada hari libur.",
            variant: "destructive"
        });
        return;
    }

    // Check for conflicts with date-bounded query to prevent excessive reads
    const dayStart = startOfDay(dateObj).toISOString();
    const dayEnd = endOfDay(dateObj).toISOString();
    const attendanceConflictQuery = query(
      collection(firestore, "attendance"),
      where("clockIn", ">=", dayStart),
      where("clockIn", "<=", dayEnd)
    );
    const attendanceSnap = await getDocs(attendanceConflictQuery);
    const hasAttendance = attendanceSnap.docs.some(d => d.data().employeeId === employeeId);

    const absenceConflictQuery = query(collection(firestore, "absences"), where("employeeId", "==", employeeId), where("date", "==", dateStr));
    const absenceSnap = await getDocs(absenceConflictQuery);
    const hasAbsence = !absenceSnap.empty;

    if(hasAttendance || hasAbsence) {
        toast({ title: "Gagal", description: "Karyawan ini sudah memiliki catatan kehadiran atau ketidakhadiran pada tanggal yang dipilih.", variant: "destructive"});
        return;
    }

    const newRecord: Omit<AbsenceRecord, 'id'> = { employeeId, date: dateStr, status, notes: absenceNotes };
    addDocumentNonBlocking(collection(firestore, "absences"), newRecord);
    
    if (status === 'alpa') {
      const alpaDeduction = settings?.alpaDeductionAmount || 0;

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
    
    const lateThreshold = settings?.lateThresholdTime || "07:35";
    const [hours, minutes] = lateThreshold.split(':').map(Number);
    const lateTime = new Date(clockInTime);
    lateTime.setHours(hours, minutes, 0, 0); 

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
  };

  const handleOpenEdit = (
    record:
      | (WithId<AttendanceRecord> & { type: "attendance" })
      | (WithId<AbsenceRecord> & { type: "absence" })
  ) => {
    if (record.type === "attendance") {
      setEditAttendanceRecord(record);
      setIsEditAttendanceOpen(true);
    } else {
      setEditAbsenceRecord(record);
      setIsEditAbsenceOpen(true);
    }
  };

  const handleOpenDelete = (
    record:
      | (WithId<AttendanceRecord> & { type: "attendance" })
      | (WithId<AbsenceRecord> & { type: "absence" })
  ) => {
    const employee = employees?.find((e) => e.id === record.employeeId);
    const employeeName = employee?.name || "Karyawan";

    if (record.type === "attendance") {
      const clockInDate = parseISO(record.clockIn);
      const dateStr = format(clockInDate, "dd MMMM yyyy", { locale: id });
      const details = `Masuk: ${format(clockInDate, "p")}${
        record.clockOut ? ` • Pulang: ${format(parseISO(record.clockOut), "p")}` : ""
      }`;
      setItemToDelete({
        id: record.id,
        type: "attendance",
        employeeName,
        date: dateStr,
        details,
      });
    } else {
      const dateObj = parseISO(record.date);
      const dateStr = format(dateObj, "dd MMMM yyyy", { locale: id });
      const details = `Status: ${record.status.toUpperCase()}${
        record.notes ? ` • ${record.notes}` : ""
      }`;
      setItemToDelete({
        id: record.id,
        type: "absence",
        employeeName,
        date: dateStr,
        details,
      });
    }
    setIsDeleteAlertOpen(true);
  };

  const handleSaveEditAttendance = (id: string, data: AttendanceEditData) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, "attendance", id);
      const updatePayload: Record<string, unknown> = {
        employeeId: data.employeeId,
        clockIn: data.clockIn,
        notes: data.notes || "",
      };
      if (data.clockOut) {
        updatePayload.clockOut = data.clockOut;
      } else {
        updatePayload.clockOut = deleteField();
      }
      updateDocumentNonBlocking(docRef, updatePayload);
      toast({
        title: "Berhasil Diperbarui",
        description: "Data absensi berhasil diperbarui.",
      });
      setIsEditAttendanceOpen(false);
      setEditAttendanceRecord(null);
    } catch (error) {
      console.error("Gagal memperbarui absensi:", error);
      toast({
        title: "Gagal Memperbarui",
        description: "Terjadi kesalahan saat memperbarui data absensi.",
        variant: "destructive",
      });
    }
  };

  const handleSaveEditAbsence = (id: string, data: AbsenceEditData) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, "absences", id);
      const updatePayload: Record<string, unknown> = {
        employeeId: data.employeeId,
        date: data.date,
        status: data.status,
        notes: data.notes || "",
      };
      updateDocumentNonBlocking(docRef, updatePayload);
      toast({
        title: "Berhasil Diperbarui",
        description: "Data ketidakhadiran berhasil diperbarui.",
      });
      setIsEditAbsenceOpen(false);
      setEditAbsenceRecord(null);
    } catch (error) {
      console.error("Gagal memperbarui ketidakhadiran:", error);
      toast({
        title: "Gagal Memperbarui",
        description: "Terjadi kesalahan saat memperbarui data ketidakhadiran.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!firestore || !itemToDelete) return;
    setIsDeleting(true);
    try {
      const collectionName =
        itemToDelete.type === "attendance" ? "attendance" : "absences";
      deleteDocumentNonBlocking(doc(firestore, collectionName, itemToDelete.id));
      toast({
        title: "Berhasil Dihapus",
        description: `Data ${
          itemToDelete.type === "attendance" ? "absensi" : "ketidakhadiran"
        } ${itemToDelete.employeeName} berhasil dihapus.`,
      });
      setIsDeleteAlertOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      toast({
        title: "Gagal Menghapus",
        description: "Terjadi kesalahan saat menghapus data. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
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

  const isLoading = isUserLoading || isLoadingEmployees || isLoadingSelectedDate || isLoadingAbsences || isLoadingHistory || isLoadingHistoryAbsences || isLoadingHolidays || isLoadingSettings;
  
  if (isLoading) {
    return (
       <div className="space-y-6">
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Karyawan Hadir</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-7 w-20 mb-1" />
                    <Skeleton className="h-2 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Karyawan Terlambat</CardTitle>
                    <AlarmClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-7 w-10 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Karyawan Tidak Hadir</CardTitle>
                    <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-7 w-10 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Karyawan Aktif</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-7 w-10 mb-1" />
                    <Skeleton className="h-3 w-40" />
                </CardContent>
            </Card>
        </div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Karyawan Hadir</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{dailySummary.presentEmployees} / {dailySummary.totalActiveEmployees}</div>
                    <Progress value={dailySummary.attendancePercentage} className="mt-2 h-2" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Karyawan Terlambat</CardTitle>
                    <AlarmClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{dailySummary.lateEmployees}</div>
                    <p className="text-xs text-muted-foreground">karyawan datang terlambat hari ini</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Karyawan Tidak Hadir</CardTitle>
                    <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{dailySummary.absentEmployees}</div>
                        <p className="text-xs text-muted-foreground">karyawan tidak hadir hari ini</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Karyawan Aktif</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{dailySummary.totalActiveEmployees}</div>
                    <p className="text-xs text-muted-foreground">total karyawan yang terdaftar & aktif</p>
                </CardContent>
            </Card>
        </div>

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
                    <Popover open={isEmployeePickerOpen} onOpenChange={setIsEmployeePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isEmployeePickerOpen}
                          className="w-full justify-between"
                        >
                          {selectedEmployeeId
                            ? activeEmployees?.find((employee) => employee.id === selectedEmployeeId)?.name
                            : "Pilih seorang karyawan..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Cari karyawan..." ref={searchInputRef} />
                          <CommandEmpty>Karyawan tidak ditemukan.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {activeEmployees?.map((employee) => (
                                <CommandItem
                                  key={employee.id}
                                  value={employee.name}
                                  onSelect={(currentValue) => {
                                    const employeeId = activeEmployees.find(e => e.name.toLowerCase() === currentValue.toLowerCase())?.id || "";
                                    setSelectedEmployeeId(employeeId);
                                    setIsEmployeePickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {employee.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" onClick={() => setIsEmployeeFormOpen(true)} disabled={isLoadingEmployees} aria-label="Tambah Karyawan Baru">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Status Kartu Absensi Karyawan Terpilih */}
                {selectedEmployeeId && (
                  <div className={cn(
                    "rounded-lg border p-3.5 transition-all text-sm",
                    isSelectedDateHoliday
                      ? "border-yellow-300 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-200"
                      : hasAbsenceOnSelectedDate
                      ? "border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
                      : hasCompletedAttendanceOnSelectedDate
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
                      : currentEmployeeRecord
                      ? "border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200"
                      : "border-slate-200 bg-slate-50 text-slate-800 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-200"
                  )}>
                    {isSelectedDateHoliday ? (
                      <div className="flex items-center gap-2.5">
                        <CalendarIcon className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                        <div>
                          <p className="font-semibold">Hari Libur Nasional / Kantor</p>
                          <p className="text-xs opacity-90">
                            Tanggal yang dipilih merupakan hari libur. Penginputan absensi dinonaktifkan.
                          </p>
                        </div>
                      </div>
                    ) : hasAbsenceOnSelectedDate ? (
                      <div className="flex items-center gap-2.5">
                        <UserX className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                        <div>
                          <p className="font-semibold">
                            Tercatat Tidak Hadir: {currentEmployeeAbsence?.status ? currentEmployeeAbsence.status.toUpperCase() : 'IZIN/SAKIT'}
                          </p>
                          <p className="text-xs opacity-90">
                            <strong>{selectedEmployee?.name}</strong> sudah ditandai tidak hadir pada tanggal ini. Form absensi dinonaktifkan.
                          </p>
                        </div>
                      </div>
                    ) : hasCompletedAttendanceOnSelectedDate ? (
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="font-semibold">Absensi Hari Ini Selesai</p>
                          <p className="text-xs opacity-90">
                            <strong>{selectedEmployee?.name}</strong> sudah tercatat Masuk ({currentCompletedAttendanceRecord?.clockIn ? format(parseISO(currentCompletedAttendanceRecord.clockIn), 'HH:mm') : '-'} WIB) dan Pulang ({currentCompletedAttendanceRecord?.clockOut ? format(parseISO(currentCompletedAttendanceRecord.clockOut), 'HH:mm') : '-'} WIB). Input jam dinonaktifkan.
                          </p>
                        </div>
                      </div>
                    ) : currentEmployeeRecord ? (
                      <div className="flex items-center gap-2.5">
                        <Clock3 className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-semibold">Sudah Masuk • Siap Absen Pulang</p>
                          <p className="text-xs opacity-90">
                            <strong>{selectedEmployee?.name}</strong> tercatat masuk pukul <strong>{format(parseISO(currentEmployeeRecord.clockIn), 'HH:mm')} WIB</strong>. Jam disetel otomatis ke <strong>18:00 WIB (06:00 PM)</strong>.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <LogIn className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="font-semibold">Belum Absen Masuk</p>
                          <p className="text-xs opacity-90">
                            <strong>{selectedEmployee?.name}</strong> belum memiliki catatan absensi hari ini. Jam disetel otomatis ke <strong>07:30 WIB (07:30 AM)</strong>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="attendance-time">Waktu</Label>
                      {timeInfo && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-normal px-2 py-0.5",
                            timeInfo.isMorning
                              ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
                          )}
                        >
                          {timeInfo.hours24} WIB ({timeInfo.partOfDay} • {timeInfo.hours12})
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="attendance-time"
                      type="time"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      disabled={isTimeInputDisabled}
                      className={cn(
                        "w-full font-mono transition-colors",
                        isTimeInputDisabled && "cursor-not-allowed bg-muted/60 opacity-80"
                      )}
                    />
                  </div>
                </div>

                {/* Preset Waktu Cepat 1-Klik */}
                {!isTimeInputDisabled && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Preset Cepat:
                    </span>
                    {!currentEmployeeRecord ? (
                      <>
                        <Button
                          type="button"
                          variant={manualTime === "07:30" ? "secondary" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setManualTime("07:30")}
                        >
                          07:30 Pagi (Standar)
                        </Button>
                        <Button
                          type="button"
                          variant={manualTime === "08:00" ? "secondary" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setManualTime("08:00")}
                        >
                          08:00 Pagi
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant={manualTime === "18:00" ? "secondary" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setManualTime("18:00")}
                        >
                          18:00 Sore (Standar)
                        </Button>
                        <Button
                          type="button"
                          variant={manualTime === "17:00" ? "secondary" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setManualTime("17:00")}
                        >
                          17:00 Sore
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setManualTime(format(new Date(), "HH:mm"))}
                    >
                      Jam Sekarang
                    </Button>
                  </div>
                )}

                {/* Peringatan Cerdas Jika Kemungkinan AM/PM Tertukar */}
                {showClockInWarning && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        Jam masuk terdeteksi <strong>{timeInfo?.partOfDay} ({timeInfo?.hours12})</strong>. Apakah maksud Anda <strong>07:30 Pagi</strong>?
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManualTime("07:30")}
                      className="h-7 text-xs border-amber-400 bg-white hover:bg-amber-100 dark:bg-amber-900 dark:hover:bg-amber-800 shrink-0"
                    >
                      Ubah ke 07:30 Pagi
                    </Button>
                  </div>
                )}

                {showClockOutWarning && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        Jam pulang terdeteksi <strong>Pagi ({timeInfo?.hours12})</strong>. Apakah maksud Anda <strong>18:00 Sore (06:00 PM)</strong>?
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManualTime("18:00")}
                      className="h-7 text-xs border-amber-400 bg-white hover:bg-amber-100 dark:bg-amber-900 dark:hover:bg-amber-800 shrink-0"
                    >
                      Ubah ke 18:00 Sore
                    </Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="attendance-notes">Catatan</Label>
                  <Textarea
                    id="attendance-notes"
                    placeholder="Tambahkan catatan (opsional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isTimeInputDisabled}
                  />
                </div>

                <div className="flex w-full flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={handleClockIn} 
                    disabled={!selectedEmployeeId || !!currentEmployeeRecord || hasCompletedAttendanceOnSelectedDate || hasAbsenceOnSelectedDate || isSelectedDateHoliday} 
                    className="w-full"
                  >
                    <LogIn className="mr-2 h-4 w-4" /> Absen Masuk
                  </Button>
                  <Button 
                    onClick={handleClockOut} 
                    disabled={!selectedEmployeeId || !currentEmployeeRecord || hasCompletedAttendanceOnSelectedDate || hasAbsenceOnSelectedDate || isSelectedDateHoliday} 
                    variant="outline" 
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Absen Pulang
                  </Button>
                </div>
                <Button 
                    onClick={() => setIsAbsenceFormOpen(true)}
                    disabled={isLoadingEmployees || !selectedEmployeeId || hasCompletedAttendanceOnSelectedDate || hasAbsenceOnSelectedDate || isSelectedDateHoliday}
                    variant="secondary"
                    className="w-full"
                  >
                    <UserX className="mr-2 h-4 w-4" /> Tandai Ketidakhadiran
                </Button>
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
                      <ul className="space-y-1">
                          {dailyLogItems.map((record) => (
                              <li
                                key={record.id}
                                className="flex items-center justify-between text-sm gap-2 p-1.5 rounded-md hover:bg-muted/40 transition-colors"
                              >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium truncate">{getEmployeeName(record.employeeId)}</div>
                                    {record.type === 'attendance' ? (
                                      <div className="text-xs text-muted-foreground">
                                          {record.clockOut ? `Masuk: ${format(parseISO(record.clockIn), 'p')} - Pulang: ${format(parseISO(record.clockOut), 'p')}` : `Masuk: ${format(parseISO(record.clockIn), 'p')}`}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground">
                                          {getAbsenceStatusBadge(record.status)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => handleOpenEdit(record)}
                                      title="Edit Data"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleOpenDelete(record)}
                                      title="Hapus Data"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span className="sr-only">Hapus</span>
                                    </Button>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        {manualDate === format(new Date(), "yyyy-MM-dd") 
                          ? "Belum ada karyawan yang absen hari ini." 
                          : "Tidak ada catatan untuk tanggal yang dipilih."}
                      </div>
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
                  <TableHead className="text-right w-[90px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">Memuat log...</TableCell>
                  </TableRow>
                ) : dailyLogItems.length > 0 ? (
                  dailyLogItems.map((record) => {
                    const employee = employees?.find(e => e.id === record.employeeId);
                    if (record.type === 'attendance') {
                        const clockInTime = parseISO(record.clockIn);
                        const lateThreshold = settings?.lateThresholdTime || "07:35";
                        const [hours, minutes] = lateThreshold.split(':').map(Number);
                        const lateTime = new Date(clockInTime);
                        lateTime.setHours(hours, minutes, 0, 0); 
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
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenEdit(record)}
                                  title="Edit Data"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleOpenDelete(record)}
                                  title="Hapus Data"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Hapus</span>
                                </Button>
                              </div>
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
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenEdit(record)}
                                  title="Edit Data"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleOpenDelete(record)}
                                  title="Hapus Data"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Hapus</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                    }
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                      Tidak ada catatan yang ditemukan untuk tanggal ini.
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
                      <TableHead className="text-right w-[90px]">Aksi</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {isLoadingHistory || isLoadingHistoryAbsences ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                            Memuat riwayat...
                            </TableCell>
                        </TableRow>
                      ) : historyLogItems.length > 0 ? (
                      historyLogItems.map((record) => {
                          const employee = employees?.find(e => e.id === record.employeeId);
                          if (record.type === 'attendance') {
                              const clockInTime = parseISO(record.clockIn);
                              const lateThreshold = settings?.lateThresholdTime || "07:35";
                              const [hours, minutes] = lateThreshold.split(':').map(Number);
                              const lateTime = new Date(clockInTime);
                              lateTime.setHours(hours, minutes, 0, 0); 
                              const isRecordLate = isAfter(clockInTime, lateTime);
                              return (
                              <TableRow key={record.id} className={isRecordLate ? "bg-destructive/10" : ""}>
                                  <TableCell className="font-medium">{employee?.name || 'Tidak diketahui'}</TableCell>
                                  <TableCell>{format(parseISO(record.clockIn), "MMM d, yyyy", { locale: id })}</TableCell>
                                  <TableCell>{format(parseISO(record.clockIn), "p")}</TableCell>
                                  <TableCell>{record.clockOut ? format(parseISO(record.clockOut), "p") : " - "}</TableCell>
                                  <TableCell>{record.notes || "-"}</TableCell>
                                  <TableCell>{getStatus(record)}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleOpenEdit(record)}
                                        title="Edit Data"
                                      >
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleOpenDelete(record)}
                                        title="Hapus Data"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Hapus</span>
                                      </Button>
                                    </div>
                                  </TableCell>
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
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                          onClick={() => handleOpenEdit(record)}
                                          title="Edit Data"
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                          onClick={() => handleOpenDelete(record)}
                                          title="Hapus Data"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Hapus</span>
                                        </Button>
                                      </div>
                                    </TableCell>
                                </TableRow>
                               );
                          }
                      })
                      ) : (
                      <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
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
      <EditAttendanceDialog
        isOpen={isEditAttendanceOpen}
        setIsOpen={setIsEditAttendanceOpen}
        record={editAttendanceRecord}
        employees={employees || null}
        onSave={handleSaveEditAttendance}
      />
      <EditAbsenceDialog
        isOpen={isEditAbsenceOpen}
        setIsOpen={setIsEditAbsenceOpen}
        record={editAbsenceRecord}
        employees={employees || null}
        onSave={handleSaveEditAbsence}
      />
      <DeleteLogItemAlert
        isOpen={isDeleteAlertOpen}
        setIsOpen={setIsDeleteAlertOpen}
        item={itemToDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}

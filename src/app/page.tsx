
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
  AlertCircle,
  CheckCircle2,
  Clock3,
  Sparkles,
  Pencil,
  Trash2,
  FileText
} from "lucide-react";
import { Clock } from "@/components/clock";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  hasDoctorLetter: z.boolean().optional(),
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      hasDoctorLetter: false,
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (isOpen) {
        reset({ date: format(new Date(), "yyyy-MM-dd"), employeeId: '', status: undefined, hasDoctorLetter: false, notes: '' });
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

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200">
            💡 <strong>Catatan:</strong> Form ini untuk karyawan yang <strong>tidak hadir seharian penuh</strong>. Jika karyawan sempat masuk lalu sakit atau izin pulang lebih awal di tengah hari, gunakan tombol <strong>Pulang Awal / Sakit Tengah Hari</strong> di dashboard.
          </div>

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
            {selectedStatus === 'sakit' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Surat Keterangan Dokter
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Bebas potongan gaji (izin sakit resmi)
                    </p>
                  </div>
                  <Controller
                    name="hasDoctorLetter"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            )}
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
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_ROWS_PER_PAGE = 10;

  // Reset history page when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilter, historyEmployeeFilter]);
  
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isAbsenceFormOpen, setIsAbsenceFormOpen] = useState(false);
  const [isEarlyDepartureDialogOpen, setIsEarlyDepartureDialogOpen] = useState(false);
  const [earlyDepartureReason, setEarlyDepartureReason] = useState<'sakit' | 'izin' | 'dinas' | 'lainnya'>('sakit');
  const [earlyDepartureHasDoctorLetter, setEarlyDepartureHasDoctorLetter] = useState<boolean>(false);
  const [earlyDepartureTime, setEarlyDepartureTime] = useState<string>("11:30");
  const [earlyDepartureNotes, setEarlyDepartureNotes] = useState<string>("");
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

  const handleEarlyDeparture = () => {
    if (!firestore || !selectedEmployeeId || !currentEmployeeRecord) {
      toast({
        title: "Error",
        description: "Karyawan ini belum absen masuk.",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = earlyDepartureTime.split(':').map(Number);
    const clockInDate = parseISO(currentEmployeeRecord.clockIn);
    const clockOutTime = new Date(clockInDate);
    clockOutTime.setHours(hours, minutes, 0, 0);

    if (clockOutTime <= clockInDate) {
      toast({
        title: "Error",
        description: "Waktu kepulangan awal harus lebih akhir dari waktu absen masuk.",
        variant: "destructive",
      });
      return;
    }

    const docRef = doc(firestore, "attendance", currentEmployeeRecord.id);
    const finalNotes = earlyDepartureNotes.trim() || notes.trim() || undefined;
    const isDoctorLetter = earlyDepartureReason === 'sakit' ? earlyDepartureHasDoctorLetter : false;

    setDocumentNonBlocking(
      docRef,
      {
        clockOut: clockOutTime.toISOString(),
        earlyDepartureReason: earlyDepartureReason,
        hasDoctorLetter: isDoctorLetter,
        notes: finalNotes || "",
      },
      { merge: true }
    );

    const reasonLabels: Record<string, string> = {
      sakit: isDoctorLetter ? "Sakit di Tempat Kerja (Surat Dokter)" : "Sakit di Tempat Kerja",
      izin: "Izin Pulang Lebih Awal",
      dinas: "Tugas Luar / Dinas",
      lainnya: "Pulang Lebih Awal",
    };

    toast({
      title: "Kepulangan Awal Dicatat",
      description: `${selectedEmployee?.name} dicatat pulang awal pukul ${format(clockOutTime, "p")} (${reasonLabels[earlyDepartureReason] || earlyDepartureReason}).`,
    });

    setIsEarlyDepartureDialogOpen(false);
    setEarlyDepartureNotes("");
    setEarlyDepartureHasDoctorLetter(false);
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

    const newRecord: Omit<AbsenceRecord, 'id'> = {
      employeeId,
      date: dateStr,
      status,
      hasDoctorLetter: status === 'sakit' ? Boolean(data.hasDoctorLetter) : false,
      notes: absenceNotes
    };
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
  
  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getStatus = (record: WithId<AttendanceRecord>) => {
    const clockInTime = parseISO(record.clockIn);
    
    const lateThreshold = settings?.lateThresholdTime || "07:35";
    const [hours, minutes] = lateThreshold.split(':').map(Number);
    const lateTime = new Date(clockInTime);
    lateTime.setHours(hours, minutes, 0, 0); 

    if (record.clockOut) {
        if (record.earlyDepartureReason) {
          switch (record.earlyDepartureReason) {
            case 'sakit':
              if (record.hasDoctorLetter) {
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <FileText className="w-3 h-3 text-emerald-600 shrink-0" />
                    Sakit (Surat Dokter)
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  Sakit (Pulang Awal)
                </span>
              );
            case 'izin':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                  Izin Pulang Awal
                </span>
              );
            case 'dinas':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Tugas Luar
                </span>
              );
            default:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Pulang Awal
                </span>
              );
          }
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Sudah Pulang
          </span>
        );
    }
    if (isAfter(clockInTime, lateTime)) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Terlambat
          </span>
        );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        Sudah Masuk
      </span>
    );
  };

  const getAbsenceStatusBadge = (status: AbsenceRecord['status'], hasDoctorLetter?: boolean) => {
    switch (status) {
        case 'sakit': 
          if (hasDoctorLetter) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <FileText className="w-3 h-3 text-emerald-600 shrink-0" />
                Sakit (Surat Dokter)
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Sakit (Tanpa Surat)
            </span>
          );
        case 'izin': 
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              Izin
            </span>
          );
        case 'alpa': 
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              Alpa
            </span>
          );
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
        if (data.earlyDepartureReason) {
          updatePayload.earlyDepartureReason = data.earlyDepartureReason;
          if (data.earlyDepartureReason === 'sakit' && data.hasDoctorLetter) {
            updatePayload.hasDoctorLetter = true;
          } else {
            updatePayload.hasDoctorLetter = deleteField();
          }
        } else {
          updatePayload.earlyDepartureReason = deleteField();
          updatePayload.hasDoctorLetter = deleteField();
        }
      } else {
        updatePayload.clockOut = deleteField();
        updatePayload.earlyDepartureReason = deleteField();
        updatePayload.hasDoctorLetter = deleteField();
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
      if (data.status === 'sakit' && data.hasDoctorLetter) {
        updatePayload.hasDoctorLetter = true;
      } else {
        updatePayload.hasDoctorLetter = deleteField();
      }
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

  const totalHistoryPages = Math.ceil(historyLogItems.length / HISTORY_ROWS_PER_PAGE);
  const paginatedHistoryLogItems = useMemo(() => {
    const startIndex = (historyPage - 1) * HISTORY_ROWS_PER_PAGE;
    return historyLogItems.slice(startIndex, startIndex + HISTORY_ROWS_PER_PAGE);
  }, [historyLogItems, historyPage]);

  const isLoading = isUserLoading || isLoadingEmployees || isLoadingSelectedDate || isLoadingAbsences || isLoadingHistory || isLoadingHistoryAbsences || isLoadingHolidays || isLoadingSettings;
  
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-full" />
            <Skeleton className="h-8 w-72 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl border border-border/60 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 glass-card rounded-2xl border border-border/60 p-6 space-y-6">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
              <div className="flex gap-3">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card rounded-2xl border border-border/60 p-5 space-y-4">
              <Skeleton className="h-6 w-36" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-border/60 p-6">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Presensi Real-Time
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-headline tracking-tight text-foreground">
              Pusat Kehadiran & Operasional
            </h1>
            <p className="text-sm text-muted-foreground">
              Pantau presensi, kelola pencatatan real-time, dan monitor kepatuhan kerja karyawan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2.5 text-xs text-muted-foreground border border-border/60 shadow-sm">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
              </span>
            </div>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Karyawan Hadir */}
          <div className="relative overflow-hidden rounded-2xl glass-card border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-background/80 to-background/50 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Karyawan Hadir</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/25">
                Hari Ini
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display tracking-tight text-foreground">
                {dailySummary.presentEmployees}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                / {dailySummary.totalActiveEmployees} Karyawan
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Rasio Kehadiran</span>
                <span className="font-semibold text-primary">{dailySummary.attendancePercentage}%</span>
              </div>
              <Progress value={dailySummary.attendancePercentage} className="h-1.5 bg-muted/60" />
            </div>
          </div>

          {/* Card 2: Karyawan Terlambat */}
          <div className="relative overflow-hidden rounded-2xl glass-card border border-rose-500/25 bg-gradient-to-br from-rose-500/[0.07] via-background/80 to-background/50 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Karyawan Terlambat</span>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                dailySummary.lateEmployees > 0 
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" 
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {dailySummary.lateEmployees > 0 ? "Perlu Review" : "Optimal"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={cn("text-3xl font-extrabold font-display tracking-tight", dailySummary.lateEmployees > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                {dailySummary.lateEmployees}
              </span>
              <span className="text-sm font-medium text-muted-foreground">Karyawan</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <AlarmClock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span>Melebihi batas toleransi jam masuk</span>
            </p>
          </div>

          {/* Card 3: Tidak Hadir / Izin */}
          <div className="relative overflow-hidden rounded-2xl glass-card border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] via-background/80 to-background/50 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Izin / Sakit / Off</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Terjadwal
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display tracking-tight text-foreground">
                {dailySummary.absentEmployees}
              </span>
              <span className="text-sm font-medium text-muted-foreground">Karyawan</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <UserX className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Cuti, izin sakit, atau libur</span>
            </p>
          </div>

          {/* Card 4: Total Karyawan Aktif */}
          <div className="relative overflow-hidden rounded-2xl glass-card border border-secondary/25 bg-gradient-to-br from-secondary/[0.07] via-background/80 to-background/50 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tim Aktif</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Status OK
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display tracking-tight text-foreground">
                {dailySummary.totalActiveEmployees}
              </span>
              <span className="text-sm font-medium text-muted-foreground">Terdaftar</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-secondary shrink-0" />
              <span>Semua divisi operasional aktif</span>
            </p>
          </div>
        </div>

        {/* 7:5 Main Split */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column (7 cols): Absensi Cepat */}
          <div className="lg:col-span-7 glass-card rounded-2xl border border-border/80 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-sky-600 flex items-center justify-center text-white shadow-md shadow-primary/20">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-headline text-foreground">Pencatatan Presensi Cepat</h2>
                  <p className="text-xs text-muted-foreground">Pilih karyawan untuk sinkronisasi otomatis waktu & status</p>
                </div>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" /> Auto-sync 07:30 / 18:00
              </div>
            </div>

            {/* Embedded Chronometer */}
            <Clock />

            {/* Attendance Form */}
            <div className="space-y-5 pt-2">
              {/* Employee Selection */}
              <div className="space-y-2">
                <Label htmlFor="employee-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pilih Karyawan
                </Label>
                <div className="flex items-center gap-2">
                  <Popover open={isEmployeePickerOpen} onOpenChange={setIsEmployeePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isEmployeePickerOpen}
                        className="w-full justify-between h-11 rounded-xl border-border/80 hover:bg-surface-container-high transition-all"
                      >
                        {selectedEmployeeId ? (
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-6 h-6 rounded-md bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                              {getInitials(activeEmployees?.find((e) => e.id === selectedEmployeeId)?.name)}
                            </div>
                            <span className="font-medium text-foreground">
                              {activeEmployees?.find((e) => e.id === selectedEmployeeId)?.name}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              • {activeEmployees?.find((e) => e.id === selectedEmployeeId)?.position}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Pilih seorang karyawan...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-xl border-border/80">
                      <Command>
                        <CommandInput placeholder="Cari karyawan berdasarkan nama..." ref={searchInputRef} />
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
                                className="flex items-center gap-2 py-2"
                              >
                                <Check
                                  className={cn(
                                    "h-4 w-4 text-primary",
                                    selectedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="w-6 h-6 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {getInitials(employee.name)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm text-foreground">{employee.name}</span>
                                  <span className="text-xs text-muted-foreground">{employee.position}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setIsEmployeeFormOpen(true)} 
                    disabled={isLoadingEmployees} 
                    aria-label="Tambah Karyawan Baru"
                    className="h-11 w-11 rounded-xl shrink-0 border-border/80 hover:bg-surface-container-high hover:text-primary transition-all"
                    title="Tambah Karyawan Baru"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Status Kartu Absensi Karyawan Terpilih */}
              {selectedEmployeeId && (
                <div className={cn(
                  "rounded-xl border p-4 transition-all text-sm",
                  isSelectedDateHoliday
                    ? "border-yellow-400/50 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200"
                    : hasAbsenceOnSelectedDate
                    ? "border-rose-400/50 bg-rose-500/10 text-rose-900 dark:text-rose-200"
                    : hasCompletedAttendanceOnSelectedDate
                    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                    : currentEmployeeRecord
                    ? "border-sky-400/50 bg-sky-500/10 text-sky-900 dark:text-sky-200"
                    : "border-slate-300 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200"
                )}>
                  {isSelectedDateHoliday ? (
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="font-bold">Hari Libur Nasional / Kantor</p>
                        <p className="text-xs opacity-90">
                          Tanggal yang dipilih merupakan hari libur. Penginputan absensi dinonaktifkan.
                        </p>
                      </div>
                    </div>
                  ) : hasAbsenceOnSelectedDate ? (
                    <div className="flex items-center gap-3">
                      <UserX className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <div>
                        <p className="font-bold">
                          Tercatat Tidak Hadir: {currentEmployeeAbsence?.status ? currentEmployeeAbsence.status.toUpperCase() : 'IZIN/SAKIT'}
                        </p>
                        <p className="text-xs opacity-90">
                          <strong>{selectedEmployee?.name}</strong> sudah ditandai tidak hadir pada tanggal ini. Form absensi dinonaktifkan.
                        </p>
                      </div>
                    </div>
                  ) : hasCompletedAttendanceOnSelectedDate ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="font-bold">Absensi Hari Ini Lengkap</p>
                        <p className="text-xs opacity-90">
                          <strong>{selectedEmployee?.name}</strong> sudah tercatat Masuk ({currentCompletedAttendanceRecord?.clockIn ? format(parseISO(currentCompletedAttendanceRecord.clockIn), 'HH:mm') : '-'} WIB) dan Pulang ({currentCompletedAttendanceRecord?.clockOut ? format(parseISO(currentCompletedAttendanceRecord.clockOut), 'HH:mm') : '-'} WIB). Input jam dinonaktifkan.
                        </p>
                      </div>
                    </div>
                  ) : currentEmployeeRecord ? (
                    <div className="flex items-center gap-3">
                      <Clock3 className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
                      <div>
                        <p className="font-bold">Sudah Masuk • Siap Absen Pulang</p>
                        <p className="text-xs opacity-90">
                          <strong>{selectedEmployee?.name}</strong> tercatat masuk pukul <strong>{format(parseISO(currentEmployeeRecord.clockIn), 'HH:mm')} WIB</strong>. Jam disetel otomatis ke <strong>18:00 WIB (06:00 PM)</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <LogIn className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="font-bold">Belum Absen Masuk</p>
                        <p className="text-xs opacity-90">
                          <strong>{selectedEmployee?.name}</strong> belum memiliki catatan absensi hari ini. Jam disetel otomatis ke <strong>07:30 WIB (07:30 AM)</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tanggal & Waktu Inputs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="attendance-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tanggal Presensi
                  </Label>
                  <Input
                    id="attendance-date"
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full h-11 rounded-xl border-border/80"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="attendance-time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Jam Presensi
                    </Label>
                    {timeInfo && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-md",
                          timeInfo.isMorning
                            ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : "border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
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
                      "w-full h-11 rounded-xl font-mono text-base transition-colors border-border/80",
                      isTimeInputDisabled && "cursor-not-allowed bg-muted/60 opacity-80"
                    )}
                  />
                </div>
              </div>

              {/* Preset Waktu Cepat 1-Klik */}
              {!isTimeInputDisabled && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1 font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Preset Cepat:
                  </span>
                  {!currentEmployeeRecord ? (
                    <>
                      <Button
                        type="button"
                        variant={manualTime === "07:30" ? "secondary" : "outline"}
                        size="sm"
                        className={cn("h-7 px-2.5 text-xs rounded-lg transition-all", manualTime === "07:30" && "bg-primary/15 text-primary font-semibold border-primary/30")}
                        onClick={() => setManualTime("07:30")}
                      >
                        07:30 Pagi (Standar)
                      </Button>
                      <Button
                        type="button"
                        variant={manualTime === "08:00" ? "secondary" : "outline"}
                        size="sm"
                        className={cn("h-7 px-2.5 text-xs rounded-lg transition-all", manualTime === "08:00" && "bg-primary/15 text-primary font-semibold border-primary/30")}
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
                        className={cn("h-7 px-2.5 text-xs rounded-lg transition-all", manualTime === "18:00" && "bg-primary/15 text-primary font-semibold border-primary/30")}
                        onClick={() => setManualTime("18:00")}
                      >
                        18:00 Sore (Standar)
                      </Button>
                      <Button
                        type="button"
                        variant={manualTime === "17:00" ? "secondary" : "outline"}
                        size="sm"
                        className={cn("h-7 px-2.5 text-xs rounded-lg transition-all", manualTime === "17:00" && "bg-primary/15 text-primary font-semibold border-primary/30")}
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
                    className="h-7 px-2.5 text-xs rounded-lg border-border/80"
                    onClick={() => setManualTime(format(new Date(), "HH:mm"))}
                  >
                    Jam Sekarang
                  </Button>
                </div>
              )}

              {/* Peringatan Cerdas Jika Kemungkinan AM/PM Tertukar */}
              {showClockInWarning && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Jam masuk terdeteksi <strong>{timeInfo?.partOfDay} ({timeInfo?.hours12})</strong>. Apakah maksud Anda <strong>07:30 Pagi</strong>?
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManualTime("07:30")}
                    className="h-7 text-xs border-amber-400/60 bg-background/90 hover:bg-amber-100 dark:hover:bg-amber-950 shrink-0 rounded-lg font-medium"
                  >
                    Ubah ke 07:30 Pagi
                  </Button>
                </div>
              )}

              {showClockOutWarning && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Jam pulang terdeteksi <strong>Pagi ({timeInfo?.hours12})</strong>. Apakah maksud Anda <strong>18:00 Sore (06:00 PM)</strong>?
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManualTime("18:00")}
                    className="h-7 text-xs border-amber-400/60 bg-background/90 hover:bg-amber-100 dark:hover:bg-amber-950 shrink-0 rounded-lg font-medium"
                  >
                    Ubah ke 18:00 Sore
                  </Button>
                </div>
              )}
              
              {/* Catatan Field */}
              <div className="space-y-2">
                <Label htmlFor="attendance-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id="attendance-notes"
                  placeholder="Tambahkan keterangan tugas luar, lembur, atau catatan khusus..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isTimeInputDisabled}
                  className="rounded-xl border-border/80 resize-none h-20"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-3">
                <div className="flex w-full flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleClockIn} 
                    disabled={!selectedEmployeeId || !!currentEmployeeRecord || hasCompletedAttendanceOnSelectedDate || hasAbsenceOnSelectedDate || isSelectedDateHoliday} 
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:from-primary/90 hover:to-sky-700 text-white font-semibold shadow-md shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    <LogIn className="mr-2 h-4 w-4" /> Absen Masuk
                  </Button>
                  <Button 
                    onClick={handleClockOut} 
                    disabled={!selectedEmployeeId || !currentEmployeeRecord || hasCompletedAttendanceOnSelectedDate || hasAbsenceOnSelectedDate || isSelectedDateHoliday} 
                    variant="outline" 
                    className="w-full h-11 rounded-xl border-border/80 hover:bg-surface-container-high font-semibold transition-all disabled:opacity-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Absen Pulang
                  </Button>
                </div>

                {/* Tombol Pulang Awal / Sakit Tengah Hari */}
                {currentEmployeeRecord && !hasCompletedAttendanceOnSelectedDate && (
                  <Button
                    type="button"
                    onClick={() => {
                      setEarlyDepartureTime(format(new Date(), "HH:mm"));
                      setEarlyDepartureNotes(notes || "");
                      setEarlyDepartureReason("sakit");
                      setEarlyDepartureHasDoctorLetter(false);
                      setIsEarlyDepartureDialogOpen(true);
                    }}
                    disabled={!selectedEmployeeId || isSelectedDateHoliday}
                    variant="outline"
                    className="w-full h-11 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold transition-all shadow-sm"
                  >
                    <AlertCircle className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Pulang Awal / Sakit Tengah Hari
                  </Button>
                )}

                <Button 
                  onClick={() => setIsAbsenceFormOpen(true)}
                  disabled={isLoadingEmployees || !selectedEmployeeId || hasCompletedAttendanceOnSelectedDate || hasAbsenceOnSelectedDate || isSelectedDateHoliday}
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-container-high border border-border/60 transition-all"
                >
                  <UserX className="mr-2 h-4 w-4 text-amber-500" /> Tandai Ketidakhadiran (Sakit / Izin / Cuti)
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Aktivitas Hari Ini & Ringkasan Kepatuhan */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card Aktivitas Hari Ini */}
            <div className="glass-card rounded-2xl border border-border/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {dailyLogItems.length}
                  </div>
                  <div>
                    <h3 className="font-bold font-headline text-foreground text-sm">Aktivitas Tanggal Dipilih</h3>
                    <p className="text-[11px] text-muted-foreground">Catatan presensi & izin</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] font-normal rounded-lg border-border/80">
                  {format(parseISO(manualDate), "dd MMM yyyy", { locale: id })}
                </Badge>
              </div>

              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {isLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Memuat aktivitas...</div>
                ) : dailyLogItems.length > 0 ? (
                  dailyLogItems.map((record) => {
                    const employeeName = getEmployeeName(record.employeeId);
                    return (
                      <div
                        key={record.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/40 hover:border-border/80 hover:bg-surface-container-high/50 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-secondary/15 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(employeeName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate text-foreground">{employeeName}</div>
                            {record.type === 'attendance' ? (
                              <div className="text-xs text-muted-foreground">
                                {record.clockOut 
                                  ? `${format(parseISO(record.clockIn), 'p')} - ${format(parseISO(record.clockOut), 'p')}`
                                  : `Masuk: ${format(parseISO(record.clockIn), 'p')}`}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {getAbsenceStatusBadge(record.status, record.hasDoctorLetter)}
                              </div>
                            )}
                            {record.notes && (
                              <p className="text-[11px] text-muted-foreground/80 truncate italic mt-0.5" title={record.notes}>
                                {record.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {record.type === 'attendance' && (
                            <div className="mr-1 hidden sm:block">
                              {getStatus(record)}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            onClick={() => handleOpenEdit(record)}
                            title="Edit Data"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-rose-500/10"
                            onClick={() => handleOpenDelete(record)}
                            title="Hapus Data"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Hapus</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-muted-foreground py-10 space-y-1">
                    <p className="font-medium text-foreground">Belum ada catatan aktivitas.</p>
                    <p>
                      {manualDate === format(new Date(), "yyyy-MM-dd") 
                        ? "Belum ada karyawan yang absen hari ini." 
                        : "Tidak ada data untuk tanggal ini."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card Ringkasan & Kepatuhan Presensi */}
            <div className="glass-card rounded-2xl border border-border/80 p-5 space-y-3 shadow-sm bg-gradient-to-br from-background/90 via-surface-container-low/40 to-background/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Kepatuhan Presensi Tim</h4>
                </div>
                <span className="text-xs font-semibold text-primary">Target: 95%</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-display text-foreground">
                  {dailySummary.attendancePercentage}%
                </span>
                <span className="text-xs text-muted-foreground">karyawan hadir sesuai jadwal</span>
              </div>
              <Progress value={dailySummary.attendancePercentage} className="h-2 bg-muted/60" />
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                Catatan: Anda dapat menggunakan tombol <strong>Edit</strong> atau <strong>Hapus</strong> pada log jika terdapat koreksi jam kerja karyawan.
              </p>
            </div>
          </div>
        </div>

        {/* Tabel: Riwayat Aktivitas Keseluruhan */}
        <div className="glass-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold font-headline text-foreground">Riwayat Aktivitas Keseluruhan</h3>
              <p className="text-xs text-muted-foreground">Telusuri catatan presensi lintas karyawan dan rentang waktu</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Select value={historyEmployeeFilter} onValueChange={setHistoryEmployeeFilter}>
                <SelectTrigger className="w-[180px] h-9 rounded-xl border-border/80 text-xs">
                  <SelectValue placeholder="Filter karyawan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80">
                  <SelectItem value="all">Semua Karyawan</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={historyFilter} onValueChange={setHistoryFilter}>
                <SelectTrigger className="w-[160px] h-9 rounded-xl border-border/80 text-xs">
                  <SelectValue placeholder="Rentang waktu" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80">
                  <SelectItem value="3">3 hari terakhir</SelectItem>
                  <SelectItem value="7">7 hari terakhir</SelectItem>
                  <SelectItem value="30">30 hari terakhir</SelectItem>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/90 dark:bg-slate-900/95 border-b border-border/80">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Karyawan</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Tanggal</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Masuk</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Pulang</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Catatan</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase tracking-wider w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory || isLoadingHistoryAbsences ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Memuat riwayat aktivitas...
                    </TableCell>
                  </TableRow>
                ) : paginatedHistoryLogItems.length > 0 ? (
                  paginatedHistoryLogItems.map((record) => {
                    const employee = employees?.find(e => e.id === record.employeeId);
                    if (record.type === 'attendance') {
                        const clockInTime = parseISO(record.clockIn);
                        const lateThreshold = settings?.lateThresholdTime || "07:35";
                        const [hours, minutes] = lateThreshold.split(':').map(Number);
                        const lateTime = new Date(clockInTime);
                        lateTime.setHours(hours, minutes, 0, 0); 
                        const isRecordLate = isAfter(clockInTime, lateTime);
                        return (
                          <TableRow key={record.id} className={cn("border-border/40 transition-colors", isRecordLate && "bg-destructive/[0.04]")}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                  {getInitials(employee?.name)}
                                </div>
                                <span className="font-semibold text-foreground text-sm">{employee?.name || 'Tidak diketahui'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {format(parseISO(record.clockIn), "dd MMM yyyy", { locale: id })}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              <span className={cn(isRecordLate && "text-rose-600 dark:text-rose-400 font-semibold")}>
                                {format(parseISO(record.clockIn), "p")}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {record.clockOut ? format(parseISO(record.clockOut), "p") : " - "}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{record.notes || "-"}</TableCell>
                            <TableCell>{getStatus(record)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                  onClick={() => handleOpenEdit(record)}
                                  title="Edit Data"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-rose-500/10"
                                  onClick={() => handleOpenDelete(record)}
                                  title="Hapus Data"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="sr-only">Hapus</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                    } else { // type is 'absence'
                         return (
                          <TableRow key={record.id} className="border-border/40 bg-muted/[0.15]">
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                                  {getInitials(employee?.name)}
                                </div>
                                <span className="font-semibold text-foreground text-sm">{employee?.name || 'Tidak diketahui'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {format(parseISO(record.date), "dd MMM yyyy", { locale: id })}
                            </TableCell>
                            <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">-</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{record.notes || "-"}</TableCell>
                            <TableCell>{getAbsenceStatusBadge(record.status, record.hasDoctorLetter)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                  onClick={() => handleOpenEdit(record)}
                                  title="Edit Data"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-rose-500/10"
                                  onClick={() => handleOpenDelete(record)}
                                  title="Hapus Data"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic text-sm">
                      Tidak ada catatan ditemukan untuk filter yang dipilih.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Pagination Footer */}
          {historyLogItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/50 gap-3">
              <div className="text-xs text-muted-foreground">
                Menampilkan <strong>{paginatedHistoryLogItems.length}</strong> dari <strong>{historyLogItems.length}</strong> total aktivitas
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs rounded-lg border-border/80"
                  onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                  disabled={historyPage === 1}
                >
                  Sebelumnya
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  Halaman {historyPage} dari {totalHistoryPages > 0 ? totalHistoryPages : 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs rounded-lg border-border/80"
                  onClick={() => setHistoryPage((prev) => Math.min(prev + 1, totalHistoryPages))}
                  disabled={historyPage === totalHistoryPages || totalHistoryPages === 0}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Dialogs */}
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

      {/* Dialog Pulang Awal / Sakit Tengah Hari */}
      <Dialog open={isEarlyDepartureDialogOpen} onOpenChange={setIsEarlyDepartureDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Pulang Awal / Sakit di Tengah Hari
            </DialogTitle>
            <DialogDescription>
              Catat waktu kepulangan lebih awal untuk karyawan yang sedang bertugas hari ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border/80 bg-surface-container-low/50 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Karyawan:</span>
                <span className="font-semibold text-foreground">{selectedEmployee?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waktu Masuk:</span>
                <span className="font-mono font-medium text-foreground">
                  {currentEmployeeRecord ? format(parseISO(currentEmployeeRecord.clockIn), "HH:mm") : "-"} WIB
                </span>
              </div>
            </div>

            {/* Pilihan Alasan */}
            <div className="space-y-1.5">
              <Label htmlFor="early-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Alasan Kepulangan
              </Label>
              <Select
                value={earlyDepartureReason}
                onValueChange={(val) => setEarlyDepartureReason(val as 'sakit' | 'izin' | 'dinas' | 'lainnya')}
              >
                <SelectTrigger id="early-reason" className="h-11 rounded-xl border-border/80">
                  <SelectValue placeholder="Pilih alasan..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 shadow-xl">
                  <SelectItem value="sakit">🤒 Sakit di Tempat Kerja</SelectItem>
                  <SelectItem value="izin">📝 Izin Pulang Lebih Awal (Urusan Mendesak)</SelectItem>
                  <SelectItem value="dinas">🚗 Tugas Luar / Dinas Kantor</SelectItem>
                  <SelectItem value="lainnya">📌 Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Switch Surat Dokter jika alasan Sakit */}
            {earlyDepartureReason === 'sakit' && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Surat Keterangan Dokter
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Sakit dengan surat dokter bebas potongan gaji
                  </p>
                </div>
                <Switch
                  id="early-departure-doctor-letter"
                  checked={earlyDepartureHasDoctorLetter}
                  onCheckedChange={setEarlyDepartureHasDoctorLetter}
                />
              </div>
            )}

            {/* Jam Kepulangan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="early-time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Jam Keluar / Pulang
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-primary"
                  onClick={() => setEarlyDepartureTime(format(new Date(), "HH:mm"))}
                >
                  Gunakan Jam Sekarang ({format(new Date(), "HH:mm")})
                </Button>
              </div>
              <Input
                id="early-time"
                type="time"
                value={earlyDepartureTime}
                onChange={(e) => setEarlyDepartureTime(e.target.value)}
                className="h-11 rounded-xl border-border/80 font-mono text-base"
              />
            </div>

            {/* Catatan / Keterangan */}
            <div className="space-y-1.5">
              <Label htmlFor="early-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Keterangan Tambahan (Opsional)
              </Label>
              <Textarea
                id="early-notes"
                placeholder="Contoh: Mengalami demam tinggi, izin periksa ke dokter..."
                value={earlyDepartureNotes}
                onChange={(e) => setEarlyDepartureNotes(e.target.value)}
                rows={2}
                className="rounded-xl border-border/80 resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEarlyDepartureDialogOpen(false)}
              className="rounded-xl border-border/80"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleEarlyDeparture}
              className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-600/90 hover:to-amber-700/90 text-white font-semibold shadow-md shadow-amber-600/25"
            >
              Simpan Kepulangan Awal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

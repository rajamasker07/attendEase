"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Employee, AttendanceRecord, AbsenceRecord } from "@/types";
import type { WithId } from "@/firebase";
import { format, parseISO } from "date-fns";
import { Clock, Calendar, AlertTriangle, Loader2 } from "lucide-react";

/** Helper untuk menerjemahkan jam (HH:mm) ke label yang jelas (WIB, Pagi/Sore, AM/PM) */
function getTimeDescriptor(timeStr: string) {
  if (!timeStr || !timeStr.includes(":")) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;

  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const formatted12 = `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;

  let partOfDay = "Pagi";
  if (h >= 0 && h < 4) partOfDay = "Dini Hari";
  else if (h >= 4 && h < 11) partOfDay = "Pagi";
  else if (h >= 11 && h < 15) partOfDay = "Siang";
  else if (h >= 15 && h < 18) partOfDay = "Sore";
  else partOfDay = "Malam";

  return {
    hours24: `${hStr.padStart(2, "0")}:${mStr.padStart(2, "0")}`,
    hours12: formatted12,
    partOfDay,
    period,
    hour: h,
  };
}

export interface AttendanceEditData {
  employeeId: string;
  clockIn: string; // ISO
  clockOut?: string | null; // ISO or null
  notes?: string;
}

interface EditAttendanceDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  record: WithId<AttendanceRecord> | null;
  employees: WithId<Employee>[] | null;
  onSave: (id: string, data: AttendanceEditData) => Promise<void> | void;
}

export function EditAttendanceDialog({
  isOpen,
  setIsOpen,
  record,
  employees,
  onSave,
}: EditAttendanceDialogProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [clockInTime, setClockInTime] = useState("07:30");
  const [hasClockOut, setHasClockOut] = useState(false);
  const [clockOutTime, setClockOutTime] = useState("18:00");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (record && isOpen) {
      setEmployeeId(record.employeeId);
      try {
        const inDate = parseISO(record.clockIn);
        setDate(format(inDate, "yyyy-MM-dd"));
        setClockInTime(format(inDate, "HH:mm"));

        if (record.clockOut) {
          const outDate = parseISO(record.clockOut);
          setHasClockOut(true);
          setClockOutTime(format(outDate, "HH:mm"));
        } else {
          setHasClockOut(false);
          setClockOutTime("18:00");
        }
      } catch (e) {
        console.error("Error parsing date in EditAttendanceDialog", e);
      }
      setNotes(record.notes || "");
      setError(null);
    }
  }, [record, isOpen]);

  const clockInInfo = useMemo(() => getTimeDescriptor(clockInTime), [clockInTime]);
  const clockOutInfo = useMemo(() => getTimeDescriptor(clockOutTime), [clockOutTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!record) return;
    if (!employeeId) {
      setError("Silakan pilih karyawan.");
      return;
    }
    if (!date) {
      setError("Tanggal absensi harus diisi.");
      return;
    }
    if (!clockInTime) {
      setError("Jam masuk harus diisi.");
      return;
    }

    try {
      const [year, month, day] = date.split("-").map(Number);
      const [inHours, inMinutes] = clockInTime.split(":").map(Number);
      const inDateObj = new Date(year, month - 1, day, inHours, inMinutes, 0, 0);

      let clockOutISO: string | null = null;
      if (hasClockOut) {
        if (!clockOutTime) {
          setError("Jam pulang harus diisi jika opsi absen pulang diaktifkan.");
          return;
        }
        const [outHours, outMinutes] = clockOutTime.split(":").map(Number);
        const outDateObj = new Date(year, month - 1, day, outHours, outMinutes, 0, 0);

        if (outDateObj <= inDateObj) {
          setError("Jam pulang harus lebih akhir dari jam masuk.");
          return;
        }
        clockOutISO = outDateObj.toISOString();
      }

      setIsSubmitting(true);
      await onSave(record.id, {
        employeeId,
        clockIn: inDateObj.toISOString(),
        clockOut: clockOutISO,
        notes: notes.trim(),
      });
      setIsSubmitting(false);
      setIsOpen(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || "Terjadi kesalahan saat menyimpan data absensi.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Data Absensi</DialogTitle>
            <DialogDescription>
              Koreksi data karyawan, tanggal, jam masuk, atau jam pulang untuk data absensi ini.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 py-4">
            {/* Pilih Karyawan */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-employee" className="text-right text-xs sm:text-sm font-medium">
                Karyawan
              </Label>
              <div className="col-span-3">
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger id="edit-employee" className="rounded-xl border-border/80 h-10">
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/80 shadow-xl">
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.status === "tidak aktif" ? "(Tidak Aktif)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tanggal Absen */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-date" className="text-right text-xs sm:text-sm font-medium flex items-center justify-end gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Tanggal
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl border-border/80 h-10"
                  required
                />
              </div>
            </div>

            {/* Jam Masuk */}
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="text-right pt-2">
                <Label htmlFor="edit-clockIn" className="text-xs sm:text-sm font-medium flex items-center justify-end gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Masuk
                </Label>
              </div>
              <div className="col-span-3 space-y-1.5">
                <Input
                  id="edit-clockIn"
                  type="time"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  className="rounded-xl border-border/80 h-10 font-mono"
                  required
                />
                {clockInInfo && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground rounded-md">
                      {clockInInfo.hours24} WIB ({clockInInfo.partOfDay} • {clockInInfo.hours12})
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Opsi Jam Pulang */}
            <div className="grid grid-cols-4 items-center gap-4 pt-1">
              <Label htmlFor="toggle-clockOut" className="text-right text-xs sm:text-sm font-medium">
                Jam Pulang
              </Label>
              <div className="col-span-3 flex items-center justify-between rounded-xl border border-border/80 p-3 bg-surface-container-low/40">
                <div className="space-y-0.5">
                  <Label htmlFor="toggle-clockOut" className="text-xs font-semibold cursor-pointer">
                    Sudah Absen Pulang?
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {hasClockOut ? "Jam pulang tercatat" : "Belum pulang / pulang belum dicatat"}
                  </p>
                </div>
                <Switch
                  id="toggle-clockOut"
                  checked={hasClockOut}
                  onCheckedChange={setHasClockOut}
                />
              </div>
            </div>

            {/* Input Jam Pulang jika diaktifkan */}
            {hasClockOut && (
              <div className="grid grid-cols-4 items-start gap-4">
                <div className="text-right pt-2">
                  <Label htmlFor="edit-clockOut" className="text-xs sm:text-sm font-medium">
                    Waktu Pulang
                  </Label>
                </div>
                <div className="col-span-3 space-y-1.5">
                  <Input
                    id="edit-clockOut"
                    type="time"
                    value={clockOutTime}
                    onChange={(e) => setClockOutTime(e.target.value)}
                    className="rounded-xl border-border/80 h-10 font-mono"
                    required={hasClockOut}
                  />
                  {clockOutInfo && (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground rounded-md">
                        {clockOutInfo.hours24} WIB ({clockOutInfo.partOfDay} • {clockOutInfo.hours12})
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Catatan */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-notes" className="text-right text-xs sm:text-sm font-medium pt-2">
                Catatan
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="edit-notes"
                  placeholder="Catatan absensi (opsional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-xl border-border/80 resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="rounded-xl border-border/80">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:from-primary/90 text-white font-semibold shadow-md shadow-primary/25">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface AbsenceEditData {
  employeeId: string;
  date: string;
  status: "sakit" | "izin" | "alpa";
  notes?: string;
}

interface EditAbsenceDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  record: WithId<AbsenceRecord> | null;
  employees: WithId<Employee>[] | null;
  onSave: (id: string, data: AbsenceEditData) => Promise<void> | void;
}

export function EditAbsenceDialog({
  isOpen,
  setIsOpen,
  record,
  employees,
  onSave,
}: EditAbsenceDialogProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"sakit" | "izin" | "alpa">("izin");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (record && isOpen) {
      setEmployeeId(record.employeeId);
      setDate(record.date);
      setStatus(record.status);
      setNotes(record.notes || "");
      setError(null);
    }
  }, [record, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!employeeId) {
      setError("Silakan pilih karyawan.");
      return;
    }
    if (!date) {
      setError("Tanggal ketidakhadiran harus diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(record.id, {
        employeeId,
        date,
        status,
        notes: notes.trim(),
      });
      setIsSubmitting(false);
      setIsOpen(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || "Gagal menyimpan perubahan ketidakhadiran.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Data Ketidakhadiran</DialogTitle>
            <DialogDescription>
              Koreksi data status tidak hadir, tanggal, atau catatan untuk karyawan ini.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="absence-edit-employee" className="text-right text-xs sm:text-sm font-medium">
                Karyawan
              </Label>
              <div className="col-span-3">
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger id="absence-edit-employee" className="rounded-xl border-border/80 h-10">
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/80 shadow-xl">
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="absence-edit-date" className="text-right text-xs sm:text-sm font-medium">
                Tanggal
              </Label>
              <div className="col-span-3">
                <Input
                  id="absence-edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl border-border/80 h-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="absence-edit-status" className="text-right text-xs sm:text-sm font-medium">
                Status
              </Label>
              <div className="col-span-3">
                <Select
                  value={status}
                  onValueChange={(val: "sakit" | "izin" | "alpa") => setStatus(val)}
                >
                  <SelectTrigger id="absence-edit-status" className="rounded-xl border-border/80 h-10">
                    <SelectValue placeholder="Pilih status..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/80 shadow-xl">
                    <SelectItem value="sakit">Sakit</SelectItem>
                    <SelectItem value="izin">Izin</SelectItem>
                    <SelectItem value="alpa">Alpa (Tanpa Keterangan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="absence-edit-notes" className="text-right text-xs sm:text-sm font-medium pt-2">
                Catatan
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="absence-edit-notes"
                  placeholder="Catatan tambahan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-xl border-border/80 resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="rounded-xl border-border/80">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:from-primary/90 text-white font-semibold shadow-md shadow-primary/25">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface ItemToDelete {
  id: string;
  type: "attendance" | "absence";
  employeeName: string;
  date: string;
  details?: string;
}

interface DeleteLogItemAlertProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: ItemToDelete | null;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
}

export function DeleteLogItemAlert({
  isOpen,
  setIsOpen,
  item,
  onConfirm,
  isDeleting,
}: DeleteLogItemAlertProps) {
  if (!item) return null;

  const isAttendance = item.type === "attendance";

  return (
    <AlertDialog open={isOpen} onOpenChange={isDeleting ? undefined : setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Hapus Data {isAttendance ? "Absensi" : "Ketidakhadiran"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-1 text-sm text-foreground/80">
            <p>
              Apakah Anda yakin ingin menghapus catatan {isAttendance ? "kehadiran" : "ketidakhadiran"} untuk{" "}
              <strong>{item.employeeName}</strong> pada tanggal <strong>{item.date}</strong>
              {item.details ? ` (${item.details})` : ""}?
            </p>
            <p className="text-xs text-muted-foreground">
              Tindakan ini bersifat permanen dan data yang dihapus tidak dapat dipulihkan kembali.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isDeleting} className="rounded-xl border-border/80">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/25"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              "Ya, Hapus Data"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

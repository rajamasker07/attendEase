"use client";

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
import type { Employee } from "@/types";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { WithId } from "@/firebase";
import { format } from "date-fns";

const employeeSchema = z.object({
  name: z.string().min(2, "Nama minimal harus 2 karakter."),
  position: z.string().min(1, "Posisi harus dipilih."),
  joinDate: z.string().min(1, "Tanggal masuk harus diisi."),
  phone: z.string().min(10, "Nomor HP minimal 10 digit.").regex(/^\+?[0-9\s-]{10,}$/, "Format nomor HP tidak valid."),
  salary: z.coerce.number().min(0, "Gaji tidak boleh negatif."),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (data: EmployeeFormData) => void;
  employee: WithId<Employee> | null;
}

export function EmployeeFormDialog({
  isOpen,
  setIsOpen,
  onSave,
  employee,
}: EmployeeFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: "", position: "", phone: "", salary: 0, joinDate: "" },
  });

  useEffect(() => {
    if (isOpen && employee) {
      reset({ 
        name: employee.name, 
        position: employee.position,
        joinDate: employee.joinDate || format(new Date(), "yyyy-MM-dd"),
        phone: employee.phone || "",
        salary: employee.salary || 0,
      });
    } else if(isOpen && !employee) {
      reset({ name: "", position: "", phone: "", salary: 0, joinDate: format(new Date(), "yyyy-MM-dd") });
    }
  }, [employee, reset, isOpen]);

  const onSubmit: SubmitHandler<EmployeeFormData> = (data) => {
    onSave(data);
    setIsOpen(false);
    toast({
      title: "Berhasil",
      description: `Karyawan berhasil ${employee ? 'diperbarui' : 'ditambahkan'}.`,
    })
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {employee ? "Ubah Karyawan" : "Tambah Karyawan"}
            </DialogTitle>
            <DialogDescription>
              {employee
                ? "Perbarui detail karyawan."
                : "Tambahkan karyawan baru ke daftar Anda."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nama
              </Label>
              <div className="col-span-3">
                <Input id="name" {...register("name")} className="w-full" />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Posisi
              </Label>
              <div className="col-span-3">
                <Controller
                  name="position"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="position">
                        <SelectValue placeholder="Pilih posisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pelayanan">Pelayanan</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="pengantaran">Pengantaran</SelectItem>
                        <SelectItem value="staff gudang">Staff Gudang</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.position && <p className="text-destructive text-sm mt-1">{errors.position.message}</p>}
              </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="joinDate" className="text-right">
                Tgl. Masuk
              </Label>
              <div className="col-span-3">
                <Input id="joinDate" {...register("joinDate")} className="w-full" type="date" />
                {errors.joinDate && <p className="text-destructive text-sm mt-1">{errors.joinDate.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                No. HP
              </Label>
              <div className="col-span-3">
                <Input id="phone" {...register("phone")} className="w-full" type="tel" />
                {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salary" className="text-right">
                Gaji
              </Label>
              <div className="col-span-3">
                <Input id="salary" {...register("salary")} className="w-full" type="number" />
                {errors.salary && <p className="text-destructive text-sm mt-1">{errors.salary.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Simpan perubahan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


interface DeleteEmployeeAlertProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onConfirm: () => void;
    employeeName?: string;
}

export function DeleteEmployeeAlert({ isOpen, setIsOpen, onConfirm, employeeName }: DeleteEmployeeAlertProps) {
    const { toast } = useToast();
    
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
        toast({
            title: "Karyawan Dihapus",
            description: `${employeeName} telah dihapus.`,
            variant: "destructive"
        })
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus karyawan
                        <strong> {employeeName}</strong> dan data terkait secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
                      Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Employee } from "@/types";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { WithId } from "@/firebase";

const employeeSchema = z.object({
  name: z.string().min(2, "Nama minimal harus 2 karakter."),
  position: z.string().min(2, "Posisi minimal harus 2 karakter."),
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
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: "", position: "" },
  });

  useEffect(() => {
    if (isOpen && employee) {
      reset({ name: employee.name, position: employee.position });
    } else if(isOpen && !employee) {
      reset({ name: "", position: "" });
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
                <Input id="position" {...register("position")} className="w-full" />
                {errors.position && <p className="text-destructive text-sm mt-1">{errors.position.message}</p>}
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

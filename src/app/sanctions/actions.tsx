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
import { Textarea } from "@/components/ui/textarea";
import type { Sanction, Employee } from "@/types";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { WithId } from "@/firebase";
import { format } from "date-fns";
import { CurrencyInput } from "@/components/ui/currency-input";

const sanctionSchema = z.object({
  employeeId: z.string().min(1, "Karyawan harus dipilih."),
  date: z.string().min(1, "Tanggal harus diisi."),
  violation: z.string().min(3, "Pelanggaran minimal harus 3 karakter."),
  description: z.string().optional(),
  deduction: z.coerce.number().min(0, "Potongan tidak boleh negatif."),
});

export type SanctionFormData = z.infer<typeof sanctionSchema>;

interface SanctionFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (data: SanctionFormData) => void;
  sanction: WithId<Sanction> | null;
  employees: WithId<Employee>[] | null;
}

export function SanctionFormDialog({
  isOpen,
  setIsOpen,
  onSave,
  sanction,
  employees
}: SanctionFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SanctionFormData>({
    resolver: zodResolver(sanctionSchema),
    defaultValues: { employeeId: "", date: "", violation: "", description: "", deduction: 0 },
  });

  useEffect(() => {
    if (isOpen && sanction) {
      reset({ 
        employeeId: sanction.employeeId,
        date: sanction.date || format(new Date(), "yyyy-MM-dd"),
        violation: sanction.violation,
        description: sanction.description,
        deduction: sanction.deduction,
      });
    } else if(isOpen && !sanction) {
      reset({ employeeId: "", date: format(new Date(), "yyyy-MM-dd"), violation: "", description: "", deduction: 0 });
    }
  }, [sanction, reset, isOpen]);

  const onSubmit: SubmitHandler<SanctionFormData> = (data) => {
    onSave(data);
    setIsOpen(false);
    toast({
      title: "Berhasil",
      description: `Sanksi berhasil ${sanction ? 'diperbarui' : 'ditambahkan'}.`,
    })
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {sanction ? "Ubah Sanksi" : "Tambah Sanksi"}
            </DialogTitle>
            <DialogDescription>
              {sanction
                ? "Perbarui detail sanksi."
                : "Tambahkan sanksi baru untuk seorang karyawan."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employeeId" className="text-right">
                Karyawan
              </Label>
              <div className="col-span-3">
                <Controller
                  name="employeeId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!sanction}>
                      <SelectTrigger id="employeeId">
                        <SelectValue placeholder="Pilih karyawan" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.employeeId && <p className="text-destructive text-sm mt-1">{errors.employeeId.message}</p>}
              </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Tanggal
              </Label>
              <div className="col-span-3">
                <Input id="date" {...register("date")} className="w-full" type="date" />
                {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="violation" className="text-right">
                Pelanggaran
              </Label>
              <div className="col-span-3">
                <Input id="violation" {...register("violation")} className="w-full" placeholder="Cth: Seragam tidak lengkap"/>
                {errors.violation && <p className="text-destructive text-sm mt-1">{errors.violation.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Deskripsi
              </Label>
              <div className="col-span-3">
                <Textarea id="description" {...register("description")} className="w-full" placeholder="Deskripsi lengkap (opsional)" />
                {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deduction" className="text-right">
                Potongan (Rp)
              </Label>
              <div className="col-span-3">
                <Controller
                  name="deduction"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="deduction"
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.deduction && <p className="text-destructive text-sm mt-1">{errors.deduction.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


interface DeleteSanctionAlertProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onConfirm: () => void;
    employeeName?: string;
}

export function DeleteSanctionAlert({ isOpen, setIsOpen, onConfirm, employeeName }: DeleteSanctionAlertProps) {
    const { toast } = useToast();
    
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
        toast({
            title: "Sanksi Dihapus",
            description: `Sanksi untuk ${employeeName} telah dihapus.`,
            variant: "destructive"
        })
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data sanksi
                        untuk <strong> {employeeName}</strong> secara permanen.
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

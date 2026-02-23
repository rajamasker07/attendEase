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
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const holidaySchema = z.object({
  date: z.string().min(1, "Tanggal harus diisi."),
  description: z.string().min(3, "Keterangan minimal harus 3 karakter."),
});

export type HolidayFormData = z.infer<typeof holidaySchema>;

interface HolidayFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (data: HolidayFormData) => void;
}

export function HolidayFormDialog({
  isOpen,
  setIsOpen,
  onSave,
}: HolidayFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset({ date: format(new Date(), "yyyy-MM-dd"), description: "" });
    }
  }, [reset, isOpen]);

  const onSubmit: SubmitHandler<HolidayFormData> = (data) => {
    onSave(data);
    setIsOpen(false);
    toast({
      title: "Berhasil",
      description: `Hari libur berhasil ditambahkan.`,
    })
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              Tambah Hari Libur
            </DialogTitle>
            <DialogDescription>
              Tambahkan hari libur nasional atau cuti bersama.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="description" className="text-right">
                Keterangan
              </Label>
              <div className="col-span-3">
                <Input id="description" {...register("description")} className="w-full" placeholder="Cth: Tahun Baru"/>
                {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
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


interface DeleteHolidayAlertProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onConfirm: () => void;
    holidayDescription?: string;
}

export function DeleteHolidayAlert({ isOpen, setIsOpen, onConfirm, holidayDescription }: DeleteHolidayAlertProps) {
    const { toast } = useToast();
    
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
        toast({
            title: "Hari Libur Dihapus",
            description: `${holidayDescription} telah dihapus.`,
            variant: "destructive"
        })
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus hari libur
                        <strong> {holidayDescription}</strong> secara permanen.
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

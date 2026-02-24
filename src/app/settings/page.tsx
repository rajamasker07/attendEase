"use client";

import { useEffect } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Setting } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";

const settingsSchema = z.object({
  lateDeductionAmount: z.coerce.number().min(0, "Potongan tidak boleh negatif."),
  lateThresholdTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM).").optional(),
  alpaDeductionAmount: z.coerce.number().min(0, "Potongan tidak boleh negatif.").optional(),
  deductUnpaidAbsence: z.boolean().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, "settings", "payroll") : null),
    [firestore]
  );
  const { data: settings, isLoading } = useDoc<Setting>(settingsDocRef);

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      lateDeductionAmount: 10000,
      lateThresholdTime: "07:35",
      alpaDeductionAmount: 0,
      deductUnpaidAbsence: false,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({ 
          lateDeductionAmount: settings.lateDeductionAmount,
          lateThresholdTime: settings.lateThresholdTime || "07:35",
          alpaDeductionAmount: settings.alpaDeductionAmount || 0,
          deductUnpaidAbsence: settings.deductUnpaidAbsence || false,
      });
    } else if (!isLoading) {
      // If not loading and no settings exist, use default
      reset({ lateDeductionAmount: 10000, lateThresholdTime: "07:35", alpaDeductionAmount: 0, deductUnpaidAbsence: false });
    }
  }, [settings, isLoading, reset]);

  const onSubmit: SubmitHandler<SettingsFormData> = (data) => {
    if (!settingsDocRef) return;
    setDocumentNonBlocking(settingsDocRef, data, { merge: true });
    toast({
      title: "Berhasil",
      description: "Pengaturan berhasil diperbarui.",
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Pengaturan</CardTitle>
        <CardDescription>
          Kelola pengaturan aplikasi Anda di sini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
        ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-2">
                    <Label htmlFor="lateThresholdTime">Batas Waktu Keterlambatan</Label>
                    <Input
                      id="lateThresholdTime"
                      type="time"
                      {...register("lateThresholdTime")}
                      className="w-40"
                    />
                    {errors.lateThresholdTime && (
                    <p className="text-sm text-destructive">
                        {errors.lateThresholdTime.message}
                    </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                        Karyawan yang absen masuk setelah waktu ini akan dianggap terlambat.
                    </p>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="lateDeductionAmount">
                    Jumlah Potongan Keterlambatan (Rp)
                    </Label>
                     <Controller
                      name="lateDeductionAmount"
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          id="lateDeductionAmount"
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    {errors.lateDeductionAmount && (
                    <p className="text-sm text-destructive">
                        {errors.lateDeductionAmount.message}
                    </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                    Jumlah ini akan digunakan untuk menghitung potongan gaji untuk setiap keterlambatan absensi.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="alpaDeductionAmount">
                    Jumlah Potongan Alpa (Mangkir) (Rp)
                    </Label>
                     <Controller
                      name="alpaDeductionAmount"
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          id="alpaDeductionAmount"
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    {errors.alpaDeductionAmount && (
                    <p className="text-sm text-destructive">
                        {errors.alpaDeductionAmount.message}
                    </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                    Jumlah ini akan digunakan sebagai sanksi otomatis jika karyawan ditandai "Alpa".
                    </p>
                </div>
                
                 <div className="flex items-center space-x-4 rounded-md border p-4">
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            Potong Gaji untuk Hari Tidak Masuk
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Jika aktif, gaji akan dipotong untuk hari Sakit, Izin, atau Alpa berdasarkan gaji harian.
                        </p>
                    </div>
                     <Controller
                        name="deductUnpaidAbsence"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                        />
                </div>

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Pengaturan"}
                </Button>
            </form>
        )}
      </CardContent>
    </Card>
  );
}

    
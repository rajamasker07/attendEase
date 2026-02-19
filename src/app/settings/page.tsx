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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Setting } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyInput } from "@/components/ui/currency-input";

const settingsSchema = z.object({
  lateDeductionAmount: z.coerce.number().min(0, "Potongan tidak boleh negatif."),
  alpaDeductionAmount: z.coerce.number().min(0, "Potongan tidak boleh negatif.").optional(),
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
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      lateDeductionAmount: 10000,
      alpaDeductionAmount: 0,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({ 
          lateDeductionAmount: settings.lateDeductionAmount,
          alpaDeductionAmount: settings.alpaDeductionAmount || 0,
      });
    } else if (!isLoading) {
      // If not loading and no settings exist, use default
      reset({ lateDeductionAmount: 10000, alpaDeductionAmount: 0 });
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Pengaturan"}
                </Button>
            </form>
        )}
      </CardContent>
    </Card>
  );
}

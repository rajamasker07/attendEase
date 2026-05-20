
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
import type { Loan, Employee, LoanPayment } from "@/types";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { WithId } from "@/firebase";
import { format } from "date-fns";
import { CurrencyInput } from "@/components/ui/currency-input";

interface LoanFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (data: LoanFormData) => void;
  loan: WithId<Loan> | null;
  employees: WithId<Employee>[] | null;
  currentActiveLoans: Map<string, { kasbon: number, kreditInstallments: number, activeKreditCount: number }>;
}

const loanSchema = z.discriminatedUnion("type", [
  // Kasbon: no installment fields needed
  z.object({
    type: z.literal("kasbon"),
    employeeId: z.string().min(1, "Karyawan harus dipilih."),
    date: z.string().min(1, "Tanggal harus diisi."),
    amount: z.coerce.number().min(1, "Jumlah pinjaman harus lebih dari 0."),
    description: z.string().min(3, "Keterangan minimal harus 3 karakter."),
    installmentAmount: z.coerce.number().optional(),
    totalInstallments: z.coerce.number().optional(),
  }),
  // Kredit: installmentAmount and totalInstallments are required
  z.object({
    type: z.literal("kredit"),
    employeeId: z.string().min(1, "Karyawan harus dipilih."),
    date: z.string().min(1, "Tanggal harus diisi."),
    amount: z.coerce.number().min(1, "Jumlah pinjaman harus lebih dari 0."),
    description: z.string().min(3, "Keterangan minimal harus 3 karakter."),
    installmentAmount: z.coerce.number().min(1, "Jumlah cicilan harus lebih dari 0."),
    totalInstallments: z.coerce.number().min(1, "Tenor harus minimal 1 bulan."),
  }),
]);

export type LoanFormData = z.infer<typeof loanSchema>;

export function LoanFormDialog({
  isOpen,
  setIsOpen,
  onSave,
  loan,
  employees,
  currentActiveLoans,
}: LoanFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: { type: "kasbon" },
  });

  const selectedType = watch("type");
  const watchedAmount = watch("amount") || 0;
  const watchedInstallment = watch("installmentAmount") || 0;
  const selectedEmployeeId = watch("employeeId");
  const selectedEmployee = employees?.find((e) => e.id === selectedEmployeeId);
  const activeLoans = currentActiveLoans.get(selectedEmployeeId || "") || { kasbon: 0, kreditInstallments: 0, activeKreditCount: 0 };
  const baseSalary = selectedEmployee?.salary ?? 0;
  const remainingLimit = baseSalary - activeLoans.kreditInstallments - activeLoans.kasbon;

  // Auto-calculate tenor from amount / installmentAmount
  const autoTenor =
    selectedType === "kredit" && watchedInstallment > 0
      ? Math.ceil(watchedAmount / watchedInstallment)
      : 0;

  useEffect(() => {
    if (selectedType === "kredit" && watchedInstallment > 0 && watchedAmount > 0) {
      setValue("totalInstallments", autoTenor);
    }
  }, [autoTenor, selectedType, watchedInstallment, watchedAmount, setValue]);

  useEffect(() => {
    if (isOpen && loan) {
      reset({
        type: loan.type ?? "kasbon",
        employeeId: loan.employeeId,
        date: loan.date || format(new Date(), "yyyy-MM-dd"),
        amount: loan.amount,
        description: loan.description,
        installmentAmount: loan.installmentAmount ?? 0,
        totalInstallments: loan.totalInstallments ?? 0,
      } as LoanFormData);
    } else if (isOpen && !loan) {
      reset({
        type: "kasbon",
        employeeId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        amount: 0,
        description: "",
        installmentAmount: 0,
        totalInstallments: 0,
      } as LoanFormData);
    }
  }, [loan, reset, isOpen]);

  const onSubmit: SubmitHandler<LoanFormData> = (data) => {
    // Validasi 1: Karyawan tidak boleh punya lebih dari 1 kredit aktif
    if (!loan && data.type === 'kredit' && activeLoans.activeKreditCount > 0) {
      toast({
        title: "Kredit Masih Aktif",
        description: "Karyawan ini masih memiliki kredit yang belum lunas. Harap lunasi kredit sebelumnya terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    // Validasi 2: Limit pinjaman hanya berlaku untuk Kasbon
    if (!loan && data.type !== 'kredit' && data.amount > remainingLimit) {
      toast({
        title: "Limit Terlampaui",
        description: `Karyawan ini hanya memiliki sisa limit pinjaman sebesar ${new Intl.NumberFormat(
          "id-ID",
          { style: "currency", currency: "IDR", minimumFractionDigits: 0 }
        ).format(remainingLimit)}.`,
        variant: "destructive",
      });
      return;
    }

    onSave(data);
    setIsOpen(false);
    toast({
      title: "Berhasil",
      description: `Pinjaman berhasil ${loan ? "diperbarui" : "ditambahkan"}.`,
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {loan ? "Ubah Pinjaman" : "Tambah Pinjaman"}
            </DialogTitle>
            <DialogDescription>
              {loan
                ? "Perbarui detail pinjaman."
                : "Catat pinjaman untuk karyawan. Pilih jenis Kasbon atau Kredit."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">

            {/* Jenis Pinjaman */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Jenis</Label>
              <div className="col-span-3">
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!loan}
                    >
                      <SelectTrigger id="loan-type">
                        <SelectValue placeholder="Pilih jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kasbon">
                          Kasbon (Potong habis tiap gajian)
                        </SelectItem>
                        <SelectItem value="kredit">
                          Kredit (Cicilan tetap per bulan)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Karyawan */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employeeId" className="text-right">
                Karyawan
              </Label>
              <div className="col-span-3">
                <Controller
                  name="employeeId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!loan}
                    >
                      <SelectTrigger id="employeeId">
                        <SelectValue placeholder="Pilih karyawan" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          ?.filter((e) => e.status === "aktif")
                          .map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.employeeId && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.employeeId.message}
                  </p>
                )}
                {selectedEmployee && !loan && selectedType !== 'kredit' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sisa limit:{" "}
                    <span
                      className={remainingLimit <= 0 ? "text-destructive" : ""}
                    >
                      {formatCurrency(remainingLimit)}
                    </span>
                  </p>
                )}
                {selectedEmployee && !loan && selectedType === 'kredit' && activeLoans.activeKreditCount === 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    ✓ Kredit tidak memiliki limit pinjaman.
                  </p>
                )}
                {selectedEmployee && !loan && selectedType === 'kredit' && activeLoans.activeKreditCount > 0 && (
                  <p className="text-xs text-destructive mt-1 font-semibold">
                    ⚠ Karyawan ini masih memiliki kredit aktif. Tidak bisa mengambil kredit baru.
                  </p>
                )}
              </div>
            </div>

            {/* Tanggal */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Tanggal
              </Label>
              <div className="col-span-3">
                <Input
                  id="date"
                  {...register("date")}
                  className="w-full"
                  type="date"
                />
                {errors.date && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.date.message}
                  </p>
                )}
              </div>
            </div>

            {/* Total Pinjaman */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                {selectedType === "kredit" ? "Total Kredit" : "Jumlah"}
              </Label>
              <div className="col-span-3">
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="amount"
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.amount && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.amount.message}
                  </p>
                )}
              </div>
            </div>

            {/* Kredit-only fields */}
            {selectedType === "kredit" && (
              <>
                {/* Cicilan per bulan */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="installmentAmount" className="text-right">
                    Cicilan/Bulan
                  </Label>
                  <div className="col-span-3">
                    <Controller
                      name="installmentAmount"
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          id="installmentAmount"
                          value={field.value ?? 0}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Jumlah cicilan per bulan"
                        />
                      )}
                    />
                    {"installmentAmount" in errors && errors.installmentAmount && (
                      <p className="text-destructive text-sm mt-1">
                        {(errors as any).installmentAmount?.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tenor (auto-calculated, shown read-only) */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="totalInstallments" className="text-right">
                    Tenor
                  </Label>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <Input
                        id="totalInstallments"
                        type="number"
                        min={1}
                        {...register("totalInstallments")}
                        className="w-full"
                        placeholder="Jumlah bulan"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">bulan</span>
                    </div>
                    {"totalInstallments" in errors && errors.totalInstallments && (
                      <p className="text-destructive text-sm mt-1">
                        {(errors as any).totalInstallments?.message}
                      </p>
                    )}
                    {/* Preview summary */}
                    {watchedAmount > 0 && watchedInstallment > 0 && (
                      <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground space-y-0.5">
                        <p>
                          Cicilan:{" "}
                          <strong className="text-foreground">
                            {formatCurrency(watchedInstallment)}
                          </strong>{" "}
                          × {autoTenor} bulan
                        </p>
                        <p>
                          Total kembali:{" "}
                          <strong className="text-foreground">
                            {formatCurrency(watchedInstallment * autoTenor)}
                          </strong>{" "}
                          {watchedInstallment * autoTenor > watchedAmount && (
                            <span className="text-amber-600">
                              (+{formatCurrency(watchedInstallment * autoTenor - watchedAmount)} pembulatan)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Keterangan */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Keterangan
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="description"
                  {...register("description")}
                  className="w-full"
                  placeholder={
                    selectedType === "kredit"
                      ? "Keperluan kredit (contoh: kredit motor)"
                      : "Keperluan kasbon..."
                  }
                />
                {errors.description && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
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

export function DeleteLoanAlert({
  isOpen,
  setIsOpen,
  onConfirm,
}: {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  onConfirm: () => void;
}) {
  const { toast } = useToast();
  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
    toast({ title: "Pinjaman Dihapus", variant: "destructive" });
  };
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus data pinjaman?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Catatan pinjaman akan dihapus
            permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RepayLoanAlert({
  isOpen,
  setIsOpen,
  onConfirm,
  amount,
  employeeName,
}: {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  onConfirm: () => void;
  amount: number;
  employeeName: string;
}) {
  const { toast } = useToast();
  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
    toast({
      title: "Pelunasan Dicatat",
      description: `Hutang ${employeeName} telah ditandai lunas.`,
    });
  };
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Pelunasan Manual</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menandai pinjaman sebesar{" "}
            <strong>{formatCurrency(amount)}</strong> untuk{" "}
            <strong>{employeeName}</strong> sebagai <strong>LUNAS</strong>?
            <br />
            <br />
            Gunakan fitur ini jika karyawan membayar hutangnya secara tunai atau
            transfer di luar sistem penggajian. Pinjaman ini tidak akan dipotong
            lagi saat gajian nanti.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Tandai Lunas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

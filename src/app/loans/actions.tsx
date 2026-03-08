
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
import type { Loan, Employee } from "@/types";
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
  currentActiveLoans: Map<string, number>;
}

const loanSchema = z.object({
  employeeId: z.string().min(1, "Karyawan harus dipilih."),
  date: z.string().min(1, "Tanggal harus diisi."),
  amount: z.coerce.number().min(1, "Jumlah pinjaman harus lebih dari 0."),
  description: z.string().min(3, "Keterangan minimal harus 3 karakter."),
});

export type LoanFormData = z.infer<typeof loanSchema>;

export function LoanFormDialog({
  isOpen,
  setIsOpen,
  onSave,
  loan,
  employees,
  currentActiveLoans
}: LoanFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
  });

  const selectedEmployeeId = watch("employeeId");
  const selectedEmployee = employees?.find(e => e.id === selectedEmployeeId);
  const activeDebt = currentActiveLoans.get(selectedEmployeeId || "") || 0;
  const loanLimit = selectedEmployee?.loanLimit ?? selectedEmployee?.salary ?? 0;
  const remainingLimit = loanLimit - activeDebt;

  useEffect(() => {
    if (isOpen && loan) {
      reset({ 
        employeeId: loan.employeeId,
        date: loan.date || format(new Date(), "yyyy-MM-dd"),
        amount: loan.amount,
        description: loan.description,
      });
    } else if(isOpen && !loan) {
      reset({ employeeId: "", date: format(new Date(), "yyyy-MM-dd"), amount: 0, description: "" });
    }
  }, [loan, reset, isOpen]);

  const onSubmit: SubmitHandler<LoanFormData> = (data) => {
    if (!loan && data.amount > remainingLimit) {
        toast({
            title: "Limit Terlampaui",
            description: `Karyawan ini hanya memiliki sisa limit pinjaman sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(remainingLimit)}.`,
            variant: "destructive"
        });
        return;
    }

    onSave(data);
    setIsOpen(false);
    toast({
      title: "Berhasil",
      description: `Pinjaman berhasil ${loan ? 'diperbarui' : 'ditambahkan'}.`,
    })
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {loan ? "Ubah Pinjaman" : "Tambah Pinjaman (Kasbon)"}
            </DialogTitle>
            <DialogDescription>
              {loan
                ? "Perbarui detail pinjaman."
                : "Catat pinjaman gaji untuk karyawan."}
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!loan}>
                      <SelectTrigger id="employeeId">
                        <SelectValue placeholder="Pilih karyawan" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.filter(e => e.status === 'aktif').map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.employeeId && <p className="text-destructive text-sm mt-1">{errors.employeeId.message}</p>}
                {selectedEmployee && !loan && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Sisa limit pinjaman: <span className={remainingLimit <= 0 ? 'text-destructive' : ''}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(remainingLimit)}</span>
                    </p>
                )}
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
              <Label htmlFor="amount" className="text-right">
                Jumlah
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
                {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Keterangan
              </Label>
              <div className="col-span-3">
                <Textarea id="description" {...register("description")} className="w-full" placeholder="Keperluan pinjaman..." />
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

export function DeleteLoanAlert({ isOpen, setIsOpen, onConfirm }: { isOpen: boolean; setIsOpen: (o: boolean) => void; onConfirm: () => void }) {
    const { toast } = useToast();
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
        toast({ title: "Pinjaman Dihapus", variant: "destructive" });
    }
    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus data pinjaman?</AlertDialogTitle>
                    <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan. Catatan pinjaman akan dihapus permanen.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function RepayLoanAlert({ isOpen, setIsOpen, onConfirm, amount, employeeName }: { isOpen: boolean; setIsOpen: (o: boolean) => void; onConfirm: () => void; amount: number; employeeName: string }) {
    const { toast } = useToast();
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
        toast({ title: "Pelunasan Dicatat", description: `Hutang ${employeeName} telah ditandai lunas.` });
    }
    const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Pelunasan Manual</AlertDialogTitle>
                    <AlertDialogDescription>
                        Apakah Anda yakin ingin menandai pinjaman sebesar <strong>{formatCurrency(amount)}</strong> untuk <strong>{employeeName}</strong> sebagai <strong>LUNAS</strong>?
                        <br/><br/>
                        Gunakan fitur ini jika karyawan membayar hutangnya secara tunai atau transfer di luar sistem penggajian. Pinjaman ini tidak akan dipotong lagi saat gajian nanti.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm}>Tandai Lunas</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

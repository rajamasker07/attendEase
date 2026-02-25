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
import type { Employee, PaymentAccount } from "@/types";
import { useForm, SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { WithId } from "@/firebase";
import { format, parseISO, intervalToDuration } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PlusCircle, Trash2, Copy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const paymentAccountSchema = z.object({
  provider: z.string().min(1, "Nama provider harus diisi."),
  accountNumber: z.string().min(3, "Nomor rekening/e-wallet tidak valid."),
  accountName: z.string().min(2, "Nama pemilik rekening tidak valid."),
});

const employeeSchema = z.object({
  name: z.string().min(2, "Nama minimal harus 2 karakter."),
  position: z.string().min(1, "Posisi harus dipilih."),
  joinDate: z.string().min(1, "Tanggal masuk harus diisi."),
  phone: z.string().min(10, "Nomor HP minimal 10 digit.").regex(/^\+?[0-9\s-]{10,}$/, "Format nomor HP tidak valid."),
  salary: z.coerce.number().min(0, "Gaji tidak boleh negatif."),
  status: z.enum(['aktif', 'tidak aktif']).default('aktif'),
  paymentAccounts: z.array(paymentAccountSchema).optional(),
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
    defaultValues: { 
      name: "", 
      position: "", 
      phone: "", 
      salary: 0, 
      joinDate: "", 
      status: "aktif",
      paymentAccounts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "paymentAccounts",
  });

  useEffect(() => {
    if (isOpen && employee) {
      reset({ 
        name: employee.name, 
        position: employee.position,
        joinDate: employee.joinDate || format(new Date(), "yyyy-MM-dd"),
        phone: employee.phone || "",
        salary: employee.salary || 0,
        status: employee.status || "aktif",
        paymentAccounts: employee.paymentAccounts || [],
      });
    } else if(isOpen && !employee) {
      reset({ 
        name: "", 
        position: "", 
        phone: "", 
        salary: 0, 
        joinDate: format(new Date(), "yyyy-MM-dd"), 
        status: "aktif",
        paymentAccounts: [],
      });
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
      <DialogContent className="sm:max-w-lg">
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
          <ScrollArea className="max-h-[70vh] pr-6">
            <div>
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
                    <Controller
                      name="salary"
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          id="salary"
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    {errors.salary && <p className="text-destructive text-sm mt-1">{errors.salary.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <div className="col-span-3">
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="status">
                            <SelectValue placeholder="Pilih status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aktif">Aktif</SelectItem>
                            <SelectItem value="tidak aktif">Tidak Aktif</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.status && <p className="text-destructive text-sm mt-1">{errors.status.message}</p>}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Rekening Pembayaran</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ provider: "", accountNumber: "", accountName: "" })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah
                  </Button>
                </div>
                
                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada rekening ditambahkan.</p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 gap-4 rounded-md border p-4 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`paymentAccounts.${index}.provider`} className="text-right">
                          Bank/E-Wallet
                        </Label>
                        <div className="col-span-3">
                          <Input
                            id={`paymentAccounts.${index}.provider`}
                            {...register(`paymentAccounts.${index}.provider`)}
                            placeholder="Cth: BCA, DANA"
                          />
                          {errors.paymentAccounts?.[index]?.provider && <p className="text-destructive text-sm mt-1">{errors.paymentAccounts[index]?.provider?.message}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`paymentAccounts.${index}.accountNumber`} className="text-right">
                          Nomor
                        </Label>
                        <div className="col-span-3">
                          <Input
                            id={`paymentAccounts.${index}.accountNumber`}
                            {...register(`paymentAccounts.${index}.accountNumber`)}
                            placeholder="Nomor rekening atau No. HP"
                          />
                          {errors.paymentAccounts?.[index]?.accountNumber && <p className="text-destructive text-sm mt-1">{errors.paymentAccounts[index]?.accountNumber?.message}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`paymentAccounts.${index}.accountName`} className="text-right">
                          Atas Nama
                        </Label>
                        <div className="col-span-3">
                          <Input
                            id={`paymentAccounts.${index}.accountName`}
                            {...register(`paymentAccounts.${index}.accountName`)}
                            placeholder="Nama pemilik rekening"
                          />
                          {errors.paymentAccounts?.[index]?.accountName && <p className="text-destructive text-sm mt-1">{errors.paymentAccounts[index]?.accountName?.message}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-6">
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

export function EmployeeDetailDialog({
  isOpen,
  setIsOpen,
  employee,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  employee: WithId<Employee> | null;
}) {
  const { toast } = useToast();

  if (!employee) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "Disalin!",
        description: `${label} telah disalin ke clipboard.`
    })
  }

  const calculateTenure = (joinDate: string): string => {
    try {
        const startDate = parseISO(joinDate);
        const endDate = new Date();
        if (isNaN(startDate.getTime())) return "-";

        const duration = intervalToDuration({ start: startDate, end: endDate });
        const years = duration.years || 0;
        const months = duration.months || 0;
        
        return `${years} tahun ${months} bulan`;
    } catch (error) {
        return "-";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Karyawan</DialogTitle>
          <DialogDescription>
            Informasi lengkap untuk {employee.name}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right text-muted-foreground">Nama</Label>
                <div className="col-span-2 font-medium">{employee.name}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right text-muted-foreground">Posisi</Label>
                <div className="col-span-2 capitalize">{employee.position}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right text-muted-foreground">Tgl. Masuk</Label>
                <div className="col-span-2">{employee.joinDate ? format(parseISO(employee.joinDate), "d MMMM yyyy", { locale: id }) : '-'}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right text-muted-foreground">Lama Bekerja</Label>
                <div className="col-span-2">{employee.joinDate ? calculateTenure(employee.joinDate) : '-'}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right text-muted-foreground">No. HP</Label>
                <div className="col-span-2">{employee.phone || '-'}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right text-muted-foreground">Gaji</Label>
                <div className="col-span-2">{typeof employee.salary === 'number' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(employee.salary) : '-'}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right text-muted-foreground">Status</Label>
                <div className="col-span-2">
                    <Badge variant={employee.status === 'tidak aktif' ? 'secondary' : 'default'}>
                        {employee.status === 'tidak aktif' ? 'Tidak Aktif' : 'Aktif'}
                    </Badge>
                </div>
              </div>
            </div>

            {employee.paymentAccounts && employee.paymentAccounts.length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="space-y-4">
                  <h4 className="font-semibold text-muted-foreground">Rekening Pembayaran</h4>
                  {employee.paymentAccounts.map((account, index) => (
                    <div key={index} className="grid grid-cols-3 items-start gap-4 rounded-md border p-3">
                      <div className="col-span-2 space-y-1">
                        <p className="font-bold uppercase">{account.provider}</p>
                        <p className="text-sm">{account.accountNumber}</p>
                        <p className="text-xs text-muted-foreground">a.n. {account.accountName}</p>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(account.accountNumber, "Nomor rekening")}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Salin
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

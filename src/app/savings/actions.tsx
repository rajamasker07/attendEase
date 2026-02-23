"use client";

import { useEffect } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Employee, Savings, SavingsTransaction } from "@/types";
import { WithId, useFirebase } from "@/firebase";
import { doc, runTransaction, collection, Firestore } from "firebase/firestore";

const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const withdrawalSchema = z.object({
  amount: z.coerce.number().min(1, "Jumlah penarikan harus lebih dari 0."),
});
type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface RecordWithdrawalDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  employee: WithId<Employee> | null;
  savings: Savings | null;
}

async function handleWithdrawal(
    firestore: Firestore,
    employeeId: string,
    amount: number
) {
    const savingsRef = doc(firestore, "savings", employeeId);
    const transactionRef = doc(collection(firestore, "savings-transactions"));

    await runTransaction(firestore, async (transaction) => {
        const savingsDoc = await transaction.get(savingsRef);
        const currentBalance = savingsDoc.exists() ? savingsDoc.data().balance : 0;
        
        if (amount > currentBalance) {
            throw new Error("Jumlah penarikan melebihi saldo yang tersedia.");
        }

        const newBalance = currentBalance - amount;

        // 1. Update savings balance
        transaction.set(savingsRef, {
            balance: newBalance,
            lastUpdated: new Date().toISOString(),
        }, { merge: true });

        // 2. Create savings transaction record
        transaction.set(transactionRef, {
            employeeId: employeeId,
            date: new Date().toISOString(),
            type: 'withdrawal',
            amount: amount,
            description: `Penarikan tunai`,
        } as SavingsTransaction);
    });
}

export function RecordWithdrawalDialog({ isOpen, setIsOpen, employee, savings }: RecordWithdrawalDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const resolver = zodResolver(withdrawalSchema.refine(
    (data) => !savings || data.amount <= savings.balance, {
      message: "Penarikan tidak boleh melebihi saldo.",
      path: ["amount"],
    }
  ));
  
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WithdrawalFormData>({
    resolver,
    defaultValues: { amount: 0 },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ amount: 0 });
    }
  }, [isOpen, reset]);
  
  if (!employee) return null;

  const onSubmit: SubmitHandler<WithdrawalFormData> = async (data) => {
    if (!firestore) return;
    try {
        await handleWithdrawal(firestore, employee.id, data.amount);
        toast({
        title: "Penarikan Berhasil",
        description: `Penarikan untuk ${employee.name} telah dicatat.`,
        });
        setIsOpen(false);
    } catch (e: any) {
        toast({
            title: "Penarikan Gagal",
            description: e.message || "Terjadi kesalahan.",
            variant: "destructive"
        })
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Penarikan Tabungan</DialogTitle>
          <DialogDescription>Untuk: {employee.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo Saat Ini</span>
                    <span className="font-medium">{formatCurrency(savings?.balance ?? 0)}</span>
                </div>
                <div className="space-y-2 pt-2">
                    <Label htmlFor="amount">Jumlah Penarikan</Label>
                    <Controller
                        name="amount"
                        control={control}
                        render={({ field }) => (
                            <CurrencyInput
                            id="amount"
                            placeholder="0"
                            value={field.value}
                            onValueChange={field.onChange}
                            onBlur={field.onBlur}
                            />
                        )}
                    />
                    {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Memproses..." : "Simpan Penarikan"}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

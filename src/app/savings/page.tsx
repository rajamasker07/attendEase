"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Wallet, ArrowDown, ArrowUp } from "lucide-react";
import type { Employee, Savings, SavingsTransaction } from "@/types";
import { useCollection, useFirebase, useMemoFirebase, WithId } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordWithdrawalDialog } from "./actions";

function TransactionHistory({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();
    const transactionsQuery = useMemoFirebase(() =>
        firestore
            ? query(
                collection(firestore, "savings-transactions"),
                where("employeeId", "==", employeeId)
              )
            : null
    , [firestore, employeeId]);

    const { data: transactions, isLoading } = useCollection<SavingsTransaction>(transactionsQuery);

    const sortedTransactions = useMemo(() => {
        if (!transactions) return [];
        // Sort on the client-side to avoid composite index requirement
        return [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [transactions]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

    if (isLoading) {
        return <div className="px-6 py-4 text-sm text-muted-foreground">Memuat riwayat...</div>;
    }

    return (
        <div className="px-6 pb-6 pt-0">
             {sortedTransactions && sortedTransactions.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTransactions.map(tx => (
                            <TableRow key={tx.id}>
                                <TableCell>{format(parseISO(tx.date), "d MMM yyyy, HH:mm", { locale: id })}</TableCell>
                                <TableCell>
                                    {tx.type === 'deposit' ? (
                                        <span className="flex items-center text-green-600"><ArrowUp className="mr-2 h-4 w-4" />Setoran</span>
                                    ) : (
                                        <span className="flex items-center text-destructive"><ArrowDown className="mr-2 h-4 w-4" />Penarikan</span>
                                    )}
                                </TableCell>
                                <TableCell>{tx.description}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                    Belum ada riwayat transaksi.
                </p>
             )}
        </div>
    )
}

export default function SavingsPage() {
  const { firestore } = useFirebase();
  const [selectedEmployee, setSelectedEmployee] = useState<WithId<Employee> | null>(null);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);

  const savingsCollection = useMemoFirebase(() => firestore ? collection(firestore, "savings") : null, [firestore]);
  const { data: savings, isLoading: isLoadingSavings } = useCollection<Savings>(savingsCollection);
  
  const savingsMap = useMemo(() => {
    if (!savings) return new Map<string, Savings>();
    return new Map(savings.map(s => [s.id, s]));
  }, [savings]);

  const handleWithdrawClick = (employee: WithId<Employee>) => {
    setSelectedEmployee(employee);
    setIsWithdrawalDialogOpen(true);
  };
  
  const isLoading = isLoadingEmployees || isLoadingSavings;
  const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Tabungan Karyawan</CardTitle>
        <CardDescription>
          Kelola saldo tabungan yang berasal dari sisa gaji karyawan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : (
            <Accordion type="single" collapsible className="w-full space-y-2">
                {employees?.filter(e => e.status === 'aktif').map(employee => (
                    <Card key={employee.id} className="overflow-hidden">
                        <AccordionItem value={employee.id} className="border-none">
                            <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/50">
                                <div className="flex w-full items-center justify-between">
                                    <div className="text-left">
                                        <h3 className="font-semibold">{employee.name}</h3>
                                        <p className="text-sm text-muted-foreground capitalize">{employee.position}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-muted-foreground text-xs">Saldo</div>
                                            <div className="font-semibold text-lg">{formatCurrency(savingsMap.get(employee.id)?.balance ?? 0)}</div>
                                        </div>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleWithdrawClick(employee);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleWithdrawClick(employee);
                                                }
                                            }}
                                        >
                                            <Button size="sm" variant="outline" asChild>
                                                <div>
                                                    <Wallet className="mr-2 h-4 w-4" />
                                                    Tarik Tunai
                                                </div>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <TransactionHistory employeeId={employee.id} />
                            </AccordionContent>
                        </AccordionItem>
                    </Card>
                ))}
                {employees?.filter(e => e.status === 'aktif').length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                        Tidak ada karyawan aktif.
                    </div>
                )}
            </Accordion>
        )}
      </CardContent>
    </Card>

    <RecordWithdrawalDialog
        isOpen={isWithdrawalDialogOpen}
        setIsOpen={setIsWithdrawalDialogOpen}
        employee={selectedEmployee}
        savings={selectedEmployee ? savingsMap.get(selectedEmployee.id) ?? null : null}
    />
    </>
  );
}

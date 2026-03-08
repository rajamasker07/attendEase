
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Loan, Employee, LoanPayment } from "@/types";
import { PlusCircle, Edit, Trash2, CheckCircle, Calendar, ArrowRight, Wallet } from "lucide-react";
import { LoanFormDialog, DeleteLoanAlert, RepayLoanAlert, type LoanFormData } from "./actions";
import { useCollection, useFirebase, WithId, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy, arrayUnion } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function LoanPaymentHistory({ payments }: { payments?: LoanPayment[] }) {
    const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

    if (!payments || payments.length === 0) {
        return <p className="text-xs text-muted-foreground p-4 italic">Belum ada riwayat pembayaran untuk pinjaman ini.</p>;
    }

    return (
        <div className="p-4 bg-muted/30 rounded-md mt-2">
            <h4 className="text-xs font-bold uppercase mb-2 text-muted-foreground tracking-wider">Riwayat Pelunasan Detail</h4>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="h-8 text-[10px]">Tanggal</TableHead>
                        <TableHead className="h-8 text-[10px]">Metode</TableHead>
                        <TableHead className="h-8 text-[10px]">Keterangan</TableHead>
                        <TableHead className="h-8 text-[10px] text-right">Jumlah</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.map((p, i) => (
                        <TableRow key={i} className="hover:bg-transparent border-muted/50">
                            <TableCell className="py-2 text-xs">{format(parseISO(p.date), "d MMM yyyy", { locale: id })}</TableCell>
                            <TableCell className="py-2 text-xs">
                                <Badge variant="outline" className="text-[10px] h-5 capitalize">{p.method === 'payroll' ? 'Potong Gaji' : 'Tunai/Manual'}</Badge>
                            </TableCell>
                            <TableCell className="py-2 text-xs">{p.description}</TableCell>
                            <TableCell className="py-2 text-xs text-right font-medium text-green-600">{formatCurrency(p.amount)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default function LoansPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isRepayAlertOpen, setIsRepayAlertOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<WithId<Loan> | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const { firestore } = useFirebase();

  const loansCollection = useMemoFirebase(() => firestore ? query(collection(firestore, "loans"), orderBy("date", "desc")) : null, [firestore]);
  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansCollection);

  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);

  const employeeMap = useMemo(() => {
    if (!employees) return new Map();
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  const currentActiveLoans = useMemo(() => {
    const map = new Map<string, number>();
    loans?.filter(l => l.status === 'active').forEach(loan => {
        const current = map.get(loan.employeeId) || 0;
        const remaining = loan.remainingAmount ?? loan.amount;
        map.set(loan.employeeId, current + remaining);
    });
    return map;
  }, [loans]);

  const filteredLoans = useMemo(() => {
    if (!loans) return [];
    let filtered = [...loans];

    if (statusFilter !== "all") {
      filtered = filtered.filter(l => l.status === statusFilter);
    }
    if (employeeFilter !== "all") {
      filtered = filtered.filter(l => l.employeeId === employeeFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employeeMap.get(l.employeeId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [loans, searchTerm, employeeFilter, statusFilter, employeeMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, employeeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredLoans.length / rowsPerPage);
  const paginatedLoans = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredLoans.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredLoans, currentPage]);

  const handleAdd = () => {
    setSelectedLoan(null);
    setIsFormOpen(true);
  };

  const handleEdit = (loan: WithId<Loan>) => {
    setSelectedLoan(loan);
    setIsFormOpen(true);
  };
  
  const handleDelete = (loan: WithId<Loan>) => {
    setSelectedLoan(loan);
    setIsAlertOpen(true);
  };

  const handleRepay = (loan: WithId<Loan>) => {
    setSelectedLoan(loan);
    setIsRepayAlertOpen(true);
  };

  const handleSave = (loanData: LoanFormData) => {
    if (!firestore) return;
    if (selectedLoan) {
      const docRef = doc(firestore, "loans", selectedLoan.id);
      // If basic info changes, we don't reset everything, just info.
      // But if amount changes, it's tricky. For MVP, we assume amount edit only for corrections.
      setDocumentNonBlocking(docRef, { 
        ...loanData, 
        remainingAmount: loanData.amount, // Reset remaining if initial amount is corrected
        status: selectedLoan.status 
      }, { merge: true });
    } else {
      const newId = doc(collection(firestore, "loans")).id;
      const docRef = doc(firestore, "loans", newId);
      setDocumentNonBlocking(docRef, { 
        ...loanData, 
        remainingAmount: loanData.amount,
        status: 'active',
        payments: []
      }, {});
    }
  };
  
  const confirmDelete = () => {
    if (selectedLoan && firestore) {
      const docRef = doc(firestore, "loans", selectedLoan.id);
      deleteDocumentNonBlocking(docRef);
    }
  }

  const confirmRepay = () => {
    if (selectedLoan && firestore) {
        const docRef = doc(firestore, "loans", selectedLoan.id);
        const amountToPay = selectedLoan.remainingAmount ?? selectedLoan.amount;
        
        const paymentRecord: LoanPayment = {
            date: new Date().toISOString(),
            amount: amountToPay,
            method: 'manual',
            description: 'Pelunasan manual (Tunai/Transfer)'
        };

        updateDocumentNonBlocking(docRef, { 
          status: 'paid',
          remainingAmount: 0,
          repaidAt: new Date().toISOString(),
          payments: arrayUnion(paymentRecord)
        });
    }
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  if (isLoadingLoans || isLoadingEmployees) {
    return (
      <Card>
        <CardHeader><CardTitle>Hutang & Kasbon</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>Total Sisa Pinjaman Aktif</CardDescription>
                <CardTitle className="text-2xl font-bold text-destructive">
                    {formatCurrency(loans?.filter(l => l.status === 'active').reduce((acc, l) => acc + (l.remainingAmount ?? l.amount), 0) || 0)}
                </CardTitle>
            </CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>Total Pinjaman Dibuat</CardDescription>
                <CardTitle className="text-2xl font-bold text-primary">
                    {formatCurrency(loans?.reduce((acc, l) => acc + l.amount, 0) || 0)}
                </CardTitle>
            </CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>Karyawan Berhutang</CardDescription>
                <CardTitle className="text-2xl font-bold">
                    {new Set(loans?.filter(l => l.status === 'active').map(l => l.employeeId)).size} Orang
                </CardTitle>
            </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Kasbon Karyawan</CardTitle>
            <CardDescription>Klik baris untuk melihat rincian pembayaran parsial.</CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pinjaman
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center py-4 gap-2">
              <Input
                  placeholder="Cari keterangan atau nama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
              />
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Semua Karyawan"/>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Semua Karyawan</SelectItem>
                      {employees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Status"/>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="active">Aktif (Berjalan)</SelectItem>
                      <SelectItem value="paid">Sudah Lunas</SelectItem>
                  </SelectContent>
              </Select>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-2">
            {paginatedLoans.length > 0 ? (
                paginatedLoans.map((loan) => (
                    <Card key={loan.id} className="overflow-hidden border-muted">
                        <AccordionItem value={loan.id} className="border-none">
                            <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/30">
                                <div className="flex w-full items-center justify-between text-left">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 items-center">
                                        <div className="space-y-1">
                                            <p className="font-semibold leading-none">{employeeMap.get(loan.employeeId)?.name || 'Karyawan Dihapus'}</p>
                                            <p className="text-xs text-muted-foreground">{format(parseISO(loan.date), "d MMM yyyy", { locale: id })}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm line-clamp-1">{loan.description}</p>
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <span>{formatCurrency(loan.amount)}</span>
                                                <ArrowRight className="h-3 w-3 mx-1" />
                                                <span className="font-bold text-foreground">{formatCurrency(loan.remainingAmount ?? loan.amount)}</span>
                                            </div>
                                            <div className="w-24 mt-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className="bg-primary h-full transition-all" 
                                                    style={{ width: `${Math.min(100, (1 - ((loan.remainingAmount ?? loan.amount) / loan.amount)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Badge variant={loan.status === 'active' ? 'destructive' : 'default'} className="h-5 text-[10px]">
                                                {loan.status === 'active' ? 'Belum Lunas' : 'Lunas'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center pr-2" onClick={(e) => e.stopPropagation()}>
                                        {loan.status === 'active' ? (
                                            <div className="flex space-x-1">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={() => handleRepay(loan)} className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8">
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Tandai Lunas Manual (Tunai)</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(loan)} className="h-8 w-8">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(loan)} className="h-8 w-8 text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(loan)} className="h-8 w-8 text-destructive opacity-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <LoanPaymentHistory payments={loan.payments} />
                            </AccordionContent>
                        </AccordionItem>
                    </Card>
                ))
            ) : (
                <div className="text-center py-10 border rounded-lg border-dashed text-muted-foreground">Tidak ada data pinjaman.</div>
            )}
          </Accordion>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Menampilkan {paginatedLoans.length} dari {filteredLoans.length} data.</div>
            <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Sebelumnya</Button>
                <span className="text-sm">Halaman {currentPage} dari {totalPages || 1}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>Berikutnya</Button>
            </div>
        </CardFooter>
      </Card>

      <LoanFormDialog
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSave={handleSave}
        loan={selectedLoan}
        employees={employees}
        currentActiveLoans={currentActiveLoans}
      />

      <DeleteLoanAlert
        isOpen={isAlertOpen}
        setIsOpen={setIsAlertOpen}
        onConfirm={confirmDelete}
      />

      <RepayLoanAlert
        isOpen={isRepayAlertOpen}
        setIsOpen={setIsRepayAlertOpen}
        onConfirm={confirmRepay}
        amount={selectedLoan?.remainingAmount ?? selectedLoan?.amount ?? 0}
        employeeName={selectedLoan ? employeeMap.get(selectedLoan.employeeId)?.name || '' : ''}
      />
    </div>
  );
}

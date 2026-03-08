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
import type { Loan, Employee } from "@/types";
import { PlusCircle, Edit, Trash2, CheckCircle } from "lucide-react";
import { LoanFormDialog, DeleteLoanAlert, RepayLoanAlert, type LoanFormData } from "./actions";
import { useCollection, useFirebase, WithId, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
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

  // Calculate current active debt per employee for limit checks
  const currentActiveLoans = useMemo(() => {
    const map = new Map<string, number>();
    loans?.filter(l => l.status === 'active').forEach(loan => {
        const current = map.get(loan.employeeId) || 0;
        map.set(loan.employeeId, current + loan.amount);
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
      setDocumentNonBlocking(docRef, { ...loanData, status: selectedLoan.status }, { merge: true });
    } else {
      const newId = doc(collection(firestore, "loans")).id;
      const docRef = doc(firestore, "loans", newId);
      setDocumentNonBlocking(docRef, { ...loanData, status: 'active' }, {});
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
        updateDocumentNonBlocking(docRef, { status: 'paid' });
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
                <CardDescription>Total Pinjaman Aktif</CardDescription>
                <CardTitle className="text-2xl font-bold text-destructive">
                    {formatCurrency(loans?.filter(l => l.status === 'active').reduce((acc, l) => acc + l.amount, 0) || 0)}
                </CardTitle>
            </CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>Pinjaman Terbayar</CardDescription>
                <CardTitle className="text-2xl font-bold text-green-600">
                    {formatCurrency(loans?.filter(l => l.status === 'paid').reduce((acc, l) => acc + l.amount, 0) || 0)}
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
            <CardDescription>Pinjaman ini akan dipotong otomatis saat gajian atau bisa dibayar manual sebelumnya.</CardDescription>
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
                      <SelectItem value="active">Aktif (Hutang)</SelectItem>
                      <SelectItem value="paid">Sudah Lunas</SelectItem>
                  </SelectContent>
              </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLoans.length > 0 ? (
                  paginatedLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">
                        {employeeMap.get(loan.employeeId)?.name || 'Karyawan Dihapus'}
                      </TableCell>
                      <TableCell>{format(parseISO(loan.date), "d MMM yyyy", { locale: id })}</TableCell>
                      <TableCell>{loan.description}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={loan.status === 'active' ? 'destructive' : 'default'}>
                          {loan.status === 'active' ? 'Belum Bayar' : 'Lunas'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {loan.status === 'active' && (
                            <div className="flex justify-end space-x-1">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => handleRepay(loan)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Tandai Lunas Manual</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(loan)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(loan)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Tidak ada data pinjaman.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
        amount={selectedLoan?.amount || 0}
        employeeName={selectedLoan ? employeeMap.get(selectedLoan.employeeId)?.name || '' : ''}
      />
    </div>
  );
}

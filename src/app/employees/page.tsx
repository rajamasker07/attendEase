"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import type { Employee } from "@/types";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Search,
  Users,
  UserCheck,
  UserX,
  Wallet,
  Phone,
  Eye,
  Calendar
} from "lucide-react";
import { EmployeeFormDialog, DeleteEmployeeAlert, EmployeeDetailDialog, type EmployeeFormData } from "./employee-actions";
import { useCollection, useFirebase, WithId, setDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function EmployeesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<WithId<Employee> | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "aktif" | "tidak aktif">("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const { firestore } = useFirebase();

  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesCollection);

  // Summary Metrics
  const totalEmployeesCount = employees?.length || 0;
  const activeEmployeesCount = useMemo(() => employees?.filter(e => e.status === 'aktif').length || 0, [employees]);
  const inactiveEmployeesCount = useMemo(() => employees?.filter(e => e.status === 'tidak aktif').length || 0, [employees]);
  const totalSalaryBudget = useMemo(() => {
    if (!employees) return 0;
    return employees.reduce((acc, curr) => acc + (typeof curr.salary === 'number' ? curr.salary : 0), 0);
  }, [employees]);

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const filteredAndSortedEmployees = useMemo(() => {
    if (!employees) return [];

    let filteredItems = [...employees];

    // Filter by status
    if (statusFilter !== "all") {
      filteredItems = filteredItems.filter(
        (employee) => employee.status === statusFilter
      );
    }

    // Filter by search term
    if (searchTerm) {
      filteredItems = filteredItems.filter((employee) =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    if (sortConfig !== null) {
      filteredItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredItems;
  }, [employees, searchTerm, statusFilter, sortConfig]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedEmployees.length / rowsPerPage);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedEmployees.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedEmployees, currentPage]);

  const requestSort = (key: keyof Employee) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof Employee) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />;
    }
    return <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />;
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const handleEdit = (employee: WithId<Employee>) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };
  
  const handleDelete = (employee: WithId<Employee>) => {
    setSelectedEmployee(employee);
    setIsAlertOpen(true);
  };

  const handleViewDetails = (employee: WithId<Employee>) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(true);
  };

  const handleSave = (employeeData: EmployeeFormData) => {
    if (!firestore) return;
    
    if (selectedEmployee) {
      const docRef = doc(firestore, "employees", selectedEmployee.id);
      setDocumentNonBlocking(docRef, employeeData, { merge: true });
    } else {
      const newId = doc(collection(firestore, "employees")).id;
      const docRef = doc(firestore, "employees", newId);
      setDocumentNonBlocking(docRef, employeeData, {});
    }
  };
  
  const confirmDelete = () => {
    if (selectedEmployee && firestore) {
      const docRef = doc(firestore, "employees", selectedEmployee.id);
      deleteDocumentNonBlocking(docRef);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-full" />
            <Skeleton className="h-8 w-72 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>
          <Skeleton className="h-11 w-48 rounded-xl" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl border border-border/60 p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl border border-border/60 p-6 space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-11 w-72 rounded-xl" />
            <Skeleton className="h-11 w-44 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistem SDM & Data Pegawai
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-headline tracking-tight text-foreground">
            Direktori & Manajemen Karyawan
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola profil seluruh anggota tim, struktur jabatan, status kontrak, dan anggaran gaji pokok.
          </p>
        </div>
        <Button 
          onClick={handleAdd}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:from-primary/90 hover:to-sky-700 text-white font-semibold shadow-md shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <PlusCircle className="h-4 w-4" /> Tambah Karyawan Baru
        </Button>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Karyawan */}
        <div className="relative overflow-hidden rounded-2xl glass-card border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-background/80 to-background/50 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Karyawan</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/25">
              Database
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-display tracking-tight text-foreground">
              {totalEmployeesCount}
            </span>
            <span className="text-sm font-medium text-muted-foreground">Orang</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Terdaftar dalam sistem AttendEase</span>
          </p>
        </div>

        {/* Card 2: Karyawan Aktif */}
        <div className="relative overflow-hidden rounded-2xl glass-card border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] via-background/80 to-background/50 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Karyawan Aktif</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Bekerja Penuh
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-display tracking-tight text-foreground">
              {activeEmployeesCount}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              ({totalEmployeesCount > 0 ? Math.round((activeEmployeesCount / totalEmployeesCount) * 100) : 0}%)
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Siap menerima penugasan & presensi</span>
          </p>
        </div>

        {/* Card 3: Tidak Aktif / Non-Aktif */}
        <div className="relative overflow-hidden rounded-2xl glass-card border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] via-background/80 to-background/50 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tidak Aktif</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              Arsip / Off
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-display tracking-tight text-foreground">
              {inactiveEmployeesCount}
            </span>
            <span className="text-sm font-medium text-muted-foreground">Orang</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <UserX className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Non-aktif atau telah resign</span>
          </p>
        </div>

        {/* Card 4: Total Anggaran Gaji Pokok */}
        <div className="relative overflow-hidden rounded-2xl glass-card border border-secondary/25 bg-gradient-to-br from-secondary/[0.07] via-background/80 to-background/50 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anggaran Gaji Pokok</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
              Beban Bulanan
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalSalaryBudget)}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-secondary shrink-0" />
            <span>Total estimasi beban gaji bulanan</span>
          </p>
        </div>
      </div>

      {/* Toolbar Pencarian & Filter */}
      <div className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau jabatan karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl border-border/80 bg-background/60"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "aktif" | "tidak aktif")}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl border-border/80 bg-background/60 text-xs">
              <SelectValue placeholder="Filter status"/>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/80">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="tidak aktif">Tidak Aktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground px-1 sm:text-right">
          Menampilkan <strong>{filteredAndSortedEmployees.length}</strong> data
        </div>
      </div>

      {/* High-Precision Glass Table */}
      <div className="glass-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/90 dark:bg-slate-900/95 border-b border-border/80">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('name')}
                    className="p-0 h-auto font-bold text-xs text-slate-700 dark:text-slate-100 uppercase hover:bg-transparent hover:text-primary dark:hover:text-primary"
                  >
                    Karyawan
                    {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('position')}
                    className="p-0 h-auto font-bold text-xs text-slate-700 dark:text-slate-100 uppercase hover:bg-transparent hover:text-primary dark:hover:text-primary"
                  >
                    Jabatan / Posisi
                    {getSortIcon('position')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('joinDate')}
                    className="p-0 h-auto font-bold text-xs text-slate-700 dark:text-slate-100 uppercase hover:bg-transparent hover:text-primary dark:hover:text-primary"
                  >
                    Tgl. Bergabung
                    {getSortIcon('joinDate')}
                  </Button>
                </TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-100 uppercase">Kontak</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('salary')}
                    className="p-0 h-auto font-bold text-xs text-slate-700 dark:text-slate-100 uppercase hover:bg-transparent hover:text-primary dark:hover:text-primary"
                  >
                    Gaji Pokok
                    {getSortIcon('salary')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => requestSort('status')}
                    className="p-0 h-auto font-bold text-xs text-slate-700 dark:text-slate-100 uppercase hover:bg-transparent hover:text-primary dark:hover:text-primary"
                  >
                    Status
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="text-right font-bold text-xs text-slate-700 dark:text-slate-100 uppercase w-[110px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((employee) => (
                  <TableRow key={employee.id} className="border-border/40 hover:bg-surface-container-high/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary border border-primary/20 font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(employee.name)}
                        </div>
                        <div className="flex flex-col">
                          <button 
                            type="button" 
                            className="font-semibold text-foreground text-sm hover:text-primary transition-colors text-left"
                            onClick={() => handleViewDetails(employee)}
                          >
                            {employee.name}
                          </button>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ID: {employee.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm font-medium text-foreground">
                        {employee.position}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {employee.joinDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 opacity-60" />
                          <span>{format(parseISO(employee.joinDate), "d MMM yyyy", { locale: id })}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {employee.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 opacity-60" />
                          <span>{employee.phone}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-foreground">
                      {typeof employee.salary === 'number' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(employee.salary) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        employee.status === 'aktif'
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                      )}>
                        {employee.status === 'tidak aktif' ? 'Tidak Aktif' : 'Aktif'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          onClick={() => handleViewDetails(employee)}
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Detail</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          onClick={() => handleEdit(employee)}
                          title="Ubah Profil"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Ubah</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-rose-500/10"
                          onClick={() => handleDelete(employee)}
                          title="Hapus Karyawan"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Hapus</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-sm italic">
                    {employees && employees.length > 0 ? 'Tidak ada karyawan yang cocok dengan filter pencarian.' : 'Belum ada data karyawan ditemukan.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/50 gap-3">
          <div className="text-xs text-muted-foreground">
            Menampilkan <strong>{paginatedEmployees.length}</strong> dari <strong>{filteredAndSortedEmployees.length}</strong> total karyawan
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs rounded-lg border-border/80"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Halaman {currentPage} dari {totalPages > 0 ? totalPages : 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs rounded-lg border-border/80"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      {/* Action Dialogs */}
      <EmployeeFormDialog
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSave={handleSave}
        employee={selectedEmployee}
      />

      <DeleteEmployeeAlert
        isOpen={isAlertOpen}
        setIsOpen={setIsAlertOpen}
        onConfirm={confirmDelete}
        employeeName={selectedEmployee?.name}
      />

      <EmployeeDetailDialog
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        employee={selectedEmployee}
      />
    </div>
  );
}

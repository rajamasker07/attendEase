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
import type { Sanction, Employee } from "@/types";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { SanctionFormDialog, DeleteSanctionAlert, type SanctionFormData } from "./actions";
import { useCollection, useFirebase, WithId, setDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function SanctionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedSanction, setSelectedSanction] = useState<WithId<Sanction> | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;


  const { firestore } = useFirebase();

  const sanctionsCollection = useMemoFirebase(() => firestore ? query(collection(firestore, "sanctions"), orderBy("date", "desc")) : null, [firestore]);
  const { data: sanctions, isLoading: isLoadingSanctions } = useCollection<Sanction>(sanctionsCollection);

  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);

  const employeeMap = useMemo(() => {
    if (!employees) return new Map();
    return new Map(employees.map(e => [e.id, e.name]));
  }, [employees]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM", { locale: id }),
  })), []);

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()), []);

  const filteredSanctions = useMemo(() => {
    if (!sanctions) return [];

    let filteredItems = [...sanctions];
    
    const year = parseInt(yearFilter, 10);
    const month = parseInt(monthFilter, 10);

    if (!isNaN(year) && yearFilter !== 'all') {
        filteredItems = filteredItems.filter(s => parseISO(s.date).getFullYear() === year);
    }
    if (!isNaN(month) && monthFilter !== 'all') {
        filteredItems = filteredItems.filter(s => parseISO(s.date).getMonth() === month);
    }

    // Filter by employee
    if (employeeFilter !== "all") {
      filteredItems = filteredItems.filter(
        (sanction) => sanction.employeeId === employeeFilter
      );
    }

    // Filter by search term
    if (searchTerm) {
      filteredItems = filteredItems.filter((sanction) =>
        sanction.violation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employeeMap.get(sanction.employeeId)?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredItems;
  }, [sanctions, searchTerm, employeeFilter, employeeMap, monthFilter, yearFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, employeeFilter, monthFilter, yearFilter]);

  const totalPages = Math.ceil(filteredSanctions.length / rowsPerPage);
  const paginatedSanctions = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredSanctions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredSanctions, currentPage]);

  const handleAdd = () => {
    setSelectedSanction(null);
    setIsFormOpen(true);
  };

  const handleEdit = (sanction: WithId<Sanction>) => {
    setSelectedSanction(sanction);
    setIsFormOpen(true);
  };
  
  const handleDelete = (sanction: WithId<Sanction>) => {
    setSelectedSanction(sanction);
    setIsAlertOpen(true);
  };

  const handleSave = (sanctionData: SanctionFormData) => {
    if (!firestore) return;
    
    if (selectedSanction) {
      const docRef = doc(firestore, "sanctions", selectedSanction.id);
      setDocumentNonBlocking(docRef, sanctionData, { merge: true });
    } else {
      const newId = doc(collection(firestore, "sanctions")).id;
      const docRef = doc(firestore, "sanctions", newId);
      setDocumentNonBlocking(docRef, sanctionData, {});
    }
  };
  
  const confirmDelete = () => {
    if (selectedSanction && firestore) {
      const docRef = doc(firestore, "sanctions", selectedSanction.id);
      deleteDocumentNonBlocking(docRef);
    }
  }

  const isLoading = isLoadingSanctions || isLoadingEmployees;
  const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sanksi</CardTitle>
            <CardDescription>
              Kelola daftar sanksi dan denda untuk karyawan.
            </CardDescription>
          </div>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Sanksi
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center py-4 gap-2">
            <Skeleton className="h-10 max-w-sm w-full" />
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-28" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-6">
          <Skeleton className="h-5 w-48" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Sanksi</CardTitle>
          <CardDescription>
            Kelola daftar sanksi dan denda untuk karyawan.
          </CardDescription>
        </div>
        <Button onClick={handleAdd} disabled={isLoadingEmployees}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Sanksi
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center py-4 gap-2">
            <Input
                placeholder="Cari pelanggaran atau nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter karyawan"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Karyawan</SelectItem>
                    {employees?.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Filter tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggaran</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSanctions.length > 0 ? (
                paginatedSanctions.map((sanction) => (
                  <TableRow key={sanction.id}>
                    <TableCell className="font-medium">
                      {employeeMap.get(sanction.employeeId) || 'Karyawan Dihapus'}
                    </TableCell>
                    <TableCell>{format(parseISO(sanction.date), "d MMM yyyy", { locale: id })}</TableCell>
                    <TableCell>{sanction.violation}</TableCell>
                    <TableCell>{formatCurrency(sanction.deduction)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(sanction)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Ubah</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(sanction)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {sanctions && sanctions.length > 0 ? 'Tidak ada sanksi yang cocok dengan filter.' : 'Tidak ada data sanksi.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-6">
        <div className="text-sm text-muted-foreground">
          Menampilkan {paginatedSanctions.length} dari {filteredSanctions.length} sanksi.
        </div>
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">
                Halaman {currentPage} dari {totalPages > 0 ? totalPages : 1}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
            >
                Berikutnya
            </Button>
        </div>
      </CardFooter>

      <SanctionFormDialog
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSave={handleSave}
        sanction={selectedSanction}
        employees={employees}
      />

      <DeleteSanctionAlert
        isOpen={isAlertOpen}
        setIsOpen={setIsAlertOpen}
        onConfirm={confirmDelete}
        employeeName={selectedSanction ? employeeMap.get(selectedSanction.employeeId) : ''}
      />
    </Card>
  );
}

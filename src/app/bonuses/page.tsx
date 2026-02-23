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
import type { Bonus, Employee } from "@/types";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { BonusFormDialog, DeleteBonusAlert, type BonusFormData } from "./actions";
import { useCollection, useFirebase, WithId, setDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function BonusesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<WithId<Bonus> | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;


  const { firestore } = useFirebase();

  const bonusesCollection = useMemoFirebase(() => firestore ? query(collection(firestore, "bonuses"), orderBy("date", "desc")) : null, [firestore]);
  const { data: bonuses, isLoading: isLoadingBonuses } = useCollection<Bonus>(bonusesCollection);

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

  const filteredBonuses = useMemo(() => {
    if (!bonuses) return [];

    let filteredItems = [...bonuses];
    
    const year = parseInt(yearFilter, 10);
    const month = parseInt(monthFilter, 10);

    if (!isNaN(year) && yearFilter !== 'all') {
        filteredItems = filteredItems.filter(s => parseISO(s.date).getFullYear() === year);
    }
    if (!isNaN(month) && monthFilter !== 'all') {
        filteredItems = filteredItems.filter(s => parseISO(s.date).getMonth() === month);
    }

    if (employeeFilter !== "all") {
      filteredItems = filteredItems.filter(
        (bonus) => bonus.employeeId === employeeFilter
      );
    }

    if (searchTerm) {
      filteredItems = filteredItems.filter((bonus) =>
        (bonus.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        employeeMap.get(bonus.employeeId)?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredItems;
  }, [bonuses, searchTerm, employeeFilter, employeeMap, monthFilter, yearFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, employeeFilter, monthFilter, yearFilter]);

  const totalPages = Math.ceil(filteredBonuses.length / rowsPerPage);
  const paginatedBonuses = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredBonuses.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredBonuses, currentPage]);

  const handleAdd = () => {
    setSelectedBonus(null);
    setIsFormOpen(true);
  };

  const handleEdit = (bonus: WithId<Bonus>) => {
    setSelectedBonus(bonus);
    setIsFormOpen(true);
  };
  
  const handleDelete = (bonus: WithId<Bonus>) => {
    setSelectedBonus(bonus);
    setIsAlertOpen(true);
  };

  const handleSave = (bonusData: BonusFormData) => {
    if (!firestore) return;
    
    if (selectedBonus) {
      const docRef = doc(firestore, "bonuses", selectedBonus.id);
      setDocumentNonBlocking(docRef, bonusData, { merge: true });
    } else {
      const newId = doc(collection(firestore, "bonuses")).id;
      const docRef = doc(firestore, "bonuses", newId);
      setDocumentNonBlocking(docRef, bonusData, {});
    }
  };
  
  const confirmDelete = () => {
    if (selectedBonus && firestore) {
      const docRef = doc(firestore, "bonuses", selectedBonus.id);
      deleteDocumentNonBlocking(docRef);
    }
  }

  const isLoading = isLoadingBonuses || isLoadingEmployees;
  const formatCurrency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const getBonusTypeBadge = (type: Bonus['type']) => {
    switch(type) {
        case 'lembur': return <Badge variant="default">Lembur</Badge>
        case 'penjualan': return <Badge className="bg-green-600 text-white hover:bg-green-700">Penjualan</Badge>
        case 'tunjangan': return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Tunjangan</Badge>
        case 'lainnya': return <Badge variant="secondary">Lainnya</Badge>
        default: return <Badge variant="secondary">{type}</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bonus</CardTitle>
            <CardDescription>
              Kelola daftar bonus dan pendapatan tambahan untuk karyawan.
            </CardDescription>
          </div>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Bonus
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
          <CardTitle>Bonus</CardTitle>
          <CardDescription>
            Kelola daftar bonus dan pendapatan tambahan untuk karyawan.
          </CardDescription>
        </div>
        <Button onClick={handleAdd} disabled={isLoadingEmployees}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Bonus
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center py-4 gap-2">
            <Input
                placeholder="Cari deskripsi atau nama..."
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
                <TableHead>Jenis</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBonuses.length > 0 ? (
                paginatedBonuses.map((bonus) => (
                  <TableRow key={bonus.id}>
                    <TableCell className="font-medium">
                      {employeeMap.get(bonus.employeeId) || 'Karyawan Dihapus'}
                    </TableCell>
                    <TableCell>{format(parseISO(bonus.date), "d MMM yyyy", { locale: id })}</TableCell>
                    <TableCell>{getBonusTypeBadge(bonus.type)}</TableCell>
                    <TableCell>{formatCurrency(bonus.amount)}</TableCell>
                    <TableCell>{bonus.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(bonus)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Ubah</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(bonus)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {bonuses && bonuses.length > 0 ? 'Tidak ada bonus yang cocok dengan filter.' : 'Tidak ada data bonus.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-6">
        <div className="text-sm text-muted-foreground">
          Menampilkan {paginatedBonuses.length} dari {filteredBonuses.length} bonus.
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

      <BonusFormDialog
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSave={handleSave}
        bonus={selectedBonus}
        employees={employees}
      />

      <DeleteBonusAlert
        isOpen={isAlertOpen}
        setIsOpen={setIsAlertOpen}
        onConfirm={confirmDelete}
        employeeName={selectedBonus ? employeeMap.get(selectedBonus.employeeId) : ''}
      />
    </Card>
  );
}

    
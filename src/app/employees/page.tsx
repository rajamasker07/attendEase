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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@/types";
import { PlusCircle, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { EmployeeFormDialog, DeleteEmployeeAlert, EmployeeDetailDialog, type EmployeeFormData } from "./employee-actions";
import { useCollection, useFirebase, WithId, setDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function EmployeesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<WithId<Employee> | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "aktif" | "tidak aktif">("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });


  const { firestore } = useFirebase();

  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesCollection);

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
        employee.name.toLowerCase().includes(searchTerm.toLowerCase())
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

  const requestSort = (key: keyof Employee) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof Employee) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
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
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Karyawan</CardTitle>
          <CardDescription>
            Kelola daftar karyawan Anda.
          </CardDescription>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Karyawan
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center py-4 gap-2">
            <Input
                placeholder="Cari nama karyawan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "aktif" | "tidak aktif")}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter status"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="tidak aktif">Tidak Aktif</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('name')}>
                      Nama
                      {getSortIcon('name')}
                    </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('position')}>
                      Posisi
                      {getSortIcon('position')}
                    </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('joinDate')}>
                      Tgl. Masuk
                      {getSortIcon('joinDate')}
                    </Button>
                </TableHead>
                <TableHead>No. HP</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('salary')}>
                      Gaji
                      {getSortIcon('salary')}
                    </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('status')}>
                      Status
                      {getSortIcon('status')}
                    </Button>
                </TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Memuat data karyawan...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedEmployees.length > 0 ? (
                filteredAndSortedEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <Button variant="link" className="p-0 h-auto font-medium" onClick={() => handleViewDetails(employee)}>
                        {employee.name}
                      </Button>
                    </TableCell>
                    <TableCell className="capitalize">{employee.position}</TableCell>
                    <TableCell>{employee.joinDate ? format(parseISO(employee.joinDate), "d MMM yyyy", { locale: id }) : '-'}</TableCell>
                    <TableCell>{employee.phone || '-'}</TableCell>
                    <TableCell>{typeof employee.salary === 'number' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(employee.salary) : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'tidak aktif' ? 'secondary' : 'default'}>
                        {employee.status === 'tidak aktif' ? 'Tidak Aktif' : 'Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Ubah</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(employee)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {employees && employees.length > 0 ? 'Tidak ada karyawan yang cocok dengan filter.' : 'Tidak ada karyawan ditemukan.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

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
    </Card>
  );
}

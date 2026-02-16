"use client";

import { useState } from "react";
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
import type { Employee } from "@/types";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { EmployeeFormDialog, DeleteEmployeeAlert, type EmployeeFormData } from "./employee-actions";
import { useCollection, useFirebase, WithId, setDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function EmployeesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<WithId<Employee> | null>(null);

  const { firestore } = useFirebase();

  const employeesCollection = useMemoFirebase(() => firestore ? collection(firestore, "employees") : null, [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesCollection);

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Posisi</TableHead>
              <TableHead>Tgl. Masuk</TableHead>
              <TableHead>No. HP</TableHead>
              <TableHead>Gaji</TableHead>
              <TableHead>Status</TableHead>
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
            ) : employees && employees.length > 0 ? (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
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
                  Tidak ada karyawan ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
    </Card>
  );
}

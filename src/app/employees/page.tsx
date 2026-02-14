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
import useLocalStorage from "@/hooks/use-local-storage";
import type { Employee } from "@/lib/types";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { EmployeeFormDialog, DeleteEmployeeAlert } from "./employee-actions";

const initialEmployees: Employee[] = [
    { id: '1', name: 'John Doe', position: 'Frontend Developer' },
    { id: '2', name: 'Jane Smith', position: 'Backend Developer' },
    { id: '3', name: 'Peter Jones', position: 'UI/UX Designer' },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useLocalStorage<Employee[]>("employees", initialEmployees);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };
  
  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsAlertOpen(true);
  };

  const handleSave = (employeeData: Omit<Employee, "id">) => {
    if (selectedEmployee) {
      setEmployees(
        employees.map((e) =>
          e.id === selectedEmployee.id ? { ...e, ...employeeData } : e
        )
      );
    } else {
      setEmployees([...employees, { id: crypto.randomUUID(), ...employeeData }]);
    }
  };
  
  const confirmDelete = () => {
    if (selectedEmployee) {
      setEmployees(employees.filter(e => e.id !== selectedEmployee.id));
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
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length > 0 ? (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
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
                <TableCell colSpan={3} className="h-24 text-center">
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

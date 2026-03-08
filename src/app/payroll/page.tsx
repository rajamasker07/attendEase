
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
import { PlusCircle, FileText, Trash2 } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase, WithId, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, getDocs } from "firebase/firestore";
import type { Payroll } from "@/types";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CreatePayrollDialog, DeletePayrollAlert } from "./actions";
import Link from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function PayrollPage() {
  const { firestore } = useFirebase();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<WithId<Payroll> | null>(null);

  const payrollsCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "payrolls"), orderBy("period", "desc")) : null),
    [firestore]
  );
  const { data: payrolls, isLoading } = useCollection<Payroll>(payrollsCollection);

  const handleDeleteClick = (payroll: WithId<Payroll>) => {
    setSelectedPayroll(payroll);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedPayroll && firestore) {
      try {
        // First, delete all payslips in the subcollection
        const payslipsRef = collection(firestore, "payrolls", selectedPayroll.id, "payslips");
        const payslipsSnap = await getDocs(payslipsRef);
        payslipsSnap.forEach((payslipDoc) => {
          deleteDocumentNonBlocking(payslipDoc.ref);
        });

        // Then, delete the payroll document itself
        const payrollDocRef = doc(firestore, "payrolls", selectedPayroll.id);
        deleteDocumentNonBlocking(payrollDocRef);

        setSelectedPayroll(null);
      } catch (error) {
        console.error("Error deleting payroll:", error);
      }
    }
  };


  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Riwayat Penggajian</CardTitle>
            <CardDescription>
              Lihat dan kelola riwayat penggajian yang telah dibuat.
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Buat Penggajian
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Tanggal Dibuat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                            <Skeleton className="h-9 w-28" />
                            <Skeleton className="h-10 w-10" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : payrolls && payrolls.length > 0 ? (
                  payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-medium">
                        {format(parseISO(payroll.period), "MMMM yyyy", { locale: id })}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(payroll.createdAt), "d MMMM yyyy, p", { locale: id })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payroll.status === "finalized" ? "default" : "secondary"}>
                          {payroll.status === 'draft' ? 'Draf' : 'Selesai'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <a href={`/payroll/${payroll.id}`} className="flex items-center">
                            <FileText className="mr-2 h-4 w-4" />
                            Lihat Detail
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="ml-2" onClick={() => handleDeleteClick(payroll)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Hapus</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Belum ada data penggajian.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <CreatePayrollDialog isOpen={isCreateOpen} setIsOpen={setIsCreateOpen} />
      <DeletePayrollAlert
        isOpen={isAlertOpen}
        setIsOpen={setIsAlertOpen}
        onConfirm={confirmDelete}
        payrollPeriod={selectedPayroll ? format(parseISO(selectedPayroll.period), "MMMM yyyy", { locale: id }) : ''}
        isFinalized={selectedPayroll?.status === 'finalized'}
      />
    </>
  );
}

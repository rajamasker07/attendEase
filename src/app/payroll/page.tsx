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
import { PlusCircle, FileText } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase, WithId } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { Payroll } from "@/types";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CreatePayrollDialog } from "./actions";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function PayrollPage() {
  const { firestore } = useFirebase();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const payrollsCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "payrolls"), orderBy("period", "desc")) : null),
    [firestore]
  );
  const { data: payrolls, isLoading } = useCollection<Payroll>(payrollsCollection);

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
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
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
                          <Link href={`/payroll/${payroll.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Lihat Detail
                          </Link>
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
    </>
  );
}

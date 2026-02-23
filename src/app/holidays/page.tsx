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
import type { Holiday } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { HolidayFormDialog, DeleteHolidayAlert, type HolidayFormData } from "./actions";
import { useCollection, useFirebase, WithId, addDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function HolidaysPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<WithId<Holiday> | null>(null);

  const { firestore } = useFirebase();

  const holidaysCollection = useMemoFirebase(() => firestore ? query(collection(firestore, "holidays"), orderBy("date", "desc")) : null, [firestore]);
  const { data: holidays, isLoading } = useCollection<Holiday>(holidaysCollection);

  const handleDelete = (holiday: WithId<Holiday>) => {
    setSelectedHoliday(holiday);
    setIsAlertOpen(true);
  };

  const handleSave = (holidayData: HolidayFormData) => {
    if (!firestore) return;
    
    addDocumentNonBlocking(collection(firestore, "holidays"), holidayData);
  };
  
  const confirmDelete = () => {
    if (selectedHoliday && firestore) {
      const docRef = doc(firestore, "holidays", selectedHoliday.id);
      deleteDocumentNonBlocking(docRef);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Hari Libur</CardTitle>
            <CardDescription>
              Kelola daftar hari libur nasional dan cuti bersama.
            </CardDescription>
          </div>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Hari Libur
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-48" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-10 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Hari Libur</CardTitle>
          <CardDescription>
            Kelola daftar hari libur nasional dan cuti bersama.
          </CardDescription>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Hari Libur
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays && holidays.length > 0 ? (
                holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">
                        {format(parseISO(holiday.date), "EEEE, d MMMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell>{holiday.description}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(holiday)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Tidak ada data hari libur.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <HolidayFormDialog
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSave={handleSave}
      />

      <DeleteHolidayAlert
        isOpen={isAlertOpen}
        setIsOpen={setIsAlertOpen}
        onConfirm={confirmDelete}
        holidayDescription={selectedHoliday?.description}
      />
    </Card>
  );
}

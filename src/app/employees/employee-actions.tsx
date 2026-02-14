"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Employee } from "@/lib/types";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  position: z.string().min(2, "Position must be at least 2 characters."),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (data: EmployeeFormData) => void;
  employee: Employee | null;
}

export function EmployeeFormDialog({
  isOpen,
  setIsOpen,
  onSave,
  employee,
}: EmployeeFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: "", position: "" },
  });

  useEffect(() => {
    if (employee) {
      reset({ name: employee.name, position: employee.position });
    } else {
      reset({ name: "", position: "" });
    }
  }, [employee, reset, isOpen]);

  const onSubmit: SubmitHandler<EmployeeFormData> = (data) => {
    onSave(data);
    setIsOpen(false);
    toast({
      title: "Success",
      description: `Employee ${employee ? 'updated' : 'added'} successfully.`,
    })
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {employee ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
            <DialogDescription>
              {employee
                ? "Update the details of the employee."
                : "Add a new employee to your list."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <div className="col-span-3">
                <Input id="name" {...register("name")} className="w-full" />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Position
              </Label>
              <div className="col-span-3">
                <Input id="position" {...register("position")} className="w-full" />
                {errors.position && <p className="text-destructive text-sm mt-1">{errors.position.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


interface DeleteEmployeeAlertProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onConfirm: () => void;
    employeeName?: string;
}

export function DeleteEmployeeAlert({ isOpen, setIsOpen, onConfirm, employeeName }: DeleteEmployeeAlertProps) {
    const { toast } = useToast();
    
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
        toast({
            title: "Employee Deleted",
            description: `${employeeName} has been removed.`,
            variant: "destructive"
        })
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the employee
                        <strong> {employeeName}</strong> and their associated data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

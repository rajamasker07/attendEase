"use client";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { Calendar } from "lucide-react";

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time ? format(time, "HH") : "--";
  const minutes = time ? format(time, "mm") : "--";
  const seconds = time ? format(time, "ss") : "--";
  const dateStr = time ? format(time, "EEEE, d MMMM yyyy", { locale: id }) : "Memuat waktu...";

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-sky-50/70 to-indigo-50/40 dark:from-sky-950/20 dark:via-background dark:to-indigo-950/20 border border-primary/15 shadow-sm text-center relative overflow-hidden">
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-1 font-display text-4xl sm:text-5xl font-extrabold text-primary tracking-tight">
          <span>{hours}</span>
          <span className="animate-pulse text-cyan-600 dark:text-cyan-400 -mt-1">:</span>
          <span>{minutes}</span>
          <span className="animate-pulse text-cyan-600 dark:text-cyan-400 -mt-1">:</span>
          <span className="text-cyan-600 dark:text-cyan-400">{seconds}</span>
          <span className="font-headline text-xs sm:text-sm font-semibold text-muted-foreground ml-2 px-2 py-0.5 rounded-md bg-background/80 border border-border/60">
            WIB
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-muted-foreground font-headline text-xs sm:text-sm font-medium">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <span className="capitalize">{dateStr}</span>
        </div>
      </div>
    </div>
  );
}

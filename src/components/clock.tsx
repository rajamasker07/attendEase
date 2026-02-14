"use client";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center rounded-lg bg-muted/50 p-4">
      {time === null ? (
        <>
          <p className="text-4xl font-bold text-primary sm:text-5xl invisible">00:00:00</p>
          <p className="text-sm text-muted-foreground sm:text-base invisible">Wednesday, 25 September 2024</p>
        </>
      ) : (
        <>
          <p className="text-4xl font-bold text-primary sm:text-5xl">{format(time, 'HH:mm:ss')}</p>
          <p className="text-sm text-muted-foreground sm:text-base">{format(time, 'EEEE, d MMMM yyyy', { locale: id })}</p>
        </>
      )}
    </div>
  );
}

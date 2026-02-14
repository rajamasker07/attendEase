"use client";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center rounded-lg bg-muted/50 p-4">
      <p className="text-4xl font-bold text-primary sm:text-5xl">{format(time, 'HH:mm:ss')}</p>
      <p className="text-sm text-muted-foreground sm:text-base">{format(time, 'EEEE, d MMMM yyyy')}</p>
    </div>
  );
}

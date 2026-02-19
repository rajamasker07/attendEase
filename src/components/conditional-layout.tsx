'use client';

import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/main-layout';
import type { ReactNode } from 'react';

export function ConditionalLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isPayslipPage = pathname.startsWith('/payslip/');

    if (isPayslipPage) {
        return <>{children}</>;
    }

    return <MainLayout>{children}</MainLayout>;
}

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { ConditionalLayout } from '@/components/conditional-layout';
import { Analytics } from '@vercel/analytics/next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AttendEase - Sistem Presensi Modern',
  description: 'Sistem absensi dan manajemen SDM modern berbasis web',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`h-full ${inter.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased h-full relative selection:bg-primary/20 selection:text-primary bg-background text-foreground transition-colors duration-200">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-32 right-12 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-sky-400/15 via-indigo-500/10 to-transparent blur-3xl dark:from-sky-500/10 dark:via-indigo-500/5" />
          <div className="absolute -bottom-20 left-1/3 w-[600px] h-[400px] rounded-full bg-gradient-to-tr from-cyan-400/15 via-blue-500/10 to-transparent blur-3xl dark:from-cyan-500/10 dark:via-blue-500/5" />
        </div>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="relative z-10 h-full flex flex-col">
            <FirebaseClientProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
              <Toaster />
            </FirebaseClientProvider>
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

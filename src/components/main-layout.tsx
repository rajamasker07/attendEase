"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  BookText,
  DollarSign,
  AlertTriangle,
  Settings,
  LogOut,
  CalendarDays,
  Star,
  Wallet,
  HandCoins,
  Timer,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ThemeToggle } from "@/components/theme-toggle";

function PageHeader() {
  const pathname = usePathname();
  let title = "Pusat Kehadiran & Operasional";
  if (pathname.startsWith("/employees")) {
    title = "Manajemen Data Karyawan";
  } else if (pathname.startsWith("/reports")) {
    title = "Laporan Kehadiran";
  } else if (pathname.startsWith("/payroll")) {
    title = "Penggajian";
  } else if (pathname.startsWith("/loans")) {
    title = "Hutang & Kasbon";
  } else if (pathname.startsWith("/sanctions")) {
    title = "Manajemen Sanksi";
  } else if (pathname.startsWith("/bonuses")) {
    title = "Manajemen Bonus";
  } else if (pathname.startsWith("/holidays")) {
    title = "Manajemen Hari Libur";
  } else if (pathname.startsWith("/settings")) {
    title = "Pengaturan Sistem";
  } else if (pathname.startsWith("/savings")) {
    title = "Tabungan Karyawan";
  }

  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy", { locale: id });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 sm:px-6 shadow-[0_1px_6px_rgba(0,0,0,0.03)] transition-all">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="h-6 w-[1px] bg-border/80 hidden sm:block" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate capitalize font-medium">{todayFormatted}</span>
          </div>
          <h1 className="font-headline text-base sm:text-lg font-bold text-foreground truncate leading-tight">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <ThemeToggle />

        <div className="hidden sm:flex flex-col text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="font-headline text-xs font-semibold text-foreground">
              Admin Operasional
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20"
            >
              HR Lead
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
            {user?.email || "admin@attendease.co.id"}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-primary via-primary-container to-secondary text-white font-bold text-sm">
                  {user?.email?.[0].toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">Admin Operasional</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/60 bg-background/80 backdrop-blur-xl">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary-container to-secondary flex items-center justify-center shadow-md shadow-primary/20 text-white shrink-0 group-hover:scale-105 transition-transform">
              <Timer className="h-5 w-5" />
            </div>
            <div className="flex flex-col group-data-[state=collapsed]:hidden min-w-0">
              <span className="font-headline font-bold text-lg text-foreground tracking-tight leading-none">
                AttendEase
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mt-1">
                HR Management
              </span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <div className="px-2 py-1 group-data-[state=collapsed]:hidden">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Navigasi Utama
            </span>
          </div>
          <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton
                  isActive={pathname === "/"}
                  tooltip="Dasbor"
                  className="rounded-xl font-medium transition-all"
                >
                  <Home className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Dasbor</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/employees">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/employees")}
                  tooltip="Karyawan"
                  className="rounded-xl font-medium transition-all"
                >
                  <Users className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Karyawan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/reports">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/reports")}
                  tooltip="Laporan"
                  className="rounded-xl font-medium transition-all"
                >
                  <BookText className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Laporan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/payroll">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/payroll")}
                  tooltip="Penggajian"
                  className="rounded-xl font-medium transition-all"
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Penggajian</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/loans">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/loans")}
                  tooltip="Kasbon"
                  className="rounded-xl font-medium transition-all"
                >
                  <HandCoins className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Hutang & Kasbon</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/savings">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/savings")}
                  tooltip="Tabungan"
                  className="rounded-xl font-medium transition-all"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Tabungan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/holidays">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/holidays")}
                  tooltip="Hari Libur"
                  className="rounded-xl font-medium transition-all"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Hari Libur</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/bonuses">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/bonuses")}
                  tooltip="Bonus"
                  className="rounded-xl font-medium transition-all"
                >
                  <Star className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Bonus</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/sanctions">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/sanctions")}
                  tooltip="Sanksi"
                  className="rounded-xl font-medium transition-all"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Sanksi</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu className="mt-auto pt-4 space-y-1">
            <SidebarMenuItem>
              <Link href="/settings">
                <SidebarMenuButton
                  isActive={pathname.startsWith("/settings")}
                  tooltip="Pengaturan"
                  className="rounded-xl font-medium transition-all"
                >
                  <Settings className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Pengaturan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="mt-4 mb-2 mx-1 p-2.5 rounded-xl bg-surface-container-low/70 dark:bg-card/70 border border-border/60 flex items-center justify-between group-data-[state=collapsed]:hidden">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground">Sistem Cloud Aktif</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-primary">v2.4</span>
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-transparent">
        <PageHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

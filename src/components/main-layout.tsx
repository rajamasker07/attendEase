
"use client"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Home, Users, BookText, DollarSign, AlertTriangle, Settings, LogOut, CalendarDays, Star, Wallet, HandCoins } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"


function PageHeader() {
  const pathname = usePathname();
  let title = "Dasbor";
  if (pathname.startsWith("/employees")) {
    title = "Manajemen Karyawan";
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
    title = "Pengaturan";
  } else if (pathname.startsWith("/savings")) {
    title = "Tabungan Karyawan";
  }
  
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    // The AuthGate will automatically redirect to the login page.
    router.push('/login');
  };


  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger />
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{user?.email?.[0].toUpperCase() ?? 'A'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Admin</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <span className="text-xl font-semibold group-data-[state=collapsed]:hidden">AttendEase</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton isActive={pathname === "/"} tooltip="Dasbor">
                  <Home />
                  <span className="group-data-[state=collapsed]:hidden">Dasbor</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/employees">
                <SidebarMenuButton isActive={pathname.startsWith("/employees")} tooltip="Karyawan">
                  <Users />
                  <span className="group-data-[state=collapsed]:hidden">Karyawan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/reports">
                <SidebarMenuButton isActive={pathname.startsWith("/reports")} tooltip="Laporan">
                  <BookText />
                  <span className="group-data-[state=collapsed]:hidden">Laporan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/payroll">
                <SidebarMenuButton isActive={pathname.startsWith("/payroll")} tooltip="Penggajian">
                  <DollarSign />
                  <span className="group-data-[state=collapsed]:hidden">Penggajian</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/loans">
                <SidebarMenuButton isActive={pathname.startsWith("/loans")} tooltip="Kasbon">
                  <HandCoins />
                  <span className="group-data-[state=collapsed]:hidden">Hutang & Kasbon</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/savings">
                <SidebarMenuButton isActive={pathname.startsWith("/savings")} tooltip="Tabungan">
                  <Wallet />
                  <span className="group-data-[state=collapsed]:hidden">Tabungan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/holidays">
                <SidebarMenuButton isActive={pathname.startsWith("/holidays")} tooltip="Hari Libur">
                  <CalendarDays />
                  <span className="group-data-[state=collapsed]:hidden">Hari Libur</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/bonuses">
                <SidebarMenuButton isActive={pathname.startsWith("/bonuses")} tooltip="Bonus">
                  <Star />
                  <span className="group-data-[state=collapsed]:hidden">Bonus</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/sanctions">
                <SidebarMenuButton isActive={pathname.startsWith("/sanctions")} tooltip="Sanksi">
                  <AlertTriangle />
                  <span className="group-data-[state=collapsed]:hidden">Sanksi</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu className="mt-auto">
            <SidebarMenuItem>
              <Link href="/settings">
                <SidebarMenuButton isActive={pathname.startsWith("/settings")} tooltip="Pengaturan">
                  <Settings />
                  <span className="group-data-[state=collapsed]:hidden">Pengaturan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <PageHeader />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

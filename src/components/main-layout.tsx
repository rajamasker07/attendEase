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
import { Home, Users, BookText } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

function PageHeader() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  let title = "Dashboard";
  if (pathname.startsWith("/employees")) {
    title = "Employee Management";
  } else if (pathname.startsWith("/reports")) {
    title = "Attendance Reports";
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="sm:hidden" />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <span className="text-xl font-semibold">AttendEase</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton isActive={pathname === "/"} tooltip="Dashboard">
                  <Home />
                  Dashboard
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/employees">
                <SidebarMenuButton isActive={pathname.startsWith("/employees")} tooltip="Employees">
                  <Users />
                  Employees
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/reports">
                <SidebarMenuButton isActive={pathname.startsWith("/reports")} tooltip="Reports">
                  <BookText />
                  Reports
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

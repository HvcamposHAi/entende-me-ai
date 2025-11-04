import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  TrendingUp,
  Store,
  Calculator,
  Receipt,
  LineChart,
  FileText,
  LogOut,
  Brain,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Overview", url: "/overview", icon: LayoutDashboard },
  { title: "Upload", url: "/upload", icon: Upload },
  { title: "P&L", url: "/pl", icon: TrendingUp },
  { title: "Por Loja", url: "/by-branch", icon: Store },
  { title: "Análise EVA", url: "/eva", icon: Calculator },
  { title: "Despesas", url: "/expenses", icon: Receipt },
  { title: "Evolução", url: "/evolution", icon: LineChart },
  { title: "Relatórios", url: "/reports", icon: FileText },
  { title: "Projeção & IA", url: "/forecast", icon: Brain },
];

function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground font-semibold text-lg">
            Dengo Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" className="hover:bg-sidebar-accent/50">
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-16 lg:px-6">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Dengo Chocolates France</h1>
          </header>
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}

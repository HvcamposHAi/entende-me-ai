import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  TrendingUp,
  Store,
  Package,
  Calculator,
  Receipt,
  LineChart,
  FileText,
  Brain,
  Settings2,
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
  { title: "Vue d'ensemble", url: "/overview", icon: LayoutDashboard },
  { title: "Téléchargement", url: "/upload", icon: Upload },
  { title: "Règles Métier", url: "/business-rules", icon: Settings2 },
  { title: "P&L", url: "/pl", icon: TrendingUp },
  { title: "Par Boutique", url: "/by-branch", icon: Store },
  { title: "Par Catégorie", url: "/by-category", icon: Package },
  { title: "Analyse de Variance", url: "/eva", icon: Calculator },
  { title: "Rapport EVA", url: "/eva-report", icon: Calculator },
  { title: "Dépenses", url: "/expenses", icon: Receipt },
  { title: "Évolution", url: "/evolution", icon: LineChart },
  { title: "Rapports", url: "/reports", icon: FileText },
  { title: "Projection & IA", url: "/forecast", icon: Brain },
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

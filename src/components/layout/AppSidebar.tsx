import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  DoorOpen,
  Users,
  Settings,
  FileText,
  ClipboardList,
  Building2,
  HardDrive,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

const navigation = [
  { key: "sidebar.dashboard", href: "/", icon: LayoutDashboard },
  { key: "sidebar.calendar", href: "/calendar", icon: CalendarDays },
  { key: "sidebar.plans", href: "/plans", icon: ClipboardList },
  { key: "sidebar.schedule", href: "/meetings/new", icon: Plus },
  { key: "sidebar.rooms", href: "/rooms", icon: DoorOpen },
];

const management = [
  { key: "sidebar.staff", href: "/staff", icon: Users },
  { key: "sidebar.departments", href: "/departments", icon: Building2 },
  { key: "sidebar.equipment", href: "/equipment", icon: HardDrive },
  { key: "sidebar.reports", href: "/reports", icon: FileText },
  { key: "sidebar.settings", href: "/settings", icon: Settings },
];

const isPlansActive = (pathname: string) => {
  return pathname === "/plans" || pathname.startsWith("/plans?") || pathname.startsWith("/meetings/edit");
};

export default function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;

  const visibleNavigation = navigation.filter(item => item.href !== "/" || isAdmin);
  const visibleManagement = management.filter(item => item.href !== "/reports" || isAdmin);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <CalendarDays className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-display font-bold text-sidebar-accent-foreground">MeetFlow</h1>
          <p className="text-[10px] text-sidebar-muted">{t("sidebar.plans")}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
            {t("sidebar.main")}
          </p>
          <ul className="space-y-0.5">
            {visibleNavigation.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  end={item.href !== "/plans"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      (item.href === "/plans" ? isPlansActive(location.pathname) : isActive)
                        ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )
                  }
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
            {t("sidebar.management")}
          </p>
          <ul className="space-y-0.5">
            {visibleManagement.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )
                  }
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-primary">
            {(user?.firstName?.[0] || user?.login?.[0] || "U").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.login ?? "User"}
            </p>
            <button onClick={signOut} className="flex items-center gap-1 text-[11px] text-sidebar-muted hover:text-destructive transition-colors">
              <LogOut className="h-3 w-3" /> {t("sidebar.logout")}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

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
  Mail,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { UserAvatar } from "@/components/ui/UserAvatar";

const navigation = [
  { key: "sidebar.dashboard", href: "/", icon: LayoutDashboard },
  { key: "sidebar.calendar", href: "/calendar", icon: CalendarDays },
  { key: "sidebar.plans", href: "/plans", icon: ClipboardList },
  { key: "sidebar.invitations", href: "/invitations", icon: Mail },
  { key: "sidebar.schedule", href: "/meetings/new", icon: Plus },
  { key: "sidebar.rooms", href: "/rooms", icon: DoorOpen },
];

const management = [
  { key: "sidebar.staff", href: "/staff", icon: Users },
  { key: "sidebar.departments", href: "/departments", icon: Building2 },
  { key: "sidebar.equipment", href: "/equipment", icon: HardDrive },
  { key: "sidebar.incidents", href: "/incidents", icon: AlertTriangle },
  { key: "sidebar.reports", href: "/reports", icon: FileText },
  { key: "sidebar.settings", href: "/settings", icon: Settings },
];

const isPlansActive = (pathname: string) => {
  return pathname === "/plans" || pathname.startsWith("/plans?") || pathname.startsWith("/meetings/edit");
};

interface AppSidebarProps {
  isMobile: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function AppSidebar({ isMobile, isMobileOpen, onCloseMobile }: AppSidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;

  const visibleNavigation = navigation;
  const visibleManagement = management.filter(item => (item.href !== "/reports" && item.href !== "/incidents") || isAdmin);

  return (
    <>
      {isMobile && isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 md:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-sidebar border-r border-sidebar-border shadow-xl transition-transform duration-300",
          "w-64 md:translate-x-0 md:w-64",
          isMobile ? "w-[85vw] max-w-[320px]" : "",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary shadow-md">
          <CalendarDays className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-display font-bold text-sidebar-accent-foreground tracking-tight">MeetViet</h1>
          <p className="text-[10px] text-sidebar-muted">Nền tảng quản lý cuộc họp</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            {t("sidebar.main")}
          </p>
          <ul className="space-y-0.5">
            {visibleNavigation.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  onClick={isMobile ? onCloseMobile : undefined}
                  end={item.href !== "/plans"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      (item.href === "/plans" ? isPlansActive(location.pathname) : item.href === "/invitations" ? location.pathname === "/invitations" : isActive)
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
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            {t("sidebar.management")}
          </p>
          <ul className="space-y-0.5">
            {visibleManagement.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  onClick={isMobile ? onCloseMobile : undefined}
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
          <UserAvatar size={36} className="ring-2 ring-sidebar-accent/50" />
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
    </>
  );
}

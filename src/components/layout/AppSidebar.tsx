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

const navigation = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Lịch họp", href: "/calendar", icon: CalendarDays },
  { name: "Quản lý kế hoạch", href: "/plans", icon: ClipboardList },
  { name: "Lên lịch họp", href: "/meetings/new", icon: Plus },
  { name: "Phòng họp", href: "/rooms", icon: DoorOpen },
];

const management = [
  { name: "Nhân viên", href: "/staff", icon: Users },
  { name: "Phòng ban", href: "/departments", icon: Building2 },
  { name: "Thiết bị", href: "/equipment", icon: HardDrive },
  { name: "Báo cáo", href: "/reports", icon: FileText },
  { name: "Cài đặt", href: "/settings", icon: Settings },
];

export default function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <CalendarDays className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-display font-bold text-sidebar-accent-foreground">MeetFlow</h1>
          <p className="text-[10px] text-sidebar-muted">Quản lý lịch họp</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
            Chính
          </p>
          <ul className="space-y-0.5">
            {navigation.map((item) => (
              <li key={item.name}>
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
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
            Quản lý
          </p>
          <ul className="space-y-0.5">
            {management.map((item) => (
              <li key={item.name}>
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
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-primary">
            {user?.email?.slice(0, 2).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{user?.email ?? "User"}</p>
            <button onClick={signOut} className="flex items-center gap-1 text-[11px] text-sidebar-muted hover:text-destructive transition-colors">
              <LogOut className="h-3 w-3" /> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

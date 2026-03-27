import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getAllParticipants } from "@/services/api/meetings";
import { useMeetings } from "@/hooks/useMeetings";
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
  isDesktopExpanded: boolean;
  onCloseMobile: () => void;
}

export default function AppSidebar({ isMobile, isMobileOpen, isDesktopExpanded, onCloseMobile }: AppSidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;
  const isSecretary = user?.authorities?.includes("ROLE_SECRETARY") ?? false;
  const isRoomManager = user?.authorities?.includes("ROLE_ROOM_MANAGER") ?? false;
  const userDepartmentId = user?.departmentId != null ? String(user.departmentId) : null;

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["all-participants"],
    queryFn: getAllParticipants,
  });
  const { data: meetings = [] } = useMeetings();

  const isCorporateLevel = (level?: string): boolean => {
    const n = (level ?? "").toUpperCase();
    return ["CORPORATE", "COMPANY", "TONG_CONG_TY", "CAP_TONG_CONG_TY"].includes(n);
  };

  const invitationsTotal = (() => {
    const meetingIds = new Set<string>();

    // Lời mời tham dự (theo user)
    (allParticipants as any[]).forEach((p: any) => {
      if (
        p.userId != null &&
        String(p.userId) === String(user?.id) &&
        (p.confirmationStatus === "PENDING" || p.confirmationStatus === undefined) &&
        String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" &&
        p.meeting?.id != null
      ) {
        meetingIds.add(String(p.meeting.id));
      }
    });

    // Lời mời theo phòng ban (company-level) cho thư ký phòng
    if (isSecretary && userDepartmentId) {
      (allParticipants as any[]).forEach((p: any) => {
        if (
          p.userId == null &&
          p.departmentId != null &&
          String(p.departmentId) === userDepartmentId &&
          String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" &&
          isCorporateLevel(p.meeting?.level) &&
          (p.confirmationStatus === "PENDING" || p.confirmationStatus === undefined) &&
          p.meeting?.id != null
        ) {
          meetingIds.add(String(p.meeting.id));
        }
      });
    }

    // Lời mời làm thư ký cuộc họp (theo meeting.secretaryId)
    (meetings as any[]).forEach((m: any) => {
      if (
        m?.id != null &&
        m.secretaryId != null &&
        String(m.secretaryId) === String(user?.id) &&
        String(m.status ?? "").toLowerCase() === "approved"
      ) {
        meetingIds.add(String(m.id));
      }
    });

    return meetingIds.size;
  })();

  const visibleNavigation = navigation;
  const visibleManagement = management.filter(item => {
    if (item.href === "/reports") return isAdmin;
    if (item.href === "/incidents") return isAdmin || isRoomManager;
    return true;
  });

  return (
    <>
      {isMobile && isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 md:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-sidebar border-r border-sidebar-border shadow-xl transition-transform duration-300",
          isMobile ? "w-[85vw] max-w-[320px]" : isDesktopExpanded ? "w-64" : "w-[76px]",
          isMobile ? "w-[85vw] max-w-[320px]" : "",
          isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
      >
      <div className={cn("flex h-16 items-center gap-3 border-b border-sidebar-border", isDesktopExpanded || isMobile ? "px-5" : "px-3 justify-center")}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary shadow-md">
          <CalendarDays className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {(isDesktopExpanded || isMobile) && (
          <div>
            <h1 className="text-sm font-display font-bold text-sidebar-accent-foreground tracking-tight">MeetViet</h1>
            <p className="text-[10px] text-sidebar-muted">Nền tảng quản lý cuộc họp</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          {(isDesktopExpanded || isMobile) && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            {t("sidebar.main")}
            </p>
          )}
          <ul className="space-y-0.5">
            {visibleNavigation.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  onClick={isMobile ? onCloseMobile : undefined}
                  end={item.href !== "/plans"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                      isDesktopExpanded || isMobile ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5",
                      (item.href === "/plans" ? isPlansActive(location.pathname) : item.href === "/invitations" ? location.pathname === "/invitations" : isActive)
                        ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )
                  }
                  title={isDesktopExpanded || isMobile ? undefined : t(item.key)}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {(isDesktopExpanded || isMobile) && <span className="flex-1 min-w-0 truncate">{t(item.key)}</span>}
                  {item.href === "/invitations" && invitationsTotal > 0 && (isDesktopExpanded || isMobile ? (
                    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                      {invitationsTotal}
                    </span>
                  ) : (
                    <span className="absolute ml-0 translate-x-[10px] -translate-y-[10px] inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {invitationsTotal > 9 ? "9+" : invitationsTotal}
                    </span>
                  ))}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {(isDesktopExpanded || isMobile) && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
              {t("sidebar.management")}
            </p>
          )}
          <ul className="space-y-0.5">
            {visibleManagement.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  onClick={isMobile ? onCloseMobile : undefined}
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                      isDesktopExpanded || isMobile ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )
                  }
                  title={isDesktopExpanded || isMobile ? undefined : t(item.key)}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {(isDesktopExpanded || isMobile) && t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className={cn("border-t border-sidebar-border", isDesktopExpanded || isMobile ? "p-4" : "p-3")}>
        <div className={cn("flex", isDesktopExpanded || isMobile ? "items-center gap-3" : "flex-col items-center justify-center")}>
          <div>
            <UserAvatar size={36} className="ring-2 ring-sidebar-accent/50" />
          </div>
          {(isDesktopExpanded || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.login ?? "User"}
              </p>
              <button onClick={signOut} className="flex items-center gap-1 text-[11px] text-sidebar-muted hover:text-destructive transition-colors">
                <LogOut className="h-3 w-3" /> {t("sidebar.logout")}
              </button>
            </div>
          )}
          {!(isDesktopExpanded || isMobile) && (
            <button
              type="button"
              onClick={signOut}
              className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-accent/60 text-destructive hover:bg-sidebar-accent transition-colors"
              aria-label={t("sidebar.logout")}
              title={t("sidebar.logout")}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      </aside>
    </>
  );
}

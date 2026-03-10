import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search, CheckCircle, CalendarDays, MapPin, XCircle, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationDTO,
} from "@/services/api/notifications";
import { useMeetings } from "@/hooks/useMeetings";
import { useRooms } from "@/hooks/useRooms";

function formatTime(createdDate: string): string {
  try {
    const d = new Date(createdDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return createdDate;
  }
}

function notificationIcon(n: NotificationDTO): { Icon: typeof Bell; iconClass: string } {
  const type = (n.type ?? "").toLowerCase();
  const title = (n.title ?? "").toLowerCase();
  const message = (n.message ?? "").toLowerCase();
  const isRejected = title.includes("từ chối") || title.includes("bị từ chối") || message.includes("từ chối") || message.includes("bị từ chối");

  if (type.includes("approval") || type === "meeting_approval") {
    return { Icon: isRejected ? XCircle : CheckCircle, iconClass: isRejected ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
  }
  if (type.includes("invite") || type.includes("reminder") || type.includes("meeting")) {
    return { Icon: Bell, iconClass: "bg-primary/10 text-primary" };
  }
  return { Icon: Bell, iconClass: "bg-muted text-muted-foreground" };
}

interface AppHeaderProps {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

export default function AppHeader({ showMenuButton = false, onMenuClick }: AppHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: meetings = [] } = useMeetings();
  const { data: rooms = [] } = useRooms();

  const searchLower = searchQuery.toLowerCase().trim();
  const searchResults = useMemo(() => {
    if (!searchLower) return { meetings: [], rooms: [] };
    const filteredMeetings = (meetings as any[]).filter(
      (m) => m.title?.toLowerCase().includes(searchLower)
    );
    const filteredRooms = (rooms as any[]).filter(
      (r) =>
        r.name?.toLowerCase().includes(searchLower) ||
        (r.code && r.code.toLowerCase().includes(searchLower)) ||
        (r.floor && r.floor.toLowerCase().includes(searchLower))
    );
    return { meetings: filteredMeetings.slice(0, 5), rooms: filteredRooms.slice(0, 5) };
  }, [meetings, rooms, searchLower]);

  const hasSearchResults =
    searchResults.meetings.length > 0 || searchResults.rooms.length > 0;

  const { data: pageData } = useQuery({
    queryKey: ["notifications", 0, 10],
    queryFn: () => getNotifications(0, 10),
    enabled: showNotifications,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: getUnreadNotificationCount,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const notifications: NotificationDTO[] = pageData?.content ?? [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMeeting = (meeting: any) => {
    const tab = meeting.status || "approved";
    setSearchQuery("");
    setShowSearchDropdown(false);
    navigate(`/plans?tab=${tab}&meetingId=${meeting.id}`);
  };

  const handleSelectRoom = (room: any) => {
    setSearchQuery("");
    setShowSearchDropdown(false);
    navigate(`/rooms?roomId=${room.id}`);
  };

  const markAsRead = (id: number) => {
    markReadMutation.mutate(id);
  };

  const markAllRead = () => {
    markAllReadMutation.mutate();
  };

  const displayUnreadCount = unreadCount > 0 ? unreadCount : 0;

  return (
    <header className="sticky top-0 z-40 flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur-md sm:h-16 sm:flex-nowrap sm:justify-between sm:gap-0 sm:px-6 sm:py-0">
      <div className="order-2 flex w-full items-center gap-4 sm:order-1 sm:flex-1 sm:max-w-md" ref={searchRef}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm cuộc họp, phòng họp..."
            className="pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => searchQuery && setShowSearchDropdown(true)}
          />
          {showSearchDropdown && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[280px] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card shadow-lg sm:max-h-[320px]">
              {!hasSearchResults ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Không tìm thấy kết quả</p>
              ) : (
                <div className="py-2">
                  {searchResults.meetings.length > 0 && (
                    <div className="px-2 pb-1">
                      <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cuộc họp</p>
                      {searchResults.meetings.map((m: any) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMeeting(m)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 rounded-lg transition-colors"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <CalendarDays className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.startTime ? new Date(m.startTime).toLocaleDateString("vi-VN") : ""}
                              {m.roomName ? ` • ${m.roomName}` : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.rooms.length > 0 && (
                    <div className="px-2 pt-1 border-t border-border">
                      <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Phòng họp</p>
                      {searchResults.rooms.map((r: any) => (
                        <button
                          key={r.id}
                          onClick={() => handleSelectRoom(r)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 rounded-lg transition-colors"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10">
                            <MapPin className="h-4 w-4 text-info" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.code ? `${r.code}` : ""}
                              {r.floor ? ` • ${r.floor}` : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="order-1 relative ml-auto flex items-center gap-2 sm:order-2" ref={dropdownRef}>
        {showMenuButton && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="h-4.5 w-4.5" />
          {displayUnreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px] px-1 text-[10px] bg-accent text-accent-foreground border-2 border-card">
              {displayUnreadCount}
            </Badge>
          )}
        </Button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 top-12 z-50 w-[calc(100vw-1rem)] max-w-96 overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-display font-semibold text-sm">Thông báo</h3>
              {displayUnreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-xs text-primary hover:underline"
                  disabled={markAllReadMutation.isPending}
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Chưa có thông báo nào.</p>
              ) : (
                notifications.map((n) => {
                  const read = !!n.readAt;
                  const { Icon, iconClass } = notificationIcon(n);
                  const handleClick = () => {
                    if (!read) markAsRead(n.id);
                    if (n.linkUrl) {
                      setShowNotifications(false);
                      navigate(n.linkUrl);
                    }
                  };
                  return (
                    <button
                      key={n.id}
                      onClick={handleClick}
                      className={`w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors flex gap-3 ${
                        !read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${!read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                          {!read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message ?? ""}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.createdDate)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-border text-center">
              <Link to="/notifications">
                <button className="text-xs text-primary hover:underline font-medium">Xem tất cả thông báo</button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

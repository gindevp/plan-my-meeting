import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search, Check, Clock } from "lucide-react";
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

export default function AppHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = (id: number) => {
    markReadMutation.mutate(id);
  };

  const markAllRead = () => {
    markAllReadMutation.mutate();
  };

  const displayUnreadCount = unreadCount > 0 ? unreadCount : 0;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur-md px-6 shadow-sm">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm cuộc họp, phòng họp..." className="pl-9 bg-secondary/50 border-0 focus-visible:ring-1" />
        </div>
      </div>

      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
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
          <div className="absolute right-0 top-12 w-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-slide-up">
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
                  const type = (n.type ?? "").toLowerCase();
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
                      <div
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          type.includes("meeting") ? "bg-info/15 text-info" : type.includes("approval") ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {type.includes("meeting") ? <Clock className="h-4 w-4" /> : type.includes("approval") ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
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

import { useState, useRef, useEffect } from "react";
import { Bell, Search, Check, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "meeting" | "approval" | "system";
}

const mockNotifications: Notification[] = [
  { id: "n1", title: "Cuộc họp sắp diễn ra", message: "Họp Ban lãnh đạo Q1/2026 sẽ bắt đầu sau 30 phút", time: "5 phút trước", read: false, type: "meeting" },
  { id: "n2", title: "Yêu cầu phê duyệt mới", message: "Review ngân sách 2026 đang chờ phê duyệt", time: "1 giờ trước", read: false, type: "approval" },
  { id: "n3", title: "Cuộc họp đã được duyệt", message: "Kickoff dự án CRM mới đã được phê duyệt", time: "2 giờ trước", read: false, type: "approval" },
  { id: "n4", title: "Phòng họp bảo trì", message: "Phòng họp Đào tạo sẽ bảo trì từ 25/02 - 28/02", time: "1 ngày trước", read: true, type: "system" },
  { id: "n5", title: "Nhắc nhở họp", message: "Standup hàng tuần - Team Dev vào ngày mai lúc 09:00", time: "1 ngày trước", read: true, type: "meeting" },
];

export default function AppHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-6">
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
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px] px-1 text-[10px] bg-accent text-accent-foreground border-2 border-card">
              {unreadCount}
            </Badge>
          )}
        </Button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 top-12 w-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-display font-semibold text-sm">Thông báo</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors flex gap-3 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    n.type === "meeting" ? "bg-info/15 text-info" : n.type === "approval" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                  }`}>
                    {n.type === "meeting" ? <Clock className="h-4 w-4" /> : n.type === "approval" ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border text-center">
              <button className="text-xs text-primary hover:underline font-medium">Xem tất cả thông báo</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

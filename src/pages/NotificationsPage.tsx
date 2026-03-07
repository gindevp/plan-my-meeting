import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, Clock, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type NotificationDTO,
} from "@/services/api/notifications";
import { useToast } from "@/hooks/use-toast";

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

function typeIcon(type?: string | null) {
  if (type === "meeting" || type?.toLowerCase().includes("meeting")) return Clock;
  if (type === "approval" || type?.toLowerCase().includes("approval")) return Check;
  return Bell;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const size = 20;

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["notifications", page, size],
    queryFn: () => getNotifications(page, size),
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
    onError: (err: Error) => toast({ variant: "destructive", title: "Lỗi", description: err.message }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      toast({ title: "Đã đánh dấu tất cả đã đọc" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Lỗi", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      toast({ title: "Đã xóa thông báo" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Lỗi", description: err.message }),
  });

  const notifications: NotificationDTO[] = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const hasUnread = unreadCount > 0;

  const handleMarkRead = (n: NotificationDTO) => {
    if (n.readAt) return;
    markReadMutation.mutate(n.id);
  };

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Thông báo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Danh sách thông báo của bạn. Đánh dấu đã đọc hoặc xóa khi không cần.
        </p>
      </div>

      <Card className="card-elevated overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Danh sách thông báo</CardTitle>
            <CardDescription>
              {hasUnread ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
            </CardDescription>
          </div>
          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> Đánh dấu tất cả đã đọc
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">Chưa có thông báo nào.</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const read = !!n.readAt;
                const Icon = typeIcon(n.type);
                const handleRowClick = (e: React.MouseEvent) => {
                  if ((e.target as HTMLElement).closest("button[data-delete]")) return;
                  handleMarkRead(n);
                  if (n.linkUrl) navigate(n.linkUrl);
                };
                return (
                  <div
                    key={n.id}
                    role={n.linkUrl ? "button" : undefined}
                    tabIndex={n.linkUrl ? 0 : undefined}
                    onClick={handleRowClick}
                    onKeyDown={n.linkUrl ? (e) => e.key === "Enter" && handleRowClick(e as unknown as React.MouseEvent) : undefined}
                    className={`flex gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                      !read ? "bg-primary/5" : ""
                    } hover:bg-accent/30`}
                  >
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                        {!read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(n.createdDate)}</p>
                    </div>
                    <Button
                      data-delete
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(n.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                Trang {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

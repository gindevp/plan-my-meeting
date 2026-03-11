import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Check, CheckCircle, Loader2, Trash2, XCircle, Calendar, Clock, MapPin, Video, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type NotificationDTO,
} from "@/services/api/notifications";
import { getMeetingById, getAgendaItemsByMeeting, getMeetingTasksByMeeting } from "@/services/api/meetings";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { statusLabels, typeLabels } from "@/data/mockData";
import { ListTodo, ClipboardList } from "lucide-react";

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

function typeIcon(n: NotificationDTO): { Icon: typeof Bell; iconClass: string } {
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

function getMeetingIdFromLinkUrl(linkUrl: string | null | undefined): string | null {
  if (!linkUrl || typeof linkUrl !== "string") return null;
  try {
    const path = linkUrl.startsWith("/") ? linkUrl : `/${linkUrl}`;
    const search = path.includes("?") ? path.slice(path.indexOf("?")) : "";
    const params = new URLSearchParams(search);
    const id = params.get("meetingId");
    return id ? id : null;
  } catch {
    return null;
  }
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [page, setPage] = useState(0);
  const [meetingDetailId, setMeetingDetailId] = useState<string | null>(() => searchParams.get("meetingId"));
  const size = 20;
  const { user } = useAuth();

  useEffect(() => {
    if (searchParams.get("meetingId")) setSearchParams({}, { replace: true });
  }, []);

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

  const { data: meetingDetail, isLoading: loadingMeeting } = useQuery({
    queryKey: ["meeting-detail", meetingDetailId],
    queryFn: () => getMeetingById(meetingDetailId!),
    enabled: !!meetingDetailId && isMobile,
  });

  const { data: agendaItems = [] } = useQuery({
    queryKey: ["meeting-agenda", meetingDetailId],
    queryFn: () => getAgendaItemsByMeeting(meetingDetailId!),
    enabled: !!meetingDetailId && isMobile,
  });

  const { data: meetingTasks = [] } = useQuery({
    queryKey: ["meeting-tasks", meetingDetailId],
    queryFn: () => getMeetingTasksByMeeting(meetingDetailId!),
    enabled: !!meetingDetailId && isMobile,
  });

  const userTasks = useMemo(
    () => (meetingTasks as any[]).filter((t) => t.assigneeId && String(t.assigneeId) === String(user?.id)),
    [meetingTasks, user?.id]
  );

  const taskStatusLabel: Record<string, string> = {
    TODO: "Chưa bắt đầu",
    IN_PROGRESS: "Đang làm",
    DONE: "Hoàn thành",
    OVERDUE: "Quá hạn",
  };

  const handleMarkRead = (n: NotificationDTO) => {
    if (n.readAt) return;
    markReadMutation.mutate(n.id);
  };

  return (
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Thông báo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Danh sách thông báo của bạn. Đánh dấu đã đọc hoặc xóa khi không cần.
        </p>
      </div>

      <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-1">
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
              {notifications.map((n, i) => {
                const read = !!n.readAt;
                const { Icon, iconClass } = typeIcon(n);
                const handleRowClick = (e: React.MouseEvent) => {
                  if ((e.target as HTMLElement).closest("button[data-delete]")) return;
                  handleMarkRead(n);
                  if (n.linkUrl) {
                    const meetingId = getMeetingIdFromLinkUrl(n.linkUrl);
                    if (isMobile && meetingId) {
                      setMeetingDetailId(meetingId);
                    } else {
                      navigate(n.linkUrl);
                    }
                  }
                };
                return (
                  <div
                    key={n.id}
                    role={n.linkUrl ? "button" : undefined}
                    tabIndex={n.linkUrl ? 0 : undefined}
                    onClick={handleRowClick}
                    onKeyDown={n.linkUrl ? (e) => e.key === "Enter" && handleRowClick(e as unknown as React.MouseEvent) : undefined}
                    className={`flex gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer opacity-0 animate-auth-fade-in-up ${
                      !read ? "bg-primary/5" : ""
                    } hover:bg-accent/30`}
                    style={{ animationDelay: `${0.15 + i * 0.03}s`, animationFillMode: "forwards" }}
                  >
                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
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

      {/* Modal chi tiết cuộc họp (chỉ mobile) */}
      <Dialog open={!!meetingDetailId} onOpenChange={(open) => !open && setMeetingDetailId(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết cuộc họp</DialogTitle>
          </DialogHeader>
          {loadingMeeting ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : meetingDetail ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-base text-foreground">{meetingDetail.title}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {typeLabels[meetingDetail.type] ?? meetingDetail.type}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {statusLabels[meetingDetail.status as keyof typeof statusLabels] ?? meetingDetail.status}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {new Date(meetingDetail.startTime).toLocaleDateString("vi-VN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {new Date(meetingDetail.startTime).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(meetingDetail.endTime).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {meetingDetail.roomName && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{meetingDetail.roomName}</span>
                </div>
              )}
              {meetingDetail.meetingLink && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Video className="h-4 w-4 shrink-0 mt-0.5" />
                  <a
                    href={meetingDetail.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {meetingDetail.meetingLink}
                  </a>
                </div>
              )}
              {(meetingDetail.chairperson || meetingDetail.organizer) && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Chủ trì: {meetingDetail.chairperson || meetingDetail.organizer || "—"}</span>
                </div>
              )}
              {meetingDetail.description && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground whitespace-pre-wrap">{meetingDetail.description}</p>
                </div>
              )}

              {/* Chương trình họp */}
              <div className="pt-3 border-t border-border space-y-2">
                <p className="font-medium flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4" />
                  Chương trình họp
                </p>
                {agendaItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Chưa có nội dung.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(agendaItems as any[])
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((item, idx) => (
                        <li key={idx} className="text-xs">
                          <span className="font-medium text-muted-foreground mr-1">{item.order || idx + 1}.</span>
                          <span className="font-medium">{item.title}</span>
                          {(item.presenter || item.duration) && (
                            <span className="text-muted-foreground ml-1">
                              — {[item.presenter, item.duration ? `${item.duration} phút` : ""].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Nhiệm vụ của tôi */}
              <div className="pt-3 border-t border-border space-y-2">
                <p className="font-medium flex items-center gap-1.5">
                  <ListTodo className="h-4 w-4" />
                  Nhiệm vụ của tôi
                </p>
                {userTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Không có nhiệm vụ được giao cho bạn.</p>
                ) : (
                  <ul className="space-y-2">
                    {userTasks.map((task: any) => (
                      <li key={task.id} className="text-xs flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-medium">{task.title}</span>
                        {task.dueAt && (
                          <span className="text-muted-foreground">
                            Hạn: {new Date(task.dueAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          {taskStatusLabel[task.status] ?? task.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : meetingDetailId && !loadingMeeting ? (
            <p className="py-4 text-center text-muted-foreground text-sm">Không tải được thông tin cuộc họp.</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

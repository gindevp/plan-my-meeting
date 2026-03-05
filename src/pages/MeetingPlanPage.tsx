import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { statusLabels, typeLabels, levelLabels, type MeetingStatus } from "@/data/mockData";
import { useMeetings } from "@/hooks/useMeetings";
import { useAuth } from "@/contexts/AuthContext";
import {
  approveRoom,
  rejectMeeting,
  getAgendaItemsByMeeting,
  getParticipantsByMeeting,
  getMeetingTasksByMeeting,
  getMeetingDocumentsByMeeting,
  submitMeeting,
  cancelMeeting,
  softDeleteMeeting,
  completeMeeting,
} from "@/services/api/meetings";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Search, Filter, Eye, Pencil, Trash2, Plus, MapPin, Video, Users, CheckCircle, Clock, XCircle, FileX, FileEdit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

const statusTabs: { key: MeetingStatus | "cancelled" | "completed"; label: string; icon: typeof CheckCircle }[] = [
  { key: "approved", label: "Đã phê duyệt", icon: CheckCircle },
  { key: "pending", label: "Chờ phê duyệt", icon: Clock },
  { key: "rejected", label: "Từ chối", icon: XCircle },
  { key: "cancelled", label: "Đã xóa", icon: FileX },
  { key: "draft", label: "Lưu nháp", icon: FileEdit },
  { key: "completed", label: "Hoàn thành", icon: CheckCircle },
];

const statusColorMap: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning border border-warning/20",
  approved: "bg-success/15 text-success border border-success/20",
  rejected: "bg-destructive/15 text-destructive border border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-info/15 text-info border border-info/20",
};

const typeIconMap: Record<string, typeof MapPin> = {
  offline: MapPin,
  online: Video,
  hybrid: Users,
};

export default function MeetingPlanPage() {
  const { toast } = useToast();
  const { data: meetings = [] } = useMeetings();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("meetingPlanActiveTab");
      if (saved) return saved;
    }
    return "approved";
  });

  useEffect(() => {
    sessionStorage.setItem("meetingPlanActiveTab", activeTab);
  }, [activeTab]);

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<typeof meetings[0] | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [taskViewModal, setTaskViewModal] = useState<{ attendee: string; tasks: any[] } | null>(null);
  const navigate = useNavigate();

  const filtered = meetings.filter(m => {
    const matchStatus = m.status === activeTab;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const isOwner = activeTab === "draft" ? m.requesterId === user?.id : m.requesterId === user?.id || m.hostId === user?.id;
    return matchStatus && matchSearch && isOwner;
  });

  const getTabCount = (status: string) => {
    if (status === "draft") {
      return meetings.filter(m => m.status === status && m.requesterId === user?.id).length;
    }
    return meetings.filter(m => m.status === status && (m.requesterId === user?.id || m.hostId === user?.id)).length;
  };

  const canApproveRoom = user?.authorities?.includes("ROLE_ROOM_MANAGER") || user?.authorities?.includes("ROLE_ADMIN");
  const canApproveUnit = user?.authorities?.includes("ROLE_UNIT_MANAGER") || user?.authorities?.includes("ROLE_ADMIN");

  const approveRoomMutation = useMutation({
    mutationFn: (id: string) => approveRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setSelectedMeeting(null);
      setActiveTab("approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (params: { id: string; reason: string }) => rejectMeeting(params.id, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setSelectedMeeting(null);
      setShowRejectDialog(false);
      setRejectReason("");
      setActiveTab("rejected");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Đã gửi duyệt", description: "Cuộc họp nháp đã được gửi phê duyệt." });
      setSelectedMeeting(null);
      setActiveTab("pending");
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Lỗi gửi duyệt",
        description: err instanceof Error ? err.message : "Không thể gửi duyệt cuộc họp.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id }: { id: string; status: string }) => cancelMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setSelectedMeeting(null);
      toast({ title: "Đã xóa", description: "Cuộc họp đã được chuyển sang danh sách đã xóa." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể xóa/hủy cuộc họp." });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setSelectedMeeting(null);
      toast({ title: "Hoàn thành", description: "Cuộc họp đã được đánh dấu hoàn thành." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể đánh dấu hoàn thành." });
    },
  });

  const { data: agendaItems = [] } = useQuery({
    queryKey: ["agenda-items", selectedMeeting?.id],
    queryFn: () => getAgendaItemsByMeeting(selectedMeeting!.id),
    enabled: !!selectedMeeting,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants", selectedMeeting?.id],
    queryFn: () => getParticipantsByMeeting(selectedMeeting!.id),
    enabled: !!selectedMeeting,
  });

  const { data: meetingTasks = [] } = useQuery({
    queryKey: ["meeting-tasks", selectedMeeting?.id],
    queryFn: () => getMeetingTasksByMeeting(selectedMeeting!.id),
    enabled: !!selectedMeeting,
  });

  const { data: meetingDocuments = [] } = useQuery({
    queryKey: ["meeting-documents", selectedMeeting?.id],
    queryFn: () => getMeetingDocumentsByMeeting(selectedMeeting!.id),
    enabled: !!selectedMeeting,
  });

  const draftValidation = (() => {
    if (!selectedMeeting || selectedMeeting.status !== "draft") {
      return { isComplete: false, missing: [] as string[] };
    }

    const missing: string[] = [];

    const step1Valid =
      !!selectedMeeting.title?.trim() &&
      !!selectedMeeting.startTime &&
      !!selectedMeeting.endTime &&
      !!selectedMeeting.chairperson?.trim() &&
      ((selectedMeeting.type === "offline" && !!selectedMeeting.roomName) ||
        (selectedMeeting.type === "online" && !!selectedMeeting.meetingLink) ||
        (selectedMeeting.type === "hybrid" && !!selectedMeeting.roomName && !!selectedMeeting.meetingLink));

    if (!step1Valid) {
      missing.push("Thiếu thông tin bước 1 (thông tin chung)");
    }

    if (participants.length === 0) {
      missing.push("Thiếu thông tin bước 2 (chưa có thành phần tham dự)");
    }

    if (agendaItems.length === 0) {
      missing.push("Thiếu thông tin bước 3 (chưa có chương trình họp)");
    }

    return { isComplete: missing.length === 0, missing };
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Quản lý kế hoạch lịch họp</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý và theo dõi các kế hoạch cuộc họp</p>
        </div>
        <Button onClick={() => navigate("/meetings/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Lên lịch họp
        </Button>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {statusTabs.map(tab => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm cuộc họp..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowFilter(!showFilter)}>
          <Filter className="h-3.5 w-3.5" /> Bộ lọc
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên cuộc họp</TableHead>
              <TableHead>Cấp</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Cơ quan chủ trì</TableHead>
              <TableHead>Chủ trì</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              {activeTab === "rejected" && <TableHead>Lý do từ chối</TableHead>}
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(meeting => {
              const TypeIcon = typeIconMap[meeting.type];
              return (
                <TableRow key={meeting.id} className="hover:bg-secondary/20">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">{meeting.attendees?.length ?? 0} đơn vị tham gia</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{levelLabels[meeting.level as keyof typeof levelLabels] ?? meeting.level}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {typeLabels[meeting.type]}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{meeting.department}</TableCell>
                  <TableCell className="text-sm">{meeting.chairperson}</TableCell>
                  <TableCell className="text-sm">{new Date(meeting.startTime).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell className="text-sm">{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className={`text-[11px] ${statusColorMap[meeting.status]}`}>
                      {statusLabels[meeting.status]}
                    </Badge>
                  </TableCell>
                  {activeTab === "rejected" && (
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={meeting.rejectionReason}>
                      {meeting.rejectionReason || "-"}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-0 m-0 bg-transparent border-0" onClick={() => setSelectedMeeting(meeting)} aria-label="Xem chi tiết cuộc họp">
                        <Eye className="h-4 w-4" />
                      </button>
                      {meeting.status === "draft" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/meetings/edit/${meeting.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              if (window.confirm("Bạn có chắc chắn muốn xóa cuộc họp này?")) {
                                cancelMutation.mutate({ id: meeting.id, status: meeting.status });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {meeting.status === "pending" && meeting.requesterId === user?.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/meetings/edit/${meeting.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                  Không tìm thấy cuộc họp nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedMeeting.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={statusColorMap[selectedMeeting.status]}>{statusLabels[selectedMeeting.status]}</Badge>
                  <Badge variant="outline">{typeLabels[selectedMeeting.type]}</Badge>
                  <Badge variant="outline">{levelLabels[selectedMeeting.level]}</Badge>
                </div>

                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Thời gian:</span><br />{new Date(selectedMeeting.startTime).toLocaleString("vi-VN")}</div>
                  <div><span className="text-muted-foreground">Kết thúc:</span><br />{new Date(selectedMeeting.endTime).toLocaleString("vi-VN")}</div>
                  <div><span className="text-muted-foreground">Chủ trì:</span><br />{selectedMeeting.chairperson}</div>
                  <div><span className="text-muted-foreground">Đơn vị:</span><br />{selectedMeeting.department}</div>
                  {selectedMeeting.roomName && <div><span className="text-muted-foreground">Phòng họp:</span><br />{selectedMeeting.roomName}</div>}
                  {selectedMeeting.meetingLink && (
                    <div>
                      <span className="text-muted-foreground">Link họp:</span><br />
                      <a href={selectedMeeting.meetingLink} target="_blank" rel="noreferrer" className="text-info underline break-all">
                        {selectedMeeting.meetingLink}
                      </a>
                    </div>
                  )}
                </div>

                <Separator />
                <div>
                  <p className="font-medium mb-1">Mô tả</p>
                  <p className="text-muted-foreground">{selectedMeeting.description || "-"}</p>
                </div>

                {agendaItems.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">Chương trình họp</p>
                      <div className="space-y-2">
                        {agendaItems.map((item: any) => (
                          <div key={item.order} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-secondary/50">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                              {item.order}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-muted-foreground">{item.presenter} • {item.duration} phút</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div>
                  <p className="font-medium mb-2">Thành phần tham dự & công việc liên quan</p>
                  {participants.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Chưa có thành phần tham dự.</p>
                  ) : (
                    <div className="space-y-3">
                      {participants.map((p: any) => {
                        const participantTasks = meetingTasks.filter((task: any) => task.assigneeId === String(p.userId));
                        return (
                          <div key={p.id} className="rounded-lg border p-3 bg-card">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="font-semibold text-sm">{p.name}</p>
                              <Badge variant="secondary" className="text-[11px] cursor-pointer" onClick={() => participantTasks.length > 0 && setTaskViewModal({ attendee: p.name, tasks: participantTasks })}>{participantTasks.length} task</Badge>
                            </div>

                            {participantTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Chưa được giao task.</p>
                            ) : (
                              <div className="space-y-2">
                                {participantTasks.map((task: any) => {
                                  const taskDocs = meetingDocuments.filter((doc: any) => doc.taskId === task.id);
                                  return (
                                    <div key={task.id} className="rounded-md border bg-secondary/30 p-3 text-xs">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium text-sm">{task.title}</p>
                                        <Badge variant="outline">{task.status}</Badge>
                                      </div>
                                      <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-muted-foreground">
                                        <p>Hạn chót: <span className="text-foreground">{task.dueAt ? new Date(task.dueAt).toLocaleString("vi-VN") : "-"}</span></p>
                                        <p>Loại: <span className="text-foreground">{task.type || "-"}</span></p>
                                        <p>Nhắc trước: <span className="text-foreground">{task.remindBeforeMinutes ?? "-"} phút</span></p>
                                      </div>
                                      {task.description && <p className="mt-1 text-muted-foreground">{task.description}</p>}

                                      <div className="mt-2 pt-2 border-t">
                                        <p className="font-medium mb-1">Tài liệu của task ({taskDocs.length})</p>
                                        {taskDocs.length === 0 ? (
                                          <p className="text-muted-foreground">Không có tài liệu.</p>
                                        ) : (
                                          <div className="space-y-1">
                                            {taskDocs.map((doc: any) => (
                                              <div key={doc.id} className="rounded bg-background px-2 py-1 border text-muted-foreground">
                                                <span className="text-foreground">{doc.fileName || "(Không tên)"}</span>
                                                {" • "}
                                                {doc.docType || "DOC"}
                                                {doc.uploadedBy ? ` • ${doc.uploadedBy}` : ""}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedMeeting.status === "draft" && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className={`rounded-lg border p-3 ${draftValidation.isComplete ? "bg-success/5 border-success/30" : "bg-warning/5 border-warning/30"}`}>
                        <p className="font-medium text-sm mb-1">Kiểm tra thông tin 3 bước</p>
                        {draftValidation.isComplete ? (
                          <p className="text-xs text-success">Đã đủ thông tin cả 3 bước. Bạn có thể gửi duyệt.</p>
                        ) : (
                          <ul className="text-xs text-warning space-y-1 list-disc pl-4">
                            {draftValidation.missing.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        {draftValidation.isComplete && (
                          <Button onClick={() => submitMutation.mutate(selectedMeeting.id)} disabled={submitMutation.isPending}>
                            {submitMutation.isPending
                              ? "Đang xử lý..."
                              : ["company", "corporate"].includes(String(selectedMeeting.level).toLowerCase())
                              ? "Tạo cuộc họp"
                              : "Gửi duyệt"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {(canApproveRoom || canApproveUnit) && selectedMeeting.status === "pending" && (
                  <>
                    <Separator />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => approveRoomMutation.mutate(selectedMeeting.id)}>Phê duyệt</Button>
                      <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)}>Từ chối</Button>
                    </div>
                  </>
                )}

                {selectedMeeting.status === "approved" && (selectedMeeting.host?.id === user?.id || selectedMeeting.requesterId === user?.id) && (
                  <>
                    <Separator />
                    <div className="flex justify-end">
                      <Button onClick={() => completeMutation.mutate(selectedMeeting.id)} disabled={completeMutation.isPending} className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {completeMutation.isPending ? "Đang xử lý..." : "Hoàn thành"}
                      </Button>
                    </div>
                  </>
                )}

                {selectedMeeting.status === "rejected" && (selectedMeeting as any).rejectionReason && (
                  <>
                    <Separator />
                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="font-medium text-destructive mb-1">Lý do từ chối:</p>
                      <p className="text-sm text-destructive">{(selectedMeeting as any).rejectionReason}</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!taskViewModal} onOpenChange={(open) => !open && setTaskViewModal(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {taskViewModal && (
            <>
              <DialogHeader>
                <DialogTitle>Task đã giao - {taskViewModal.attendee}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {taskViewModal.tasks.map((task: any, idx: number) => {
                  const taskDocs = meetingDocuments.filter((doc: any) => doc.taskId === task.id);
                  return (
                    <div key={task.id} className="rounded-md border bg-card p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Task #{idx + 1}</p>
                      <div>
                        <Label className="text-xs">Tiêu đề task</Label>
                        <Input value={task.title || ""} readOnly className="mt-1" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Hạn xử lý (due_at)</Label>
                          <Input value={task.dueAt ? new Date(task.dueAt).toLocaleString("vi-VN") : ""} readOnly className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Nhắc trước (phút)</Label>
                          <Input value={task.remindBeforeMinutes ?? ""} readOnly className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Tài liệu liên quan</Label>
                        <div className="space-y-2 mt-1">
                          {taskDocs.length === 0 ? (
                            <Input value="" readOnly placeholder="Không có tài liệu" />
                          ) : (
                            taskDocs.map((doc: any) => <Input key={doc.id} value={doc.fileName || ""} readOnly />)
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Mô tả</Label>
                        <Textarea value={task.description || ""} readOnly rows={2} className="mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Từ chối cuộc họp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Lý do từ chối</Label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối cuộc họp..."
                className="mt-1.5"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                }}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => {
                  if (rejectReason.trim()) {
                    rejectMutation.mutate({ id: selectedMeeting?.id || "", reason: rejectReason });
                  }
                }}
              >
                {rejectMutation.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

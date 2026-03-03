import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { statusLabels, typeLabels, levelLabels, type MeetingStatus } from "@/data/mockData";
import { useMeetings } from "@/hooks/useMeetings";
import { useAuth } from "@/contexts/AuthContext";
import { approveRoom, rejectMeeting, getAgendaItemsByMeeting, getParticipantsByMeeting, submitMeeting, cancelMeeting, softDeleteMeeting, completeMeeting } from "@/services/api/meetings";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Search, Filter, Eye, Pencil, Trash2, Plus, MapPin, Video, Users, CheckCircle, Clock, XCircle, FileX, FileEdit, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Helper: Format time as hh:mm
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
    // Try to get from sessionStorage first
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('meetingPlanActiveTab');
      if (saved) return saved;
    }
    return "approved";
  });

  // Save activeTab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('meetingPlanActiveTab', activeTab);
  }, [activeTab]);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<typeof meetings[0] | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const navigate = useNavigate();

  const filtered = meetings.filter((m) => {
    const matchStatus = m.status === activeTab;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    // Draft: only requester can see. Other tabs: requester OR host
    const isOwner = activeTab === "draft" 
      ? m.requesterId === user?.id 
      : m.requesterId === user?.id || m.hostId === user?.id;
    return matchStatus && matchSearch && isOwner;
  });

  const getTabCount = (status: string) => {
    // Draft: only requester. Other tabs: requester OR host
    if (status === "draft") {
      return meetings.filter((m) => m.status === status && m.requesterId === user?.id).length;
    }
    return meetings.filter((m) => m.status === status && (m.requesterId === user?.id || m.hostId === user?.id)).length;
  };

  const canApproveRoom = user?.authorities?.includes("ROLE_ROOM_MANAGER") || user?.authorities?.includes("ROLE_ADMIN");
  const canApproveUnit = user?.authorities?.includes("ROLE_UNIT_MANAGER") || user?.authorities?.includes("ROLE_ADMIN");
  const canApprove = canApproveRoom || canApproveUnit;

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
      setSelectedMeeting(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // For all statuses (including draft), use cancel to set status = CANCELED
      // status_record will remain ACTIVE
      return cancelMeeting(id);
    },
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

      {/* Status Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {statusTabs.map((tab) => {
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

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm cuộc họp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowFilter(!showFilter)}>
          <Filter className="h-3.5 w-3.5" /> Bộ lọc
        </Button>
      </div>

      {/* Table */}
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
            {filtered.map((meeting) => {
              const TypeIcon = typeIconMap[meeting.type];
              return (
                <TableRow key={meeting.id} className="hover:bg-secondary/20">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">{(meeting.attendees?.length ?? 0)} đơn vị tham gia</p>
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
                  <TableCell className="text-sm">
                    {new Date(meeting.startTime).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatTime(meeting.startTime)}
                    {" - "}
                    {formatTime(meeting.endTime)}
                  </TableCell>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMeeting(meeting)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {meeting.status === "draft" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/meetings/edit/${meeting.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                            if (window.confirm("Bạn có chắc chắn muốn xóa cuộc họp này?")) {
                              cancelMutation.mutate({ id: meeting.id, status: meeting.status });
                            }
                          }}>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-lg">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selectedMeeting.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline" className={statusColorMap[selectedMeeting.status]}>
                    {statusLabels[selectedMeeting.status]}
                  </Badge>
                  <Badge variant="outline">{typeLabels[selectedMeeting.type]}</Badge>
                  <Badge variant="outline">{levelLabels[selectedMeeting.level]}</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Thời gian:</span><br />{new Date(selectedMeeting.startTime).toLocaleString("vi-VN")}</div>
                  <div><span className="text-muted-foreground">Kết thúc:</span><br />{new Date(selectedMeeting.endTime).toLocaleString("vi-VN")}</div>
                  <div><span className="text-muted-foreground">Chủ trì:</span><br />{selectedMeeting.chairperson}</div>
                  <div><span className="text-muted-foreground">Đơn vị:</span><br />{selectedMeeting.department}</div>
                  {selectedMeeting.roomName && <div><span className="text-muted-foreground">Phòng họp:</span><br />{selectedMeeting.roomName}</div>}
                  {selectedMeeting.meetingLink && <div><span className="text-muted-foreground">Link họp:</span><br /><a href={selectedMeeting.meetingLink} className="text-info underline">{selectedMeeting.meetingLink}</a></div>}
                </div>
                <Separator />
                <div>
                  <p className="font-medium mb-1">Mô tả</p>
                  <p className="text-muted-foreground">{selectedMeeting.description}</p>
                </div>
                {agendaItems.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">Chương trình họp</p>
                      <div className="space-y-2">
                        {agendaItems.map((item) => (
                          <div key={item.order} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-secondary/50">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{item.order}</span>
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
                  <p className="font-medium mb-1">Thành phần tham dự ({participants.length})</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {participants.map((p: any) => (
                      <Badge key={p.id} variant="secondary" className="text-[11px]">{p.name}</Badge>
                    ))}
                  </div>
                </div>

                {(canApproveRoom || canApproveUnit) && selectedMeeting.status === "pending" && (
                  <>
                    <Separator />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => approveRoomMutation.mutate(selectedMeeting.id)}>
                        Phê duyệt
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)}>
                        Từ chối
                      </Button>
                    </div>
                  </>
                )}

                {selectedMeeting.status === "approved" && (selectedMeeting.host?.id === user?.id || selectedMeeting.requesterId === user?.id) && (
                  <>
                    <Separator />
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => completeMutation.mutate(selectedMeeting.id)}
                        disabled={completeMutation.isPending}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {completeMutation.isPending ? "Đang xử lý..." : "Hoàn thành"}
                      </Button>
                    </div>
                  </>
                )}

                {/* Rejection reason for rejected meetings */}
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

      {/* Reject Dialog */}
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
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối cuộc họp..."
                className="mt-1.5"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => {
                setShowRejectDialog(false);
                setRejectReason("");
              }}>
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

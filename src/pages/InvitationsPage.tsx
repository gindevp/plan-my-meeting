import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAllParticipants, respondToInvitation, selectRepresentatives, deleteMeetingParticipant } from "@/services/api/meetings";
import { useMeetings } from "@/hooks/useMeetings";
import { getUsersByDepartment } from "@/services/api/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, UserCheck, UserX, Calendar, Clock, Building2, Users, Trash2 } from "lucide-react";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function isCorporateLevel(level?: string): boolean {
  const n = (level ?? "").toUpperCase();
  return ["CORPORATE", "COMPANY", "TONG_CONG_TY", "CAP_TONG_CONG_TY"].includes(n);
}

/** Cuộc họp đã quá thời gian kết thúc → không cho xác nhận/từ chối; chỉ được yêu cầu điểm danh bù. */
function isMeetingOver(meeting: { endTime?: string } | null): boolean {
  return meeting?.endTime != null && new Date() > new Date(meeting.endTime);
}

export default function InvitationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "mine";
  const [activeTab, setActiveTab] = useState<"mine" | "department">(tabParam === "department" ? "department" : "mine");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [declineParticipantId, setDeclineParticipantId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [requiredDeclineParticipantId, setRequiredDeclineParticipantId] = useState<number | null>(null);
  const [selectModal, setSelectModal] = useState<{ participantId: number; meeting: any; departmentName: string } | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [representativeSearch, setRepresentativeSearch] = useState("");
  const [deleteConfirmInvitationId, setDeleteConfirmInvitationId] = useState<number | null>(null);

  const isSecretary = user?.authorities?.includes("ROLE_SECRETARY") ?? false;
  const userDepartmentId = user?.departmentId != null ? String(user.departmentId) : null;

  const { data: allParticipants = [], isLoading } = useQuery({
    queryKey: ["all-participants"],
    queryFn: getAllParticipants,
  });

  const { data: meetings = [] } = useMeetings();

  const secretaryInvitations = useMemo(() => {
    return (meetings as any[])
      .filter(
        (m: any) =>
          m.secretaryId != null &&
          String(m.secretaryId) === String(user?.id) &&
          String(m.status ?? "").toLowerCase() === "approved"
      )
      .map((m: any) => ({
        id: `secretary-${m.id}`,
        isSecretaryInvitation: true,
        meeting: {
          id: String(m.id),
          title: m.title,
          startTime: m.startTime,
          endTime: m.endTime,
          chairperson: m.chairperson ?? m.organizer ?? "",
          department: m.department ?? "",
          level: m.level,
        },
      }));
  }, [meetings, user?.id]);

  const participantInvitations = allParticipants.filter(
    (p: any) =>
      p.userId != null &&
      String(p.userId) === String(user?.id) &&
      (p.confirmationStatus === "PENDING" || p.confirmationStatus === undefined) &&
      (String(p.meeting?.status ?? "").toUpperCase() === "APPROVED")
  );

  const invitations = useMemo(() => {
    const participantIds = new Set(participantInvitations.map((p: any) => String(p.meeting?.id)));
    const onlySecretary = secretaryInvitations.filter((s: any) => !participantIds.has(String(s.meeting?.id)));
    return [...participantInvitations, ...onlySecretary];
  }, [participantInvitations, secretaryInvitations]);

  const departmentInvitations = allParticipants.filter(
    (p: any) =>
      p.userId == null &&
      p.departmentId != null &&
      String(p.departmentId) === userDepartmentId &&
      (String(p.meeting?.status ?? "").toUpperCase() === "APPROVED") &&
      isCorporateLevel(p.meeting?.level) &&
      // Sau khi thư ký chọn đại diện, participant phòng ban được set CONFIRMED → không còn hiển thị ở tab lời mời phòng ban.
      (p.confirmationStatus === "PENDING" || p.confirmationStatus === undefined)
  );

  const { data: deptUsers = [], isLoading: loadingDeptUsers } = useQuery({
    queryKey: ["users-by-department", selectModal ? userDepartmentId : null],
    queryFn: () => getUsersByDepartment(userDepartmentId!),
    enabled: !!selectModal && !!userDepartmentId,
  });

  const respondMutation = useMutation({
    mutationFn: ({ participantId, status, reason }: { participantId: number; status: "CONFIRMED" | "DECLINED"; reason?: string }) =>
      respondToInvitation(participantId, status, reason),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["all-participants"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setDeclineParticipantId(null);
      setDeclineReason("");
      toast({
        title: status === "CONFIRMED" ? "Đã xác nhận tham gia" : "Đã từ chối",
        description: status === "CONFIRMED" ? "Bạn đã xác nhận tham dự cuộc họp." : "Bạn đã từ chối tham dự.",
      });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể cập nhật." });
    },
  });

  const selectMutation = useMutation({
    mutationFn: ({ participantId, userIds }: { participantId: number; userIds: number[] }) =>
      selectRepresentatives(participantId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-participants"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setSelectModal(null);
      setSelectedUserIds([]);
      toast({ title: "Đã chọn đại diện", description: "Các cá nhân đã được thông báo tham dự." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể chọn đại diện." });
    },
  });

  const openMeetingDetail = (meetingId: string) => {
    navigate(`/plans?meetingId=${meetingId}`);
  };

  const openSelectModal = (p: any) => {
    setSelectModal({ participantId: p.id, meeting: p.meeting, departmentName: p.departmentName || "" });
    setSelectedUserIds([]);
  };

  const toggleUser = (uid: number) => {
    setSelectedUserIds((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  };

  const handleSelectRepresentatives = () => {
    if (!selectModal || selectedUserIds.length === 0) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn ít nhất một người đại diện." });
      return;
    }
    selectMutation.mutate({ participantId: selectModal.participantId, userIds: selectedUserIds });
  };

  const deleteInvitationMutation = useMutation({
    mutationFn: (participantId: number) => deleteMeetingParticipant(participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-participants"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setDeleteConfirmInvitationId(null);
      toast({ title: "Đã xóa", description: "Lời mời đã được xóa khỏi danh sách." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể xóa lời mời." });
    },
  });

  return (
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Lời mời</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Các cuộc họp đã phê duyệt mà bạn được mời tham dự, làm thư ký cuộc họp, hoặc phòng ban của bạn được mời
        </p>
      </div>

      {isSecretary && (
        <div className="flex gap-2 mt-4 border-b border-border opacity-0 animate-auth-fade-in-up auth-stagger-1">
          <Button
            variant={activeTab === "mine" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("mine")}
            className="gap-1.5"
          >
            <Mail className="h-4 w-4" />
            Lời mời của tôi
            {invitations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {invitations.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "department" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("department")}
            className="gap-1.5"
          >
            <Building2 className="h-4 w-4" />
            Lời mời phòng tôi
            {departmentInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {departmentInvitations.length}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8">Đang tải...</div>
      ) : activeTab === "department" && isSecretary ? (
        departmentInvitations.length === 0 ? (
          <Card className="card-elevated mt-4 opacity-0 animate-auth-fade-in-up auth-stagger-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">Không có lời mời phòng ban nào</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Các cuộc họp <strong>cấp Tổng công ty</strong> mời phòng ban của bạn sẽ hiển thị tại đây.
              </p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md">
                Lưu ý: Khi tạo cuộc họp, chọn <strong>Cấp Tổng công ty</strong> và chọn phòng ban HR (không chọn Cấp Phòng ban). Đảm bảo tài khoản thư ký có phòng ban được gán đúng.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 mt-4">
            {departmentInvitations.map((inv: any) => {
              const meeting = inv.meeting;
              if (!meeting) return null;
              return (
                <Card key={inv.id} className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up transition-all duration-300 hover:shadow-lg" style={{ animationDelay: `${0.2 + departmentInvitations.indexOf(inv) * 0.05}s`, animationFillMode: "forwards" }}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-display">{meeting.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatTime(meeting.startTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Chủ trì: {meeting.chairperson || "-"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {inv.departmentName || "Phòng ban"}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">Chọn đại diện</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">
                      Phòng ban của bạn được mời tham dự. Vui lòng chọn cá nhân đại diện tham dự cuộc họp.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openMeetingDetail(meeting.id)}>
                        <Eye className="h-4 w-4" />
                        Xem chi tiết
                      </Button>
                      <Button size="sm" className="gap-1.5" onClick={() => openSelectModal(inv)}>
                        <Users className="h-4 w-4" />
                        Chọn đại diện
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : invitations.length === 0 ? (
        <Card className="card-elevated mt-4 opacity-0 animate-auth-fade-in-up auth-stagger-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="font-medium text-foreground">Không có lời mời nào chờ xác nhận</p>
            <p className="text-sm text-muted-foreground mt-1">
              Lời mời chỉ hiển thị sau khi cuộc họp được phê duyệt.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 mt-4">
          {invitations.map((inv: any) => {
            const meeting = inv.meeting;
            if (!meeting) return null;
            const isSecretaryInv = inv.isSecretaryInvitation === true;
            const isDeclineMode = !isSecretaryInv && declineParticipantId === inv.id;
            return (
              <Card key={inv.id} className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up transition-all duration-300 hover:shadow-lg" style={{ animationDelay: `${0.2 + invitations.indexOf(inv) * 0.05}s`, animationFillMode: "forwards" }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-display">{meeting.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatTime(meeting.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Chủ trì: {meeting.chairperson || "-"}
                        </span>
                        {meeting.department && (
                          <span>{meeting.department}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {isSecretaryInv ? "Thư ký cuộc họp" : "Chờ xác nhận"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isSecretaryInv ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openMeetingDetail(meeting.id)}>
                        <Eye className="h-4 w-4" />
                        Xem chi tiết
                      </Button>
                      <span className="text-xs text-muted-foreground">Bạn được chỉ định làm thư ký cuộc họp. Vào chi tiết để xem và quản lý.</span>
                    </div>
                  ) : !isDeclineMode ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openMeetingDetail(meeting.id)}>
                        <Eye className="h-4 w-4" />
                        Xem chi tiết
                      </Button>
                      {isMeetingOver(meeting) ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">Đã quá thời gian họp. Vào chi tiết cuộc họp để yêu cầu điểm danh bù.</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive border-destructive/50 hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmInvitationId(inv.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Xóa lời mời
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => respondMutation.mutate({ participantId: inv.id, status: "CONFIRMED" })}
                            disabled={respondMutation.isPending}
                          >
                            <UserCheck className="h-4 w-4" />
                            Xác nhận tham gia
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5"
                            onClick={() => {
                              if (inv.required === true) {
                                setRequiredDeclineParticipantId(inv.id);
                              } else {
                                setDeclineParticipantId(inv.id);
                              }
                            }}
                          >
                            <UserX className="h-4 w-4" />
                            Từ chối
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <Label className="text-xs">Lý do không tham dự (bắt buộc)</Label>
                      <Textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Nhập lý do..."
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (!declineReason.trim()) {
                              toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập lý do từ chối." });
                              return;
                            }
                            respondMutation.mutate({ participantId: inv.id, status: "DECLINED", reason: declineReason.trim() });
                          }}
                          disabled={respondMutation.isPending}
                        >
                          Gửi từ chối
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDeclineParticipantId(null); setDeclineReason(""); }}>
                          Hủy
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteConfirmInvitationId != null} onOpenChange={(open) => !open && setDeleteConfirmInvitationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa lời mời</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa lời mời này? Lời mời sẽ không còn hiển thị trong danh sách của bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmInvitationId != null) deleteInvitationMutation.mutate(deleteConfirmInvitationId);
              }}
              disabled={deleteInvitationMutation.isPending}
            >
              {deleteInvitationMutation.isPending ? "Đang xử lý..." : "Xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal chọn đại diện */}
      <Dialog open={!!selectModal} onOpenChange={(open) => { if (!open) { setSelectModal(null); setRepresentativeSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Chọn đại diện tham dự</DialogTitle>
          </DialogHeader>
          {selectModal && (
            <>
              <div className="mb-4">
                <p className="text-sm font-medium">{selectModal.meeting?.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(selectModal.meeting?.startTime)} • {selectModal.departmentName}
                </p>
              </div>
              <div>
                <Label className="text-sm">Chọn cá nhân đại diện phòng ban (có thể chọn nhiều)</Label>
                {loadingDeptUsers ? (
                  <p className="text-sm text-muted-foreground py-4">Đang tải...</p>
                ) : (
                  <>
                    <Input
                      placeholder="Tìm theo tên, chức vụ..."
                      value={representativeSearch}
                      onChange={(e) => setRepresentativeSearch(e.target.value)}
                      className="mt-2"
                    />
                    <div className="mt-2 max-h-[240px] overflow-y-auto space-y-2 rounded-lg border p-2">
                    {(() => {
                      const q = representativeSearch.trim().toLowerCase();
                      const filtered = q
                        ? deptUsers.filter((u: any) => {
                            const name = (u.name || "").toLowerCase();
                            const login = (u.login || "").toLowerCase();
                            const position = (u.position || "").toLowerCase();
                            return name.includes(q) || login.includes(q) || position.includes(q);
                          })
                        : deptUsers;
                      if (deptUsers.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Không có nhân viên trong phòng</p>;
                      if (filtered.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Không tìm thấy kết quả</p>;
                      return filtered.map((u: any) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleUser(Number(u.id))}
                          className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm transition-colors ${
                            selectedUserIds.includes(Number(u.id))
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {u.name?.split(" ")?.[0]?.[0] || "?"}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{u.name || u.login}</p>
                            {u.position && <p className="text-xs text-muted-foreground">{u.position}</p>}
                          </div>
                          {selectedUserIds.includes(Number(u.id)) && (
                            <UserCheck className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      ));
                    })()}
                  </div>
                  </>
                )}
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectModal(null)} disabled={selectMutation.isPending}>
              Hủy
            </Button>
            <Button onClick={handleSelectRepresentatives} disabled={selectMutation.isPending || selectedUserIds.length === 0}>
              {selectMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={requiredDeclineParticipantId != null} onOpenChange={(open) => !open && setRequiredDeclineParticipantId(null)}>
        <AlertDialogContent className="max-w-md rounded-xl border-border shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-display font-semibold tracking-tight">Từ chối tham dự</AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              Bạn được chỉ định bắt buộc tham dự; nếu không thể, vui lòng báo trưởng phòng để đổi người.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2 sm:justify-end">
            <AlertDialogCancel className="h-11">Hủy</AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-11"
              onClick={() => {
                if (requiredDeclineParticipantId != null) {
                  setDeclineParticipantId(requiredDeclineParticipantId);
                  setRequiredDeclineParticipantId(null);
                }
              }}
            >
              Vẫn từ chối
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

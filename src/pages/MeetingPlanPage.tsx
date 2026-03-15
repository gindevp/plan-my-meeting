import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { statusLabels, typeLabels, levelLabels, type MeetingStatus } from "@/data/mockData";
import { useMeetings } from "@/hooks/useMeetings";
import { useDepartments } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
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
  respondToInvitation,
  updateParticipantAttendance,
  requestLateCheckIn,
  approveLateCheckIn,
  rejectLateCheckIn,
  getIncidentsByMeeting,
  createIncident,
  createMeetingDocument,
  createPostMeetingTask,
  getAllParticipants,
  downloadMeetingDocument,
  deleteMeetingDocument,
  updateMeetingTaskStatus,
} from "@/services/api/meetings";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Search, Filter, Eye, Pencil, Trash2, Plus, MapPin, Video, Users, CheckCircle, Clock, XCircle, FileX, FileEdit, UserCheck, UserX, AlertTriangle, FileText, Upload, Download, Loader2, ListTodo, PlayCircle, Circle, Calendar, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";

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

const normalizeLevel = (level?: string) => {
  const value = String(level ?? "").trim().toLowerCase();
  if (["corporate", "company", "tong_cong_ty", "tổng công ty", "cap_tong_cong_ty"].includes(value)) return "company";
  if (["department", "phong_ban", "phòng ban", "team"].includes(value)) return "department";
  return value || "department";
};

export default function MeetingPlanPage() {
  const { toast } = useToast();
  const { data: meetings = [] } = useMeetings();
  const { data: users = [] } = useUsers();
  const { user } = useAuth();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get("tab");
      if (tabFromUrl) return tabFromUrl;

      const saved = sessionStorage.getItem("meetingPlanActiveTab");
      if (saved) return saved;
    }
    return "approved";
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem("meetingPlanActiveTab", activeTab);
    const params = new URLSearchParams(location.search);
    params.set("tab", activeTab);
    const meetingId = params.get("meetingId");
    if (meetingId) params.set("meetingId", meetingId);
    navigate(`/plans?${params.toString()}`, { replace: true });
  }, [activeTab, location.search, navigate]);


  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [selectedMeeting, setSelectedMeeting] = useState<typeof meetings[0] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [deleteConfirmMeeting, setDeleteConfirmMeeting] = useState<typeof meetings[0] | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingUploadTaskId, setPendingUploadTaskId] = useState<string | null>(null);
  const taskFileInputRef = useRef<HTMLInputElement>(null);
  const [declineParticipantId, setDeclineParticipantId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [requiredDeclineParticipantId, setRequiredDeclineParticipantId] = useState<number | null>(null);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState("MEDIUM");
  const [incidentAssignedToId, setIncidentAssignedToId] = useState<string>("");
  const [minutesFiles, setMinutesFiles] = useState<File[]>([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeModalMinutesFiles, setCompleteModalMinutesFiles] = useState<File[]>([]);
  const [showPostTaskForm, setShowPostTaskForm] = useState(false);
  const [postTasks, setPostTasks] = useState<{ key: string; title: string; dueAt: string; assigneeKey: string }[]>(() => [{ key: `task-${Date.now()}`, title: "", dueAt: "", assigneeKey: "" }]);
  const [representativesModal, setRepresentativesModal] = useState<{ departmentName: string; representativeParticipants: any[] } | null>(null);

  const { data: allParticipantsForPlan = [] } = useQuery({
    queryKey: ["all-participants"],
    queryFn: getAllParticipants,
  });
  const { data: departments = [] } = useDepartments();

  const visibleStatusTabs = statusTabs;

  const isSecretary = user?.authorities?.includes("ROLE_SECRETARY") ?? false;
  const userDepartmentId = user?.departmentId != null ? String(user.departmentId) : null;

  const participantMeetingIds = useMemo(() => {
    const ids = new Set<string>();
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (p.userId != null && String(p.userId) === String(user?.id) && String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" && p.meeting?.id != null) {
        ids.add(String(p.meeting.id));
      }
    });
    return ids;
  }, [allParticipantsForPlan, user?.id]);

  const secretaryDepartmentMeetingIds = useMemo(() => {
    const ids = new Set<string>();
    if (!isSecretary || !userDepartmentId) return ids;
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (p.userId == null && p.departmentId != null && String(p.departmentId) === userDepartmentId && String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" && p.meeting?.id != null) {
        ids.add(String(p.meeting.id));
      }
      if (p.userId != null && p.departmentId != null && String(p.departmentId) === userDepartmentId && String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" && p.meeting?.id != null) {
        ids.add(String(p.meeting.id));
      }
    });
    return ids;
  }, [allParticipantsForPlan, isSecretary, userDepartmentId]);

  const participantMeetingsAsList = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (p.userId == null || String(p.userId) !== String(user?.id) || String(p.meeting?.status ?? "").toUpperCase() !== "APPROVED" || !p.meeting?.id) return;
      const id = String(p.meeting.id);
      if (seen.has(id)) return;
      seen.add(id);
      const m = p.meeting;
      list.push({
        id,
        title: m.title ?? "",
        type: "offline",
        level: "department",
        status: "approved",
        startTime: m.startTime,
        endTime: m.endTime,
        roomName: undefined,
        meetingLink: undefined,
        organizer: m.chairperson ?? "",
        chairperson: m.chairperson ?? "",
        host: undefined,
        hostId: undefined,
        secretaryId: undefined,
        department: m.department ?? "",
        description: "",
        requesterId: undefined,
        attendees: [],
        agenda: [],
      });
    });
    return list;
  }, [allParticipantsForPlan, user?.id]);

  const secretaryDepartmentMeetingsAsList = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (!isSecretary || !userDepartmentId || p.meeting?.id == null) return;
      const deptMatch = p.departmentId != null && String(p.departmentId) === userDepartmentId;
      if (!deptMatch) return;
      if (String(p.meeting?.status ?? "").toUpperCase() !== "APPROVED") return;
      const id = String(p.meeting.id);
      if (seen.has(id)) return;
      seen.add(id);
      const m = p.meeting;
      list.push({
        id,
        title: m.title ?? "",
        type: "offline",
        level: (m.level ?? "department").toLowerCase().includes("corporate") || (m.level ?? "").toLowerCase().includes("company") ? "company" : "department",
        status: "approved",
        startTime: m.startTime,
        endTime: m.endTime,
        roomName: undefined,
        meetingLink: undefined,
        organizer: m.chairperson ?? "",
        chairperson: m.chairperson ?? "",
        host: undefined,
        hostId: undefined,
        secretaryId: undefined,
        department: m.department ?? "",
        description: "",
        requesterId: undefined,
        attendees: [],
        agenda: [],
      });
    });
    return list;
  }, [allParticipantsForPlan, isSecretary, userDepartmentId]);

  const meetingsForTabs = useMemo(() => {
    const fromApi = meetings as any[];
    const existingIds = new Set(fromApi.map((m: any) => String(m.id)));
    const onlyFromParticipant = participantMeetingsAsList.filter((m: any) => !existingIds.has(m.id));
    const fromSecretaryDept = secretaryDepartmentMeetingsAsList.filter((m: any) => !existingIds.has(String(m.id)));
    return [...fromApi, ...onlyFromParticipant, ...fromSecretaryDept];
  }, [meetings, participantMeetingsAsList, secretaryDepartmentMeetingsAsList]);

  const participantCountByMeetingId = useMemo(() => {
    const map: Record<string, number> = {};
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      const id = p.meeting?.id != null ? String(p.meeting.id) : null;
      if (id && p.userId != null) {
        map[id] = (map[id] ?? 0) + 1;
      }
    });
    return map;
  }, [allParticipantsForPlan]);

  const departmentCountByMeetingId = useMemo(() => {
    const map: Record<string, number> = {};
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      const id = p.meeting?.id != null ? String(p.meeting.id) : null;
      if (id && p.departmentId != null) {
        map[id] = (map[id] ?? 0) + 1;
      }
    });
    return map;
  }, [allParticipantsForPlan]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const meetingId = params.get("meetingId");
    if (!meetingId) return;
    const meeting = meetingsForTabs.find((m: any) => String(m.id) === String(meetingId));
    if (meeting) {
      setSelectedMeeting(meeting);
      setDetailOpen(true);
      return;
    }
    const fromParticipant = (allParticipantsForPlan as any[]).find(
      (p: any) => p.meeting?.id != null && String(p.meeting.id) === String(meetingId) && String(p.userId) === String(user?.id)
    );
    if (fromParticipant?.meeting) {
      const m = fromParticipant.meeting;
      setSelectedMeeting({
        id: String(m.id),
        title: m.title ?? "",
        type: "offline",
        level: "department",
        status: (m.status ?? "APPROVED").toLowerCase(),
        startTime: m.startTime,
        endTime: m.endTime,
        roomName: undefined,
        meetingLink: undefined,
        organizer: m.chairperson ?? "",
        chairperson: m.chairperson ?? "",
        host: undefined,
        hostId: undefined,
        secretaryId: undefined,
        department: m.department ?? "",
        description: "",
        requesterId: undefined,
        attendees: [],
        agenda: [],
      } as any);
      setDetailOpen(true);
    }
  }, [location.search, meetingsForTabs, allParticipantsForPlan, user?.id]);

  const filtered = useMemo(() => {
    return meetingsForTabs.filter((m: any) => {
      const matchStatus = m.status === activeTab;
      const matchSearch = m.title?.toLowerCase().includes(search.toLowerCase());
      const isOwner = activeTab === "draft" ? m.requesterId === user?.id : m.requesterId === user?.id || m.hostId === user?.id;
      const isParticipantInApproved = activeTab === "approved" && participantMeetingIds.has(String(m.id));
      const isSecretaryDepartmentInvited = activeTab === "approved" && secretaryDepartmentMeetingIds.has(String(m.id));
      const visibleToUser = isAdmin || isOwner || isParticipantInApproved || isSecretaryDepartmentInvited;

      if (!matchStatus || !matchSearch || !visibleToUser) return false;

      if (filterStartDate && filterStartTime) {
        const filterStart = new Date(`${filterStartDate}T${filterStartTime}`).getTime();
        if (new Date(m.endTime).getTime() < filterStart) return false;
      }
      if (filterEndDate && filterEndTime) {
        const filterEnd = new Date(`${filterEndDate}T${filterEndTime}`).getTime();
        if (new Date(m.startTime).getTime() > filterEnd) return false;
      }
      if (filterLevel) {
        const mLevel = normalizeLevel(m.level);
        if (mLevel !== filterLevel) return false;
      }
      if (filterType && m.type !== filterType) return false;

      return true;
    });
  }, [meetingsForTabs, activeTab, search, user?.id, isAdmin, participantMeetingIds, filterStartDate, filterStartTime, filterEndDate, filterEndTime, filterLevel, filterType]);

  const getTabCount = (status: string) => {
    if (isAdmin) {
      return meetingsForTabs.filter((m: any) => m.status === status).length;
    }
    if (status === "draft") {
      return meetings.filter(m => m.status === status && m.requesterId === user?.id).length;
    }
    if (status === "approved") {
      return meetingsForTabs.filter(
        (m: any) => m.status === status && (m.requesterId === user?.id || m.hostId === user?.id || participantMeetingIds.has(String(m.id)))
      ).length;
    }
    return meetings.filter(m => m.status === status && (m.requesterId === user?.id || m.hostId === user?.id)).length;
  };

  const canApproveRoom = user?.authorities?.includes("ROLE_ROOM_MANAGER") || user?.authorities?.includes("ROLE_ADMIN");

  const approveRoomMutation = useMutation({
    mutationFn: (id: string) => approveRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setDetailOpen(false);
      setSelectedMeeting(null);
      setActiveTab("approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (params: { id: string; reason: string }) => rejectMeeting(params.id, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setDetailOpen(false);
      setSelectedMeeting(null);
      setShowRejectDialog(false);
      setRejectReason("");
      setActiveTab("rejected");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitMeeting(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      const submittedStatus = String(res?.status ?? "").toUpperCase();
      const isAutoApproved = submittedStatus === "APPROVED";

      if (isAutoApproved) {
        toast({ title: "Tạo cuộc họp thành công", description: "Cuộc họp cấp tổng công ty đã được tự động duyệt." });
        setActiveTab("approved");
      } else {
        toast({ title: "Đã gửi duyệt", description: "Cuộc họp nháp đã được gửi phê duyệt." });
        setActiveTab("pending");
      }

      setDetailOpen(false);
      setSelectedMeeting(null);
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
      setDetailOpen(false);
      setSelectedMeeting(null);
      toast({ title: "Đã xóa", description: "Cuộc họp đã được chuyển sang danh sách đã xóa." });
      setActiveTab("cancelled");
    },
    onError: () => {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể xóa/hủy cuộc họp." });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setShowCompleteModal(false);
      setDetailOpen(false);
      setSelectedMeeting(null);
      setActiveTab("completed");
      const params = new URLSearchParams(location.search);
      params.delete("meetingId");
      navigate(`/plans?tab=completed${params.toString() ? "&" + params.toString() : ""}`, { replace: true });
      toast({ title: "Hoàn thành", description: "Cuộc họp đã được đánh dấu hoàn thành." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể đánh dấu hoàn thành." });
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ participantId, status, reason }: { participantId: number; status: "CONFIRMED" | "DECLINED"; reason?: string }) =>
      respondToInvitation(participantId, status, reason),
    onSuccess: async (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["participants", selectedMeeting?.id] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setDeclineParticipantId(null);
      setDeclineReason("");
      if (status === "CONFIRMED" && selectedMeeting?.id && user?.id) {
        const myTasks = (meetingTasks as any[]).filter((t: any) => String(t.assigneeId) === String(user.id));
        await Promise.all(myTasks.map((t: any) => updateMeetingTaskStatus(t.id, "IN_PROGRESS")));
        queryClient.invalidateQueries({ queryKey: ["meeting-tasks", selectedMeeting.id] });
      }
      toast({
        title: status === "CONFIRMED" ? "Đã xác nhận tham gia" : "Đã từ chối",
        description: status === "CONFIRMED" ? "Bạn đã xác nhận tham dự cuộc họp. Task của bạn đã chuyển sang Đang làm." : "Bạn đã từ chối tham dự.",
      });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể cập nhật." });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: ({ participantId, attendance }: { participantId: number; attendance: "PRESENT" | "ABSENT" | "NOT_MARKED" | "EXCUSED" }) =>
      updateParticipantAttendance(participantId, attendance),
    onSuccess: () => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["participants", selectedMeeting.id] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Đã cập nhật", description: "Điểm danh đã được cập nhật." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể cập nhật điểm danh." });
    },
  });

  const requestLateCheckInMutation = useMutation({
    mutationFn: (participantId: number) => requestLateCheckIn(participantId),
    onSuccess: () => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["participants", selectedMeeting.id] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Đã gửi", description: "Yêu cầu điểm danh bù đã được gửi, chờ chủ trì phê duyệt." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể gửi yêu cầu điểm danh bù." });
    },
  });

  const approveLateCheckInMutation = useMutation({
    mutationFn: (participantId: number) => approveLateCheckIn(participantId),
    onSuccess: () => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["participants", selectedMeeting.id] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Đã phê duyệt", description: "Đã chấp nhận điểm danh bù." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể phê duyệt." });
    },
  });

  const rejectLateCheckInMutation = useMutation({
    mutationFn: (participantId: number) => rejectLateCheckIn(participantId),
    onSuccess: () => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["participants", selectedMeeting.id] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Đã từ chối", description: "Đã từ chối yêu cầu điểm danh bù." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể từ chối." });
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: (payload: { meetingId: string; reportedById: number | string; title: string; description?: string; severity?: string }) =>
      createIncident(payload),
    onSuccess: () => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["incidents", selectedMeeting.id] });
      setShowIncidentForm(false);
      setIncidentTitle("");
      setIncidentDescription("");
      setIncidentSeverity("MEDIUM");
      toast({ title: "Đã gửi", description: "Báo cáo sự cố đã được gửi." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể gửi báo cáo sự cố." });
    },
  });

  const uploadMinutesMutation = useMutation({
    mutationFn: async (payload: {
      meetingId: string;
      fileName: string;
      uploadedById: number | string;
      fileBase64?: string;
      fileContentType?: string;
    }) => {
      return createMeetingDocument({
        meetingId: payload.meetingId,
        docType: "MINUTES",
        fileName: payload.fileName,
        uploadedById: payload.uploadedById,
        ...(payload.fileBase64 && { fileBase64: payload.fileBase64, fileContentType: payload.fileContentType || "application/octet-stream" }),
      });
    },
    onSuccess: () => {
      if (selectedMeeting?.id) {
        queryClient.invalidateQueries({ queryKey: ["meeting-documents", selectedMeeting.id] });
      }
      setMinutesFiles([]);
      setCompleteModalMinutesFiles([]);
      toast({ title: "Đã tải lên", description: "Biên bản đã được lưu." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể tải lên biên bản." });
    },
  });

  const createPostTaskMutation = useMutation({
    mutationFn: (payload: {
      meetingId: string;
      title: string;
      description?: string;
      dueAt?: string;
      assigneeId?: string;
      departmentId?: string;
      departmentCode?: string;
      departmentName?: string;
      assignedById: number | string;
    }) =>
      createPostMeetingTask({
        ...payload,
        assigneeId: payload.assigneeId ? Number(payload.assigneeId) : undefined,
        departmentId: payload.departmentId,
      }),
    onSuccess: () => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["meeting-tasks", selectedMeeting.id] });
      toast({ title: "Đã giao", description: "Công việc sau họp đã được tạo." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể tạo công việc." });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: "IN_PROGRESS" | "DONE" }) =>
      updateMeetingTaskStatus(taskId, status),
    onSuccess: (_, { status }) => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["meeting-tasks", selectedMeeting.id] });
      toast({
        title: "Đã cập nhật",
        description: status === "DONE" ? "Task đã đánh dấu hoàn thành." : "Task đã chuyển sang đang làm.",
      });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể cập nhật trạng thái." });
    },
  });

  const uploadTaskDocMutation = useMutation({
    mutationFn: (payload: {
      meetingId: string;
      taskId: string;
      fileName: string;
      fileContentType: string;
      fileBase64: string;
      uploadedById: number | string;
    }) =>
      createMeetingDocument({
        meetingId: payload.meetingId,
        taskId: payload.taskId,
        docType: "TASK_DOC",
        fileName: payload.fileName,
        fileContentType: payload.fileContentType,
        fileBase64: payload.fileBase64,
        uploadedById: payload.uploadedById,
      }),
    onSuccess: () => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["meeting-documents", selectedMeeting.id] });
      setPendingUploadTaskId(null);
      toast({ title: "Đã tải lên", description: "Tài liệu task đã được lưu." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể tải lên tài liệu." });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: number | string) => deleteMeetingDocument(documentId),
    onSuccess: () => {
      if (selectedMeeting?.id) queryClient.invalidateQueries({ queryKey: ["meeting-documents", selectedMeeting.id] });
      toast({ title: "Đã xóa", description: "Tài liệu đã được xóa." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message || "Không thể xóa tài liệu." });
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

  // Cấp Tổng công ty: thành phần tham dự CHỈ hiển thị phòng ban, không hiển thị người đại diện (đại diện chỉ trong modal).
  // Cấp khác: ẩn thư ký và ẩn đại diện (user thuộc phòng đã có participant phòng ban).
  const visibleParticipants = useMemo(() => {
    const list = participants as any[];
    const isCompanyLevel = selectedMeeting && normalizeLevel(selectedMeeting.level) === "company";
    if (isCompanyLevel) {
      return list.filter((p: any) => p.departmentId && !p.userId);
    }
    const secretaryId = selectedMeeting ? String(selectedMeeting.secretaryId ?? "") : "";
    const deptIdsWithDeptParticipant = new Set(
      list.filter((p: any) => p.departmentId && !p.userId).map((p: any) => String(p.departmentId))
    );
    return list.filter((p: any) => {
      if (p.userId && secretaryId && String(p.userId) === secretaryId) return false;
      if (p.departmentId && !p.userId) return true;
      if (p.userId) {
        const userDeptId = (users as any[]).find((u: any) => String(u.id) === String(p.userId))?.departmentId;
        if (userDeptId != null && deptIdsWithDeptParticipant.has(String(userDeptId))) return false;
      }
      return true;
    });
  }, [participants, selectedMeeting, users]);

  const myParticipant = useMemo(
    () => (participants as any[]).find((p: any) => p.userId && String(p.userId) === String(user?.id)),
    [participants, user?.id]
  );
  const hasConfirmedParticipation = myParticipant?.confirmationStatus === "CONFIRMED";

  /** Cuộc họp đã quá thời gian kết thúc → không cho xác nhận tham gia, không cho điểm danh trực tiếp; chỉ được yêu cầu điểm danh bù. */
  const isMeetingOver = (m: { endTime?: string } | null) => m?.endTime != null && new Date() > new Date(m.endTime);

  const postTaskAssigneeOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    (participants as any[]).forEach((p: any) => {
      if (p.userId) {
        list.push({ value: `user-${p.userId}`, label: p.name || p.userId });
      } else if (p.departmentId) {
        list.push({ value: `dept-${p.departmentId}`, label: p.name || `Phòng ban #${p.departmentId}` });
      }
    });
    return list;
  }, [participants]);

  const addPostTaskRow = () => {
    setPostTasks(prev => [...prev, { key: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`, title: "", dueAt: "", assigneeKey: "" }]);
  };
  const removePostTaskRow = (key: string) => {
    setPostTasks(prev => (prev.length <= 1 ? [{ key: `task-${Date.now()}`, title: "", dueAt: "", assigneeKey: "" }] : prev.filter(t => t.key !== key)));
  };
  const updatePostTaskRow = (key: string, field: "title" | "dueAt" | "assigneeKey", value: string) => {
    setPostTasks(prev => prev.map(t => (t.key === key ? { ...t, [field]: value } : t)));
  };

  const submitAllPostTasks = async () => {
    if (!selectedMeeting?.id || !user?.id) return;
    const toCreate = postTasks.filter(t => t.title.trim());
    if (toCreate.length === 0) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập ít nhất một tiêu đề công việc." });
      return;
    }
    try {
      for (const t of toCreate) {
        const assigneeId = t.assigneeKey.startsWith("user-") ? t.assigneeKey.slice(5) : undefined;
        const departmentId = t.assigneeKey.startsWith("dept-") ? t.assigneeKey.slice(5) : undefined;
        const dept = departmentId ? (departments as any[]).find((d: any) => String(d.id) === String(departmentId)) : null;
        await createPostTaskMutation.mutateAsync({
          meetingId: selectedMeeting.id,
          title: t.title.trim(),
          dueAt: t.dueAt || undefined,
          assigneeId,
          departmentId,
          departmentCode: dept?.code,
          departmentName: dept?.name,
          assignedById: user.id,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["meeting-tasks", selectedMeeting.id] });
      toast({ title: "Đã giao", description: `Đã tạo ${toCreate.length} công việc sau họp.` });
      setPostTasks([{ key: `task-${Date.now()}`, title: "", dueAt: "", assigneeKey: "" }]);
      setShowPostTaskForm(false);
    } catch {
      // onError of mutation already shows toast
    }
  };

  const { data: meetingIncidents = [] } = useQuery({
    queryKey: ["incidents", selectedMeeting?.id],
    queryFn: () => getIncidentsByMeeting(selectedMeeting!.id),
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
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
        <PageHeader
          title="Quản lý kế hoạch lịch họp"
          description="Quản lý và theo dõi các kế hoạch cuộc họp"
        >
          <Button onClick={() => navigate("/meetings/new")} className="gap-2 h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            Lên lịch họp
          </Button>
        </PageHeader>
      </div>

      <div className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-1 transition-all duration-300 hover:shadow-lg">
        <div className="flex gap-0 px-1 pt-1 border-b border-border/60 bg-muted/20">
          {visibleStatusTabs.map(tab => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 rounded-t-lg hover:scale-[1.02] ${
                  isActive
                    ? "border-primary text-primary bg-background shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/60 hover:border-border"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-medium">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative w-[60%] min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm cuộc họp..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11" />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-11 shrink-0 ml-auto transition-all duration-200 hover:scale-[1.02]" onClick={() => setShowFilter(!showFilter)}>
              <Filter className="h-3.5 w-3.5" /> Bộ lọc
            </Button>
          </div>
        </div>

        {showFilter && (
          <div className="px-5 pb-5 pt-2 space-y-4 animate-auth-scale-in border-b border-border/50 bg-muted/10">
          <p className="text-sm font-medium tracking-tight">Lọc theo thời gian và điều kiện</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Từ ngày</Label>
              <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="text-sm h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Từ giờ</Label>
              <Input type="time" value={filterStartTime} onChange={e => setFilterStartTime(e.target.value)} className="text-sm h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Đến ngày</Label>
              <Input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="text-sm h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Đến giờ</Label>
              <Input type="time" value={filterEndTime} onChange={e => setFilterEndTime(e.target.value)} className="text-sm h-11" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cấp họp</Label>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Tất cả</option>
                <option value="company">Tổng công ty</option>
                <option value="department">Phòng ban</option>
                <option value="team">Nhóm/Team</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Loại họp</Label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Tất cả</option>
                <option value="offline">Trực tiếp</option>
                <option value="online">Trực tuyến</option>
                <option value="hybrid">Kết hợp</option>
              </select>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setFilterStartDate(""); setFilterStartTime(""); setFilterEndDate(""); setFilterEndTime(""); setFilterLevel(""); setFilterType(""); }}>
            Xóa bộ lọc
          </Button>
          </div>
        )}

        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="font-semibold tracking-tight">Tên cuộc họp</TableHead>
              <TableHead className="font-medium">Cấp</TableHead>
              <TableHead className="font-medium">Loại</TableHead>
              <TableHead className="font-medium">Cơ quan chủ trì</TableHead>
              <TableHead className="font-medium">Chủ trì</TableHead>
              <TableHead className="font-medium">Bắt đầu</TableHead>
              <TableHead className="font-medium">Kết thúc</TableHead>
              <TableHead className="font-medium">Người tạo</TableHead>
              {activeTab === "rejected" && <TableHead>Lý do từ chối</TableHead>}
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((meeting, i) => {
              const TypeIcon = typeIconMap[meeting.type];
              return (
                <TableRow
                  key={meeting.id}
                  className="hover:bg-secondary/20 transition-all duration-200 opacity-0 animate-auth-fade-in-up"
                  style={{ animationDelay: `${0.15 + i * 0.03}s`, animationFillMode: "forwards" }}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {normalizeLevel(meeting.level) === "company"
                          ? `${departmentCountByMeetingId[String(meeting.id)] ?? 0} đơn vị tham gia`
                          : `${participantCountByMeetingId[String(meeting.id)] ?? meeting.attendees?.length ?? 0} người tham gia`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{levelLabels[normalizeLevel(meeting.level) as keyof typeof levelLabels] ?? meeting.level}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {typeLabels[meeting.type]}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{meeting.department}</TableCell>
                  <TableCell className="text-sm">{meeting.chairperson}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    <div className="font-medium">{new Date(meeting.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</div>
                    <div className="text-muted-foreground text-xs">{new Date(meeting.startTime).toLocaleDateString("vi-VN")}</div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    <div className="font-medium">{new Date(meeting.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</div>
                    <div className="text-muted-foreground text-xs">{new Date(meeting.endTime).toLocaleDateString("vi-VN")}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">{meeting.organizer || "—"}</span>
                  </TableCell>
                  {activeTab === "rejected" && (
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={meeting.rejectionReason}>
                      {meeting.rejectionReason || "-"}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedMeeting(meeting); setDetailOpen(true); }} aria-label="Xem chi tiết cuộc họp">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {meeting.status === "draft" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/meetings/edit/${meeting.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmMeeting(meeting)}
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
                <TableCell colSpan={activeTab === "rejected" ? 10 : 9} className="p-0">
                  <div className="empty-state opacity-0 animate-auth-fade-in-up auth-stagger-2">
                    <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Không tìm thấy cuộc họp nào</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Thử điều chỉnh bộ lọc hoặc tạo cuộc họp mới</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => navigate("/meetings/new")}>
                      <Plus className="h-4 w-4" />
                      Lên lịch họp
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOpen(false);
            setTimeout(() => {
              setSelectedMeeting(null);
              const params = new URLSearchParams(location.search);
              params.delete("meetingId");
              const tab = params.get("tab") || activeTab;
              navigate(`/plans?tab=${tab}`, { replace: true });
            }, 300);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto pr-14">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedMeeting.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={statusColorMap[selectedMeeting.status]}>{statusLabels[selectedMeeting.status]}</Badge>
                  <Badge variant="outline">{typeLabels[selectedMeeting.type]}</Badge>
                  <Badge variant="outline">{levelLabels[normalizeLevel(selectedMeeting.level) as keyof typeof levelLabels] ?? selectedMeeting.level}</Badge>
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

                {(() => {
                  const preMeetingTasks = (meetingTasks as any[]).filter((t: any) => String(t.type || "").toUpperCase() === "PRE_MEETING");
                  const incompletePreMeeting = preMeetingTasks.filter((t: any) => String(t.status || "").toUpperCase() !== "DONE");
                  const startTime = selectedMeeting.startTime ? new Date(selectedMeeting.startTime).getTime() : 0;
                  const now = Date.now();
                  const meetingStartedOrNear = startTime > 0 && now >= startTime - 15 * 60 * 1000;
                  const showWarning =
                    (selectedMeeting.status === "approved" || selectedMeeting.status === "completed") &&
                    incompletePreMeeting.length > 0 &&
                    meetingStartedOrNear;
                  if (!showWarning) return null;
                  return (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2 mt-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">Task chuẩn bị chưa hoàn thành</p>
                        <p className="text-amber-700 dark:text-amber-300/90 mt-0.5">
                          Có {incompletePreMeeting.length} task chuẩn bị tài liệu chưa DONE (đã đến / gần giờ họp). Người được giao cần hoàn thành và upload tài liệu.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {agendaItems.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">Chương trình họp</p>
                      <div className="space-y-2">
                        {(() => {
                          const sorted = [...agendaItems].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
                          const meetingStart = selectedMeeting.startTime ? new Date(selectedMeeting.startTime).getTime() : 0;
                          return sorted.map((item: any, idx: number) => {
                            const prevMinutes = sorted.slice(0, idx).reduce((sum: number, p: any) => sum + (Number(p.duration) || 0), 0);
                            const startTime = meetingStart ? new Date(meetingStart + prevMinutes * 60 * 1000) : null;
                            const timeStr = startTime ? startTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
                            return (
                              <div key={item.order ?? idx} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-secondary/50">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                  {item.order ?? idx + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="font-medium">{timeStr ? `${timeStr} - ${item.title}` : item.title}</p>
                                  <p className="text-muted-foreground">{item.presenter} • {item.duration} phút</p>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div>
                  <p className="font-medium mb-2">Thành phần tham dự & công việc liên quan</p>
                  {participants.length > 0 && (() => {
                    const confirmedCount = (participants as any[]).filter((p: any) => p.confirmationStatus === "CONFIRMED").length;
                    const preMeetingTasks = (meetingTasks as any[]).filter((t: any) => String(t.type || "").toUpperCase() === "PRE_MEETING");
                    const docsUploaded = (meetingDocuments as any[]).length;
                    const docsAssigned = preMeetingTasks.length;
                    return (
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                        <span>Tham dự: <span className="font-medium text-foreground">{confirmedCount}</span> đã xác nhận / <span className="font-medium text-foreground">{participants.length}</span> được mời</span>
                        <span>Tài liệu: <span className="font-medium text-foreground">{docsUploaded}</span> đã tải lên / <span className="font-medium text-foreground">{docsAssigned}</span> được giao</span>
                      </div>
                    );
                  })()}
                  <input
                    ref={taskFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f || !pendingUploadTaskId || !selectedMeeting?.id || !user?.id) return;
                      const base64 = await new Promise<string>((res, rej) => {
                        const r = new FileReader();
                        r.onload = () => {
                          const dataUrl = r.result as string;
                          res(dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl);
                        };
                        r.onerror = rej;
                        r.readAsDataURL(f);
                      });
                      uploadTaskDocMutation.mutate({
                        meetingId: selectedMeeting.id,
                        taskId: pendingUploadTaskId,
                        fileName: f.name,
                        fileContentType: f.type || "application/octet-stream",
                        fileBase64: base64,
                        uploadedById: user.id,
                      });
                      setPendingUploadTaskId(null);
                      e.target.value = "";
                    }}
                  />
                  {visibleParticipants.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Chưa có thành phần tham dự.</p>
                  ) : (
                    <div className="space-y-3">
                      {visibleParticipants.map((p: any) => {
                        const participantTasks = meetingTasks.filter((task: any) => {
                          if (p.userId) {
                            return task.assigneeId === String(p.userId);
                          }
                          if (p.departmentId) {
                            return task.departmentId === String(p.departmentId);
                          }
                          return false;
                        });
                        const confLabel = p.confirmationStatus === "CONFIRMED" ? "Đã xác nhận" : p.confirmationStatus === "DECLINED" ? "Đã từ chối" : "Chưa xác nhận";
                        const confVariant = p.confirmationStatus === "CONFIRMED" ? "default" : p.confirmationStatus === "DECLINED" ? "destructive" : "secondary";
                        const ConfIcon = p.confirmationStatus === "CONFIRMED" ? UserCheck : p.confirmationStatus === "DECLINED" ? UserX : Clock;
                        const isMyTaskRow = !!p.userId && String(p.userId) === String(user?.id) && participantTasks.length > 0;
                        const isDeptParticipant = !!p.departmentId && !p.userId;
                        const departmentRepresentatives = isDeptParticipant
                          ? (participants as any[]).filter(
                              (pp: any) =>
                                pp.userId &&
                                String((users as any[]).find((u: any) => String(u.id) === String(pp.userId))?.departmentId) === String(p.departmentId)
                            )
                          : [];
                        return (
                          <div key={p.id} className={`rounded-lg border p-3 bg-card ${isMyTaskRow ? "ring-2 ring-primary/50 border-primary/30" : ""}`}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="font-semibold text-sm">{p.name}</p>
                              <div className="flex items-center gap-2">
                                {(activeTab === "approved" || activeTab === "completed") && (
                                  <Badge variant={confVariant} className="text-[11px] gap-1">
                                    <ConfIcon className="h-3 w-3 shrink-0" />
                                    {confLabel}
                                  </Badge>
                                )}
                                <Badge
                                  variant={isMyTaskRow ? "default" : "secondary"}
                                  className={`text-[11px] gap-1 ${isMyTaskRow ? "bg-primary/90 font-medium" : ""}`}
                                >
                                  {isMyTaskRow ? <ListTodo className="h-3.5 w-3.5 shrink-0" /> : null}
                                  {isMyTaskRow ? `Task của tôi (${participantTasks.length})` : `${participantTasks.length} task`}
                                </Badge>
                                {isDeptParticipant && departmentRepresentatives.length > 0 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-[11px] h-7"
                                    onClick={() => setRepresentativesModal({ departmentName: p.name, representativeParticipants: departmentRepresentatives })}
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                    Xem đại diện ({departmentRepresentatives.length})
                                  </Button>
                                )}
                              </div>
                            </div>

                            {participantTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Chưa được giao task.</p>
                            ) : (
                              <div className="space-y-2">
                                {participantTasks.map((task: any) => {
                                  const taskDocs = meetingDocuments.filter((doc: any) => doc.taskId === task.id);
                                  const isMyTask = !!task.assigneeId && String(task.assigneeId) === String(user?.id);
                                  const taskStatus = String(task.status || "").toUpperCase();
                                  const isDone = taskStatus === "DONE";
                                  return (
                                    <div key={task.id} className="rounded-md border bg-secondary/30 p-3 text-xs">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium text-sm">{task.title}</p>
                                        <div className="flex items-center gap-2">
                                          {(activeTab === "approved" || activeTab === "completed") && (
                                            <>
                                              {isMyTask && hasConfirmedParticipation ? (
                                                <div
                                                  role="group"
                                                  aria-label="Trạng thái task"
                                                  className="inline-flex h-8 rounded-full bg-muted p-0.5 border border-border shrink-0"
                                                >
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={updateTaskStatusMutation.isPending}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      e.preventDefault();
                                                      if (task.id) updateTaskStatusMutation.mutate({ taskId: String(task.id), status: "IN_PROGRESS" });
                                                    }}
                                                    className={`h-7 min-w-[4.5rem] rounded-full px-3 text-xs font-medium gap-1.5 ${
                                                      !isDone
                                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                                    }`}
                                                  >
                                                    {updateTaskStatusMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <PlayCircle className="h-3 w-3 shrink-0" />}
                                                    IN_PROGRESS
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={updateTaskStatusMutation.isPending}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      e.preventDefault();
                                                      if (task.id) updateTaskStatusMutation.mutate({ taskId: String(task.id), status: "DONE" });
                                                    }}
                                                    className={`h-7 min-w-[4.5rem] rounded-full px-3 text-xs font-medium gap-1.5 ${
                                                      isDone
                                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                                    }`}
                                                  >
                                                    <CheckCircle className="h-3 w-3 shrink-0" />
                                                    Done
                                                  </Button>
                                                </div>
                                              ) : isMyTask ? (
                                                <Badge variant="outline" className="text-[11px] gap-1">
                                                  <Circle className="h-3 w-3 shrink-0" />
                                                  TODO
                                                </Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-[11px] gap-1">
                                                  {taskStatus === "DONE" ? <CheckCircle className="h-3 w-3 shrink-0" /> : taskStatus === "IN_PROGRESS" ? <PlayCircle className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
                                                  {task.status}
                                                </Badge>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-muted-foreground">
                                        <p>Hạn chót: <span className="text-foreground">{task.dueAt ? new Date(task.dueAt).toLocaleString("vi-VN") : "-"}</span></p>
                                        <p>Loại: <span className="text-foreground">{task.type || "-"}</span></p>
                                        <p>Nhắc trước: <span className="text-foreground">{task.remindBeforeMinutes ?? "-"} phút</span></p>
                                      </div>
                                      <div className="mt-1">
                                        <p className="font-medium text-muted-foreground mb-0.5">Mô tả:</p>
                                        <p className="text-muted-foreground">{task.description || "-"}</p>
                                      </div>

                                      <div className="mt-2 pt-2 border-t">
                                        <p className="font-medium mb-1">Tài liệu của task ({taskDocs.length})</p>
                                        {taskDocs.length === 0 ? (
                                          <p className="text-muted-foreground">Không có tài liệu.</p>
                                        ) : (
                                          <div className="space-y-1">
                                            {taskDocs.map((doc: any) => (
                                              <div key={doc.id} className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1 border text-muted-foreground">
                                                <span className="text-foreground">{doc.fileName || "(Không tên)"}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs gap-1"
                                                    onClick={() => downloadMeetingDocument(doc.id)}
                                                  >
                                                    <Download className="h-3 w-3" />
                                                    Tải xuống
                                                  </Button>
                                                  {(selectedMeeting?.host?.id === user?.id || selectedMeeting?.secretaryId === user?.id || isMyTask) && (
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                                      onClick={() => deleteDocumentMutation.mutate(doc.id)}
                                                      disabled={deleteDocumentMutation.isPending}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                      Xóa
                                                    </Button>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {(selectedMeeting.status === "approved" || selectedMeeting.status === "completed") && isMyTask && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 mt-2"
                                            disabled={uploadTaskDocMutation.isPending}
                                            onClick={() => {
                                              setPendingUploadTaskId(String(task.id));
                                              taskFileInputRef.current?.click();
                                            }}
                                          >
                                            <Upload className="h-3.5 w-3.5" />
                                            Tải tài liệu của bạn lên
                                          </Button>
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

                {(() => {
                  const myParticipant = participants.find((p: any) => p.userId && String(p.userId) === String(user?.id));
                  const isPending = myParticipant?.confirmationStatus === "PENDING";
                  const isDeclineMode = declineParticipantId === myParticipant?.id;
                  const isApproved = selectedMeeting.status === "approved";
                  const meetingOver = isMeetingOver(selectedMeeting);
                  if (!myParticipant || !isApproved) return null;
                  if (meetingOver && isPending) {
                    return (
                      <>
                        <Separator />
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                          <p className="font-medium text-sm mb-1">Đã quá thời gian cuộc họp</p>
                          <p className="text-xs text-muted-foreground">Bạn không thể xác nhận tham gia hay điểm danh trực tiếp. Chỉ có thể <strong>yêu cầu điểm danh bù</strong> bên dưới (chủ trì sẽ phê duyệt).</p>
                        </div>
                      </>
                    );
                  }
                  if (!isPending) return null;
                  return (
                    <>
                      <Separator />
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <p className="font-medium text-sm mb-2">Xác nhận tham dự</p>
                        <p className="text-xs text-muted-foreground mb-3">Bạn được mời tham dự cuộc họp này. Vui lòng xác nhận tham gia hoặc từ chối.</p>
                        {!isDeclineMode ? (
                          <div className="flex gap-2">
                            <Button size="sm" className="gap-1.5" onClick={() => respondMutation.mutate({ participantId: myParticipant.id, status: "CONFIRMED" })} disabled={respondMutation.isPending}>
                              <UserCheck className="h-4 w-4" />
                              Xác nhận tham gia
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => {
                                if (myParticipant.required === true) {
                                  setRequiredDeclineParticipantId(myParticipant.id);
                                } else {
                                  setDeclineParticipantId(myParticipant.id);
                                }
                              }}
                            >
                              <UserX className="h-4 w-4" />
                              Từ chối
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label className="text-xs">Lý do không tham dự (bắt buộc)</Label>
                            <Textarea
                              value={declineReason}
                              onChange={e => setDeclineReason(e.target.value)}
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
                                  respondMutation.mutate({ participantId: myParticipant.id, status: "DECLINED", reason: declineReason.trim() });
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
                      </div>
                    </>
                  );
                })()}

                {selectedMeeting.status === "approved" && (() => {
                  const isHostOrSecretary = selectedMeeting.host?.id === user?.id || selectedMeeting.secretaryId === user?.id;
                  const myParticipant = participants.find((p: any) => p.userId && String(p.userId) === String(user?.id));
                  const meetingOver = isMeetingOver(selectedMeeting);
                  if (isHostOrSecretary) {
                    return (
                      <>
                        <Separator />
                        <div className="rounded-lg border border-border p-3">
                          <p className="font-medium text-sm mb-2">Điểm danh</p>
                          {meetingOver ? (
                            <p className="text-xs text-muted-foreground mb-3">Đã quá thời gian họp. Chỉ có thể phê duyệt hoặc từ chối <strong>yêu cầu điểm danh bù</strong> của thành viên bên dưới.</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mb-3">Chủ trì / Thư ký đánh dấu có mặt hoặc vắng mặt cho từng thành viên.</p>
                          )}
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {participants.filter((p: any) => p.userId || p.departmentId).map((p: any) => (
                              <div key={p.id} className="flex flex-col gap-1.5 py-1.5 border-b border-border/50 last:border-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{p.name}</p>
                                  {!meetingOver && (
                                  <div
                                    role="group"
                                    aria-label="Điểm danh"
                                    className="inline-flex h-8 rounded-full bg-muted p-0.5 border border-border shrink-0"
                                  >
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={attendanceMutation.isPending}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        attendanceMutation.mutate({ participantId: p.id, attendance: "PRESENT" });
                                      }}
                                      className={`h-7 min-w-[4.5rem] rounded-full px-3 text-xs font-medium ${
                                        p.attendance === "PRESENT"
                                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                      }`}
                                    >
                                      Có mặt
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={attendanceMutation.isPending}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        attendanceMutation.mutate({ participantId: p.id, attendance: "ABSENT" });
                                      }}
                                      className={`h-7 min-w-[4rem] rounded-full px-3 text-xs font-medium ${
                                        p.attendance === "ABSENT"
                                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                      }`}
                                    >
                                      Vắng
                                    </Button>
                                  </div>
                                  )}
                                </div>
                                {p.lateCheckInRequestedAt && (
                                  <div className="flex items-center gap-2 pl-0 text-xs text-muted-foreground">
                                    <span className="shrink-0">Yêu cầu điểm danh bù</span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-xs"
                                      disabled={approveLateCheckInMutation.isPending || rejectLateCheckInMutation.isPending}
                                      onClick={() => approveLateCheckInMutation.mutate(p.id)}
                                    >
                                      Phê duyệt
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs text-destructive hover:text-destructive"
                                      disabled={approveLateCheckInMutation.isPending || rejectLateCheckInMutation.isPending}
                                      onClick={() => rejectLateCheckInMutation.mutate(p.id)}
                                    >
                                      Từ chối
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  }
                  if (myParticipant && (myParticipant.attendance !== "PRESENT" || isMeetingOver(selectedMeeting))) {
                    const meetingOver = isMeetingOver(selectedMeeting);
                    return (
                      <>
                        <Separator />
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                          <p className="font-medium text-sm mb-2">Điểm danh</p>
                          {meetingOver ? (
                            <p className="text-xs text-muted-foreground mb-2">Đã quá thời gian họp. Chỉ có thể yêu cầu điểm danh bù (chủ trì sẽ phê duyệt).</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mb-2">Xác nhận trạng thái có mặt của bạn.</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            {!meetingOver && (
                            <div
                              role="group"
                              aria-label="Điểm danh"
                              className="inline-flex h-8 rounded-full bg-muted p-0.5 border border-border"
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={attendanceMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  attendanceMutation.mutate({ participantId: myParticipant.id, attendance: "PRESENT" });
                                }}
                                className="h-7 min-w-[4.5rem] rounded-full px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <UserCheck className="h-3 w-3 shrink-0 mr-1" />
                                Có mặt
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={attendanceMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  attendanceMutation.mutate({ participantId: myParticipant.id, attendance: "ABSENT" });
                                }}
                                className="h-7 min-w-[4rem] rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                              >
                                Vắng
                              </Button>
                            </div>
                            )}
                            {myParticipant.lateCheckInRequestedAt ? (
                              <span className="text-xs text-muted-foreground">Đã gửi yêu cầu điểm danh bù, chờ chủ trì phê duyệt.</span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={requestLateCheckInMutation.isPending}
                                onClick={() => requestLateCheckInMutation.mutate(myParticipant.id)}
                              >
                                Yêu cầu điểm danh bù
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}

                {selectedMeeting.status === "approved" && (
                  <>
                    <Separator />
                    <div className="rounded-lg border border-border p-3">
                      {!showIncidentForm ? (
                        <div className="flex items-center justify-end">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowIncidentForm(true)}>
                            <AlertTriangle className="h-4 w-4" />
                            Báo cáo sự cố
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-sm mb-2">Báo cáo sự cố</p>
                          <div className="space-y-2 pt-2 border-t">
                            <Input placeholder="Tiêu đề" value={incidentTitle} onChange={e => setIncidentTitle(e.target.value)} className="text-sm" />
                            <Textarea placeholder="Mô tả" value={incidentDescription} onChange={e => setIncidentDescription(e.target.value)} rows={2} className="text-sm" />
                            <div className="flex flex-wrap gap-2 items-center">
                              <select value={incidentSeverity} onChange={e => setIncidentSeverity(e.target.value)} className="rounded-md border px-2 py-1.5 text-sm">
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HIGH">Cao</option>
                              </select>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Gửi tới người phụ trách:</Label>
                                <Select value={incidentAssignedToId || "none"} onValueChange={v => setIncidentAssignedToId(v === "none" ? "" : v)}>
                                  <SelectTrigger className="w-[200px] h-8 text-xs">
                                    <SelectValue placeholder="Không chọn" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Không chọn</SelectItem>
                                    {(users as any[]).map((u: any) => (
                                      <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name || u.login}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button size="sm" onClick={() => { if (incidentTitle.trim()) createIncidentMutation.mutate({ meetingId: selectedMeeting.id, reportedById: user?.id!, title: incidentTitle.trim(), description: incidentDescription.trim(), severity: incidentSeverity, assignedToId: incidentAssignedToId || undefined }); }} disabled={createIncidentMutation.isPending || !incidentTitle.trim()}>Gửi</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setShowIncidentForm(false); setIncidentTitle(""); setIncidentDescription(""); setIncidentAssignedToId(""); }}>Hủy</Button>
                            </div>
                          </div>
                        </>
                      )}
                      {meetingIncidents.length > 0 && (
                        <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
                          <p className="text-xs text-muted-foreground">Đã báo cáo ({meetingIncidents.length})</p>
                          {meetingIncidents.map((inc: any) => (
                            <div key={inc.id} className="rounded border bg-muted/30 px-2 py-1.5 text-xs">
                              <p className="font-medium">{inc.title}</p>
                              <p className="text-muted-foreground">{inc.severity} • {inc.reportedBy} • {inc.reportedAt ? new Date(inc.reportedAt).toLocaleString("vi-VN") : ""}{inc.assignedTo ? ` • Gửi tới: ${inc.assignedTo}` : ""}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

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
                              : normalizeLevel(selectedMeeting.level) === "company"
                              ? "Tạo cuộc họp"
                              : "Gửi duyệt"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {canApproveRoom && selectedMeeting.status === "pending" && (
                  <>
                    <Separator />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => approveRoomMutation.mutate(selectedMeeting.id)}>Phê duyệt</Button>
                      <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)}>Từ chối</Button>
                    </div>
                  </>
                )}

                {selectedMeeting.status === "approved" && (String(selectedMeeting.host?.id) === String(user?.id) || String(selectedMeeting.requesterId) === String(user?.id) || String(selectedMeeting.secretaryId) === String(user?.id)) && (
                  <>
                    <Separator />
                    <div className="flex justify-end">
                      <Button onClick={() => setShowCompleteModal(true)} className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Hoàn thành
                      </Button>
                    </div>
                  </>
                )}

                {(selectedMeeting.status === "approved" || selectedMeeting.status === "completed") && (String(selectedMeeting.host?.id) === String(user?.id) || String(selectedMeeting.requesterId) === String(user?.id) || String(selectedMeeting.secretaryId) === String(user?.id)) && (
                  <>
                    <Separator />
                    <div className="rounded-lg border border-border p-3">
                      <p className="font-medium text-sm mb-2 flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Upload biên bản cuộc họp
                      </p>
                      <div className="flex gap-2 flex-wrap items-center mb-3">
                        <Input
                          type="file"
                          multiple
                          className="max-w-xs text-sm"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            if (files.length) setMinutesFiles((prev) => [...prev, ...files]);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          size="sm"
                          disabled={uploadMinutesMutation.isPending || minutesFiles.length === 0}
                          onClick={async () => {
                            if (minutesFiles.length === 0 || !user?.id) return;
                            for (const file of minutesFiles) {
                              const base64 = await new Promise<string>((res, rej) => {
                                const r = new FileReader();
                                r.onload = () => {
                                  const dataUrl = r.result as string;
                                  res(dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl);
                                };
                                r.onerror = rej;
                                r.readAsDataURL(file);
                              });
                              await uploadMinutesMutation.mutateAsync({
                                meetingId: selectedMeeting.id,
                                fileName: file.name,
                                uploadedById: user.id,
                                fileBase64: base64,
                                fileContentType: file.type || "application/octet-stream",
                              });
                            }
                            setMinutesFiles([]);
                          }}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          Tải lên
                        </Button>
                      </div>
                      {minutesFiles.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          <p className="text-xs font-medium text-muted-foreground">File đã chọn:</p>
                          <div className="flex flex-col gap-1">
                            {minutesFiles.map((f, idx) => (
                              <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 text-sm rounded-md border border-border bg-muted/30 px-3 py-2">
                                <span className="truncate flex-1 min-w-0">{f.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setMinutesFiles((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(meetingDocuments as any[]).filter((d: any) => (d.docType || "").toUpperCase() === "MINUTES").length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground">Biên bản đã tải:</p>
                          <div className="flex flex-col gap-1">
                            {(meetingDocuments as any[]).filter((d: any) => (d.docType || "").toUpperCase() === "MINUTES").map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between gap-2 text-sm rounded-md border bg-success/5 border-success/20 px-3 py-2">
                                <span className="truncate flex-1 min-w-0">{d.fileName || "(Không tên)"}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => downloadMeetingDocument(d.id)}>
                                    <Download className="h-3 w-3" /> Tải xuống
                                  </Button>
                                  {(selectedMeeting?.host?.id === user?.id || selectedMeeting?.secretaryId === user?.id) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                      onClick={() => deleteDocumentMutation.mutate(d.id)}
                                      disabled={deleteDocumentMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" /> Xóa
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedMeeting.status === "completed" && (selectedMeeting.host?.id === user?.id || selectedMeeting.secretaryId === user?.id) && (
                  <>
                    <div className="rounded-lg border border-border p-3 mt-2">
                      <p className="font-medium text-sm mb-2">Giao công việc sau họp</p>
                      {!showPostTaskForm ? (
                        <Button size="sm" variant="outline" onClick={() => setShowPostTaskForm(true)}>Thêm công việc sau họp</Button>
                      ) : (
                        <div className="space-y-3">
                          {postTasks.map((task, idx) => (
                            <div key={task.key} className="rounded-md border bg-muted/30 p-2 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground">Công việc #{idx + 1}</p>
                                {postTasks.length > 1 && (
                                  <Button type="button" size="sm" variant="ghost" className="h-7 text-destructive text-xs" onClick={() => removePostTaskRow(task.key)}>Xóa</Button>
                                )}
                              </div>
                              <Input placeholder="Tiêu đề công việc" value={task.title} onChange={e => updatePostTaskRow(task.key, "title", e.target.value)} className="text-sm" />
                              <Input type="datetime-local" placeholder="Hạn" value={task.dueAt} onChange={e => updatePostTaskRow(task.key, "dueAt", e.target.value)} className="text-sm" />
                              <select value={task.assigneeKey} onChange={e => updatePostTaskRow(task.key, "assigneeKey", e.target.value)} className="rounded-md border px-2 py-1.5 text-sm w-full bg-background">
                                <option value="">Chọn người nhận / phòng ban</option>
                                {postTaskAssigneeOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                          <Button type="button" size="sm" variant="outline" onClick={addPostTaskRow}>
                            <Plus className="h-3 w-3 mr-1" /> Tạo thêm task
                          </Button>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={submitAllPostTasks} disabled={createPostTaskMutation.isPending || !postTasks.some(t => t.title.trim())}>Giao việc</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setShowPostTaskForm(false); setPostTasks([{ key: `task-${Date.now()}`, title: "", dueAt: "", assigneeKey: "" }]); }}>Hủy</Button>
                          </div>
                        </div>
                      )}
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

      <Dialog open={showCompleteModal} onOpenChange={(open) => !open && (setShowCompleteModal(false), setCompleteModalMinutesFiles([]))}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle>Hoàn thành cuộc họp</DialogTitle>
                <p className="text-sm text-muted-foreground">Tải biên bản và giao công việc sau họp (tùy chọn), sau đó bấm Hoàn thành cuộc họp.</p>
              </DialogHeader>
              <div className="space-y-6 py-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="font-medium text-sm mb-2 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Tải biên bản cuộc họp
                  </p>
                  <div className="flex gap-2 flex-wrap items-center mb-3">
                    <Input
                      type="file"
                      multiple
                      className="max-w-xs text-sm"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) setCompleteModalMinutesFiles((prev) => [...prev, ...files]);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      disabled={uploadMinutesMutation.isPending || completeModalMinutesFiles.length === 0}
                      onClick={async () => {
                        if (completeModalMinutesFiles.length === 0 || !user?.id) return;
                        for (const file of completeModalMinutesFiles) {
                          const base64 = await new Promise<string>((res, rej) => {
                            const r = new FileReader();
                            r.onload = () => {
                              const dataUrl = r.result as string;
                              res(dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl);
                            };
                            r.onerror = rej;
                            r.readAsDataURL(file);
                          });
                          await uploadMinutesMutation.mutateAsync({
                            meetingId: selectedMeeting.id,
                            fileName: file.name,
                            uploadedById: user.id,
                            fileBase64: base64,
                            fileContentType: file.type || "application/octet-stream",
                          });
                        }
                        setCompleteModalMinutesFiles([]);
                      }}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Tải lên
                    </Button>
                  </div>
                  {completeModalMinutesFiles.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <p className="text-xs font-medium text-muted-foreground">File đã chọn:</p>
                      <div className="flex flex-col gap-1">
                        {completeModalMinutesFiles.map((f, idx) => (
                          <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 text-sm rounded-md border border-border bg-muted/30 px-3 py-2">
                            <span className="truncate flex-1 min-w-0">{f.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setCompleteModalMinutesFiles((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(meetingDocuments as any[]).filter((d: any) => (d.docType || "").toUpperCase() === "MINUTES").length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground">Biên bản đã tải:</p>
                      <div className="flex flex-col gap-1">
                        {(meetingDocuments as any[]).filter((d: any) => (d.docType || "").toUpperCase() === "MINUTES").map((d: any) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 text-sm rounded-md border bg-success/5 border-success/20 px-3 py-2">
                            <span className="truncate flex-1 min-w-0">{d.fileName || "(Không tên)"}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => downloadMeetingDocument(d.id)}>
                                <Download className="h-3 w-3" /> Tải xuống
                              </Button>
                              {(selectedMeeting?.host?.id === user?.id || selectedMeeting?.secretaryId === user?.id) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                  onClick={() => deleteDocumentMutation.mutate(d.id)}
                                  disabled={deleteDocumentMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" /> Xóa
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="font-medium text-sm mb-2">Giao công việc sau họp</p>
                  <div className="space-y-3">
                    {postTasks.map((task, idx) => (
                      <div key={task.key} className="rounded-md border bg-muted/30 p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">Công việc #{idx + 1}</p>
                          {postTasks.length > 1 && (
                            <Button type="button" size="sm" variant="ghost" className="h-7 text-destructive text-xs" onClick={() => removePostTaskRow(task.key)}>Xóa</Button>
                          )}
                        </div>
                        <Input placeholder="Tiêu đề công việc" value={task.title} onChange={e => updatePostTaskRow(task.key, "title", e.target.value)} className="text-sm" />
                        <Input type="datetime-local" placeholder="Hạn" value={task.dueAt} onChange={e => updatePostTaskRow(task.key, "dueAt", e.target.value)} className="text-sm" />
                        <select value={task.assigneeKey} onChange={e => updatePostTaskRow(task.key, "assigneeKey", e.target.value)} className="rounded-md border px-2 py-1.5 text-sm w-full bg-background">
                          <option value="">Chọn người nhận / phòng ban</option>
                          {postTaskAssigneeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" onClick={addPostTaskRow}>
                      <Plus className="h-3 w-3 mr-1" /> Tạo thêm task
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={submitAllPostTasks}
                        disabled={createPostTaskMutation.isPending || !postTasks.some(t => t.title.trim())}
                      >
                        Giao việc
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setShowCompleteModal(false)}>Đóng</Button>
                  <Button
                    onClick={() => completeMutation.mutate(selectedMeeting.id)}
                    disabled={completeMutation.isPending}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {completeMutation.isPending ? "Đang xử lý..." : "Hoàn thành cuộc họp"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!representativesModal} onOpenChange={(open) => !open && setRepresentativesModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Đại diện tham dự
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {representativesModal ? `Phòng ban: ${representativesModal.departmentName}` : ""}
            </p>
          </DialogHeader>
          <div className="py-2">
            {representativesModal?.representativeParticipants?.length ? (
              <ul className="space-y-1.5 text-sm">
                {representativesModal.representativeParticipants.map((rep: any, idx: number) => (
                  <li key={rep.id} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">{idx + 1}</span>
                    {rep.name || "(Không tên)"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có đại diện.</p>
            )}
          </div>
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

      <AlertDialog open={!!deleteConfirmMeeting} onOpenChange={(open) => !open && setDeleteConfirmMeeting(null)}>
        <AlertDialogContent className="max-w-md rounded-xl border-border shadow-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-display font-semibold tracking-tight">
                  Xóa cuộc họp
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Bạn có chắc chắn muốn xóa cuộc họp này? Cuộc họp sẽ được chuyển sang danh sách đã xóa.
                </AlertDialogDescription>
              </div>
            </div>
            {deleteConfirmMeeting && (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{deleteConfirmMeeting.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(deleteConfirmMeeting.startTime).toLocaleString("vi-VN")}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2 sm:justify-end">
            <AlertDialogCancel className="h-11">Hủy</AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-11 gap-2"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (deleteConfirmMeeting) {
                  cancelMutation.mutate(
                    { id: deleteConfirmMeeting.id, status: deleteConfirmMeeting.status },
                    { onSettled: () => setDeleteConfirmMeeting(null) }
                  );
                }
              }}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Xóa cuộc họp
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

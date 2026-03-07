import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MeetingType, MeetingLevel } from "@/data/mockData";
import { meetingTypes as mockTypes, meetingLevels as mockLevels } from "@/data/mockData";
import { useMeetings } from "@/hooks/useMeetings";
import { useRooms } from "@/hooks/useRooms";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/contexts/AuthContext";
import {
  createMeetingFromForm,
  updateMeeting,
  submitMeeting,
  getAgendaItemsByMeeting,
  getParticipantsByMeeting,
  getMeetingTasksByMeeting,
} from "@/services/api/meetings";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Send, Save, RotateCcw, Search, ArrowLeft, Building2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface AgendaForm {
  title: string;
  presenter: string;
  duration: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface TaskAssignmentForm {
  key: string;
  attendee: string;
  assigneeId?: number;
  departmentId?: number;
  title: string;
  description: string;
  dueAt: string;
  remindBeforeMinutes: string;
}

export default function CreateMeetingPage() {
  const { toast } = useToast();
  const { user: account } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: meetingId } = useParams<{ id: string }>();
  const isEditMode = Boolean(meetingId);

  const { data: rooms = [] } = useRooms();
  const { data: users = [] } = useUsers();
  const { data: departments = [] } = useDepartments();

  const isSecretary = account?.authorities?.includes("ROLE_SECRETARY") || false;

  const meetingTypes = mockTypes;
  const meetingLevels = mockLevels.filter(l => {
    if (l.value === "company" && !isSecretary) return false;
    return l.value === "company" || l.value === "department";
  });

  const [step, setStep] = useState(1);
  const [meetingType, setMeetingType] = useState<MeetingType>("offline");
  const [meetingLevel, setMeetingLevel] = useState<MeetingLevel>("department");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isOvernight, setIsOvernight] = useState(false);
  const [chairpersonId, setChairpersonId] = useState("");
  const [secretaryId, setSecretaryId] = useState<string>("");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaForm[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignmentForm[]>([]);
  const [taskModalAttendee, setTaskModalAttendee] = useState<string | null>(null);
  const [taskModalErrors, setTaskModalErrors] = useState<Record<string, string>>({});
  const [taskAssignmentsSnapshot, setTaskAssignmentsSnapshot] = useState<TaskAssignmentForm[] | null>(null);
  const skipNextFilterRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: meetings = [] } = useMeetings();
  const existingMeeting = isEditMode ? meetings.find((m: any) => String(m.id) === String(meetingId)) : null;

  const { data: existingAgendaItems = [] } = useQuery({
    queryKey: ["edit-meeting-agenda", meetingId],
    queryFn: () => getAgendaItemsByMeeting(meetingId!),
    enabled: isEditMode && !!meetingId,
  });

  const { data: existingParticipants = [] } = useQuery({
    queryKey: ["edit-meeting-participants", meetingId],
    queryFn: () => getParticipantsByMeeting(meetingId!),
    enabled: isEditMode && !!meetingId,
  });

  const { data: existingTasks = [] } = useQuery({
    queryKey: ["edit-meeting-tasks", meetingId],
    queryFn: () => getMeetingTasksByMeeting(meetingId!),
    enabled: isEditMode && !!meetingId,
  });

  const userDepartment = account?.department || "";

  const usersByDepartment = useMemo(() => {
    if (meetingLevel === "department") {
      return users.filter((u: any) => u.departmentId === account?.departmentId);
    }
    return users;
  }, [users, meetingLevel, account?.departmentId]);

  useEffect(() => {
    if (!existingMeeting) return;

    setTitle(existingMeeting.title || "");
    setDescription(existingMeeting.description || "");

    const start = new Date(existingMeeting.startTime);
    const end = new Date(existingMeeting.endTime);

    const toLocalDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const toLocalTimeStr = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    setStartDate(toLocalDateStr(start));
    setStartTime(toLocalTimeStr(start));
    setEndTime(toLocalTimeStr(end));

    const startDateStrLocal = toLocalDateStr(start);
    const endDateStrLocal = toLocalDateStr(end);
    if (endDateStrLocal !== startDateStrLocal) {
      setIsOvernight(true);
      setEndDate(endDateStrLocal);
    } else {
      setIsOvernight(false);
      setEndDate("");
    }

    setMeetingType(existingMeeting.type || "offline");
    const levelValue = existingMeeting.level?.toLowerCase() || "department";
    setMeetingLevel(["company", "department", "team"].includes(levelValue) ? (levelValue as MeetingLevel) : "department");
    setSelectedRoom(existingMeeting.roomId || "");
    setMeetingLink(existingMeeting.meetingLink || "");
    setChairpersonId(existingMeeting.host?.id?.toString() || existingMeeting.hostId?.toString() || "");
    setSecretaryId(existingMeeting.secretaryId != null ? String(existingMeeting.secretaryId) : "");
  }, [existingMeeting]);

  useEffect(() => {
    if (!isEditMode) return;

    const mappedAgenda = existingAgendaItems.map((item: any) => ({
      title: item.title || "",
      presenter: item.presenter || "",
      duration: String(item.duration ?? 15),
    }));

    setAgendaItems(prev => {
      const prevStr = JSON.stringify(prev);
      const nextStr = JSON.stringify(mappedAgenda);
      return prevStr === nextStr ? prev : mappedAgenda;
    });
  }, [isEditMode, existingAgendaItems]);

  useEffect(() => {
    if (meetingLevel === "department") {
      setSelectedDepartment(userDepartment);
    } else {
      setSelectedDepartment("");
    }

    if (!isEditMode) {
      setSelectedAttendees([]);
      setSelectedDepartments([]);
      setTaskAssignments([]);
    }
  }, [meetingLevel, userDepartment, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !meetingId || users.length === 0) return;

    const participantAttendees = existingParticipants
      .map((p: any) => {
        const user = users.find((u: any) => String(u.id) === String(p.userId));
        return user?.name || user?.login || p.name;
      })
      .filter(Boolean);

    const participantDepartments = existingParticipants
      .map((p: any) => {
        if (!p.departmentId) return "";
        const dept = departments.find((d: any) => String(d.id) === String(p.departmentId));
        return dept?.name || p.name || "";
      })
      .filter(Boolean);

    const taskAssignmentsFromApi = existingTasks.map((task: any) => {
      const assigneeUser = users.find((u: any) => String(u.id) === String(task.assigneeId));
      const dept = departments.find((d: any) => String(d.id) === String(task.departmentId));
      const attendeeName =
        assigneeUser?.name || assigneeUser?.login || dept?.name || task.assignee;

      const departmentId = task.departmentId != null ? Number(task.departmentId) : undefined;
      const assigneeId = task.assigneeId != null ? Number(task.assigneeId) : undefined;

      return {
        key: `task-${task.id}`,
        attendee: attendeeName ?? "",
        assigneeId,
        departmentId,
        title: task.title || "",
        description: task.description || "",
        dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : "",
        remindBeforeMinutes: task.remindBeforeMinutes != null ? String(task.remindBeforeMinutes) : "",
      } as TaskAssignmentForm;
    });

    const taskAttendees = taskAssignmentsFromApi.map(task => task.attendee).filter(Boolean);
    const mergedAttendees = Array.from(new Set([...participantAttendees, ...taskAttendees]));

    skipNextFilterRef.current = true;

    setSelectedDepartments(prev => {
      const nextDepartments = Array.from(new Set(participantDepartments));
      const same = prev.length === nextDepartments.length && prev.every((v, i) => v === nextDepartments[i]);
      return same ? prev : nextDepartments;
    });

    setSelectedAttendees(prev => {
      const same = prev.length === mergedAttendees.length && prev.every((v, i) => v === mergedAttendees[i]);
      return same ? prev : mergedAttendees;
    });

    setTaskAssignments(prev => {
      const prevStr = JSON.stringify(prev);
      const nextStr = JSON.stringify(taskAssignmentsFromApi);
      return prevStr === nextStr ? prev : taskAssignmentsFromApi;
    });
  }, [isEditMode, meetingId, users, departments, existingParticipants, existingTasks]);

  const steps = [
    { num: 1, label: "Thông tin chung" },
    { num: 2, label: "Thành phần tham dự" },
    { num: 3, label: "Chương trình họp" },
  ];

  const validateStep1 = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    if (!startDate) newErrors.startDate = "Vui lòng chọn ngày";
    if (!startTime) newErrors.startTime = "Vui lòng chọn giờ bắt đầu";
    if (!endTime) newErrors.endTime = "Vui lòng chọn giờ kết thúc";
    if (!chairpersonId) newErrors.chairperson = "Vui lòng chọn người chủ trì";
    if ((meetingType === "offline" || meetingType === "hybrid") && !selectedRoom) newErrors.room = "Vui lòng chọn phòng họp";
    if ((meetingType === "online" || meetingType === "hybrid") && !meetingLink.trim()) newErrors.meetingLink = "Vui lòng nhập link họp";

    if (startDate && startTime && endTime) {
      const start = new Date(`${startDate}T${startTime}:00`);
      let end: Date;

      if (isOvernight && endDate) {
        end = new Date(`${endDate}T${endTime}:00`);
      } else if (!isOvernight) {
        end = new Date(`${startDate}T${endTime}:00`);
        if (end <= start) {
          newErrors.timeRange = "Giờ kết thúc phải sau giờ bắt đầu (họp trong ngày)";
        }
      } else {
        end = new Date(`${startDate}T${endTime}:00`);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (meetingLevel === "company") {
      if (selectedDepartments.length === 0) newErrors.attendees = "Vui lòng chọn ít nhất 1 phòng ban";
    } else {
      if (selectedAttendees.length === 0) newErrors.attendees = "Vui lòng chọn ít nhất 1 người tham dự";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (agendaItems.length === 0) newErrors.agenda = "Vui lòng tạo ít nhất 1 mục chương trình họp";
    agendaItems.forEach((item, i) => {
      if (!item.title.trim()) newErrors[`agenda_title_${i}`] = "Nhập tên nội dung";
      if (!item.presenter) newErrors[`agenda_presenter_${i}`] = "Chọn người trình bày";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkConflicts = () => {
    const found: string[] = [];
    if (selectedRoom) {
      const room = rooms.find((r: any) => r.id === selectedRoom);
      if (room?.status === "occupied") found.push(`Phòng ${room.name} đang được sử dụng`);
      if (room?.status === "maintenance") found.push(`Phòng ${room.name} đang bảo trì`);

      let totalParticipants = selectedAttendees.length;
      if (meetingLevel === "company") {
        totalParticipants = users.filter((u: any) => selectedDepartments.includes(u.department)).length;
      }

      if (room && totalParticipants > room.capacity) {
        found.push(`Số người tham dự (${totalParticipants}) vượt sức chứa phòng (${room.capacity})`);
      }
    }
    setConflicts(found);
  };

  const goToStep = (targetStep: number) => {
    if (targetStep > step) {
      if (step === 1 && !validateStep1()) return;
      if (step === 2 && !validateStep2()) return;
    }
    setErrors({});
    checkConflicts();
    setStep(targetStep);
  };

  const toggleAttendee = (name: string) => {
    setSelectedAttendees(prev => (prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]));
    if (errors.attendees) {
      setErrors(prev => {
        const { attendees, ...rest } = prev;
        return rest;
      });
    }
  };

  useEffect(() => {
    if (skipNextFilterRef.current) {
      skipNextFilterRef.current = false;
      setTaskModalAttendee(prev => (prev && (meetingLevel === "company" ? selectedDepartments : selectedAttendees).includes(prev) ? prev : null));
      return;
    }

    if (meetingLevel === "company") {
      setTaskAssignments(prev => prev.filter(assignment => selectedDepartments.includes(assignment.attendee)));
      setTaskModalAttendee(prev => (prev && selectedDepartments.includes(prev) ? prev : null));
      return;
    }

    setTaskAssignments(prev => prev.filter(assignment => selectedAttendees.includes(assignment.attendee)));
    setTaskModalAttendee(prev => (prev && selectedAttendees.includes(prev) ? prev : null));
  }, [selectedAttendees, selectedDepartments, meetingLevel]);

  const updateTaskAssignment = (
    assignmentKey: string,
    field: "title" | "description" | "dueAt" | "remindBeforeMinutes",
    value: string
  ) => {
    setTaskAssignments(prev => prev.map(assignment => (assignment.key === assignmentKey ? { ...assignment, [field]: value } : assignment)));
  };

  const addTaskForAttendee = (attendee: string) => {
    const assignee = users.find((u: any) => (u.name || u.login) === attendee);
    const selectedDepartmentObj = departments.find((d: any) => d.name === attendee);

    setTaskAssignments(prev => [
      {
        key: `${attendee}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        attendee,
        assigneeId: assignee?.id != null ? Number(assignee.id) : undefined,
        departmentId:
          assignee?.departmentId != null
            ? Number(assignee.departmentId)
            : selectedDepartmentObj?.id != null
            ? Number(selectedDepartmentObj.id)
            : undefined,
        title: "",
        description: "",
        dueAt: "",
        remindBeforeMinutes: "",
      },
      ...prev,
    ]);
  };

  const removeTaskAssignment = (assignmentKey: string) => {
    setTaskAssignments(prev => prev.filter(assignment => assignment.key !== assignmentKey));
  };

  const getTaskCountByAttendee = (attendee: string) => taskAssignments.filter(assignment => assignment.attendee === attendee).length;

  const validateTasksForAttendee = (attendee: string) => {
    const attendeeTasks = taskAssignments.filter(assignment => assignment.attendee === attendee);
    const nextErrors: Record<string, string> = {};

    attendeeTasks.forEach(assignment => {
      if (!assignment.title.trim()) nextErrors[`${assignment.key}-title`] = "Vui lòng nhập tiêu đề task";
      if (!assignment.dueAt) nextErrors[`${assignment.key}-dueAt`] = "Vui lòng chọn hạn xử lý";
      if (!String(assignment.remindBeforeMinutes).trim()) nextErrors[`${assignment.key}-remind`] = "Vui lòng nhập nhắc trước";
    });

    setTaskModalErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeTaskModal = () => {
    if (!taskModalAttendee) return;
    if (validateTasksForAttendee(taskModalAttendee)) {
      setTaskModalAttendee(null);
      setTaskModalErrors({});
      setTaskAssignmentsSnapshot(null);
    }
  };

  const cancelTaskModal = () => {
    if (taskAssignmentsSnapshot) {
      setTaskAssignments(taskAssignmentsSnapshot);
    }
    setTaskModalAttendee(null);
    setTaskModalErrors({});
    setTaskAssignmentsSnapshot(null);
  };

  const openTaskModal = (attendee: string) => {
    setTaskModalErrors({});
    setTaskAssignmentsSnapshot(JSON.parse(JSON.stringify(taskAssignments)));
    setTaskModalAttendee(attendee);
  };

  const toggleDepartment = (deptName: string) => {
    setSelectedDepartments(prev => (prev.includes(deptName) ? prev.filter(d => d !== deptName) : [...prev, deptName]));
    if (errors.attendees) {
      setErrors(prev => {
        const { attendees, ...rest } = prev;
        return rest;
      });
    }
  };

  const addAgendaItem = () => {
    setAgendaItems(prev => [...prev, { title: "", presenter: "", duration: "15" }]);
    if (errors.agenda) {
      setErrors(prev => {
        const { agenda, ...rest } = prev;
        return rest;
      });
    }
  };

  useEffect(() => {
    if (step !== 3 || agendaItems.length > 0 || isEditMode) return;
    const presenters = meetingLevel === "company" ? selectedDepartments : selectedAttendees;
    if (presenters.length === 0) return;
    setAgendaItems(presenters.map(p => ({ title: "", presenter: p, duration: "15" })));
  }, [step, meetingLevel, selectedDepartments, selectedAttendees, isEditMode]);

  const removeAgendaItem = (index: number) => {
    setAgendaItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateAgendaItem = (index: number, field: keyof AgendaForm, value: string) => {
    setAgendaItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const redirectToPlansTab = (tab: "draft" | "pending" | "approved" | "rejected" | "cancelled" | "completed") => {
    const currentSearch = location.search || "";
    navigate(`/plans?tab=${tab}${currentSearch ? `&${currentSearch.replace(/^\?/, "")}` : ""}`);
  };

  const handleClearForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setStartTime("");
    setEndTime("");
    setEndDate("");
    setIsOvernight(false);
    setChairpersonId("");
    setMeetingLink("");
    setSelectedRoom("");
    setMeetingType("offline");
    setMeetingLevel("department");
    setSelectedDepartment(userDepartment);
    setSelectedAttendees([]);
    setSelectedDepartments([]);
    setTaskAssignments([]);
    setAgendaItems([]);
    setConflicts([]);
    setErrors({});
    setStep(1);
    toast({ title: "Đã xóa", description: "Tất cả dữ liệu đã được xóa." });
  };

  const buildParticipantsPayload = () => {
    if (meetingLevel === "company") {
      return selectedDepartments
        .map(deptName => {
          const dept = departments.find((d: any) => d.name === deptName);
          if (!dept?.id) return null;
          return { departmentId: Number(dept.id), isRequired: true };
        })
        .filter(Boolean) as { departmentId: number; isRequired: boolean }[];
    }

    return selectedAttendees
      .map((login: string) => {
        const user = users.find((u: any) => (u.name || u.login) === login);
        if (user?.id == null) return null;
        return { userId: Number(user.id), isRequired: true };
      })
      .filter(Boolean) as { userId: number; isRequired: boolean }[];
  };

  const buildAgendaPayload = () =>
    agendaItems.map(item => ({
      title: item.title,
      presenter: item.presenter,
      duration: parseInt(item.duration) || 15,
    }));

  const resolveOrganizerDepartmentId = () => {
    if (meetingLevel === "department" && account?.departmentId != null) {
      return Number(account.departmentId);
    }

    const selectedDeptName = selectedDepartment || userDepartment;
    if (selectedDeptName) {
      const selectedDept = departments.find((d: any) => d.name === selectedDeptName);
      if (selectedDept?.id != null) return Number(selectedDept.id);
    }

    return departments[0]?.id != null ? Number(departments[0].id) : undefined;
  };

  const buildTaskAndDocumentPayload = () => {
    const tasks = taskAssignments
      .map(assignment => {
        const assignee = users.find((u: any) => (u.name || u.login) === assignment.attendee);
        const mappedDepartment = departments.find((d: any) => d.name === assignment.attendee);
        if (!assignment.title.trim()) return null;

        const departmentId =
          assignment.departmentId ??
          (assignee?.departmentId != null ? Number(assignee.departmentId) : mappedDepartment?.id != null ? Number(mappedDepartment.id) : undefined);

        return {
          clientKey: assignment.key,
          type: "PRE_MEETING" as const,
          title: assignment.title.trim(),
          description: assignment.description?.trim() || undefined,
          dueAt: assignment.dueAt ? new Date(assignment.dueAt).toISOString() : undefined,
          status: "TODO" as const,
          remindBeforeMinutes: assignment.remindBeforeMinutes ? Number(assignment.remindBeforeMinutes) : undefined,
          assigneeId: assignee?.id != null ? Number(assignee.id) : undefined,
          assignedById: Number(account?.id),
          departmentId,
        };
      })
      .filter(Boolean) as any[];

    const documents = [];
    return { tasks, documents };
  };

  const handleSaveDraft = async () => {
    if (!validateStep1()) return;
    if (!account?.id) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không xác định được người yêu cầu (requester)." });
      return;
    }
    if (!chairpersonId) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn người chủ trì." });
      return;
    }

    try {
      const { tasks, documents } = buildTaskAndDocumentPayload();
      const organizerDepartmentId = resolveOrganizerDepartmentId();

      await createMeetingFromForm({
        title,
        description,
        startDate,
        startTime,
        endTime,
        endDate: isOvernight ? endDate : undefined,
        meetingType,
        meetingLevel,
        selectedRoomId: selectedRoom || undefined,
        meetingLink,
        requesterId: account.id,
        hostId: chairpersonId,
        secretaryId: secretaryId || undefined,
        organizerDepartmentId,
        participants: buildParticipantsPayload(),
        agendaItems: buildAgendaPayload(),
        tasks,
        documents,
        submitAfterCreate: false,
      });
      toast({ title: "Đã lưu nháp", description: "Cuộc họp đã được lưu ở trạng thái nháp." });
      redirectToPlansTab("draft");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Lỗi lưu nháp",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => updateMeeting(data.id, data.payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Đã cập nhật", description: "Cuộc họp đã được cập nhật thành công." });
      const currentStatus = existingMeeting?.status ?? "draft";
      redirectToPlansTab(currentStatus === "pending" ? "pending" : "draft");
    },
    onError: err => {
      toast({ variant: "destructive", title: "Lỗi cập nhật", description: err instanceof Error ? err.message : "Lỗi không xác định" });
    },
  });

  const handleSubmit = async (submitAfterUpdate = false) => {
    if (!validateStep3()) return;
    checkConflicts();
    if (!account?.id) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không xác định được người yêu cầu (requester)." });
      return;
    }
    if (!chairpersonId) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn người chủ trì." });
      return;
    }

    try {
      const { tasks, documents } = buildTaskAndDocumentPayload();
      const participants = buildParticipantsPayload();
      const agendaPayload = buildAgendaPayload();
      const organizerDepartmentId = resolveOrganizerDepartmentId();

      if (isEditMode && meetingId) {
        await updateMutation.mutateAsync({
          id: meetingId,
          payload: {
            title,
            description,
            startDate,
            startTime,
            endTime,
            endDate: isOvernight ? endDate : undefined,
            meetingType,
            meetingLevel,
            selectedRoomId: selectedRoom || undefined,
            meetingLink,
            requesterId: account.id,
            hostId: chairpersonId,
            secretaryId: secretaryId || undefined,
            organizerDepartmentId,
            participants,
            agendaItems: agendaPayload,
            tasks,
            documents,
          },
        });

        if (submitAfterUpdate) {
          await submitMeeting(meetingId);
          queryClient.invalidateQueries({ queryKey: ["meetings"] });
          if (meetingLevel === "company") {
            toast({ title: "Tạo cuộc họp thành công", description: "Cuộc họp cấp tổng công ty đã được tự động duyệt." });
            redirectToPlansTab("approved");
          } else {
            toast({ title: "Đã gửi duyệt", description: "Cuộc họp đã được cập nhật và gửi phê duyệt." });
            redirectToPlansTab("pending");
          }
        }
      } else {
        const created = await createMeetingFromForm({
          title,
          description,
          startDate,
          startTime,
          endTime,
          endDate: isOvernight ? endDate : undefined,
          meetingType,
          meetingLevel,
          selectedRoomId: selectedRoom || undefined,
          meetingLink,
          requesterId: account.id,
          hostId: chairpersonId,
          secretaryId: secretaryId || undefined,
          organizerDepartmentId,
          participants,
          agendaItems: agendaPayload,
          tasks,
          documents,
          submitAfterCreate: true,
        });
        if (created?.id != null) {
          if (meetingLevel === "company") {
            toast({ title: "Tạo cuộc họp thành công", description: "Cuộc họp cấp tổng công ty đã được tự động duyệt." });
            redirectToPlansTab("approved");
          } else {
            toast({ title: "Đã gửi duyệt", description: "Cuộc họp đã được tạo và gửi phê duyệt." });
            redirectToPlansTab("pending");
          }
        }
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: isEditMode ? "Lỗi cập nhật" : "Lỗi tạo cuộc họp",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    }
  };

  const filteredUsers = usersByDepartment.filter((u: any) => u.name.toLowerCase().includes(attendeeSearch.toLowerCase()));
  const errorClass = (field: string) => (errors[field] ? "border-destructive" : "");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEditMode && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/plans")} className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">{isEditMode ? "Chỉnh sửa cuộc họp" : "Tạo cuộc họp mới"}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isEditMode ? "Cập nhật thông tin cuộc họp" : "Điền thông tin để tạo và gửi phê duyệt cuộc họp"}</p>
          </div>
        </div>
        {!isEditMode && (
          <Button variant="outline" onClick={handleClearForm} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Xóa dữ liệu
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => goToStep(s.num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                step === s.num ? "bg-primary text-primary-foreground shadow-sm" : step > s.num ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-bold">{step > s.num ? "✓" : s.num}</span>
              {s.label}
            </button>
            {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {conflicts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive">Phát hiện xung đột</p>
                <ul className="mt-1 space-y-0.5 text-xs text-destructive/80">
                  {conflicts.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="card-elevated animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base font-display">Thông tin chung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tiêu đề cuộc họp *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nhập tiêu đề cuộc họp" className={`mt-1.5 ${errorClass("title")}`} />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hình thức họp *</Label>
                <Select value={meetingType} onValueChange={v => setMeetingType(v as MeetingType)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meetingTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cấp họp *</Label>
                <Select value={meetingLevel} onValueChange={v => setMeetingLevel(v as MeetingLevel)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meetingLevels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Ngày *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (isOvernight && e.target.value) {
                      const nextDay = new Date(e.target.value);
                      nextDay.setDate(nextDay.getDate() + 1);
                      setEndDate(nextDay.toISOString().split("T")[0]);
                    }
                  }}
                  className={`mt-1.5 ${errorClass("startDate")}`}
                />
                {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <Label>Bắt đầu *</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={`mt-1.5 ${errorClass("startTime")}`} />
                {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime}</p>}
              </div>
              <div>
                <Label>Kết thúc *</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={`mt-1.5 ${errorClass("endTime")}`} />
                {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime}</p>}
                {errors.timeRange && <p className="text-xs text-destructive mt-1">{errors.timeRange}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOvernight"
                checked={isOvernight}
                onChange={e => {
                  const checked = e.target.checked;
                  setIsOvernight(checked);
                  if (checked && startDate) {
                    const nextDay = new Date(startDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                    setEndDate(nextDay.toISOString().split("T")[0]);
                  } else if (!checked) {
                    setEndDate("");
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isOvernight" className="text-sm font-normal cursor-pointer">Họp qua đêm (sang ngày hôm sau)</Label>
            </div>

            {isOvernight && (
              <div>
                <Label>Ngày kết thúc (tự động)</Label>
                <Input type="date" value={endDate} disabled className="mt-1.5 bg-muted cursor-not-allowed" />
              </div>
            )}

            {(meetingType === "offline" || meetingType === "hybrid") && (
              <div>
                <Label>Phòng họp *</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger className={`mt-1.5 ${errorClass("room")}`}><SelectValue placeholder="Chọn phòng họp" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((r: { id: string; name: string; capacity: number; status: string }) => (
                      <SelectItem key={r.id} value={r.id} disabled={r.status !== "available"}>
                        {r.name} ({r.capacity} người) {r.status !== "available" ? `- ${r.status === "occupied" ? "Đang sử dụng" : "Bảo trì"}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.room && <p className="text-xs text-destructive mt-1">{errors.room}</p>}
              </div>
            )}

            {(meetingType === "online" || meetingType === "hybrid") && (
              <div>
                <Label>Link họp trực tuyến *</Label>
                <Input value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet.example.com/..." className={`mt-1.5 ${errorClass("meetingLink")}`} />
                {errors.meetingLink && <p className="text-xs text-destructive mt-1">{errors.meetingLink}</p>}
              </div>
            )}

            <div>
              <Label>Người chủ trì *</Label>
              <Select value={chairpersonId} onValueChange={setChairpersonId}>
                <SelectTrigger className={`mt-1.5 ${errorClass("chairperson")}`}><SelectValue placeholder="Chọn người chủ trì" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {(u.name || u.login) + (u.position ? ` - ${u.position}` : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.chairperson && <p className="text-xs text-destructive mt-1">{errors.chairperson}</p>}
            </div>

            <div>
              <Label>Thư ký cuộc họp</Label>
              <Select value={secretaryId || "none"} onValueChange={v => setSecretaryId(v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Chọn thư ký (tùy chọn)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không chọn</SelectItem>
                  {users.filter((u: any) => u.role === "secretary").map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {(u.name || u.login) + (u.position ? ` - ${u.position}` : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nội dung, mục tiêu</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả nội dung và mục tiêu cuộc họp" className="mt-1.5" rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="card-elevated animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base font-display">
              <div className="flex items-center gap-2">
                {meetingLevel === "company" ? (
                  <>
                    <Building2 className="h-5 w-5" />
                    <span>Chọn phòng ban tham dự (Cấp Tổng công ty)</span>
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    <span>Chọn người tham dự (Cấp Phòng ban - {userDepartment})</span>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.attendees && <p className="text-sm text-destructive font-medium">{errors.attendees}</p>}

            {meetingLevel === "company" ? (
              <>
                <div className="text-sm text-muted-foreground mb-2">Chọn các phòng ban tham gia cuộc họp:</div>
                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                  {departments.map((d: any) => (
                    <button
                      key={d.id}
                      onClick={() => toggleDepartment(d.name)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${
                        selectedDepartments.includes(d.name) ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Checkbox checked={selectedDepartments.includes(d.name)} />
                      <div>
                        <p className="font-medium text-xs">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground">{users.filter((u: any) => u.departmentId != null && String(u.departmentId) === String(d.id)).length} nhân viên</p>
                      </div>
                      {selectedDepartments.includes(d.name) && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                    </button>
                  ))}
                  {departments.length === 0 && <p className="col-span-2 text-center text-sm text-muted-foreground py-4">Không có phòng ban nào</p>}
                </div>

                {selectedDepartments.length > 0 && (
                  <>
                    <div>
                      <Label>Đã chọn ({selectedDepartments.length} phòng ban)</Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedDepartments.map(d => (
                          <Badge key={d} variant="secondary" className="cursor-pointer" onClick={() => toggleDepartment(d)}>
                            {d} ×
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Tổng số người tham dự dự kiến: {users.filter((u: any) => {
                          const d = departments.find((dept: any) => String(dept.id) === String(u.departmentId));
                          return d != null && selectedDepartments.includes(d.name);
                        }).length}
                      </p>
                    </div>

                    <div>
                      <Label>Giao task theo phòng ban</Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedDepartments.map(d => {
                          const count = getTaskCountByAttendee(d);
                          return (
                            <div key={d} className="rounded-xl border bg-secondary/20 px-4 py-3 flex items-center justify-between gap-3 w-full">
                              <div>
                                <p className="text-sm font-semibold">{d}</p>
                                <p className="text-xs text-muted-foreground">{count > 0 ? `Đã giao ${count} task` : "Chưa giao task"}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {count > 0 && <Badge variant="outline">{count}</Badge>}
                                <Button size="sm" onClick={() => openTaskModal(d)}>
                                  <Plus className="h-4 w-4 mr-1" /> Giao task
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm người tham dự theo tên..."
                    value={attendeeSearch}
                    onChange={e => setAttendeeSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {filteredUsers.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => toggleAttendee(u.name || u.login)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${
                        selectedAttendees.includes(u.name || u.login) ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                        {u.name?.split(" ")?.[0]?.[0] || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-xs">{u.name || u.login}</p>
                        <p className="text-[10px] text-muted-foreground">{[u.position, u.department].filter(Boolean).join(" • ") || "—"}</p>
                      </div>
                      {selectedAttendees.includes(u.name || u.login) && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="col-span-2 text-center text-sm text-muted-foreground py-4">
                      {userDepartment ? `Không có nhân viên nào trong phòng ban ${userDepartment}` : "Vui lòng chọn phòng ban của bạn trong hồ sơ"}
                    </p>
                  )}
                </div>

                {selectedAttendees.length > 0 && (
                  <>
                    <div>
                      <Label>Đã chọn ({selectedAttendees.length})</Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedAttendees.map(a => {
                          const count = getTaskCountByAttendee(a);
                          return (
                            <div key={a} className="rounded-xl border bg-secondary/20 px-4 py-3 flex items-center justify-between gap-3 w-full">
                              <div>
                                <p className="text-sm font-semibold">{a}</p>
                                <p className="text-xs text-muted-foreground">{count > 0 ? `Đã giao ${count} task` : "Chưa giao task"}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {count > 0 && <Badge variant="outline">{count}</Badge>}
                                <Button size="sm" onClick={() => openTaskModal(a)}>
                                  <Plus className="h-4 w-4 mr-1" /> Giao task
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAttendee(a)}>
                                  ×
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>


                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!taskModalAttendee} onOpenChange={open => !open && cancelTaskModal()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Giao task theo cấu trúc hệ thống {taskModalAttendee ? `- ${taskModalAttendee}` : ""}</DialogTitle>
          </DialogHeader>

          {taskModalAttendee && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mt-1">
                Mỗi người/phòng ban có thể có nhiều task. Trạng thái task sẽ tự động là TODO khi tạo. Tài liệu do người được giao task tải lên sau.
              </p>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => addTaskForAttendee(taskModalAttendee)}>
                  <Plus className="h-3 w-3 mr-1" /> Thêm task
                </Button>
              </div>

              <div className="space-y-3">
                {taskAssignments
                  .filter(assignment => assignment.attendee === taskModalAttendee)
                  .map((assignment, taskIndex, list) => (
                    <div key={assignment.key} className="rounded-md border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Task #{taskIndex + 1}</p>
                        {list.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTaskAssignment(assignment.key)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs">Tiêu đề task</Label>
                        <Input placeholder="Nhập tiêu đề task" value={assignment.title} onChange={e => updateTaskAssignment(assignment.key, "title", e.target.value)} className="mt-1" />
                        {taskModalErrors[`${assignment.key}-title`] && <p className="text-xs text-destructive mt-1">{taskModalErrors[`${assignment.key}-title`]}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Hạn xử lý (due_at)</Label>
                          <Input type="datetime-local" value={assignment.dueAt} onChange={e => updateTaskAssignment(assignment.key, "dueAt", e.target.value)} className="mt-1" />
                          {taskModalErrors[`${assignment.key}-dueAt`] && <p className="text-xs text-destructive mt-1">{taskModalErrors[`${assignment.key}-dueAt`]}</p>}
                        </div>
                        <div>
                          <Label className="text-xs">Nhắc trước (phút)</Label>
                          <Input type="number" min={0} placeholder="VD: 30" value={assignment.remindBeforeMinutes} onChange={e => updateTaskAssignment(assignment.key, "remindBeforeMinutes", e.target.value)} className="mt-1" />
                          {taskModalErrors[`${assignment.key}-remind`] && <p className="text-xs text-destructive mt-1">{taskModalErrors[`${assignment.key}-remind`]}</p>}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Mô tả</Label>
                        <Textarea placeholder="Mô tả chi tiết task" value={assignment.description} onChange={e => updateTaskAssignment(assignment.key, "description", e.target.value)} rows={2} className="mt-1" />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cancelTaskModal}>Thoát</Button>
                <Button onClick={completeTaskModal}>Xong</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {step === 3 && (
        <Card className="card-elevated animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Chương trình họp (Agenda)</CardTitle>
            <Button variant="outline" size="sm" onClick={addAgendaItem}>
              <Plus className="h-4 w-4 mr-1" /> Thêm mục
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {errors.agenda && <p className="text-sm text-destructive font-medium">{errors.agenda}</p>}
            {agendaItems.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">Chưa có mục nào. Nhấn "Thêm mục" để bắt đầu.</div>}
            {agendaItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-secondary/20">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-1">{i + 1}</span>
                <div className="flex-1 space-y-2">
                  <div>
                    <Input placeholder="Tên nội dung" value={item.title} onChange={e => updateAgendaItem(i, "title", e.target.value)} className={errorClass(`agenda_title_${i}`)} />
                    {errors[`agenda_title_${i}`] && <p className="text-xs text-destructive mt-1">{errors[`agenda_title_${i}`]}</p>}
                  </div>
                    <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Select value={item.presenter} onValueChange={v => updateAgendaItem(i, "presenter", v)}>
                        <SelectTrigger className={errorClass(`agenda_presenter_${i}`)}><SelectValue placeholder={meetingLevel === "company" ? "Đơn vị trình bày" : "Người trình bày"} /></SelectTrigger>
                        <SelectContent>
                          {meetingLevel === "company"
                            ? selectedDepartments.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)
                            : selectedAttendees.map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors[`agenda_presenter_${i}`] && <p className="text-xs text-destructive mt-1">{errors[`agenda_presenter_${i}`]}</p>}
                    </div>
                    <Input type="number" placeholder="Thời lượng (phút)" value={item.duration} onChange={e => updateAgendaItem(i, "duration", e.target.value)} />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeAgendaItem(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Quay lại</Button>
        <div className="flex gap-2">
          {!isEditMode && (
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-1.5" /> Lưu nháp
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => goToStep(step + 1)}>Tiếp theo</Button>
          ) : isEditMode ? (
            <>
              <Button variant="outline" onClick={() => handleSubmit(false)}>
                <Save className="h-4 w-4 mr-1.5" /> Cập nhật
              </Button>
              {existingMeeting?.status !== "pending" && (
                <Button onClick={() => handleSubmit(true)}>
                  <Send className="h-4 w-4 mr-1.5" /> {meetingLevel === "company" ? "Tạo cuộc họp" : "Gửi duyệt"}
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => handleSubmit(false)}>
              {meetingLevel === "company" ? (
                <>
                  <Send className="h-4 w-4 mr-1.5" /> Tạo cuộc họp
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" /> Gửi duyệt
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

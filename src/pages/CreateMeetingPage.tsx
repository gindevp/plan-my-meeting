import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MeetingType, MeetingLevel } from "@/data/mockData";
import { meetingTypes as mockTypes, meetingLevels as mockLevels } from "@/data/mockData";
import { useMeetings } from "@/hooks/useMeetings";
import { useRooms, useRoomEquipments } from "@/hooks/useRooms";
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
import { Plus, Trash2, AlertTriangle, CheckCircle2, Send, Save, RotateCcw, Search, ArrowLeft, Building2, Users, MapPin, ChevronDown, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { countChairsInLayout } from "@/lib/roomLayoutTemplates";
import { API_BASE } from "@/lib/api";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ROOM_TYPES } from "@/services/api/rooms";

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
  const { data: roomEquipments = [] } = useRoomEquipments();
  const roomsWithEquipment = useMemo(() => {
    return (rooms as any[]).map((r: any) => {
      const eq = roomEquipments.find((re: any) => String(re.roomId) === String(r.id));
      return { ...r, equipment: eq?.equipment ?? [] };
    });
  }, [rooms, roomEquipments]);

  const { data: users = [] } = useUsers();
  const { data: departments = [] } = useDepartments();

  const isSecretary = account?.authorities?.includes("ROLE_SECRETARY") || false;
  const isAdmin = account?.authorities?.includes("ROLE_ADMIN") ?? false;

  const meetingTypes = mockTypes;
  const meetingLevels = mockLevels.filter(l => {
    if (l.value === "company" && !isSecretary && !isAdmin) return false;
    return l.value === "company" || l.value === "department";
  });

  const [step, setStep] = useState(1);
  const [meetingType, setMeetingType] = useState<MeetingType>("offline");
  const [meetingLevel, setMeetingLevel] = useState<MeetingLevel>("department");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [chairpersonId, setChairpersonId] = useState("");
  const [secretaryId, setSecretaryId] = useState<string>("");
  const [chairpersonOpen, setChairpersonOpen] = useState(false);
  const [secretaryOpen, setSecretaryOpen] = useState(false);
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
  const [roomDetailDialog, setRoomDetailDialog] = useState<any>(null);
  const skipNextFilterRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: meetings = [] } = useMeetings();
  const existingMeeting = isEditMode ? meetings.find((m: any) => String(m.id) === String(meetingId)) : null;

  const userDepartmentId = account?.departmentId != null ? String(account.departmentId) : null;

  const banLanhDaoDepartmentId = useMemo(() => {
    const dept = (departments as any[]).find(
      (d: any) =>
        String(d.code).toUpperCase() === "PB003" ||
        String(d.name).toLowerCase() === "ban lãnh đạo" ||
        String(d.name).toLowerCase() === "ban lanh dao"
    );
    return dept ? String(dept.id) : null;
  }, [departments]);

  const chairpersonCandidates = useMemo(() => {
    const list = users as any[];
    const lower = (s?: string) => (s || "").toLowerCase();
    const nonStaffNonSecretary = (u: any) => {
      const pos = lower(u.position);
      if (!pos) return true;
      return !pos.includes("nhân viên") && !pos.includes("thư ký");
    };
    if (meetingLevel === "department" && userDepartmentId) {
      return list.filter(
        (u: any) => String(u.departmentId) === userDepartmentId && nonStaffNonSecretary(u)
      );
    }
    if (meetingLevel === "company" && banLanhDaoDepartmentId) {
      return list.filter((u: any) => String(u.departmentId) === banLanhDaoDepartmentId && nonStaffNonSecretary(u));
    }
    return list;
  }, [users, meetingLevel, userDepartmentId, banLanhDaoDepartmentId]);

  const secretaryCandidates = useMemo(() => {
    const list = users as any[];
    const lower = (s?: string) => (s || "").toLowerCase();
    const isSecretaryPosition = (u: any) => lower(u.position).includes("thư ký");
    if (meetingLevel === "department" && userDepartmentId) {
      return list.filter(
        (u: any) => String(u.departmentId) === userDepartmentId && isSecretaryPosition(u)
      );
    }
    if (meetingLevel === "company" && banLanhDaoDepartmentId) {
      return list.filter(
        (u: any) => String(u.departmentId) === banLanhDaoDepartmentId && isSecretaryPosition(u)
      );
    }
    // fallback: dùng ROLE_SECRETARY hiện tại
    return list.filter((u: any) => u.role === "secretary");
  }, [users, meetingLevel, userDepartmentId, banLanhDaoDepartmentId]);

  // Khi đổi cấp họp, nếu chủ trì / thư ký hiện tại không còn thuộc danh sách hợp lệ thì reset lại
  useEffect(() => {
    if (chairpersonId && !chairpersonCandidates.some((u: any) => String(u.id) === String(chairpersonId))) {
      setChairpersonId("");
    }
    if (secretaryId && !secretaryCandidates.some((u: any) => String(u.id) === String(secretaryId))) {
      setSecretaryId("");
    }
  }, [meetingLevel, chairpersonId, secretaryId, chairpersonCandidates, secretaryCandidates]);

  // Auto-chọn thư ký: luôn lấy candidate đầu tiên (nếu có) cho cấp hiện tại, không cho sửa ở UI
  useEffect(() => {
    if (isEditMode) return;
    if (secretaryCandidates.length === 0) {
      setSecretaryId("");
      return;
    }
    const first = secretaryCandidates[0] as any;
    if (!secretaryId || !secretaryCandidates.some((u: any) => String(u.id) === String(secretaryId))) {
      setSecretaryId(String(first.id));
    }
  }, [isEditMode, meetingLevel, secretaryId, secretaryCandidates]);

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

    setStartDateTime(`${toLocalDateStr(start)}T${toLocalTimeStr(start)}`);
    setEndDateTime(`${toLocalDateStr(end)}T${toLocalTimeStr(end)}`);

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

  const getMinNowString = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}T${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  };

  const [minStartDateTime, setMinStartDateTime] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}T${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  });

  const validateStep1 = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    if (!startDateTime) newErrors.startDateTime = "Vui lòng chọn ngày giờ bắt đầu";
    if (!endDateTime) newErrors.endDateTime = "Vui lòng chọn ngày giờ kết thúc";
    if (!chairpersonId) newErrors.chairperson = "Vui lòng chọn người chủ trì";
    if ((meetingType === "offline" || meetingType === "hybrid") && !selectedRoom) newErrors.room = "Vui lòng chọn phòng họp";
    if ((meetingType === "online" || meetingType === "hybrid") && !meetingLink.trim()) newErrors.meetingLink = "Vui lòng nhập link họp";

    const now = Date.now();
    if (startDateTime) {
      const start = new Date(startDateTime).getTime();
      if (start < now - 60 * 1000) {
        newErrors.startDateTime = "Không được chọn thời gian trong quá khứ";
      }
    }
    if (endDateTime) {
      const end = new Date(endDateTime).getTime();
      if (end < now - 60 * 1000) {
        newErrors.endDateTime = "Không được chọn thời gian kết thúc trong quá khứ";
      }
    }
    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);
      if (end <= start) {
        newErrors.timeRange = "Ngày giờ kết thúc phải sau ngày giờ bắt đầu";
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

    // Kiểm tra sức chứa phòng khi có chọn phòng (offline/hybrid)
    if ((meetingType === "offline" || meetingType === "hybrid") && selectedRoom) {
      const room = rooms.find((r: any) => r.id === selectedRoom);
      const totalParticipants = meetingLevel === "company"
        ? users.filter((u: any) => {
            const d = departments.find((dept: any) => String(dept.id) === String(u.departmentId));
            return d != null && selectedDepartments.includes(d.name);
          }).length
        : selectedAttendees.length;
      if (room && totalParticipants > room.capacity) {
        newErrors.capacity = `Số người tham dự (${totalParticipants}) vượt sức chứa phòng (${room.capacity}). Vui lòng giảm số người hoặc chọn phòng khác.`;
      }
      const layoutChairs = room?.layoutData ? countChairsInLayout(room.layoutData) : 0;
      if (layoutChairs > 0 && totalParticipants > layoutChairs) {
        newErrors.capacity = newErrors.capacity || `Số người tham dự (${totalParticipants}) lớn hơn số ghế trong layout phòng (${layoutChairs}). Vui lòng giảm số người hoặc chọn phòng khác.`;
      }
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
    const meetingMinutes = getMeetingDurationMinutes();
    const totalAgenda = agendaItems.reduce((sum, item) => sum + (parseInt(item.duration, 10) || 0), 0);
    if (agendaItems.length > 0 && meetingMinutes > 0 && totalAgenda > meetingMinutes) {
      newErrors.agendaDuration =
        `Tổng thời lượng chương trình họp (${totalAgenda} phút) vượt quá thời lượng cuộc họp (${meetingMinutes} phút). Vui lòng điều chỉnh.`;
    }
    // Người trình bày bắt buộc phải nằm trong thành phần tham dự (chủ trì, thư ký, hoặc danh sách mời)
    const allowedNames = new Set<string>();
    const addName = (raw: string) => {
      const n = (raw ?? "").trim().toLowerCase();
      if (n) allowedNames.add(n);
    };
    const hostUser = users.find((u: any) => String(u.id) === String(chairpersonId));
    if (hostUser) {
      addName(hostUser.name ?? hostUser.login);
    }
    if (secretaryId) {
      const sec = users.find((u: any) => String(u.id) === String(secretaryId));
      if (sec) addName(sec.name ?? sec.login);
    }
    selectedAttendees.forEach((a: string) => addName(a));
    selectedDepartments.forEach((d: string) => addName(d));
    const presentersNotInList: string[] = [];
    agendaItems.forEach((item) => {
      const p = (item.presenter ?? "").trim();
      if (!p) return;
      if (!allowedNames.has(p.toLowerCase())) presentersNotInList.push(p);
    });
    if (presentersNotInList.length > 0) {
      const uniq = [...new Set(presentersNotInList)];
      newErrors.agendaPresenterNotAttendee =
        `Người trình bày bắt buộc phải tham dự cuộc họp. Các tên sau chưa có trong thành phần tham dự: ${uniq.join(", ")}. Vui lòng thêm vào danh sách tham dự hoặc chọn người trình bày khác.`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  function getMeetingDurationMinutes(): number {
    if (!startDateTime || !endDateTime) return 0;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (end <= start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / (60 * 1000));
  }

  const checkConflicts = () => {
    const found: string[] = [];
    if (selectedRoom) {
      const room = rooms.find((r: any) => r.id === selectedRoom);
      if (room?.status === "occupied") found.push(`Phòng ${room.name} đang được sử dụng`);
      if (room?.status === "maintenance") found.push(`Phòng ${room.name} đang bảo trì`);
      if (room?.status === "disabled") found.push(`Phòng ${room.name} đang ngừng sử dụng`);

      let totalParticipants = selectedAttendees.length;
      if (meetingLevel === "company") {
        totalParticipants = users.filter((u: any) => selectedDepartments.includes(u.department)).length;
      }

      if (room && totalParticipants > room.capacity) {
        found.push(`Số người tham dự (${totalParticipants}) vượt sức chứa phòng (${room.capacity})`);
      }
      const layoutChairs = room?.layoutData ? countChairsInLayout(room.layoutData) : 0;
      if (layoutChairs > 0 && totalParticipants > layoutChairs) {
        found.push(`Số người tham dự (${totalParticipants}) lớn hơn số ghế trong layout phòng (${layoutChairs})`);
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
    if (errors.attendees || errors.capacity) {
      setErrors(prev => {
        const { attendees, capacity, ...rest } = prev;
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
    const now = new Date();
    const meetingStart = startDateTime ? new Date(startDateTime) : null;

    attendeeTasks.forEach(assignment => {
      if (!assignment.title.trim()) nextErrors[`${assignment.key}-title`] = "Vui lòng nhập tiêu đề task";
      if (!assignment.dueAt) {
        nextErrors[`${assignment.key}-dueAt`] = "Vui lòng chọn hạn xử lý";
      } else {
        const due = new Date(assignment.dueAt);
        if (due <= now) nextErrors[`${assignment.key}-dueAt`] = "Thời hạn giao task phải sau thời gian hiện tại.";
        else if (meetingStart && due >= meetingStart) nextErrors[`${assignment.key}-dueAt`] = "Thời hạn giao task phải trước thời gian bắt đầu cuộc họp.";
      }
      const remindVal = Number(assignment.remindBeforeMinutes);
      if (!String(assignment.remindBeforeMinutes).trim()) nextErrors[`${assignment.key}-remind`] = "Vui lòng nhập nhắc trước";
      else if (Number.isNaN(remindVal) || remindVal < 1) nextErrors[`${assignment.key}-remind`] = "Nhắc trước phải lớn hơn 0 (phút).";
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
    if (errors.attendees || errors.capacity) {
      setErrors(prev => {
        const { attendees, capacity, ...rest } = prev;
        return rest;
      });
    }
  };

  const addAgendaItem = () => {
    setAgendaItems(prev => [...prev, { title: "", presenter: "", duration: "15" }]);
    if (errors.agenda || errors.agendaDuration || errors.agendaPresenterNotAttendee) {
      setErrors(prev => {
        const { agenda, agendaDuration, agendaPresenterNotAttendee, ...rest } = prev;
        return rest;
      });
    }
  };

  const removeAgendaItem = (index: number) => {
    setAgendaItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateAgendaItem = (index: number, field: keyof AgendaForm, value: string) => {
    setAgendaItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    if (field === "duration" && errors.agendaDuration) {
      setErrors(prev => {
        const { agendaDuration, ...rest } = prev;
        return rest;
      });
    }
    if ((field === "presenter" || field === "title") && errors.agendaPresenterNotAttendee) {
      setErrors(prev => {
        const { agendaPresenterNotAttendee, ...rest } = prev;
        return rest;
      });
    }
  };

  const redirectToPlansTab = (tab: "draft" | "pending" | "approved" | "rejected" | "cancelled" | "completed") => {
    const currentSearch = location.search || "";
    navigate(`/plans?tab=${tab}${currentSearch ? `&${currentSearch.replace(/^\?/, "")}` : ""}`);
  };

  const handleClearForm = () => {
    setTitle("");
    setDescription("");
    setStartDateTime("");
    setEndDateTime("");
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

  const getDateTimePayload = () => ({
    startDate: startDateTime.slice(0, 10),
    startTime: startDateTime.slice(11, 16),
    endTime: endDateTime.slice(11, 16),
    endDate: endDateTime.slice(0, 10),
  });

  const handleSaveDraft = async () => {
    if (!validateStep1()) return;
    const meetingMinutes = getMeetingDurationMinutes();
    const totalAgenda = agendaItems.reduce((sum, item) => sum + (parseInt(item.duration, 10) || 0), 0);
    if (agendaItems.length > 0 && meetingMinutes > 0 && totalAgenda > meetingMinutes) {
      toast({
        variant: "destructive",
        title: "Không thể lưu",
        description: `Tổng thời lượng chương trình họp (${totalAgenda} phút) vượt quá thời lượng cuộc họp (${meetingMinutes} phút). Vui lòng điều chỉnh.`,
      });
      return;
    }
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
        ...getDateTimePayload(),
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
            ...getDateTimePayload(),
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
          ...getDateTimePayload(),
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

  const filteredUsers = usersByDepartment
    .filter((u: any) => !secretaryId || String(u.id) !== String(secretaryId))
    .filter((u: any) => (u.name || u.login || "").toLowerCase().includes(attendeeSearch.toLowerCase()));
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
                <div className="mt-1.5">
                  <SearchableSelect
                    options={meetingTypes.map(t => ({ value: t.value, label: t.label }))}
                    value={meetingType}
                    onValueChange={v => setMeetingType(v as MeetingType)}
                    placeholder="Chọn hình thức"
                    searchPlaceholder="Tìm hình thức..."
                    emptyText="Không tìm thấy."
                  />
                </div>
              </div>
              <div>
                <Label>Cấp họp *</Label>
                <div className="mt-1.5">
                  <SearchableSelect
                    options={meetingLevels.map(l => ({ value: l.value, label: l.label }))}
                    value={meetingLevel}
                    onValueChange={v => setMeetingLevel(v as MeetingLevel)}
                    placeholder="Chọn cấp họp"
                    searchPlaceholder="Tìm cấp họp..."
                    emptyText="Không tìm thấy."
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Ngày giờ bắt đầu *</Label>
                <Input
                  type="datetime-local"
                  min={minStartDateTime}
                  value={startDateTime}
                  onChange={e => setStartDateTime(e.target.value)}
                  onFocus={() => setMinStartDateTime(getMinNowString())}
                  className={`mt-1.5 ${errorClass("startDateTime")}`}
                />
                {errors.startDateTime && <p className="text-xs text-destructive mt-1">{errors.startDateTime}</p>}
              </div>
              <div>
                <Label>Ngày giờ kết thúc *</Label>
                <Input
                  type="datetime-local"
                  min={startDateTime || getMinNowString()}
                  value={endDateTime}
                  onChange={e => setEndDateTime(e.target.value)}
                  onFocus={() => setMinStartDateTime(getMinNowString())}
                  className={`mt-1.5 ${errorClass("endDateTime")}`}
                />
                {errors.endDateTime && <p className="text-xs text-destructive mt-1">{errors.endDateTime}</p>}
                {errors.timeRange && <p className="text-xs text-destructive mt-1">{errors.timeRange}</p>}
              </div>
            </div>

            {(meetingType === "offline" || meetingType === "hybrid") && (
              <div>
                <Label>Phòng họp *</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">Chọn một phòng từ các thẻ bên dưới</p>
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto p-1 rounded-lg border ${errorClass("room")} border-border bg-muted/5`}>
                  {roomsWithEquipment.map((r: any) => {
                    const available = r.status === "available";
                    const selected = selectedRoom === r.id;
                    const imgSrc = r.imageUrl
                      ? (r.imageUrl.startsWith("/api/") ? API_BASE + r.imageUrl : r.imageUrl)
                      : "/placeholder.svg";
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => available && setSelectedRoom(r.id)}
                        disabled={!available}
                        className={`relative text-left rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${
                          selected
                            ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                            : available
                            ? "border-border hover:border-primary/40 bg-card"
                            : "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                        }`}
                        aria-label={r.name}
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                          <img src={imgSrc} alt={r.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-2.5 relative z-0">
                          <p className="font-semibold text-sm truncate pr-6">{r.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{r.floor || "—"}</span>
                            <span>·</span>
                            <span>{r.capacity} người</span>
                          </div>
                          {(r.equipment?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {r.equipment.slice(0, 3).map((eq: { name: string; quantity?: number }, i: number) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {eq.name}{eq.quantity > 1 ? ` ×${eq.quantity}` : ""}
                                </span>
                              ))}
                              {r.equipment.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{r.equipment.length - 3}</span>
                              )}
                            </div>
                          )}
                          {!available && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">
                              {r.status === "occupied" ? "Đang sử dụng" : r.status === "maintenance" ? "Bảo trì" : "Ngừng sử dụng"}
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1.5 h-7 text-xs text-muted-foreground hover:text-foreground relative z-10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRoomDetailDialog(r);
                            }}
                          >
                            <Info className="h-3 w-3 mr-1" />
                            Xem chi tiết
                          </Button>
                        </div>
                        {selected && (
                          <div className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground p-1 z-10 pointer-events-none">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Dialog chi tiết phòng họp */}
                <Dialog open={!!roomDetailDialog} onOpenChange={(open) => !open && setRoomDetailDialog(null)}>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display">Thông tin phòng họp</DialogTitle>
                    </DialogHeader>
                    {roomDetailDialog && (
                      <div className="space-y-4">
                        <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                          <img
                            src={
                              roomDetailDialog.imageUrl
                                ? roomDetailDialog.imageUrl.startsWith("/api/")
                                  ? API_BASE + roomDetailDialog.imageUrl
                                  : roomDetailDialog.imageUrl
                                : "/placeholder.svg"
                            }
                            alt={roomDetailDialog.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{roomDetailDialog.name}</p>
                          {roomDetailDialog.code && (
                            <p className="text-xs text-muted-foreground">Mã: {roomDetailDialog.code}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>Vị trí: {roomDetailDialog.floor || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>Sức chứa: {roomDetailDialog.capacity} người</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Trạng thái: </span>
                            <Badge variant={roomDetailDialog.status === "available" ? "default" : "secondary"}>
                              {roomDetailDialog.status === "occupied"
                                ? "Đang sử dụng"
                                : roomDetailDialog.status === "maintenance"
                                ? "Bảo trì"
                                : roomDetailDialog.status === "disabled"
                                ? "Ngừng sử dụng"
                                : "Sẵn sàng"}
                            </Badge>
                          </div>
                          {roomDetailDialog.roomType && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Loại phòng: </span>
                              <span>{ROOM_TYPES.find((t) => t.value === roomDetailDialog.roomType)?.label ?? roomDetailDialog.roomType}</span>
                            </div>
                          )}
                        </div>
                        {roomDetailDialog.description && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Mô tả</p>
                            <p className="text-sm whitespace-pre-wrap">{roomDetailDialog.description}</p>
                          </div>
                        )}
                        {(roomDetailDialog.equipment?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">Thiết bị</p>
                            <div className="flex flex-wrap gap-2">
                              {roomDetailDialog.equipment.map((eq: { name: string; quantity?: number }, i: number) => (
                                <Badge key={i} variant="outline" className="font-normal">
                                  {eq.name}{eq.quantity > 1 ? ` ×${eq.quantity}` : ""}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                {roomsWithEquipment.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">Chưa có phòng họp nào. Vui lòng liên hệ quản trị để thêm phòng.</p>
                )}
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
              <Popover open={chairpersonOpen} onOpenChange={setChairpersonOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={chairpersonOpen}
                    className={`w-full mt-1.5 justify-between h-10 font-normal ${errorClass("chairperson")}`}
                  >
                    <span className="truncate">
                      {chairpersonId
                        ? (() => {
                            const u = (users as any[]).find((x: any) => String(x.id) === chairpersonId);
                            return u ? (u.name || u.login) + (u.position ? ` - ${u.position}` : "") : "Chọn người chủ trì";
                          })()
                        : "Chọn người chủ trì"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm theo tên, email..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy người dùng.</CommandEmpty>
                      <CommandGroup>
                        {chairpersonCandidates.map((u: any) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.name || u.login} ${u.email || ""} ${u.position || ""}`}
                            onSelect={() => {
                              setChairpersonId(String(u.id));
                              setChairpersonOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <UserAvatar userId={u.id} name={u.name || u.login} size={24} />
                              <span className="truncate">{(u.name || u.login) + (u.position ? ` - ${u.position}` : "")}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.chairperson && <p className="text-xs text-destructive mt-1">{errors.chairperson}</p>}
            </div>

            <div>
              <Label>Thư ký cuộc họp</Label>
              <div className="mt-1.5 h-10 px-3 flex items-center rounded-md border bg-muted/40 text-sm text-muted-foreground">
                {(() => {
                  const u = secretaryId ? (users as any[]).find((x: any) => String(x.id) === secretaryId) : null;
                  if (u) {
                    return (u.name || u.login) + (u.position ? ` - ${u.position}` : "");
                  }
                  if (secretaryCandidates.length > 0) {
                    const first = secretaryCandidates[0] as any;
                    return (first.name || first.login) + (first.position ? ` - ${first.position}` : "");
                  }
                  return "Không có thư ký phù hợp";
                })()}
              </div>
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
            {errors.capacity && <p className="text-sm text-destructive font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{errors.capacity}</p>}

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
                      <UserAvatar userId={u.id} name={u.name || u.login} size={32} />
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
                          <Input
                            type="datetime-local"
                            min={(() => { const t = new Date(); return t.toISOString().slice(0, 16); })()}
                            max={startDateTime ? startDateTime.slice(0, 16) : undefined}
                            value={assignment.dueAt}
                            onChange={e => updateTaskAssignment(assignment.key, "dueAt", e.target.value)}
                            className="mt-1"
                          />
                          {taskModalErrors[`${assignment.key}-dueAt`] && <p className="text-xs text-destructive mt-1">{taskModalErrors[`${assignment.key}-dueAt`]}</p>}
                        </div>
                        <div>
                          <Label className="text-xs">Nhắc trước (phút)</Label>
                          <Input type="number" min={1} placeholder="VD: 30" value={assignment.remindBeforeMinutes} onChange={e => updateTaskAssignment(assignment.key, "remindBeforeMinutes", e.target.value)} className="mt-1" />
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
            {errors.agendaDuration && (
              <p className="text-sm text-destructive font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {errors.agendaDuration}
              </p>
            )}
            {errors.agendaPresenterNotAttendee && (
              <p className="text-sm text-destructive font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {errors.agendaPresenterNotAttendee}
              </p>
            )}
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
                      <SearchableSelect
                        options={meetingLevel === "company"
                          ? selectedDepartments.map((d: string) => ({ value: d, label: d }))
                          : selectedAttendees.map((a: string) => ({ value: a, label: a }))}
                        value={item.presenter}
                        onValueChange={v => updateAgendaItem(i, "presenter", v)}
                        placeholder={meetingLevel === "company" ? "Đơn vị trình bày" : "Người trình bày"}
                        searchPlaceholder="Tìm..."
                        emptyText="Không tìm thấy."
                        triggerClassName={errorClass(`agenda_presenter_${i}`)}
                      />
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

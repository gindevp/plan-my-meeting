import { fetchApi } from "@/lib/api";
import { getDepartments } from "./departments";
import { getMeetingLevels, getMeetingTypes } from "./references";

export const meetingModeMap: Record<string, "offline" | "online" | "hybrid"> = {
  IN_PERSON: "offline",
  ONLINE: "online",
  HYBRID: "hybrid",
};

export const meetingStatusMap: Record<string, string> = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELED: "cancelled",
  COMPLETED: "completed",
};

const normalizeMeetingLevel = (raw?: string) => {
  const value = String(raw ?? "").trim().toUpperCase();
  if (["CORPORATE", "COMPANY", "TONG_CONG_TY", "TỔNG CÔNG TY", "CAP_TONG_CONG_TY"].includes(value)) return "company";
  if (["DEPARTMENT", "PHONG_BAN", "PHÒNG BAN", "TEAM"].includes(value)) return "department";
  return "department";
};

const resolveLevelRef = (levels: any[], meetingLevel: "company" | "department" | "team") => {
  const corporateAliases = ["CORPORATE", "COMPANY", "TONG_CONG_TY", "CAP_TONG_CONG_TY"];
  const departmentAliases = ["DEPARTMENT", "PHONG_BAN", "TEAM"];

  const aliases = meetingLevel === "company" ? corporateAliases : departmentAliases;

  const matched = levels.find((l: any) => aliases.includes(String(l.name ?? "").trim().toUpperCase()));
  return matched ? { id: matched.id } : levels[0] ? { id: levels[0].id } : null;
};

export interface MeetingListItem {
  id: string;
  title: string;
  type: "offline" | "online" | "hybrid";
  level: string;
  status: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  roomName?: string;
  meetingLink?: string;
  organizer: string;
  chairperson: string;
  host?: any;
  department: string;
  description: string;
  rejectionReason?: string;
  attendees: string[];
  agenda: { order: number; title: string; presenter: string; duration: number }[];
}

export async function getMeetings(params?: { page?: number; size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 100));
  const q = sp.toString();

  const [meetings, approvals] = await Promise.all([
    fetchApi<unknown[]>(`/api/meetings${q ? "?" + q : ""}`),
    fetchApi<unknown[]>("/api/meeting-approvals"),
  ]);

  const rejectionReasons: Record<string, string> = {};
  (approvals as any[]).forEach((a: any) => {
    if (a.decision === "REJECTED" && a.meeting?.id) {
      rejectionReasons[String(a.meeting.id)] = a.reason ?? "";
    }
  });

  return (meetings as any[]).map((m: any) => ({
    id: String(m.id),
    title: m.title ?? "",
    type: meetingModeMap[m.mode] ?? "offline",
    level: normalizeMeetingLevel(m.level?.name),
    status: meetingStatusMap[m.status] ?? "draft",
    statusRecord: m.statusRecord ?? "ACTIVE",
    startTime: m.startTime,
    endTime: m.endTime,
    roomId: m.room?.id != null ? String(m.room.id) : undefined,
    roomName: m.room?.name,
    meetingLink: m.onlineLink,
    organizer: m.requester?.login ?? m.host?.login ?? "",
    host: m.host,
    chairperson: m.host?.login ?? m.requester?.login ?? "",
    department: m.organizerDepartment?.name ?? "",
    description: m.objectives ?? m.note ?? "",
    rejectionReason: rejectionReasons[m.id] ?? "",
    requesterId: m.requester?.id,
    hostId: m.host?.id,
    secretaryId: m.secretary?.id ?? undefined,
    attendees: [] as string[],
    agenda: [] as { order: number; title: string; presenter: string; duration: number }[],
  }));
}

export interface CreateMeetingFormPayload {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endTime: string;
  endDate?: string;
  meetingType: "offline" | "online" | "hybrid";
  meetingLevel: "company" | "department" | "team";
  selectedRoomId?: string;
  meetingLink?: string;
  requesterId: number | string;
  hostId: number | string;
  secretaryId?: number | string | null;
  organizerDepartmentId?: number | string;
  participants?: { userId?: number; departmentId?: number; role?: string; isRequired?: boolean }[];
  agendaItems?: { title: string; presenter: string; duration: number }[];
  tasks?: {
    clientKey: string;
    type: "PRE_MEETING" | "POST_MEETING";
    title: string;
    description?: string;
    dueAt?: string;
    status: "TODO" | "IN_PROGRESS" | "DONE" | "OVERDUE";
    remindBeforeMinutes?: number;
    assigneeId?: number;
    assignedById?: number;
    departmentId?: number;
  }[];
  documents?: {
    docType: string;
    fileName: string;
    contentType?: string;
    file?: string;
    fileContentType?: string;
    uploadedAt?: string;
    uploadedById?: number;
    taskId?: number;
    taskClientKey?: string;
  }[];
  submitAfterCreate?: boolean;
}

export async function createMeetingFromForm(payload: CreateMeetingFormPayload) {
  const [types, levels, departments] = await Promise.all([
    getMeetingTypes(),
    getMeetingLevels(),
    getDepartments({ size: 200 }),
  ]);

  const start = new Date(`${payload.startDate}T${payload.startTime}:00`);
  const endDateStr = payload.endDate || payload.startDate;
  const end = new Date(`${endDateStr}T${payload.endTime}:00`);
  const nowIso = new Date().toISOString();

  const mode =
    payload.meetingType === "offline"
      ? "IN_PERSON"
      : payload.meetingType === "online"
      ? "ONLINE"
      : "HYBRID";

  const typeRef = types[0] ? { id: types[0].id } : null;

  const levelRef = resolveLevelRef(levels as any[], payload.meetingLevel);

  const fallbackDepartmentId = departments[0]?.id;
  const resolvedOrganizerDepartmentId = payload.organizerDepartmentId != null ? Number(payload.organizerDepartmentId) : fallbackDepartmentId;
  const deptRef = resolvedOrganizerDepartmentId != null ? { id: resolvedOrganizerDepartmentId } : null;

  const body: any = {
    title: payload.title,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    mode,
    onlineLink: payload.meetingLink || null,
    objectives: payload.description || null,
    note: null,
    status: "DRAFT",
    statusRecord: "ACTIVE",
    createdAt: nowIso,
    type: typeRef,
    level: levelRef,
    organizerDepartment: deptRef,
    requester: { id: Number(payload.requesterId) },
    host: { id: Number(payload.hostId) },
  };

  if (payload.secretaryId != null && payload.secretaryId !== "") {
    body.secretary = { id: Number(payload.secretaryId) };
  }

  if (payload.selectedRoomId) {
    body.room = { id: Number(payload.selectedRoomId) };
  }

  const hasDetails =
    (payload.participants && payload.participants.length > 0) ||
    (payload.agendaItems && payload.agendaItems.length > 0) ||
    (payload.tasks && payload.tasks.length > 0) ||
    (payload.documents && payload.documents.length > 0);

  // Nếu cần submit ngay sau khi tạo, luôn đi qua endpoint with-details
  // để backend xử lý create + submit trong 1 transaction (fail thì rollback toàn bộ)
  if (hasDetails || payload.submitAfterCreate === true) {
    const participants =
      payload.participants?.map((p: any) => ({
        userId: p.userId != null ? Number(p.userId) : null,
        departmentId: p.departmentId != null ? Number(p.departmentId) : null,
        role: p.role || "ATTENDEE",
        isRequired: p.isRequired !== false,
      })) || [];

    const agendaItems =
      payload.agendaItems?.map((a: any, index: number) => ({
        topic: a.title,
        presenterName: a.presenter,
        durationMinutes: parseInt(a.duration) || 15,
        itemOrder: index + 1,
      })) || [];

    const tasks =
      payload.tasks?.map((t) => ({
        clientKey: t.clientKey,
        type: t.type,
        title: t.title,
        description: t.description || null,
        dueAt: t.dueAt || null,
        status: t.status,
        remindBeforeMinutes: t.remindBeforeMinutes ?? null,
        assigneeId: Number(t.assigneeId),
        assignedById: t.assignedById != null ? Number(t.assignedById) : Number(payload.requesterId),
        departmentId: t.departmentId != null ? Number(t.departmentId) : null,
      })) || [];

    const documents =
      payload.documents?.map((d) => ({
        docType: d.docType,
        fileName: d.fileName,
        contentType: d.contentType || null,
        file: d.file || null,
        fileContentType: d.fileContentType || null,
        uploadedAt: d.uploadedAt || nowIso,
        uploadedById: d.uploadedById ?? Number(payload.requesterId),
        taskId: d.taskId ?? null,
        taskClientKey: d.taskClientKey || null,
      })) || [];

    return fetchApi<any>("/api/meetings/with-details", {
      method: "POST",
      body: JSON.stringify({
        meeting: body,
        participants,
        agendaItems,
        tasks,
        documents,
        submitAfterCreate: payload.submitAfterCreate === true,
      }),
    });
  }

  return fetchApi<any>("/api/meetings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function submitMeeting(id: number | string) {
  return fetchApi<any>(`/api/meetings/${id}/submit`, {
    method: "POST",
  });
}

export async function approveRoom(id: number | string) {
  return fetchApi<any>(`/api/meetings/${id}/approve-room`, {
    method: "POST",
  });
}

export async function approveUnit(id: number | string) {
  return fetchApi<any>(`/api/meetings/${id}/approve-unit`, {
    method: "POST",
  });
}

export async function rejectMeeting(id: number | string, reason: string) {
  return fetchApi<any>(`/api/meetings/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function cancelMeeting(id: number | string) {
  return fetchApi<any>(`/api/meetings/${id}/cancel`, {
    method: "POST",
  });
}

export async function completeMeeting(id: number | string) {
  return fetchApi<any>(`/api/meetings/${id}/complete`, {
    method: "POST",
  });
}

export async function softDeleteMeeting(id: number | string) {
  return fetchApi<any>(`/api/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ id: Number(id), statusRecord: "INACTIVE" }),
  });
}

export async function updateMeeting(id: number | string, payload: Partial<CreateMeetingFormPayload>) {
  const [types, levels, departments] = await Promise.all([
    getMeetingTypes(),
    getMeetingLevels(),
    getDepartments({ size: 200 }),
  ]);

  const startDate = payload.startDate ?? new Date().toISOString().slice(0, 10);
  const startTime = payload.startTime ?? "08:00";
  const endTime = payload.endTime ?? "09:00";
  const endDateStr = payload.endDate || startDate;
  const nowIso = new Date().toISOString();

  const mode =
    payload.meetingType === "offline"
      ? "IN_PERSON"
      : payload.meetingType === "online"
      ? "ONLINE"
      : "HYBRID";

  const normalizedMeetingLevel = (payload.meetingLevel || "department") as "company" | "department" | "team";
  const levelRef = resolveLevelRef(levels as any[], normalizedMeetingLevel);

  const fallbackDepartmentId = departments[0]?.id;
  const resolvedOrganizerDepartmentId = payload.organizerDepartmentId != null ? Number(payload.organizerDepartmentId) : fallbackDepartmentId;

  const body: any = {
    id: Number(id),
    title: payload.title,
    startTime: new Date(`${startDate}T${startTime}:00`).toISOString(),
    endTime: new Date(`${endDateStr}T${endTime}:00`).toISOString(),
    mode,
    onlineLink: payload.meetingLink || null,
    objectives: payload.description || null,
    statusRecord: "ACTIVE",
    updatedAt: nowIso,
    type: types[0] ? { id: types[0].id } : null,
    level: levelRef,
    organizerDepartment: resolvedOrganizerDepartmentId != null ? { id: resolvedOrganizerDepartmentId } : null,
    requester: { id: Number(payload.requesterId) },
    host: { id: Number(payload.hostId) },
  };

  if (payload.secretaryId != null && payload.secretaryId !== "") {
    body.secretary = { id: Number(payload.secretaryId) };
  } else {
    body.secretary = null;
  }

  if (payload.selectedRoomId !== undefined) {
    body.room = payload.selectedRoomId ? { id: Number(payload.selectedRoomId) } : null;
  }

  const participants =
    payload.participants?.map((p: any) => ({
      userId: p.userId != null ? Number(p.userId) : null,
      departmentId: p.departmentId != null ? Number(p.departmentId) : null,
      role: p.role || "ATTENDEE",
      isRequired: p.isRequired !== false,
    })) || [];

  const agendaItems =
    payload.agendaItems?.map((a: any, index: number) => ({
      topic: a.title,
      presenterName: a.presenter,
      durationMinutes: parseInt(a.duration) || 15,
      itemOrder: index + 1,
    })) || [];

  const tasks =
    payload.tasks?.map((t) => ({
      clientKey: t.clientKey,
      type: t.type,
      title: t.title,
      description: t.description || null,
      dueAt: t.dueAt || null,
      status: t.status ?? "TODO",
      remindBeforeMinutes: t.remindBeforeMinutes ?? null,
      assigneeId: Number(t.assigneeId),
      assignedById: t.assignedById != null ? Number(t.assignedById) : Number(payload.requesterId),
      departmentId: t.departmentId != null ? Number(t.departmentId) : null,
    })) || [];

  const documents =
    payload.documents?.map((d) => ({
      docType: d.docType,
      fileName: d.fileName,
      contentType: d.contentType || null,
      file: d.file || null,
      fileContentType: d.fileContentType || null,
      uploadedAt: d.uploadedAt || nowIso,
      uploadedById: d.uploadedById ?? Number(payload.requesterId),
      taskId: d.taskId ?? null,
      taskClientKey: d.taskClientKey || null,
    })) || [];

  return fetchApi<any>(`/api/meetings/${id}/with-details`, {
    method: "PUT",
    body: JSON.stringify({
      meeting: body,
      participants,
      agendaItems,
      tasks,
      documents,
      submitAfterCreate: false,
    }),
  });
}

export async function getAgendaItemsByMeeting(meetingId: number | string) {
  const list = await fetchApi<unknown[]>("/api/agenda-items");
  return (list as any[])
    .filter((a: any) => a.meeting?.id === Number(meetingId))
    .map((a: any) => ({
      order: a.itemOrder ?? 0,
      title: a.topic ?? "",
      presenter: a.presenterName ?? "",
      duration: a.durationMinutes ?? 0,
      note: a.note ?? "",
    }));
}

export async function getParticipantsByMeeting(meetingId: number | string) {
  const list = await fetchApi<unknown[]>("/api/meeting-participants");
  return (list as any[])
    .filter((p: any) => p.meeting?.id === Number(meetingId))
    .map((p: any) => ({
      id: p.id,
      userId: p.user?.id != null ? String(p.user.id) : "",
      departmentId: p.department?.id != null ? String(p.department.id) : "",
      name: p.user?.login ?? p.department?.name ?? "",
      role: p.role,
      required: p.isRequired,
      attendance: p.attendance,
      confirmationStatus: p.confirmationStatus ?? "PENDING",
      absentReason: p.absentReason ?? "",
    }));
}

/** Lấy tất cả participant (để filter lời mời của user hiện tại). */
export async function getAllParticipants(): Promise<any[]> {
  const list = await fetchApi<unknown[]>("/api/meeting-participants");
  return (list as any[]).map((p: any) => ({
    id: p.id,
    userId: p.user?.id != null ? String(p.user.id) : null,
    departmentId: p.department?.id != null ? String(p.department.id) : null,
    departmentName: p.department?.name ?? "",
    confirmationStatus: p.confirmationStatus ?? "PENDING",
    absentReason: p.absentReason ?? "",
    meeting: p.meeting
      ? {
          id: String(p.meeting.id),
          title: p.meeting.title,
          startTime: p.meeting.startTime,
          endTime: p.meeting.endTime,
          status: p.meeting.status,
          level: p.meeting.level?.name ?? "",
          chairperson: p.meeting.host?.login ?? p.meeting.requester?.login ?? "",
          department: p.meeting.organizerDepartment?.name ?? "",
        }
      : null,
  }));
}

/** Thư ký chọn cá nhân đại diện cho participant theo phòng ban. */
export async function selectRepresentatives(participantId: number | string, userIds: number[]) {
  return fetchApi<any[]>(`/api/meeting-participants/${participantId}/select-representatives`, {
    method: "POST",
    body: JSON.stringify({ userIds }),
  });
}

export async function respondToInvitation(
  participantId: number | string,
  confirmationStatus: "CONFIRMED" | "DECLINED",
  absentReason?: string
) {
  return fetchApi<any>(`/api/meeting-participants/${participantId}/respond`, {
    method: "POST",
    body: JSON.stringify({
      confirmationStatus,
      absentReason: absentReason ?? (confirmationStatus === "DECLINED" ? "" : undefined),
    }),
  });
}

export async function updateParticipantAttendance(
  participantId: number | string,
  attendance: "PRESENT" | "ABSENT" | "NOT_MARKED" | "EXCUSED"
) {
  return fetchApi<any>(`/api/meeting-participants/${participantId}/attendance`, {
    method: "PATCH",
    body: JSON.stringify({ attendance }),
  });
}

export async function getMeetingTasksByMeeting(meetingId: number | string) {
  const list = await fetchApi<unknown[]>("/api/meeting-tasks");
  return (list as any[])
    .filter((t: any) => t.meeting?.id === Number(meetingId))
    .map((t: any) => ({
      id: String(t.id),
      title: t.title ?? "",
      type: t.type ?? "",
      assigneeId: t.assignee?.id != null ? String(t.assignee.id) : "",
      assignee: t.assignee?.login ?? "",
      departmentId: t.department?.id != null ? String(t.department.id) : "",
      departmentName: t.department?.name ?? "",
      dueAt: t.dueAt ?? "",
      status: t.status ?? "TODO",
      remindBeforeMinutes: t.remindBeforeMinutes,
      description: t.description ?? "",
    }));
}

export async function getMeetingDocumentsByMeeting(meetingId: number | string) {
  const list = await fetchApi<unknown[]>("/api/meeting-documents");
  return (list as any[])
    .filter((d: any) => d.meeting?.id === Number(meetingId))
    .map((d: any) => ({
      id: String(d.id),
      fileName: d.fileName ?? "",
      docType: d.docType ?? "",
      uploadedBy: d.uploadedBy?.login ?? "",
      taskId: d.task?.id != null ? String(d.task.id) : "",
    }));
}

export async function getMeetingRejectionReason(meetingId: number | string): Promise<string> {
  try {
    const list = await fetchApi<unknown[]>("/api/meeting-approvals");
    const approvals = (list as any[]).filter((a: any) => a.meeting?.id === Number(meetingId));
    const rejected = approvals.find((a: any) => a.decision === "REJECTED");
    return rejected?.reason ?? "";
  } catch {
    return "";
  }
}

export async function getIncidentsByMeeting(meetingId: number | string) {
  const list = await fetchApi<unknown[]>("/api/incidents");
  return (list as any[])
    .filter((i: any) => i.meeting?.id === Number(meetingId))
    .map((i: any) => ({
      id: String(i.id),
      title: i.title ?? "",
      description: i.description ?? "",
      severity: i.severity ?? "",
      status: i.status ?? "",
      reportedAt: i.reportedAt ?? "",
      reportedBy: i.reportedBy?.login ?? "",
    }));
}

export async function getAllIncidents(): Promise<any[]> {
  const list = await fetchApi<unknown[]>("/api/incidents");
  return (list as any[]).map((i: any) => ({
    id: String(i.id),
    title: i.title ?? "",
    description: i.description ?? "",
    severity: i.severity ?? "",
    status: i.status ?? "",
    reportedAt: i.reportedAt ?? "",
    reportedBy: i.reportedBy?.login ?? "",
    meetingId: i.meeting?.id != null ? String(i.meeting.id) : "",
    meetingTitle: i.meeting?.title ?? "",
  }));
}

export async function createIncident(payload: {
  meetingId: number | string;
  reportedById: number | string;
  title: string;
  description?: string;
  severity?: string;
}) {
  return fetchApi<any>("/api/incidents", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      description: payload.description ?? "",
      severity: payload.severity ?? "MEDIUM",
      status: "OPEN",
      reportedAt: new Date().toISOString(),
      meeting: { id: Number(payload.meetingId) },
      reportedBy: { id: Number(payload.reportedById) },
    }),
  });
}

export async function createMeetingDocument(payload: {
  meetingId: number | string;
  docType: string;
  fileName: string;
  uploadedById: number | string;
  taskId?: number | string | null;
  fileBase64?: string | null;
  fileContentType?: string | null;
}) {
  const body: any = {
    meeting: { id: Number(payload.meetingId) },
    docType: payload.docType,
    fileName: payload.fileName,
    uploadedBy: { id: Number(payload.uploadedById) },
    uploadedAt: new Date().toISOString(),
  };
  if (payload.taskId != null && payload.taskId !== "") {
    body.task = { id: Number(payload.taskId) };
  }
  if (payload.fileContentType) body.fileContentType = payload.fileContentType;
  if (payload.fileBase64) body.file = payload.fileBase64;
  return fetchApi<any>("/api/meeting-documents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Download meeting document file (for task docs or minutes). */
export async function downloadMeetingDocument(documentId: number | string): Promise<void> {
  const { fetchApiBlob } = await import("@/lib/api");
  const { blob, filename } = await fetchApiBlob(`/api/meeting-documents/${documentId}/download`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function createPostMeetingTask(payload: {
  meetingId: number | string;
  title: string;
  description?: string;
  dueAt?: string;
  assigneeId?: number | string;
  departmentId?: number | string;
  assignedById: number | string;
}) {
  return fetchApi<any>("/api/meeting-tasks", {
    method: "POST",
    body: JSON.stringify({
      meeting: { id: Number(payload.meetingId) },
      type: "POST_MEETING",
      title: payload.title,
      description: payload.description ?? "",
      dueAt: payload.dueAt ?? null,
      status: "TODO",
      assignee: payload.assigneeId != null ? { id: Number(payload.assigneeId) } : null,
      department: payload.departmentId != null ? { id: Number(payload.departmentId) } : null,
      assignedBy: { id: Number(payload.assignedById) },
    }),
  });
}

/** Cập nhật trạng thái task. */
export async function updateMeetingTaskStatus(
  taskId: number | string,
  status: "TODO" | "IN_PROGRESS" | "DONE"
) {
  return fetchApi<any>(`/api/meeting-tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

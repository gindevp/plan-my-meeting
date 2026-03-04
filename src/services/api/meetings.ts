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
    level: m.level?.name ?? "",
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
  participants?: { userId: number; role?: string; isRequired?: boolean }[];
  agendaItems?: { title: string; presenter: string; duration: number }[];
  tasks?: {
    clientKey: string;
    type: "PRE_MEETING" | "POST_MEETING";
    title: string;
    description?: string;
    dueAt?: string;
    status: "TODO" | "IN_PROGRESS" | "DONE" | "OVERDUE";
    remindBeforeMinutes?: number;
    assigneeId: number;
    assignedById?: number;
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

  const levelMap: Record<string, string> = {
    company: "CORPORATE",
    department: "DEPARTMENT",
    team: "DEPARTMENT",
  };
  const targetLevelName = levelMap[payload.meetingLevel] || "DEPARTMENT";
  const matchedLevel = levels.find((l: any) => l.name === targetLevelName);
  const levelRef = matchedLevel ? { id: matchedLevel.id } : levels[0] ? { id: levels[0].id } : null;

  const deptRef = departments[0] ? { id: departments[0].id } : null;

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

  if (payload.selectedRoomId) {
    body.room = { id: Number(payload.selectedRoomId) };
  }

  const hasDetails =
    (payload.participants && payload.participants.length > 0) ||
    (payload.agendaItems && payload.agendaItems.length > 0) ||
    (payload.tasks && payload.tasks.length > 0) ||
    (payload.documents && payload.documents.length > 0);

  if (hasDetails) {
    const participants =
      payload.participants?.map((p: any) => ({
        userId: Number(p.userId),
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
  const body: any = { id: Number(id), statusRecord: "ACTIVE" };

  if (payload.title !== undefined) body.title = payload.title;
  if (payload.description !== undefined) body.objectives = payload.description;
  if (payload.startDate !== undefined && payload.startTime !== undefined) {
    body.startTime = new Date(`${payload.startDate}T${payload.startTime}:00`).toISOString();
  }
  if (payload.startDate !== undefined && payload.endTime !== undefined) {
    const endDateStr = payload.endDate || payload.startDate;
    body.endTime = new Date(`${endDateStr}T${payload.endTime}:00`).toISOString();
  }
  if (payload.meetingType !== undefined) {
    body.mode = payload.meetingType === "offline" ? "IN_PERSON" : payload.meetingType === "online" ? "ONLINE" : "HYBRID";
  }
  if (payload.meetingLink !== undefined) body.onlineLink = payload.meetingLink || null;
  if (payload.selectedRoomId !== undefined) {
    body.room = payload.selectedRoomId ? { id: Number(payload.selectedRoomId) } : null;
  }
  if (payload.hostId !== undefined) body.host = { id: Number(payload.hostId) };

  return fetchApi<any>(`/api/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
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
      name: p.user?.login ?? "",
      role: p.role,
      required: p.isRequired,
      attendance: p.attendance,
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

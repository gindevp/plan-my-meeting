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
  department: string;
  description: string;
  attendees: string[];
  agenda: { order: number; title: string; presenter: string; duration: number }[];
}

export async function getMeetings(params?: { page?: number; size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 100));
  const q = sp.toString();
  const list = await fetchApi<unknown[]>(`/api/meetings${q ? "?" + q : ""}`);
  return (list as any[]).map((m: any) => ({
    id: String(m.id),
    title: m.title ?? "",
    type: meetingModeMap[m.mode] ?? "offline",
    level: m.level?.name ?? "",
    status: meetingStatusMap[m.status] ?? "draft",
    startTime: m.startTime,
    endTime: m.endTime,
    roomId: m.room?.id != null ? String(m.room.id) : undefined,
    roomName: m.room?.name,
    meetingLink: m.onlineLink,
    organizer: m.requester?.login ?? m.host?.login ?? "",
    chairperson: m.host?.login ?? m.requester?.login ?? "",
    department: m.organizerDepartment?.name ?? "",
    description: m.objectives ?? m.note ?? "",
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
  meetingType: "offline" | "online" | "hybrid";
  meetingLevel: "company" | "department" | "team";
  selectedRoomId?: string;
  meetingLink?: string;
  requesterId: number | string;
  hostId: number | string;
}

export async function createMeetingFromForm(payload: CreateMeetingFormPayload) {
  const [types, levels, departments] = await Promise.all([
    getMeetingTypes(),
    getMeetingLevels(),
    getDepartments({ size: 200 }),
  ]);

  const start = new Date(`${payload.startDate}T${payload.startTime}:00`);
  const end = new Date(`${payload.startDate}T${payload.endTime}:00`);
  const nowIso = new Date().toISOString();

  const mode =
    payload.meetingType === "offline"
      ? "IN_PERSON"
      : payload.meetingType === "online"
      ? "ONLINE"
      : "HYBRID";

  const typeRef = types[0] ? { id: types[0].id } : null;
  const levelRef = levels[0] ? { id: levels[0].id } : null;
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


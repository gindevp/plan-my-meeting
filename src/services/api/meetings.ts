import { fetchApi } from "@/lib/api";

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

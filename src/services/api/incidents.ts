import { fetchApi } from "@/lib/api";

export interface IncidentListItem {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  reportedAt: string;
  meetingId: string;
  meetingTitle: string;
  reportedByLogin: string;
  reportedById?: string;
  assignedToId?: string;
  assignedToLogin?: string;
}

interface IncidentPayload {
  title: string;
  description?: string;
  severity?: string;
  status?: string;
  reportedAt: string;
  meeting: { id: number };
  reportedBy: { id: number };
}

function mapIncident(raw: any): IncidentListItem {
  return {
    id: String(raw.id),
    title: raw.title ?? "",
    description: raw.description,
    severity: raw.severity ?? "MEDIUM",
    status: raw.status ?? "OPEN",
    reportedAt: raw.reportedAt ?? new Date().toISOString(),
    meetingId: raw.meeting?.id != null ? String(raw.meeting.id) : "",
    meetingTitle: raw.meeting?.title ?? "",
    reportedByLogin: raw.reportedBy?.login ?? "",
    reportedById: raw.reportedBy?.id != null ? String(raw.reportedBy.id) : undefined,
    assignedToId: raw.assignedTo?.id != null ? String(raw.assignedTo.id) : undefined,
    assignedToLogin: raw.assignedTo?.login ?? "",
  };
}

export async function getIncidents(params?: {
  page?: number;
  size?: number;
  status?: string;
  severity?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 200));
  if (params?.status != null && params.status !== "__all__" && params.status !== "")
    sp.set("status", params.status);
  if (params?.severity != null && params.severity !== "__all__" && params.severity !== "")
    sp.set("severity", params.severity);
  const q = sp.toString();
  const list = await fetchApi<unknown[]>(`/api/incidents${q ? "?" + q : ""}`);
  return (list as any[]).map(mapIncident);
}

export async function getIncident(id: string) {
  const raw = await fetchApi<any>(`/api/incidents/${id}`);
  return mapIncident(raw);
}

export async function createIncident(data: {
  title: string;
  description?: string;
  severity?: string;
  meetingId?: string | number | null;
  reportedById: string | number;
  assignedToId?: string | number | null;
}) {
  const body: Record<string, unknown> = {
    title: data.title,
    description: data.description ?? "",
    severity: data.severity ?? "MEDIUM",
    status: "OPEN",
    reportedAt: new Date().toISOString(),
    reportedBy: { id: Number(data.reportedById) },
  };
  if (data.meetingId != null && data.meetingId !== "") {
    (body as any).meeting = { id: Number(data.meetingId) };
  }
  if (data.assignedToId != null && data.assignedToId !== "") {
    (body as any).assignedTo = { id: Number(data.assignedToId) };
  }
  const res = await fetchApi<any>("/api/incidents", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapIncident(res);
}

export async function updateIncident(
  id: string,
  data: {
    title: string;
    description?: string;
    severity?: string;
    status?: string;
    reportedAt?: string;
    meetingId?: string | number | null;
    reportedById: string | number;
    assignedToId?: string | number | null;
  }
) {
  const body: Record<string, unknown> = {
    id: Number(id),
    title: data.title,
    description: data.description ?? "",
    severity: data.severity ?? "MEDIUM",
    status: data.status ?? "OPEN",
    reportedAt: data.reportedAt ?? new Date().toISOString(),
    reportedBy: { id: Number(data.reportedById) },
    assignedTo: data.assignedToId != null && data.assignedToId !== "" ? { id: Number(data.assignedToId) } : null,
  };
  if (data.meetingId != null && data.meetingId !== "") {
    (body as any).meeting = { id: Number(data.meetingId) };
  } else {
    (body as any).meeting = null;
  }
  const res = await fetchApi<any>(`/api/incidents/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return mapIncident(res);
}

export async function deleteIncident(id: string) {
  await fetchApi<void>(`/api/incidents/${id}`, { method: "DELETE" });
}

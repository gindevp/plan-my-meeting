import { fetchApi } from "@/lib/api";

export interface MeetingTypeItem {
  id: number;
  name: string;
}

export interface MeetingLevelItem {
  id: number;
  name: string;
}

export async function getMeetingTypes(): Promise<MeetingTypeItem[]> {
  const list = await fetchApi<unknown[]>(`/api/meeting-types`);
  return (list as any[]).map((t) => ({ id: t.id, name: t.name ?? "" }));
}

export async function getMeetingLevels(): Promise<MeetingLevelItem[]> {
  const list = await fetchApi<unknown[]>(`/api/meeting-levels`);
  return (list as any[]).map((l) => ({ id: l.id, name: l.name ?? "" }));
}

import { fetchApi } from "@/lib/api";

export interface RoomListItem {
  id: string;
  name: string;
  code: string;
  capacity: number;
  floor: string;
  equipment: string[];
  status: "available" | "occupied" | "maintenance";
}

export async function getRooms(params?: { page?: number; size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 100));
  const q = sp.toString();
  const list = await fetchApi<unknown[]>(`/api/rooms${q ? "?" + q : ""}`);
  return (list as any[]).map((r: any) => ({
    id: String(r.id),
    name: r.name ?? "",
    code: r.code ?? "",
    capacity: r.capacity ?? 0,
    floor: r.location ?? "",
    equipment: [] as string[],
    status: r.active === false ? "maintenance" : "available",
  }));
}

export async function getRoomEquipments(): Promise<{ roomId: string; equipmentNames: string[] }[]> {
  const list = await fetchApi<unknown[]>(`/api/room-equipments`);
  const byRoom: Record<string, string[]> = {};
  for (const re of list as any[]) {
    const rid = String(re.room?.id ?? 0);
    const name = re.equipment?.name ?? "";
    if (!byRoom[rid]) byRoom[rid] = [];
    if (name) byRoom[rid].push(name);
  }
  return Object.entries(byRoom).map(([roomId, equipmentNames]) => ({ roomId, equipmentNames }));
}

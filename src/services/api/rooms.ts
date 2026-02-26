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

interface RoomPayload {
  code: string;
  name: string;
  location: string;
  capacity: number;
  active: boolean;
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

export async function createRoom(data: RoomPayload) {
  return fetchApi("/api/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRoom(id: string, data: RoomPayload) {
  return fetchApi(`/api/rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, id: Number(id) }),
  });
}

export async function deleteRoom(id: string) {
  const roomEquipments = await fetchApi<any[]>(`/api/room-equipments`);
  const related = roomEquipments.filter((re) => String(re.room?.id) === id);

  for (const re of related) {
    await fetchApi<void>(`/api/room-equipments/${re.id}`, {
      method: "DELETE",
    });
  }

  return fetchApi<void>(`/api/rooms/${id}`, {
    method: "DELETE",
  });
}

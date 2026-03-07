import { fetchApi } from "@/lib/api";

export interface RoomListItem {
  id: string;
  name: string;
  code: string;
  capacity: number;
  floor: string;
  equipment: { name: string; quantity: number; equipmentType?: string }[];
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
    equipment: [] as { name: string; quantity: number }[],
    status: r.active === false ? "maintenance" : "available",
  }));
}

export interface RoomEquipmentItem {
  id: number;
  roomId: string;
  equipmentId: string;
  equipmentName: string;
  quantity: number;
}

export interface RoomEquipmentWithQty {
  name: string;
  quantity: number;
  equipmentType?: string;
}

export async function getRoomEquipments(): Promise<{ roomId: string; equipment: RoomEquipmentWithQty[] }[]> {
  const list = await fetchApi<unknown[]>(`/api/room-equipments`);
  const byRoom: Record<string, RoomEquipmentWithQty[]> = {};
  for (const re of list as any[]) {
    const rid = String(re.room?.id ?? re.roomId ?? "");
    const name = re.equipment?.name ?? re.equipment?.code ?? "";
    const qty = re.quantity ?? 1;
    const equipmentType = re.equipment?.equipmentType;
    if (!rid) continue;
    if (!byRoom[rid]) byRoom[rid] = [];
    if (name) byRoom[rid].push({ name, quantity: qty, equipmentType });
  }
  return Object.entries(byRoom).map(([roomId, equipment]) => ({ roomId, equipment }));
}

export async function getRoomEquipmentsRaw(): Promise<RoomEquipmentItem[]> {
  const list = await fetchApi<unknown[]>(`/api/room-equipments`);
  return (list as any[]).map((re) => ({
    id: re.id,
    roomId: String(re.room?.id ?? ""),
    equipmentId: String(re.equipment?.id ?? ""),
    equipmentName: re.equipment?.name ?? re.equipment?.code ?? "",
    quantity: re.quantity ?? 1,
  }));
}

export async function createRoomEquipment(payload: { roomId: number | string; equipmentId: number | string; quantity?: number }) {
  return fetchApi("/api/room-equipments", {
    method: "POST",
    body: JSON.stringify({
      roomId: Number(payload.roomId),
      equipmentId: Number(payload.equipmentId),
      quantity: payload.quantity ?? 1,
    }),
  });
}

export async function deleteRoomEquipment(id: number | string) {
  return fetchApi<void>(`/api/room-equipments/${id}`, { method: "DELETE" });
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

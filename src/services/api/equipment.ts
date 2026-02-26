import { fetchApi } from "@/lib/api";

export interface EquipmentListItem {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface EquipmentPayload {
  code: string;
  name: string;
  description?: string;
}

export async function getEquipment(params?: { page?: number; size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 100));
  const q = sp.toString();
  const list = await fetchApi<unknown[]>(`/api/equipment${q ? "?" + q : ""}`);
  return (list as any[]).map((e) => ({
    id: String(e.id),
    code: e.code ?? "",
    name: e.name ?? "",
    description: e.description,
  }));
}

export async function createEquipment(data: EquipmentPayload) {
  return fetchApi("/api/equipment", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEquipment(id: string, data: EquipmentPayload) {
  return fetchApi(`/api/equipment/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, id: Number(id) }),
  });
}

export async function deleteEquipment(id: string) {
  return fetchApi<void>(`/api/equipment/${id}`, {
    method: "DELETE",
  });
}

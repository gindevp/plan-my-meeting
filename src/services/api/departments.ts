import { fetchApi } from "@/lib/api";

export interface DepartmentListItem {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface DepartmentPayload {
  code: string;
  name: string;
  description?: string;
}

export async function getDepartments(params?: { page?: number; size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 100));
  const q = sp.toString();
  const list = await fetchApi<unknown[]>(`/api/departments${q ? "?" + q : ""}`);
  return (list as any[]).map((d: any) => ({
    id: String(d.id),
    name: d.name ?? "",
    code: d.code ?? "",
    description: d.description,
  }));
}

export async function createDepartment(data: DepartmentPayload) {
  return fetchApi("/api/departments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDepartment(id: string, data: DepartmentPayload) {
  return fetchApi(`/api/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, id: Number(id) }),
  });
}

export async function deleteDepartment(id: string) {
  return fetchApi<void>(`/api/departments/${id}`, {
    method: "DELETE",
  });
}

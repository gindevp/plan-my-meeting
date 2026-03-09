import { fetchApi } from "@/lib/api";

export interface DepartmentListItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  status?: string;
  managerId?: string;
  managerLogin?: string;
}

interface DepartmentPayload {
  code: string;
  name: string;
  description?: string;
  status?: string;
  managerId?: string | number | null;
}

export async function getDepartments(params?: {
  page?: number;
  size?: number;
  status?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 100));
  if (params?.status != null && params.status !== "__all__" && params.status !== "")
    sp.set("status", params.status);
  const q = sp.toString();
  const list = await fetchApi<unknown[]>(`/api/departments${q ? "?" + q : ""}`);
  return (list as any[]).map((d: any) => ({
    id: String(d.id),
    name: d.name ?? "",
    code: d.code ?? "",
    description: d.description,
    status: d.status ?? "ACTIVE",
    managerId: d.managerId != null ? String(d.managerId) : undefined,
    managerLogin: d.managerLogin,
  }));
}

function toManagerId(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function createDepartment(data: DepartmentPayload) {
  return fetchApi("/api/departments", {
    method: "POST",
    body: JSON.stringify({
      code: data.code,
      name: data.name,
      description: data.description ?? "",
      status: data.status ?? "ACTIVE",
      managerId: toManagerId(data.managerId),
    }),
  });
}

export async function updateDepartment(id: string, data: DepartmentPayload) {
  return fetchApi(`/api/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      id: Number(id),
      code: data.code,
      name: data.name,
      description: data.description ?? "",
      status: data.status ?? "ACTIVE",
      managerId: toManagerId(data.managerId),
    }),
  });
}

export async function deleteDepartment(id: string) {
  return fetchApi<void>(`/api/departments/${id}`, {
    method: "DELETE",
  });
}

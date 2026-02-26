import { fetchApi } from "@/lib/api";

export interface UserListItem {
  id: string;
  login: string;
  name: string;
  email?: string;
  department?: string;
  position?: string;
  role?: string;
}

export async function getUsers(params?: { page?: number; size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 100));
  const q = sp.toString();
  const list = await fetchApi<unknown[]>(`/api/users${q ? "?" + q : ""}`);
  return (list as any[]).map((u) => {
    const first = u.firstName ?? "";
    const last = u.lastName ?? "";
    const name = (`${first} ${last}`.trim() || u.login) ?? "";
    return {
      id: String(u.id),
      login: u.login ?? "",
      name,
      email: u.email,
      department: undefined,
      position: undefined,
      role: undefined,
    };
  });
}

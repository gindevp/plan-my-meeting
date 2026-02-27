import { fetchApi } from "@/lib/api";

export interface UserListItem {
  id: string;
  login: string;
  name: string;
  email?: string;
  department?: string;
  position?: string;
  role?: string;
  activated?: boolean;
}

interface AdminUserPayload {
  id?: number;
  login: string;
  firstName?: string;
  lastName?: string;
  email: string;
  activated: boolean;
  langKey?: string;
  authorities: string[];
}

function toAuthorities(role?: string): string[] {
  if (role === "admin") return ["ROLE_ADMIN"];
  if (role === "secretary") return ["ROLE_USER", "ROLE_SECRETARY"];
  if (role === "room_manager") return ["ROLE_USER", "ROLE_ROOM_MANAGER"];
  return ["ROLE_USER"];
}

function fromAuthorities(authorities?: string[]): string {
  if (!authorities?.length) return "employee";
  if (authorities.includes("ROLE_ADMIN")) return "admin";
  if (authorities.includes("ROLE_SECRETARY")) return "secretary";
  if (authorities.includes("ROLE_ROOM_MANAGER")) return "room_manager";
  return "employee";
}

export async function getUsers(params?: { page?: number; size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.size != null) sp.set("size", String(params.size ?? 100));
  const q = sp.toString();
  const list = await fetchApi<unknown[]>(`/api/admin/users${q ? "?" + q : ""}`);
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
      role: fromAuthorities(u.authorities),
      activated: u.activated,
    };
  });
}

export async function createUser(data: {
  login: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
}) {
  const payload: AdminUserPayload = {
    login: data.login,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    activated: true,
    langKey: "vi",
    authorities: toAuthorities(data.role),
  };
  return fetchApi("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  id: string,
  data: {
    login: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
    activated?: boolean;
  }
) {
  const payload: AdminUserPayload = {
    id: Number(id),
    login: data.login,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    activated: data.activated ?? true,
    langKey: "vi",
    authorities: toAuthorities(data.role),
  };
  return fetchApi(`/api/admin/users/${data.login}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(login: string) {
  return fetchApi<void>(`/api/admin/users/${encodeURIComponent(login)}`, {
    method: "DELETE",
  });
}

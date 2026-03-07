import { fetchApi } from "@/lib/api";

export interface SettingDTO {
  id?: number;
  userId?: number | null;
  category: string;
  key: string;
  value?: string | null;
}

/** Lấy tất cả cấu hình của user hiện tại */
export async function getCurrentUserSettings(): Promise<SettingDTO[]> {
  return fetchApi<SettingDTO[]>("/api/settings");
}

/** Lấy một cấu hình theo key (user hiện tại) */
export async function getCurrentUserSettingByKey(key: string): Promise<SettingDTO | null> {
  try {
    return await fetchApi<SettingDTO>(`/api/settings/key/${encodeURIComponent(key)}`);
  } catch {
    return null;
  }
}

/** Lưu cấu hình user (tạo hoặc cập nhật theo key) */
export async function saveUserSetting(setting: { key: string; value?: string | null }): Promise<SettingDTO> {
  return fetchApi<SettingDTO>("/api/settings", {
    method: "POST",
    body: JSON.stringify({ category: "USER", ...setting }),
  });
}

/** Xóa cấu hình theo id (user hiện tại) */
export async function deleteUserSetting(id: number): Promise<void> {
  return fetchApi(`/api/settings/${id}`, { method: "DELETE" });
}

/** Xóa cấu hình theo key (user hiện tại) */
export async function deleteUserSettingByKey(key: string): Promise<void> {
  return fetchApi(`/api/settings/key/${encodeURIComponent(key)}`, { method: "DELETE" });
}

// ---------- Admin: cấu hình hệ thống ----------

/** Lấy tất cả cấu hình hệ thống (admin) */
export async function getSystemSettings(): Promise<SettingDTO[]> {
  return fetchApi<SettingDTO[]>("/api/admin/settings");
}

/** Lưu cấu hình hệ thống (admin) */
export async function saveSystemSetting(setting: { key: string; value?: string | null }): Promise<SettingDTO> {
  return fetchApi<SettingDTO>("/api/admin/settings", {
    method: "POST",
    body: JSON.stringify({ category: "SYSTEM", userId: null, ...setting }),
  });
}

/** Cập nhật cấu hình hệ thống (admin) */
export async function updateSystemSetting(id: number, setting: { key: string; value?: string | null }): Promise<SettingDTO> {
  return fetchApi<SettingDTO>(`/api/admin/settings/${id}`, {
    method: "PUT",
    body: JSON.stringify({ id, category: "SYSTEM", userId: null, ...setting }),
  });
}

/** Xóa cấu hình hệ thống (admin) */
export async function deleteSystemSetting(id: number): Promise<void> {
  return fetchApi(`/api/admin/settings/${id}`, { method: "DELETE" });
}

import { fetchApi } from "@/lib/api";

export interface NotificationDTO {
  id: number;
  userId: number;
  title: string;
  message?: string | null;
  readAt?: string | null;
  createdDate: string;
  type?: string | null;
  linkUrl?: string | null;
}

export interface NotificationPage {
  content: NotificationDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/** Danh sách thông báo của user (phân trang) */
export async function getNotifications(page = 0, size = 20): Promise<NotificationPage> {
  const res = await fetchApi<NotificationPage>(
    `/api/notifications?page=${page}&size=${size}&sort=createdDate,desc`
  );
  return res;
}

/** Số thông báo chưa đọc */
export async function getUnreadNotificationCount(): Promise<number> {
  return fetchApi<number>("/api/notifications/unread-count");
}

/** Đánh dấu một thông báo đã đọc */
export async function markNotificationAsRead(id: number): Promise<void> {
  return fetchApi(`/api/notifications/${id}/read`, { method: "PATCH" });
}

/** Đánh dấu tất cả đã đọc */
export async function markAllNotificationsAsRead(): Promise<void> {
  return fetchApi("/api/notifications/mark-all-read", { method: "POST" });
}

/** Xóa một thông báo */
export async function deleteNotification(id: number): Promise<void> {
  return fetchApi(`/api/notifications/${id}`, { method: "DELETE" });
}

/** Tạo thông báo (dùng từ service khác hoặc admin) */
export async function createNotification(dto: {
  userId?: number;
  title: string;
  message?: string;
  type?: string;
  linkUrl?: string;
}): Promise<NotificationDTO> {
  return fetchApi<NotificationDTO>("/api/notifications", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * API client cho JHipster meetings backend (JWT)
 * * Khi chạy local hoặc nhúng trong app mobile (WebView load từ IP máy), API base dùng cùng hostname, port 8080.
 */
function getApiBase(): string {
  if (typeof window === "undefined") {
    return import.meta.env.VITE_API_URL || "http://localhost:8080";
  }
  const hostname = window.location.hostname;
  const envUrl = import.meta.env.VITE_API_URL;
  const isProduction =
      /vercel\.app|netlify\.app|railway\.app|plan-my-meeting\./.test(hostname) ||
      (typeof envUrl === "string" && envUrl.startsWith("https://"));
  if (isProduction && envUrl) return envUrl;
  return `http://${hostname}:8080`;
}

export const API_BASE = getApiBase();
const AUTH_TOKEN_KEY = "jhi-authenticationToken";

let pendingRequests = 0;
const loadingListeners = new Set<() => void>();

function notifyLoadingListeners(): void {
  loadingListeners.forEach(listener => listener());
}

function startRequest(): void {
  pendingRequests += 1;
  notifyLoadingListeners();
}

function finishRequest(): void {
  pendingRequests = Math.max(0, pendingRequests - 1);
  notifyLoadingListeners();
}

async function withGlobalLoading<T>(request: () => Promise<T>): Promise<T> {
  startRequest();
  try {
    return await request();
  } finally {
    finishRequest();
  }
}

export function subscribeApiLoading(listener: () => void): () => void {
  loadingListeners.add(listener);
  return () => {
    loadingListeners.delete(listener);
  };
}

export function getIsApiLoading(): boolean {
  return pendingRequests > 0;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string, rememberMe: boolean): void {
  if (rememberMe) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export function clearStoredToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  id_token: string;
}

export async function loginApi(body: LoginRequest): Promise<{ token: string }> {
  return withGlobalLoading(async () => {
    const res = await fetch(`${API_BASE}/api/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Lỗi đăng nhập - hiển thị thông báo chung
      throw new Error("Tên đăng nhập hoặc mật khẩu không đúng");
    }
    let token = res.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      const data = (await res.json()) as LoginResponse;
      token = data?.id_token;
    }
    if (!token) throw new Error("Không nhận được token");
    return { token };
  });
}

export interface Account {
  id?: string | number;
  login: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  langKey?: string;
  activated?: boolean;
  authorities?: string[];
  department?: string;
  departmentId?: number;
  position?: string;
}

export interface RegisterRequest {
  login: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export async function registerApi(body: RegisterRequest): Promise<void> {
  return withGlobalLoading(async () => {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Kiểm tra lỗi trùng email hoặc username
      const errorMessage = err.message || err.title || "";
      if (errorMessage.toLowerCase().includes("email")) {
        throw new Error("Email đã được sử dụng");
      }
      if (errorMessage.toLowerCase().includes("login") || errorMessage.toLowerCase().includes("username")) {
        throw new Error("Tên đăng nhập đã được sử dụng");
      }
      throw new Error("Đăng ký thất bại. Vui lòng thử lại.");
    }
  });
}

export async function getAccount(): Promise<Account | null> {
  return withGlobalLoading(async () => {
    const token = getStoredToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/api/account`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error("Lỗi tải thông tin tài khoản");
    return res.json();
  });
}

/**
 * Register Expo push token for current user/device (used by embedded mobile WebView).
 * Endpoint: POST /api/account/expo-push-token body: { token }
 */
export async function registerExpoPushToken(expoToken: string): Promise<void> {
  const token = getStoredToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const trimmed = (expoToken || "").trim();
  if (!trimmed) throw new Error("Thiếu push token");
  await fetchApi<void>("/api/account/expo-push-token", {
    method: "POST",
    body: JSON.stringify({ token: trimmed }),
  });
}

/** URL for current user's avatar (append ?t=version for cache bust). */
export function getAccountAvatarUrl(version?: number): string {
  const base = `${API_BASE}/api/account/avatar`;
  const token = getStoredToken();
  if (!token) return base;
  return version != null ? `${base}?t=${version}` : base;
}

/** Upload current user's avatar (base64). */
export async function uploadAccountAvatar(file: File): Promise<void> {
  const base64 = await fileToBase64(file);
  await uploadAccountAvatarFromBlob(base64);
}

/** Upload from blob (e.g. after crop). */
export async function uploadAccountAvatarFromBlob(blob: Blob): Promise<void> {
  const base64 = await blobToBase64(blob);
  const contentType = blob.type || "image/jpeg";
  const token = getStoredToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const res = await fetch(`${API_BASE}/api/account/avatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ file: base64, fileContentType: contentType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.detail || "Không thể tải ảnh lên");
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = r.result as string;
      res(dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl);
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = r.result as string;
      res(dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl);
    };
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

/** Delete current user's avatar. */
export async function deleteAccountAvatar(): Promise<void> {
  const token = getStoredToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const res = await fetch(`${API_BASE}/api/account/avatar`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.detail || "Không thể xóa ảnh");
  }
}

/** URL for a user's avatar by id (for participant/staff lists). */
export function getUserAvatarUrl(userId: string | number, version?: number): string {
  const base = `${API_BASE}/api/users/${userId}/avatar`;
  return version != null ? `${base}?t=${version}` : base;
}

/** Fetch current user avatar as Blob (with auth). Returns null if 204/no image. */
export async function fetchAccountAvatarBlob(): Promise<Blob | null> {
  const token = getStoredToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/account/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) return null;
  return res.blob();
}

/** Fetch a user's avatar by id as Blob (with auth). Returns null if 204/no image. */
export async function fetchUserAvatarBlob(userId: string | number): Promise<Blob | null> {
  const token = getStoredToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/users/${userId}/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) return null;
  return res.blob();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = getStoredToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const res = await fetch(`${API_BASE}/api/account/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.message || err?.detail || err?.title || "";
    if (msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("sai") || msg.toLowerCase().includes("không đúng")) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }
    throw new Error(msg || "Không thể đổi mật khẩu");
  }
}

export async function fetchApi<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  return withGlobalLoading(async () => {
    const token = getStoredToken();
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    if (res.status === 401) {
      clearStoredToken();
      window.location.href = "/login";
      throw new Error("Phiên đăng nhập hết hạn");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const rawMessage = err?.message || err?.detail || err?.title || "";
      const combined = `${rawMessage} ${JSON.stringify(err)}`.toLowerCase();

      if (
        res.status === 409 ||
        combined.includes("conflict") ||
        combined.includes("xung đột") ||
        combined.includes("room") ||
        combined.includes("phòng") ||
        combined.includes("trùng")
      ) {
        throw new Error(
          "Không thể gửi duyệt do xung đột lịch/phòng. Vui lòng kiểm tra lại: thời gian họp, phòng họp, người tham dự hoặc thiết bị đang bị trùng." +
            (rawMessage ? ` Chi tiết: ${rawMessage}` : "")
        );
      }

      throw new Error(rawMessage || res.statusText || "Lỗi yêu cầu");
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  });
}

/** Fetch binary (blob) with auth; for download endpoints. */
export async function fetchApiBlob(path: string): Promise<{ blob: Blob; filename: string }> {
  return withGlobalLoading(async () => {
    const token = getStoredToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (res.status === 401) {
      clearStoredToken();
      window.location.href = "/login";
      throw new Error("Phiên đăng nhập hết hạn");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const rawMessage = err?.message || err?.detail || err?.title || res.statusText;
      throw new Error(rawMessage || "Lỗi tải file");
    }
    const blob = await res.blob();
    let filename = "document";
    const disp = res.headers.get("Content-Disposition");
    if (disp) {
      const m = disp.match(/filename="?([^";\n]+)"?/);
      if (m) filename = m[1].trim();
    }
    return { blob, filename };
  });
}

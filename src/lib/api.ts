/**
 * API client cho JHipster meetings backend (JWT)
 */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
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

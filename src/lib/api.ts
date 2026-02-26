/**
 * API client cho JHipster meetings backend (JWT)
 */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const AUTH_TOKEN_KEY = "jhi-authenticationToken";

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
  const res = await fetch(`${API_BASE}/api/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText || "Đăng nhập thất bại");
  }
  let token = res.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    const data = (await res.json()) as LoginResponse;
    token = data?.id_token;
  }
  if (!token) throw new Error("Không nhận được token");
  return { token };
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
}

export interface RegisterRequest {
  login: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export async function registerApi(body: RegisterRequest): Promise<void> {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText || "Đăng ký thất bại");
  }
}

export async function getAccount(): Promise<Account | null> {
  const token = getStoredToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/account`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Lỗi tải thông tin tài khoản");
  return res.json();
}

export async function fetchApi<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
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
    throw new Error(err.message || res.statusText || "Lỗi yêu cầu");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

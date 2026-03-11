import { useEffect, useState, createContext, useContext } from "react";
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  loginApi,
  getAccount,
  type Account,
} from "@/lib/api";

interface AuthContextType {
  user: Account | null;
  loading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<Account>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ login: "", authorities: [] } as Account),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const timeout = setTimeout(() => setLoading(false), 5000);
    getAccount()
      .then((account) => {
        setUser(account);
      })
      .catch(() => {
        clearStoredToken();
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
    return () => clearTimeout(timeout);
  }, []);

  // Khi nhúng trong app mobile (WebView), gửi authorities sang RN để hiện tab Báo cáo cho admin
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ReactNativeWebView) return;
    const payload = user
      ? { type: "user", authorities: user.authorities ?? [] }
      : { type: "user", authorities: [] };
    try {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [user]);

  const login = async (username: string, password: string, rememberMe = false): Promise<Account> => {
    const { token } = await loginApi({ username, password, rememberMe });
    setStoredToken(token, rememberMe);
    const account = await getAccount();
    setUser(account);
    return account;
  };

  const signOut = async () => {
    clearStoredToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

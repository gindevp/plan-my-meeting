import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

function isEmbed(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView) return true;
  try {
    return new URL(window.location.href).searchParams.get("embed") === "1";
  } catch {
    return false;
  }
}

/**
 * Khi chạy trong app (embed), chỉ hiện một màn loading full màn hình cho đến khi
 * auth xác định xong. Tránh nháy nav/layout/redirect khi splash vừa tắt.
 */
export function EmbedAuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const embed = isEmbed();

  if (embed && loading) {
    return (
      <div className="fixed inset-0 z-[9998] min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-background to-primary/5">
        <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={2} />
        <p className="mt-4 text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  return <>{children}</>;
}

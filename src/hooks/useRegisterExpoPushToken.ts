import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { registerExpoPushToken } from "@/lib/api";

declare global {
  interface Window {
    __EXPO_PUSH_TOKEN__?: string;
  }
}

/**
 * Khi chạy trong app mobile (WebView embed), đọc Expo push token do native inject
 * và đăng ký lên server để nhận push khi có thông báo.
 */
export function useRegisterExpoPushToken(enabled: boolean) {
  const { user } = useAuth();
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id) return;
    const isEmbed = typeof window !== "undefined" && !!(window as any).ReactNativeWebView;
    if (!isEmbed) return;

    const tryRegister = () => {
      const token = (window as Window).__EXPO_PUSH_TOKEN__;
      if (!token || token === registered.current) return;
      registered.current = token;
      registerExpoPushToken(token).catch(() => {
        registered.current = null;
      });
    };

    tryRegister();
    const t1 = window.setTimeout(tryRegister, 500);
    const t2 = window.setTimeout(tryRegister, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [enabled, user?.id]);
}

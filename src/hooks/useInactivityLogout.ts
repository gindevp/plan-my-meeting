import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const SECURITY_SETTINGS_KEY = "app-security-settings";
const INACTIVITY_MS = 10 * 60 * 1000; // 10 phút

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

export function useInactivityLogout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const raw = localStorage.getItem(SECURITY_SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (parsed.autoLogout === false) {
          resetTimer();
          return;
        }
      } catch {
        // default: logout
      }
      signOut();
      navigate("/login", { replace: true });
    }, INACTIVITY_MS);
  }, [signOut, navigate]);

  useEffect(() => {
    if (!user) return;

    try {
      const raw = localStorage.getItem(SECURITY_SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed.autoLogout === false) return;
    } catch {
      // default: enable auto logout
    }

    resetTimer();

    const handleActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, handleActivity));

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);
}

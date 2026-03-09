import { useState, useEffect, useRef } from "react";
import { fetchAccountAvatarBlob, fetchUserAvatarBlob } from "@/lib/api";

/**
 * Fetches avatar with auth and returns a blob URL so <img> can display it.
 * Revokes the object URL on unmount or when refetching.
 */
export function useAvatarBlobUrl(userId: string | number | null | undefined, avatarVersion: number) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUrlRef = useRef<string | null>(null);

  const revokeCurrent = () => {
    if (currentUrlRef.current) {
      try {
        URL.revokeObjectURL(currentUrlRef.current);
      } catch {}
      currentUrlRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    revokeCurrent();
    setBlobUrl(null);
    setLoading(true);
    const fetchAvatar = async () => {
      try {
        const blob =
          userId != null && userId !== ""
            ? await fetchUserAvatarBlob(userId)
            : await fetchAccountAvatarBlob();
        if (cancelled) {
          if (blob) URL.revokeObjectURL(URL.createObjectURL(blob));
          return;
        }
        if (blob) {
          const url = URL.createObjectURL(blob);
          currentUrlRef.current = url;
          setBlobUrl(url);
        } else {
          setBlobUrl(null);
        }
      } catch {
        if (!cancelled) setBlobUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAvatar();
    return () => {
      cancelled = true;
      revokeCurrent();
      setBlobUrl(null);
    };
  }, [userId, avatarVersion]);

  return { blobUrl, loading };
}

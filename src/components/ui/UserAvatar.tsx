import { useAuth } from "@/contexts/AuthContext";
import { useAvatarVersion } from "@/contexts/AvatarVersionContext";
import { useAvatarBlobUrl } from "@/hooks/useAvatarBlobUrl";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  /** When provided, show avatar for that user (e.g. in participant/staff list). Otherwise current user. */
  userId?: string | number | null;
  /** Display name or login for fallback initial. */
  name?: string;
  size?: number;
  className?: string;
}

export function UserAvatar({ userId, name, size = 40, className }: UserAvatarProps) {
  const { user } = useAuth();
  const { avatarVersion } = useAvatarVersion();

  const isCurrentUser = userId == null || (user?.id != null && String(user.id) === String(userId));
  const effectiveUserId = isCurrentUser ? null : (userId ?? null);
  const { blobUrl, loading } = useAvatarBlobUrl(effectiveUserId, avatarVersion);

  const displayName = name ?? (isCurrentUser ? (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.login) : "") ?? "?";
  const initial = (displayName.trim()[0] || "U").toUpperCase();

  const src = blobUrl;

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold overflow-hidden", className)}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.4) }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className={cn("h-full w-full object-cover", loading && "opacity-70")}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            const next = (e.target as HTMLImageElement).nextElementSibling;
            if (next) (next as HTMLElement).style.display = "flex";
          }}
        />
      ) : null}
      <span
        className="flex items-center justify-center h-full w-full"
        style={{ display: src ? "none" : "flex" }}
      >
        {loading ? "…" : initial}
      </span>
    </div>
  );
}

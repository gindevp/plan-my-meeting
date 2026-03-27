import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { aiAssistantChat, type AiUiContext } from "@/services/api/aiAssistant";
import { createMeetingFromForm } from "@/services/api/meetings";
import { getAiBridgeContext, subscribeAiBridgeContext } from "@/lib/aiContextBridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type XY = { x: number; y: number };
type MeetingRow = { id: number | string; title: string; startTime?: string; status?: string };
type ChatMessage = { role: "user" | "assistant"; content: string; meetingsTable?: MeetingRow[] };

type KvRow = { key: string; value: string };

const parseKvFromMarkdownish = (content: string): { rows: KvRow[]; roles: string[] } => {
  const rows: KvRow[] = [];
  const roles: string[] = [];
  const lines = String(content || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let inRoles = false;
  for (const line of lines) {
    const kv = line.match(/^-\s*\*\*(.+?)\*\*\s*:\s*(.*)$/);
    if (kv) {
      const key = kv[1]?.trim() || "";
      const value = (kv[2] ?? "").trim();
      rows.push({ key, value });
      inRoles = key.toLowerCase().includes("vai trò") || key.toLowerCase().includes("role");
      continue;
    }
    if (inRoles) {
      const r = line.match(/^-\s*(ROLE_[A-Z0-9_]+)\s*$/);
      if (r) {
        roles.push(r[1]);
        continue;
      }
      // stop if role block ends
      if (line.startsWith("- **")) inRoles = false;
    }
  }

  return { rows, roles };
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

export default function AiAssistantOverlay() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [bubblePos, setBubblePos] = useState<XY>({ x: 24, y: 24 });
  const [chatPos, setChatPos] = useState<XY>({ x: 24, y: 90 });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bridgeCtx, setBridgeCtx] = useState(getAiBridgeContext());
  const [domOpenModals, setDomOpenModals] = useState<string[]>([]);
  const modalNamesRef = useRef<string[]>([]);
  const rafRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const bubbleAboveChatRef = useRef(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const BUBBLE_SIZE = 48;
  const GAP = 8;
  const CHAT_WIDTH = 360;
  const CHAT_HEIGHT = 420;
  const STORAGE_KEY = "aiAssistantOverlayPos.v1";

  useEffect(() => {
    // Initialize position away from header (notification button).
    const margin = 16;
    const fallbackBubble: XY = {
      x: Math.max(8, window.innerWidth - BUBBLE_SIZE - margin),
      y: Math.max(8, window.innerHeight - BUBBLE_SIZE - margin),
    };
    const fallbackChat: XY = {
      x: clamp(fallbackBubble.x, 8, window.innerWidth - CHAT_WIDTH - 8),
      y: clamp(fallbackBubble.y - 320, 8, window.innerHeight - 120),
    };
    const isValidBubblePos = (b: XY) =>
      Number.isFinite(b.x) &&
      Number.isFinite(b.y) &&
      b.x >= 8 &&
      b.x <= window.innerWidth - BUBBLE_SIZE - 8 &&
      b.y >= 96 && // avoid header/notification area after reload
      b.y <= window.innerHeight - BUBBLE_SIZE - 8;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { bubblePos?: XY; chatPos?: XY };
        const b = parsed?.bubblePos;
        const c = parsed?.chatPos;
        if (b && isValidBubblePos(b)) {
          setBubblePos({
            x: clamp(b.x, 8, window.innerWidth - BUBBLE_SIZE - 8),
            y: clamp(b.y, 8, window.innerHeight - BUBBLE_SIZE - 8),
          });
        } else {
          setBubblePos(fallbackBubble);
        }
        if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) {
          setChatPos({
            x: clamp(c.x, 8, window.innerWidth - CHAT_WIDTH - 8),
            y: clamp(c.y, 8, window.innerHeight - 120),
          });
        } else {
          setChatPos(fallbackChat);
        }
        return;
      }
    } catch {
      // ignore
    }
    setBubblePos(fallbackBubble);
    setChatPos(fallbackChat);
  }, []);

  useEffect(() => {
    // Persist positions for next load.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ bubblePos, chatPos }));
    } catch {
      // ignore
    }
  }, [bubblePos, chatPos]);

  useEffect(() => subscribeAiBridgeContext(setBridgeCtx), []);

  useEffect(() => {
    const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
    const pickModalNames = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"], [role="dialog"]:not([data-state="closed"])'));
      const names = dialogs.map((el, idx) => {
        const title = el.getAttribute("aria-label") || el.getAttribute("data-dialog-name") || "";
        return title || `dialog-${idx + 1}`;
      });
      if (!sameList(modalNamesRef.current, names)) {
        modalNamesRef.current = names;
        setDomOpenModals(names);
      }
    };

    const schedulePick = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        pickModalNames();
      });
    };

    pickModalNames();
    const mo = new MutationObserver(() => schedulePick());
    mo.observe(document.body, { subtree: true, childList: true });
    return () => {
      mo.disconnect();
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const extractMeetingIdFromRoute = (path: string, search: string): number | null => {
    const byQuery = new URLSearchParams(search).get("meetingId");
    if (byQuery && !Number.isNaN(Number(byQuery))) return Number(byQuery);
    const m = path.match(/\/meeting\/(\d+)|\/meetings\/edit\/(\d+)/i);
    const id = m?.[1] ?? m?.[2];
    if (id && !Number.isNaN(Number(id))) return Number(id);
    return null;
  };

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const uiContext: AiUiContext = useMemo(
    () => ({
      route: location.pathname + location.search,
      meetingId: bridgeCtx.meetingId ?? extractMeetingIdFromRoute(location.pathname, location.search),
      openModals: Array.from(new Set([...(bridgeCtx.openModals ?? []), ...domOpenModals])),
      selectedItems: bridgeCtx.selectedItems ?? {},
      user: {
        id: user?.id,
        role: (user?.authorities ?? [])[0] ?? "USER",
        permissions: user?.authorities ?? [],
      },
      // Extra runtime hints for backend prompt/context
      clientNow: new Date().toISOString(),
    }),
    [location.pathname, location.search, bridgeCtx, domOpenModals, user]
  );

  const computeChatPosFromBubble = (b: XY) => {
    const maxChatX = Math.max(8, window.innerWidth - CHAT_WIDTH - 8);
    const maxChatY = Math.max(8, window.innerHeight - CHAT_HEIGHT - 8);
    const belowY = b.y + BUBBLE_SIZE + GAP;
    const canPlaceBelow = belowY <= maxChatY;
    if (canPlaceBelow) {
      bubbleAboveChatRef.current = true;
      return {
        chat: { x: clamp(b.x, 8, maxChatX), y: clamp(belowY, 8, maxChatY) },
        bubble: { x: clamp(b.x, 8, window.innerWidth - BUBBLE_SIZE - 8), y: clamp(b.y, 8, window.innerHeight - BUBBLE_SIZE - 8) },
      };
    }
    const aboveY = b.y - GAP - CHAT_HEIGHT;
    bubbleAboveChatRef.current = false;
    return {
      chat: { x: clamp(b.x, 8, maxChatX), y: clamp(aboveY, 8, maxChatY) },
      bubble: { x: clamp(b.x, 8, window.innerWidth - BUBBLE_SIZE - 8), y: clamp(b.y, 8, window.innerHeight - BUBBLE_SIZE - 8) },
    };
  };

  const startDrag = (setter: Dispatch<SetStateAction<XY>>, kind: "bubble" | "chat" | "both") => (e: React.PointerEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const origin = { x: rect.left, y: rect.top };
    const originChat = { ...chatPos };
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
        suppressClickRef.current = true;
      }
      if (kind === "bubble") {
        const nx = clamp(origin.x + (ev.clientX - startX), 8, window.innerWidth - BUBBLE_SIZE - 8);
        const ny = clamp(origin.y + (ev.clientY - startY), 8, window.innerHeight - BUBBLE_SIZE - 8);
        setter({ x: nx, y: ny });
        return;
      }
      if (kind === "both") {
        const maxChatX = Math.max(8, window.innerWidth - CHAT_WIDTH - 8);
        const maxChatY = Math.max(8, window.innerHeight - CHAT_HEIGHT - 8);
        const nx = clamp(originChat.x + (ev.clientX - startX), 8, maxChatX);
        const ny = clamp(originChat.y + (ev.clientY - startY), 8, maxChatY);
        setChatPos({ x: nx, y: ny });
        if (bubbleAboveChatRef.current) {
          setBubblePos({ x: nx, y: clamp(ny - (BUBBLE_SIZE + GAP), 8, window.innerHeight - BUBBLE_SIZE - 8) });
        } else {
          setBubblePos({ x: nx, y: clamp(ny + CHAT_HEIGHT + GAP, 8, window.innerHeight - BUBBLE_SIZE - 8) });
        }
        return;
      }

      // Dragging popup: keep icon attached right above popup.
      const nx = clamp(origin.x + (ev.clientX - startX), 8, window.innerWidth - CHAT_WIDTH - 8);
      const ny = clamp(origin.y + (ev.clientY - startY), 8, window.innerHeight - 120);
      setter({ x: nx, y: ny });
      if (bubbleAboveChatRef.current) {
        setBubblePos({
          x: nx,
          y: clamp(ny - (BUBBLE_SIZE + GAP), 8, window.innerHeight - BUBBLE_SIZE - 8),
        });
      } else {
        setBubblePos({
          x: nx,
          y: clamp(ny + CHAT_HEIGHT + GAP, 8, window.innerHeight - BUBBLE_SIZE - 8),
        });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const handleClientActions = async (actions: Array<{ name: string; status: string; payload?: any; message: string }>) => {
    actions.forEach((a) => {
      if (a.status !== "client_action") return;
      if (a.name === "navigateToPage" && a.payload?.path) {
        navigate(String(a.payload.path));
        toast({ title: "AI đã mở cuộc họp", description: "Đã điều hướng tới cuộc họp theo yêu cầu." });
      } else if (a.name === "openModal") {
        toast({ title: "AI gợi ý mở modal", description: a.message || "Bạn có thể mở modal tương ứng trên màn hình hiện tại." });
      }
    });
    const createAction = actions.find((a) => a.status === "client_action" && a.name === "createMeetingFromAi" && a.payload);
    if (createAction?.payload) {
      const p = createAction.payload as any;
      const start = p.startTime ? new Date(p.startTime) : null;
      const end = p.endTime ? new Date(p.endTime) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        toast({ variant: "destructive", title: "Không tạo được cuộc họp", description: "Thời gian AI gửi không hợp lệ." });
        return;
      }
      try {
        await createMeetingFromForm({
          title: p.title || "Cuộc họp mới",
          description: p.description || "",
          startDate: start.toISOString().slice(0, 10),
          startTime: start.toISOString().slice(11, 16),
          endDate: end.toISOString().slice(0, 10),
          endTime: end.toISOString().slice(11, 16),
          meetingType: (p.meetingType || "offline") as "offline" | "online" | "hybrid",
          meetingLevel: (p.meetingLevel || "department") as "company" | "department" | "team",
          selectedRoomId: p.selectedRoomId != null ? String(p.selectedRoomId) : undefined,
          meetingLink: p.meetingLink || undefined,
          requesterId: Number(p.requesterId ?? user?.id),
          hostId: Number(p.hostId ?? user?.id),
          secretaryId: p.secretaryId != null ? Number(p.secretaryId) : undefined,
          organizerDepartmentId: p.organizerDepartmentId != null ? Number(p.organizerDepartmentId) : undefined,
          submitAfterCreate: false,
        });
        toast({ title: "Đã tạo cuộc họp", description: "AI đã tạo cuộc họp bản nháp thành công." });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Không thể tạo cuộc họp",
          description: err instanceof Error ? err.message : "Vui lòng kiểm tra lại dữ liệu và thử lại.",
        });
      }
    }
  };

  const extractMeetingsTable = (actions: Array<{ name: string; status: string; payload?: any }> | undefined): MeetingRow[] | undefined => {
    if (!actions || actions.length === 0) return undefined;
    const hit = actions.find((a) => a.name === "getUserMeetings" && a.status === "executed" && Array.isArray(a.payload?.meetings));
    if (!hit) return undefined;
    return (hit.payload.meetings as any[]).slice(0, 12).map((m: any) => ({
      id: m.id ?? "",
      title: m.title ?? "",
      startTime: m.startTime ?? "",
      status: m.status ?? "",
    }));
  };

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await aiAssistantChat({
        message: question,
        context: uiContext,
        userId: user?.id,
        conversationId,
        recentMessages: next.slice(-8),
      });
      setConversationId(res.conversationId);
      const meetingsTable = extractMeetingsTable(res.actions ?? []);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer || "", meetingsTable }]);
      await handleClientActions(res.actions ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể gọi AI Assistant.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Lỗi: ${message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      if (!prev) {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return prev;
      }
        // Opening: popup appears near icon, but keep icon fixed.
      const pos = computeChatPosFromBubble(bubblePos);
      setChatPos(pos.chat);
        return true;
      }
      return false;
    });
  };

  // Only show assistant for authenticated users.
  if (!user?.id) return null;

  return (
    <>
      <button
        type="button"
        className={`fixed z-[10000] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg ${open ? "" : "animate-pulse"}`}
        style={{ left: bubblePos.x, top: bubblePos.y }}
        onPointerDown={!open ? startDrag(setBubblePos, "bubble") : undefined}
        onClick={toggleOpen}
      >
        <Bot className="h-6 w-6 mx-auto" />
      </button>

      {open && (
        <div
          className="fixed z-[10001] w-[360px] max-w-[calc(100vw-16px)] rounded-xl border bg-background shadow-2xl"
          style={{ left: chatPos.x, top: chatPos.y }}
        >
          <div
            className="flex items-center justify-between border-b px-3 py-2 cursor-move"
            onPointerDown={startDrag(setChatPos, "chat")}
          >
            <div className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={listRef} className="h-80 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.length === 0 && (
              <div className="text-muted-foreground text-xs">
                Hỏi bất cứ điều gì về màn hình hiện tại, cuộc họp đang mở hoặc yêu cầu AI điều hướng giúp bạn.
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "text-foreground" : "text-muted-foreground"}>
                <span className="font-medium">{m.role === "user" ? "Bạn" : "AI"}:</span>{" "}
                {m.role === "assistant" ? (() => {
                  const { rows, roles } = parseKvFromMarkdownish(m.content);
                  const hasKv = rows.length >= 2;
                  if (!hasKv) return <span className="whitespace-pre-wrap">{m.content}</span>;
                  const filteredRows = rows.filter(r => r.key && r.key.toLowerCase() !== "vai trò" && r.key.toLowerCase() !== "role");
                  const header = rows[0]?.key?.toLowerCase().includes("thông tin") ? rows[0].key : "Thông tin";
                  return (
                    <div className="mt-1 rounded-md border bg-card text-foreground">
                      <div className="px-3 py-2 border-b flex items-center justify-between">
                        <div className="text-xs font-semibold">{header}</div>
                        {roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-end">
                            {roles.slice(0, 10).map((r) => (
                              <Badge key={r} variant="secondary" className="text-[10px] px-2 py-0.5">{r}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="p-2 overflow-x-auto">
                        <table className="w-full text-xs">
                          <tbody>
                            {filteredRows.slice(0, 12).map((r, ridx) => (
                              <tr key={`${r.key}-${ridx}`} className={ridx === 0 ? "" : "border-t"}>
                                <td className="px-2 py-1.5 font-medium text-muted-foreground align-top w-[40%]">{r.key}</td>
                                <td className="px-2 py-1.5 whitespace-pre-wrap">{r.value || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })() : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
                {m.role === "assistant" && m.meetingsTable && m.meetingsTable.length > 0 && (
                  <div className="mt-2 overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium">ID</th>
                          <th className="px-2 py-1 text-left font-medium">Tiêu đề</th>
                          <th className="px-2 py-1 text-left font-medium">Bắt đầu</th>
                          <th className="px-2 py-1 text-left font-medium">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.meetingsTable.map((r, ridx) => (
                          <tr key={`${r.id}-${ridx}`} className="border-t">
                            <td className="px-2 py-1">#{r.id}</td>
                            <td className="px-2 py-1">{r.title}</td>
                            <td className="px-2 py-1">{r.startTime ? new Date(r.startTime).toLocaleString("vi-VN") : "-"}</td>
                            <td className="px-2 py-1">{r.status || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang suy nghĩ...
              </div>
            )}
          </div>

          <div className="border-t p-2 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="Nhập yêu cầu..."
              disabled={loading}
            />
            <Button size="icon" onClick={() => void send()} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}


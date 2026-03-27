import { fetchApi } from "@/lib/api";

export type AiUiContext = {
  route: string;
  meetingId?: number | null;
  openModals?: string[];
  selectedItems?: Record<string, unknown>;
  clientNow?: string;
  user?: {
    id?: number | string;
    role?: string;
    permissions?: string[];
  };
};

export type AiAssistantMessage = { role: "user" | "assistant"; content: string };

export type AiAssistantActionResult = {
  name: string;
  status: "executed" | "client_action" | "needs_confirmation" | "rejected";
  requiresConfirmation: boolean;
  message: string;
  payload?: Record<string, unknown>;
};

export type AiAssistantChatResponse = {
  conversationId: string;
  answer: string;
  actions: AiAssistantActionResult[];
};

export async function aiAssistantChat(payload: {
  message: string;
  context: AiUiContext;
  userId?: number | string;
  conversationId?: string;
  recentMessages?: AiAssistantMessage[];
  timeoutMs?: number;
}) {
  const timeoutMs = Math.max(5000, Number(payload.timeoutMs ?? 45000));
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchApi<AiAssistantChatResponse>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("AI phản hồi quá lâu, vui lòng thử lại.");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}


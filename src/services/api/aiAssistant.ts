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
}) {
  return fetchApi<AiAssistantChatResponse>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export type AiBridgeContext = {
  meetingId?: number | null;
  openModals?: string[];
  selectedItems?: Record<string, unknown>;
};

let current: AiBridgeContext = {};
const listeners = new Set<(ctx: AiBridgeContext) => void>();

export function getAiBridgeContext(): AiBridgeContext {
  return current;
}

export function setAiBridgeContext(next: AiBridgeContext) {
  // Replace instead of merge to avoid stale context leaking across screens.
  current = {
    meetingId: next.meetingId ?? null,
    openModals: next.openModals ?? [],
    selectedItems: next.selectedItems ?? {},
  };
  listeners.forEach((l) => l(current));
}

export function subscribeAiBridgeContext(listener: (ctx: AiBridgeContext) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


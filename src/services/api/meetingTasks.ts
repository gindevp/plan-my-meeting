import { fetchApi } from "@/lib/api";

const taskStatusMap: Record<string, string> = {
  TODO: "not_started",
  IN_PROGRESS: "in_progress",
  DONE: "completed",
  OVERDUE: "overdue",
};

export interface MeetingTaskItem {
  id: string;
  meetingId: string;
  title: string;
  assignee: string;
  deadline: string;
  status: "not_started" | "in_progress" | "completed" | "overdue";
}

export async function getMeetingTasks(): Promise<MeetingTaskItem[]> {
  const list = await fetchApi<unknown[]>(`/api/meeting-tasks`);
  return (list as any[]).map((t) => ({
    id: String(t.id),
    meetingId: String(t.meeting?.id ?? ""),
    title: t.title ?? "",
    assignee: t.assignee?.login ?? "",
    deadline: t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : "",
    status: (taskStatusMap[t.status] ?? "not_started") as MeetingTaskItem["status"],
  }));
}

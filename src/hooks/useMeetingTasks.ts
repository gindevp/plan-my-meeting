import { useQuery } from "@tanstack/react-query";
import { getMeetingTasks } from "@/services/api/meetingTasks";

export function useMeetingTasks() {
  return useQuery({
    queryKey: ["meeting-tasks"],
    queryFn: getMeetingTasks,
  });
}

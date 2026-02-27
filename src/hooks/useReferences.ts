import { useQuery } from "@tanstack/react-query";
import { getMeetingTypes, getMeetingLevels } from "@/services/api/references";

export function useMeetingTypes() {
  return useQuery({
    queryKey: ["meeting-types"],
    queryFn: getMeetingTypes,
  });
}

export function useMeetingLevels() {
  return useQuery({
    queryKey: ["meeting-levels"],
    queryFn: getMeetingLevels,
  });
}

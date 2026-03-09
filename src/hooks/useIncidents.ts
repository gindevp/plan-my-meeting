import { useQuery } from "@tanstack/react-query";
import { getIncidents } from "@/services/api/incidents";

export interface UseIncidentsParams {
  status?: string;
  severity?: string;
}

export function useIncidents(params?: UseIncidentsParams) {
  const status = params?.status != null && params.status !== "__all__" ? params.status : undefined;
  const severity = params?.severity != null && params.severity !== "__all__" ? params.severity : undefined;
  return useQuery({
    queryKey: ["incidents", status, severity],
    queryFn: () => getIncidents({ size: 200, status, severity }),
  });
}

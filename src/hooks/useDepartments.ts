import { useQuery } from "@tanstack/react-query";
import { getDepartments } from "@/services/api/departments";

export interface UseDepartmentsParams {
  status?: string;
}

export function useDepartments(params?: UseDepartmentsParams) {
  const status =
    params?.status != null && params.status !== "__all__" ? params.status : undefined;
  return useQuery({
    queryKey: ["departments", status],
    queryFn: () => getDepartments({ size: 200, status }),
  });
}

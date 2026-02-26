import { useQuery } from "@tanstack/react-query";
import { getDepartments } from "@/services/api/departments";

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartments({ size: 200 }),
  });
}

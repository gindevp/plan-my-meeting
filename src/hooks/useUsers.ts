import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/services/api/users";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers({ size: 200 }),
  });
}

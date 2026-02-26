import { useQuery } from "@tanstack/react-query";
import { getEquipment } from "@/services/api/equipment";

export function useEquipment() {
  return useQuery({
    queryKey: ["equipment"],
    queryFn: () => getEquipment({ size: 200 }),
  });
}

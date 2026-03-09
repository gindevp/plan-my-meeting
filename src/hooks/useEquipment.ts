import { useQuery } from "@tanstack/react-query";
import { getEquipment } from "@/services/api/equipment";

export function useEquipment(params?: { status?: string }) {
  return useQuery({
    queryKey: ["equipment", params?.status],
    queryFn: () => getEquipment({ size: 200, status: params?.status }),
  });
}

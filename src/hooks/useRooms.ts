import { useQuery } from "@tanstack/react-query";
import { getRooms, getRoomEquipments } from "@/services/api/rooms";

export interface UseRoomsParams {
  location?: string;
  minCapacity?: number;
  maxCapacity?: number;
  status?: string;
}

export function useRooms(params?: UseRoomsParams & { enabled?: boolean }) {
  const { enabled, ...filterParams } = params ?? {};
  return useQuery({
    queryKey: ["rooms", filterParams],
    queryFn: () => getRooms({ size: 200, ...filterParams }),
    enabled: enabled ?? true,
  });
}

export function useRoomEquipments(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["room-equipments"],
    queryFn: getRoomEquipments,
    enabled: options?.enabled ?? true,
  });
}

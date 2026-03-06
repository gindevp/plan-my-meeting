import { useQuery } from "@tanstack/react-query";
import { getRooms, getRoomEquipments } from "@/services/api/rooms";

export function useRooms(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ size: 200 }),
    enabled: options?.enabled ?? true,
  });
}

export function useRoomEquipments(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["room-equipments"],
    queryFn: getRoomEquipments,
    enabled: options?.enabled ?? true,
  });
}

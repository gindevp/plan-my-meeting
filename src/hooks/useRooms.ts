import { useQuery } from "@tanstack/react-query";
import { getRooms, getRoomEquipments } from "@/services/api/rooms";

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ size: 200 }),
  });
}

export function useRoomEquipments() {
  return useQuery({
    queryKey: ["room-equipments"],
    queryFn: getRoomEquipments,
  });
}

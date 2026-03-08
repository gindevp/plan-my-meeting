import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { RoomListItem } from "@/services/api/rooms";
import { createRoom, updateRoom, deleteRoom, createRoomEquipment, deleteRoomEquipment, getRoomEquipmentsRaw } from "@/services/api/rooms";
import { useRooms, useRoomEquipments } from "@/hooks/useRooms";
import { useEquipment } from "@/hooks/useEquipment";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Users, Plus, SquarePen, Trash2, Search, MapPin, Cpu, Eye, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { getEquipmentIcon, getEquipmentTypeIcon } from "@/lib/equipmentIcons";

const statusConfig: Record<string, { label: string; class: string; dot: string }> = {
  available: { label: "Sẵn sàng", class: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" },
  occupied: { label: "Đang sử dụng", class: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500" },
  maintenance: { label: "Bảo trì", class: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30", dot: "bg-rose-500" },
};

type RoomEquipmentEntry = { equipmentId: string; quantity: number };
const emptyRoom: Omit<RoomListItem, "id"> & { equipment?: { name: string; quantity: number }[]; equipmentEntries?: RoomEquipmentEntry[] } = { name: "", code: "", capacity: 10, floor: "", equipment: [], equipmentEntries: [], status: "available" };

export default function RoomManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCrudRoom =
    user?.authorities?.includes("ROLE_ADMIN") || user?.authorities?.includes("ROLE_ROOM_MANAGER") || false;
  const queryClient = useQueryClient();
  const { data: roomList = [] } = useRooms();
  const { data: roomEquipments = [] } = useRoomEquipments();
  const { data: equipmentList = [] } = useEquipment();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomListItem | null>(null);
  const [form, setForm] = useState(emptyRoom);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailRoom, setDetailRoom] = useState<typeof roomsWithEquipment[0] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const roomsWithEquipment = roomList.map((r) => {
    const raw = roomEquipments.find((re) => re.roomId === r.id)?.equipment ?? [];
    const equipment = raw.map((eq) => {
      const equipmentType =
        eq.equipmentType ??
        equipmentList.find((e) => e.name?.toLowerCase() === eq.name?.toLowerCase())?.equipmentType;
      return { ...eq, equipmentType };
    });
    return { ...r, equipment };
  });

  const getRoomEquipmentIcon = (eq: { name: string; equipmentType?: string }) => {
    if (eq.equipmentType) return getEquipmentTypeIcon(eq.equipmentType);
    const full = equipmentList.find((e) => e.name?.toLowerCase() === eq.name?.toLowerCase());
    if (full?.equipmentType) return getEquipmentTypeIcon(full.equipmentType);
    return getEquipmentIcon(eq.name);
  };
  const roomIdFromUrl = searchParams.get("roomId");

  useEffect(() => {
    if (!roomIdFromUrl || roomList.length === 0) return;
    const base = roomList.find((r) => String(r.id) === String(roomIdFromUrl));
    if (!base) return;
    const raw = roomEquipments.find((re) => re.roomId === base.id)?.equipment ?? [];
    const equipment = raw.map((eq) => {
      const equipmentType =
        eq.equipmentType ??
        equipmentList.find((e) => e.name?.toLowerCase() === eq.name?.toLowerCase())?.equipmentType;
      return { ...eq, equipmentType };
    });
    setDetailRoom({ ...base, equipment });
    setDetailOpen(true);
  }, [roomIdFromUrl, roomList, roomEquipments, equipmentList]);

  const handleCloseDetailRoom = (open: boolean) => {
    if (!open) {
      setDetailOpen(false);
      setTimeout(() => {
        setDetailRoom(null);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("roomId");
          return next;
        }, { replace: true });
      }, 300);
    }
  };

  const searchLower = search.toLowerCase().trim();
  const filtered = roomsWithEquipment.filter(
    (r) =>
      !searchLower ||
      r.name.toLowerCase().includes(searchLower) ||
      (r.code && r.code.toLowerCase().includes(searchLower)) ||
      (r.floor && r.floor.toLowerCase().includes(searchLower))
  );

  const createMutation = useMutation({
    mutationFn: (data: { name: string; code?: string; floor: string; capacity: number; status: RoomListItem["status"] }) =>
      createRoom({
        code: data.code && data.code.trim().length > 0 ? data.code : `ROOM_${Date.now()}`,
        name: data.name,
        location: data.floor,
        capacity: data.capacity,
        active: data.status !== "maintenance",
      }),
    onSuccess: () => {
      toast({ title: "Đã thêm", description: "Phòng họp đã được tạo." });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room-equipments"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Lỗi tạo phòng",
        description: err?.message || "Không thể tạo phòng họp",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: { name: string; code?: string; floor: string; capacity: number; status: RoomListItem["status"] } }) =>
      updateRoom(params.id, {
        code: params.data.code && params.data.code.trim().length > 0 ? params.data.code : `ROOM_${params.id}`,
        name: params.data.name,
        location: params.data.floor,
        capacity: params.data.capacity,
        active: params.data.status !== "maintenance",
      }),
    onSuccess: () => {
      toast({ title: "Đã cập nhật", description: "Phòng họp đã được cập nhật." });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room-equipments"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Lỗi cập nhật phòng",
        description: err?.message || "Không thể cập nhật phòng họp",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      toast({ title: "Đã xóa", description: "Phòng họp đã được xóa." });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room-equipments"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Lỗi xóa phòng",
        description: err?.message || "Không thể xóa phòng họp",
      });
    },
  });

  const openCreate = () => {
    if (!canCrudRoom) return;
    setEditingRoom(null);
    setForm({ ...emptyRoom, equipmentEntries: [] });
    setModalOpen(true);
  };

  const openEdit = async (room: typeof roomsWithEquipment[0]) => {
    if (!canCrudRoom) return;
    setEditingRoom(room);
    const raw = await getRoomEquipmentsRaw();
    const roomRaws = raw.filter((re) => re.roomId === room.id);
    const equipmentEntries: RoomEquipmentEntry[] = roomRaws.map((re) => ({
      equipmentId: re.equipmentId,
      quantity: re.quantity,
    }));
    setForm({ name: room.name, code: room.code, capacity: room.capacity, floor: room.floor, equipment: room.equipment, equipmentEntries, status: room.status });
    setModalOpen(true);
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Vui lòng nhập tên phòng";
    if (!form.floor.trim()) return "Vui lòng nhập vị trí (tầng)";
    if (!form.capacity || form.capacity < 1) return "Sức chứa phải lớn hơn 0";
    if (form.capacity > 500) return "Sức chứa không được vượt quá 500";
    return null;
  };

  const handleSave = async () => {
    if (!canCrudRoom) return;
    const err = validateForm();
    if (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err });
      return;
    }
    setSaving(true);
    const equipmentEntries = form.equipmentEntries ?? [];
    try {
      if (editingRoom) {
        const raw = await getRoomEquipmentsRaw();
        const toDelete = raw.filter((re) => re.roomId === editingRoom.id);
        for (const re of toDelete) {
          await deleteRoomEquipment(re.id);
        }
        await updateRoom(editingRoom.id, {
          code: form.code && form.code.trim() ? form.code : editingRoom.code || `ROOM_${editingRoom.id}`,
          name: form.name,
          location: form.floor,
          capacity: form.capacity,
          active: form.status !== "maintenance",
        });
        for (const entry of equipmentEntries) {
          if (entry.quantity > 0) {
            await createRoomEquipment({ roomId: editingRoom.id, equipmentId: entry.equipmentId, quantity: entry.quantity });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        queryClient.invalidateQueries({ queryKey: ["room-equipments"] });
        toast({ title: "Đã cập nhật", description: "Phòng họp đã được cập nhật." });
      } else {
        const res = (await createRoom({
          code: form.code && form.code.trim() ? form.code : `ROOM_${Date.now()}`,
          name: form.name,
          location: form.floor,
          capacity: form.capacity,
          active: form.status !== "maintenance",
        })) as { id?: number };
        const roomId = res?.id;
        if (roomId) {
          for (const entry of equipmentEntries) {
            if (entry.quantity > 0) {
              await createRoomEquipment({ roomId, equipmentId: entry.equipmentId, quantity: entry.quantity });
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        queryClient.invalidateQueries({ queryKey: ["room-equipments"] });
        toast({ title: "Đã thêm", description: "Phòng họp đã được tạo." });
      }
      setModalOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi", description: e?.message ?? "Không thể lưu phòng họp." });
    }
  };

  const handleDelete = (id: string) => {
    if (!canCrudRoom) return;
    setDeleteConfirm(null);
    deleteMutation.mutate(id);
  };

  return (
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="opacity-0 animate-auth-fade-in-up">
          <h1 className="text-2xl font-display font-bold tracking-tight">Quản lý phòng họp</h1>
          <p className="text-sm text-muted-foreground mt-1">Xem thông tin phòng, thiết bị và trạng thái</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 opacity-0 animate-auth-fade-in-up auth-stagger-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, mã phòng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {canCrudRoom && (
            <Button onClick={openCreate} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Thêm phòng họp
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((room, i) => {
          const status = statusConfig[room.status];
          const equipList = room.equipment ?? [];
          return (
            <Card
              key={room.id}
              className="group overflow-hidden card-elevated opacity-0 animate-auth-fade-in-up transition-all duration-300 hover:shadow-lg"
              style={{ animationDelay: `${0.15 + i * 0.04}s`, animationFillMode: "forwards" }}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white px-5 py-5">
                <div className="absolute top-3 right-3">
                  <Badge variant="outline" className={`${status.class} border text-xs font-medium`}>
                    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </Badge>
                </div>
                <p className="font-display font-bold text-xl tracking-tight">{room.name}</p>
                {room.code && (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{room.code}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    {room.floor || "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-500" />
                    {room.capacity} người
                  </span>
                </div>
              </div>

              {/* Equipment icons + actions */}
              <CardContent className="p-5">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    Thiết bị
                  </p>
                  {equipList.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {equipList.map((eq, idx) => {
                        const Icon = getRoomEquipmentIcon(eq);
                        return (
                          <div
                            key={`${eq.name}-${idx}`}
                            className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-muted/50 border border-border/50"
                            title={`${eq.name} x${eq.quantity}`}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            {eq.quantity > 1 && <span className="text-xs font-medium text-muted-foreground">x{eq.quantity}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-2 px-3 rounded-lg bg-muted/30">
                      Chưa có thiết bị
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => { setDetailRoom(room); setDetailOpen(true); }}>
                    <Eye className="h-3.5 w-3.5" /> Chi tiết
                  </Button>
                  {canCrudRoom && (
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(room)}>
                      <SquarePen className="h-3.5 w-3.5" /> Sửa
                    </Button>
                  )}
                  {canCrudRoom && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirm(room.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "Không tìm thấy phòng họp phù hợp" : "Chưa có phòng họp nào"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Thử tìm theo tên hoặc mã phòng khác" : "Thêm phòng họp để bắt đầu"}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingRoom ? "Sửa phòng họp" : "Thêm phòng họp"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên phòng *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Phòng họp A"
                className="mt-1.5 h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sức chứa *</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label>Vị trí (tầng) *</Label>
                <Input
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="VD: Tầng 2"
                  className="mt-1.5 h-11"
                />
              </div>
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RoomListItem["status"] })}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Sẵn sàng</SelectItem>
                  <SelectItem value="occupied">Đang sử dụng</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-full">
              <Label className="mb-2 block">Thiết bị (số lượng)</Label>
              <div className="rounded-lg border border-border p-3 max-h-48 overflow-y-auto space-y-2">
                {equipmentList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có thiết bị. Thêm thiết bị tại trang Quản lý thiết bị.</p>
                ) : (
                  equipmentList.map((eq) => {
                    const Icon = eq.equipmentType ? getEquipmentTypeIcon(eq.equipmentType) : getEquipmentIcon(eq.name);
                    const entries = form.equipmentEntries ?? [];
                    const entry = entries.find((e) => e.equipmentId === eq.id);
                    const qty = entry?.quantity ?? 0;
                    return (
                      <div key={eq.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="flex-1 text-sm font-medium">{eq.name}</span>
                        <div className="flex items-center gap-1 border rounded-md">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              const newQty = Math.max(0, qty - 1);
                              const rest = entries.filter((e) => e.equipmentId !== eq.id);
                              setForm({
                                ...form,
                                equipmentEntries: newQty > 0 ? [...rest, { equipmentId: eq.id, quantity: newQty }] : rest,
                              });
                            }}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums">{qty}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              const newQty = qty + 1;
                              const rest = entries.filter((e) => e.equipmentId !== eq.id);
                              setForm({ ...form, equipmentEntries: [...rest, { equipmentId: eq.id, quantity: newQty }] });
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : editingRoom ? "Cập nhật" : "Thêm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={handleCloseDetailRoom}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight">
              {detailRoom?.name}
            </DialogTitle>
          </DialogHeader>
          {detailRoom && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Mã phòng</p>
                  <p className="font-mono">{detailRoom.code || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Vị trí</p>
                  <p>{detailRoom.floor || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Sức chứa</p>
                  <p>{detailRoom.capacity} người</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
                  <p>
                    <Badge variant="outline" className={statusConfig[detailRoom.status]?.class}>
                      {statusConfig[detailRoom.status]?.label ?? detailRoom.status}
                    </Badge>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Thiết bị chi tiết</p>
                {(detailRoom.equipment ?? []).length > 0 ? (
                  <ul className="space-y-2">
                    {detailRoom.equipment.map((eq, idx) => {
                      const Icon = getRoomEquipmentIcon(eq);
                      return (
                        <li key={`${eq.name}-${idx}`} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border border-border">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{eq.name}</p>
                            <p className="text-xs text-muted-foreground">Số lượng: {eq.quantity}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic py-3 px-3 rounded-lg bg-muted/30">Chưa có thiết bị</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xóa phòng họp này? Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

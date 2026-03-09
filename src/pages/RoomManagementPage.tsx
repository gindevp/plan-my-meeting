import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { RoomListItem, LayoutItem } from "@/services/api/rooms";
import { createRoom, updateRoom, deleteRoom, createRoomEquipment, deleteRoomEquipment, getRoomEquipmentsRaw, uploadRoomImage, deleteRoomImage, ROOM_TYPES } from "@/services/api/rooms";
import { API_BASE } from "@/lib/api";
import { useRooms, useRoomEquipments } from "@/hooks/useRooms";
import { useEquipment } from "@/hooks/useEquipment";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Users, Plus, SquarePen, Trash2, Search, MapPin, Cpu, Eye, Minus, CircleDot, LayoutList, RectangleHorizontal, Theater, GraduationCap, LayoutGrid, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { getEquipmentIcon, getEquipmentTypeIcon } from "@/lib/equipmentIcons";
import { RoomLayoutEditor } from "@/components/room/RoomLayoutEditor";
import { LAYOUT_TEMPLATES, LAYOUT_TEMPLATE_OPTIONS, scaleLayoutItems, countChairsInLayout, parseLayoutData, serializeLayoutData } from "@/lib/roomLayoutTemplates";

const statusConfig: Record<string, { label: string; class: string; dot: string }> = {
  available: { label: "Hoạt động", class: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" },
  occupied: { label: "Đang sử dụng", class: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500" },
  maintenance: { label: "Bảo trì", class: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30", dot: "bg-rose-500" },
  disabled: { label: "Ngừng sử dụng", class: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30", dot: "bg-slate-500" },
};

type RoomEquipmentEntry = { equipmentId: string; quantity: number };
const emptyRoom: Omit<RoomListItem, "id"> & { equipment?: { name: string; quantity: number }[]; equipmentEntries?: RoomEquipmentEntry[]; imageUrl?: string; description?: string; roomType?: string; layoutData?: string } = {
  name: "", code: "", capacity: 10, floor: "", equipment: [], equipmentEntries: [], status: "available", imageUrl: "", description: "", roomType: "", layoutData: "",
};

export default function RoomManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCrudRoom =
    user?.authorities?.includes("ROLE_ADMIN") || user?.authorities?.includes("ROLE_ROOM_MANAGER") || false;
  const queryClient = useQueryClient();
  const [filterLocation, setFilterLocation] = useState("");
  const [filterMinCapacity, setFilterMinCapacity] = useState<string>("");
  const [filterMaxCapacity, setFilterMaxCapacity] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("__all__");
  const roomQueryParams = (() => {
    const minRaw = filterMinCapacity.trim() === "" ? undefined : parseInt(filterMinCapacity, 10);
    const maxRaw = filterMaxCapacity.trim() === "" ? undefined : parseInt(filterMaxCapacity, 10);
    const min = minRaw != null && !Number.isNaN(minRaw) && minRaw >= 0 ? minRaw : undefined;
    const max = maxRaw != null && !Number.isNaN(maxRaw) && maxRaw >= 0 ? maxRaw : undefined;
    // Luôn gửi min <= max: "Từ" = sức chứa tối thiểu, "Đến" = sức chứa tối đa
    const minCapacity = min != null && max != null && min > max ? max : min;
    const maxCapacity = min != null && max != null && min > max ? min : max;
    return {
      location: filterLocation.trim() || undefined,
      minCapacity: minCapacity ?? undefined,
      maxCapacity: maxCapacity ?? undefined,
      status: filterStatus === "__all__" || filterStatus === "" ? undefined : filterStatus,
    };
  })();
  const { data: roomList = [] } = useRooms(roomQueryParams);
  const { data: roomEquipments = [] } = useRoomEquipments();
  const { data: equipmentList = [] } = useEquipment();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomListItem | null>(null);
  const [form, setForm] = useState(emptyRoom);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [detailRoom, setDetailRoom] = useState<typeof roomsWithEquipment[0] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);
  const [showCopyLayoutSource, setShowCopyLayoutSource] = useState(false);
  const [copyLayoutSourceId, setCopyLayoutSourceId] = useState<string>("");
  const layoutCanvasContainerRef = useRef<HTMLDivElement>(null);
  const detailImageInputRef = useRef<HTMLInputElement>(null);
  const [detailImageUploading, setDetailImageUploading] = useState(false);
  const [layoutCanvasSize, setLayoutCanvasSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (!modalOpen || !layoutCanvasContainerRef.current) return;
    const el = layoutCanvasContainerRef.current;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 800, height: 600 };
      setLayoutCanvasSize({ w: Math.max(400, Math.round(width)), h: Math.max(300, Math.round(height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [modalOpen]);

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

  const handleDetailImageReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !detailRoom || !file.type.startsWith("image/")) return;
    setDetailImageUploading(true);
    try {
      await uploadRoomImage(detailRoom.id, file);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setDetailRoom((prev) => (prev ? { ...prev, imageUrl: `/api/rooms/${prev.id}/image?t=${Date.now()}` } : null));
    } catch (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err instanceof Error ? err.message : "Không thể thay ảnh." });
    } finally {
      setDetailImageUploading(false);
    }
  };

  const handleDetailImageDelete = async () => {
    if (!detailRoom) return;
    setDetailImageUploading(true);
    try {
      await deleteRoomImage(detailRoom.id);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setDetailRoom((prev) => (prev ? { ...prev, imageUrl: undefined } : null));
      toast({ title: "Đã xóa", description: "Ảnh phòng đã được xóa." });
    } catch (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err instanceof Error ? err.message : "Không thể xóa ảnh." });
    } finally {
      setDetailImageUploading(false);
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
    setSaving(false);
    setImageFile(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setLayoutEditorKey(0);
    setModalOpen(true);
  };

  const openEdit = async (room: typeof roomsWithEquipment[0]) => {
    if (!canCrudRoom) return;
    setEditingRoom(room);
    setSaving(false);
    setImageFile(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const raw = await getRoomEquipmentsRaw();
    const roomRaws = raw.filter((re) => re.roomId === room.id);
    const equipmentEntries: RoomEquipmentEntry[] = roomRaws.map((re) => ({
      equipmentId: re.equipmentId,
      quantity: re.quantity,
    }));
    setForm({
      name: room.name,
      code: room.code,
      capacity: room.capacity,
      floor: room.floor,
      equipment: room.equipment,
      equipmentEntries,
      status: room.status,
      imageUrl: room.imageUrl ?? "",
      description: room.description ?? "",
      roomType: room.roomType ?? "",
      layoutData: room.layoutData ?? "",
    });
    setLayoutEditorKey((k) => k + 1);
    setModalOpen(true);
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Vui lòng nhập tên phòng";
    if (!form.floor.trim()) return "Vui lòng nhập vị trí (tầng)";
    if (!form.capacity || form.capacity < 1) return "Sức chứa phải lớn hơn 0";
    if (form.capacity > 500) return "Sức chứa không được vượt quá 500";
    const chairs = countChairsInLayout(form.layoutData);
    if (chairs > (form.capacity ?? 0)) return `Số ghế trong layout (${chairs}) vượt quá sức chứa phòng (${form.capacity}).`;
    return null;
  };

  /** Returns error message if total equipment quantity would exceed allowed total. */
  const validateEquipmentQuantities = (
    raw: { roomId: string; equipmentId: string; quantity: number }[],
    entries: RoomEquipmentEntry[],
    excludeRoomId?: string
  ): string | null => {
    const usedByEquipment: Record<string, number> = {};
    for (const re of raw) {
      if (excludeRoomId != null && String(re.roomId) === String(excludeRoomId)) continue;
      const id = re.equipmentId;
      usedByEquipment[id] = (usedByEquipment[id] ?? 0) + (re.quantity ?? 0);
    }
    for (const entry of entries) {
      if (!entry.quantity || entry.quantity <= 0) continue;
      const eq = equipmentList.find((e) => String(e.id) === String(entry.equipmentId));
      const totalAllowed = eq?.totalQuantity ?? 999;
      const used = usedByEquipment[entry.equipmentId] ?? 0;
      const after = used + entry.quantity;
      if (after > totalAllowed) {
        const name = eq?.name ?? entry.equipmentId;
        return `Số lượng thiết bị "${name}" vượt quá tổng số lượng: đang dùng ${used}, thêm ${entry.quantity}, tổng có ${totalAllowed}. Vui lòng giảm số lượng hoặc bổ sung thiết bị trong danh mục.`;
      }
    }
    return null;
  };

  const mapStatusToApi = (s: string): string => (s === "available" ? "ACTIVE" : s === "maintenance" ? "MAINTENANCE" : s === "disabled" ? "DISABLED" : "ACTIVE");
  const handleSave = async () => {
    if (!canCrudRoom) return;
    const err = validateForm();
    if (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err });
      return;
    }
    const equipmentEntries = form.equipmentEntries ?? [];
    const raw = await getRoomEquipmentsRaw();
    const equipmentErr = validateEquipmentQuantities(
      raw.map((r) => ({ roomId: r.roomId, equipmentId: r.equipmentId, quantity: r.quantity })),
      equipmentEntries,
      editingRoom?.id
    );
    if (equipmentErr) {
      toast({ variant: "destructive", title: "Lỗi thiết bị", description: equipmentErr });
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code?.trim() || (editingRoom ? editingRoom.code : `ROOM_${Date.now()}`),
      name: form.name,
      location: form.floor,
      capacity: form.capacity,
      active: form.status === "available",
      imageUrl: imageFile ? undefined : (form.imageUrl?.trim() || undefined),
      description: form.description?.trim() || undefined,
      status: mapStatusToApi(form.status),
      roomType: form.roomType?.trim() || undefined,
      layoutData: form.layoutData?.trim() || undefined,
    };
    try {
      if (editingRoom) {
        const raw = await getRoomEquipmentsRaw();
        const toDelete = raw.filter((re) => re.roomId === editingRoom.id);
        for (const re of toDelete) {
          await deleteRoomEquipment(re.id);
        }
        await updateRoom(editingRoom.id, payload);
        for (const entry of equipmentEntries) {
          if (entry.quantity > 0) {
            await createRoomEquipment({ roomId: editingRoom.id, equipmentId: entry.equipmentId, quantity: entry.quantity });
          }
        }
        if (imageFile) {
          await uploadRoomImage(editingRoom.id, imageFile);
          setImageFile(null);
          setImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        queryClient.invalidateQueries({ queryKey: ["room-equipments"] });
        toast({ title: "Đã cập nhật", description: "Phòng họp đã được cập nhật." });
        const chairs = countChairsInLayout(form.layoutData);
        if (chairs > 0 && chairs < (form.capacity ?? 0)) {
          toast({ title: "Lưu ý", description: `Layout hiện tại chỉ bố trí ${chairs} ghế, nhỏ hơn sức chứa phòng (${form.capacity}).` });
        }
        if (form.layoutData && countChairsInLayout(form.layoutData) === 0) {
          toast({ title: "Lưu ý", description: "Layout chưa bố trí ghế ngồi." });
        }
      } else {
        const res = (await createRoom(payload)) as { id?: number };
        const roomId = res?.id;
        if (roomId) {
          for (const entry of equipmentEntries) {
            if (entry.quantity > 0) {
              await createRoomEquipment({ roomId, equipmentId: entry.equipmentId, quantity: entry.quantity });
            }
          }
          if (imageFile) {
            await uploadRoomImage(String(roomId), imageFile);
            setImageFile(null);
            setImagePreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        queryClient.invalidateQueries({ queryKey: ["room-equipments"] });
        toast({ title: "Đã thêm", description: "Phòng họp đã được tạo." });
        const chairs = countChairsInLayout(form.layoutData);
        if (chairs > 0 && chairs < (form.capacity ?? 0)) {
          toast({ title: "Lưu ý", description: `Layout hiện tại chỉ bố trí ${chairs} ghế, nhỏ hơn sức chứa phòng (${form.capacity}).` });
        }
        if (form.layoutData && countChairsInLayout(form.layoutData) === 0) {
          toast({ title: "Lưu ý", description: "Layout chưa bố trí ghế ngồi." });
        }
      }
      setModalOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi", description: e?.message ?? "Không thể lưu phòng họp." });
    } finally {
      setSaving(false);
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
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Vị trí"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="h-9 w-32"
            />
            <div className="flex items-center gap-2 h-9 rounded-md border border-input bg-background px-2 py-1">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Sức chứa</span>
              <Input
                type="number"
                placeholder="Từ"
                value={filterMinCapacity}
                onChange={(e) => setFilterMinCapacity(e.target.value)}
                className="h-7 w-14 border-0 bg-transparent p-0 text-center text-sm tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={1}
              />
              <span className="text-muted-foreground/60 text-xs">–</span>
              <Input
                type="number"
                placeholder="Đến"
                value={filterMaxCapacity}
                onChange={(e) => setFilterMaxCapacity(e.target.value)}
                className="h-7 w-14 border-0 bg-transparent p-0 text-center text-sm tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={1}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tất cả</SelectItem>
                <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                <SelectItem value="MAINTENANCE">Bảo trì</SelectItem>
                <SelectItem value="DISABLED">Ngừng sử dụng</SelectItem>
              </SelectContent>
            </Select>
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
              className="group overflow-hidden card-elevated opacity-0 animate-auth-fade-in-up transition-all duration-300 hover:shadow-lg flex flex-col"
              style={{ animationDelay: `${0.15 + i * 0.04}s`, animationFillMode: "forwards" }}
            >
              {/* Hình ảnh phòng hoặc ảnh mặc định để cân bằng chiều cao thẻ */}
              <div className="aspect-video w-full overflow-hidden bg-muted shrink-0">
                {room.imageUrl ? (
                  <img
                    src={room.imageUrl.startsWith("/api/") ? API_BASE + room.imageUrl : room.imageUrl}
                    alt={room.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src="/placeholder.svg"
                    alt=""
                    className="h-full w-full object-cover object-center"
                  />
                )}
              </div>
              {/* Header */}
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white px-5 py-5 shrink-0">
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
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display">{editingRoom ? "Sửa phòng họp" : "Thêm phòng họp"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 pr-3">
          <div className="space-y-4">
            <div>
              <Label>Mã phòng</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Để trống sẽ tự sinh"
                className="mt-1.5 h-11"
              />
            </div>
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
                  <SelectItem value="available">Hoạt động</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                  <SelectItem value="disabled">Ngừng sử dụng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Loại phòng họp</Label>
              <Select value={form.roomType || "__none__"} onValueChange={(v) => setForm({ ...form, roomType: v === "__none__" ? "" : v })}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Chọn loại phòng" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Không chọn —</SelectItem>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hình ảnh phòng</Label>
              <div className="mt-1.5 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  className="h-11"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                      setImageFile(f);
                      setImagePreviewUrl(URL.createObjectURL(f));
                    }
                  }}
                />
                {imagePreviewUrl && (
                  <div className="rounded-lg overflow-hidden border border-border w-full max-w-xs aspect-video">
                    <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                {!imagePreviewUrl && editingRoom?.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-border w-full max-w-xs aspect-video">
                    <img
                      src={editingRoom.imageUrl.startsWith("/api/") ? API_BASE + editingRoom.imageUrl : editingRoom.imageUrl}
                      alt={editingRoom.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Mô tả phòng</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả ngắn về phòng họp..."
                className="mt-1.5 min-h-[80px]"
                rows={3}
              />
            </div>
            <div className="col-span-full">
              <Label className="mb-2 block">Thiết bị (số lượng)</Label>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left font-medium p-2 w-12">STT</th>
                      <th className="text-left font-medium p-2">Tên thiết bị</th>
                      <th className="text-right font-medium p-2 w-28">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentList.length === 0 ? (
                      <tr><td colSpan={3} className="p-3 text-muted-foreground text-center">Chưa có thiết bị. Thêm thiết bị tại trang Quản lý thiết bị.</td></tr>
                    ) : (
                      equipmentList.map((eq, idx) => {
                        const Icon = eq.equipmentType ? getEquipmentTypeIcon(eq.equipmentType) : getEquipmentIcon(eq.name);
                        const entries = form.equipmentEntries ?? [];
                        const entry = entries.find((e) => e.equipmentId === eq.id);
                        const qty = entry?.quantity ?? 0;
                        return (
                          <tr key={eq.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-2 text-muted-foreground">{idx + 1}</td>
                            <td className="p-2">
                              <span className="flex items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted border border-border">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                {eq.name}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1 border rounded-md inline-flex">
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
                                <span className="w-8 text-center font-medium tabular-nums">{qty}</span>
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
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-span-full space-y-3">
              <Label className="block">Sơ đồ bố trí phòng họp (layout)</Label>
              <p className="text-xs text-muted-foreground">Chọn mẫu hoặc kéo thả đối tượng vào khung phòng. Kéo góc khung để thay đổi kích thước phòng.</p>
              <div className="flex gap-4 flex-1 min-h-0">
                <aside className="w-52 shrink-0 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mẫu layout</p>
                  <div className="flex flex-col gap-1.5">
                    {LAYOUT_TEMPLATE_OPTIONS.map((opt) => {
                      const Icon = { CIRCLE: CircleDot, U_SHAPE: LayoutList, BOARDROOM: RectangleHorizontal, THEATER: Theater, CLASSROOM: GraduationCap, WORKSHOP: LayoutGrid }[opt.key] ?? LayoutList;
                      return (
                        <Button
                          key={opt.key}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-full justify-start gap-2"
                          onClick={() => {
                            const template = LAYOUT_TEMPLATES[opt.key];
                            if (!template) return;
                            const { w: cw, h: ch } = parseLayoutData(form.layoutData);
                            const toW = cw ?? layoutCanvasSize.w;
                            const toH = ch ?? layoutCanvasSize.h;
                            const scaled = scaleLayoutItems(template, 400, 300, toW, toH);
                            setForm((f) => ({ ...f, layoutData: serializeLayoutData(toW, toH, scaled) }));
                            setLayoutEditorKey((k) => k + 1);
                            toast({ title: "Đã áp dụng", description: `Mẫu "${opt.label}" đã được áp dụng.` });
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {opt.label}
                        </Button>
                      );
                    })}
                  </div>
                  {form.roomType && LAYOUT_TEMPLATES[form.roomType] && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full h-9"
                      onClick={() => {
                        const template = LAYOUT_TEMPLATES[form.roomType!];
                        const { w: cw, h: ch } = parseLayoutData(form.layoutData);
                        const toW = cw ?? layoutCanvasSize.w;
                        const toH = ch ?? layoutCanvasSize.h;
                        const scaled = scaleLayoutItems(template, 400, 300, toW, toH);
                        setForm((f) => ({ ...f, layoutData: serializeLayoutData(toW, toH, scaled) }));
                        setLayoutEditorKey((k) => k + 1);
                        toast({ title: "Đã áp dụng", description: "Layout theo loại phòng đã được áp dụng." });
                      }}
                    >
                      Theo loại phòng
                    </Button>
                  )}
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Sao chép</p>
                  {roomList.length > 0 && (
                    <>
                      {!showCopyLayoutSource ? (
                        <Button type="button" variant="outline" size="sm" className="w-full h-9" onClick={() => setShowCopyLayoutSource(true)}>
                          Từ phòng khác
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Select value={copyLayoutSourceId} onValueChange={setCopyLayoutSourceId}>
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Chọn phòng..." />
                            </SelectTrigger>
                            <SelectContent>
                              {roomList.filter((r) => !editingRoom || r.id !== editingRoom.id).map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-1 h-9"
                              disabled={!copyLayoutSourceId}
                              onClick={() => {
                                if (!copyLayoutSourceId) return;
                                const src = roomList.find((r) => r.id === copyLayoutSourceId);
                                const raw = src?.layoutData?.trim();
                                if (!raw) {
                                  setForm((f) => ({ ...f, layoutData: serializeLayoutData(layoutCanvasSize.w, layoutCanvasSize.h, []) }));
                                  setLayoutEditorKey((k) => k + 1);
                                  toast({ title: "Không có layout", description: "Phòng nguồn chưa có layout." });
                                  setShowCopyLayoutSource(false);
                                  setCopyLayoutSourceId("");
                                  return;
                                }
                                const parsed = parseLayoutData(raw);
                                const itemsToScale = parsed.items;
                                if (itemsToScale.length === 0) {
                                  setForm((f) => ({ ...f, layoutData: serializeLayoutData(layoutCanvasSize.w, layoutCanvasSize.h, []) }));
                                  setLayoutEditorKey((k) => k + 1);
                                  setShowCopyLayoutSource(false);
                                  setCopyLayoutSourceId("");
                                  return;
                                }
                                const maxX = Math.max(...itemsToScale.map((i) => i.x + (i.width || 40)));
                                const maxY = Math.max(...itemsToScale.map((i) => i.y + (i.height || 40)));
                                const fromW = Math.max(1, maxX);
                                const fromH = Math.max(1, maxY);
                                const { w: cw, h: ch } = parseLayoutData(form.layoutData);
                                const toW = cw ?? layoutCanvasSize.w;
                                const toH = ch ?? layoutCanvasSize.h;
                                const scaled = scaleLayoutItems(itemsToScale, fromW, fromH, toW, toH);
                                setForm((f) => ({ ...f, layoutData: serializeLayoutData(toW, toH, scaled) }));
                                setLayoutEditorKey((k) => k + 1);
                                toast({ title: "Đã sao chép", description: "Layout đã được sao chép từ phòng nguồn." });
                                setShowCopyLayoutSource(false);
                                setCopyLayoutSourceId("");
                              }}
                            >
                              Sao chép
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => { setShowCopyLayoutSource(false); setCopyLayoutSourceId(""); }}>
                              Hủy
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </aside>
                <div ref={layoutCanvasContainerRef} className="flex-1 min-w-0 min-h-[480px] overflow-auto">
                  <RoomLayoutEditor
                    key={layoutEditorKey}
                    layoutData={form.layoutData ?? "[]"}
                    capacity={form.capacity ?? 10}
                    onChange={(layoutData) => setForm((f) => ({ ...f, layoutData }))}
                    disabled={saving}
                    defaultCanvasWidth={layoutCanvasSize.w}
                    defaultCanvasHeight={layoutCanvasSize.h}
                  />
                </div>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : editingRoom ? "Cập nhật" : "Thêm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={handleCloseDetailRoom}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle className="font-display text-xl tracking-tight">
              {detailRoom?.name}
            </DialogTitle>
          </DialogHeader>
          {detailRoom && (
            <div className="flex flex-col min-h-0 overflow-y-auto px-6 pb-6 pt-2 space-y-4 text-sm">
              <div className="rounded-lg overflow-hidden border border-border shrink-0 relative group">
                <input
                  ref={detailImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleDetailImageReplace}
                />
                <img
                  src={detailRoom.imageUrl
                    ? (detailRoom.imageUrl.startsWith("/api/") ? API_BASE + detailRoom.imageUrl : detailRoom.imageUrl)
                    : "/placeholder.svg"}
                  alt={detailRoom.name}
                  className="w-full aspect-video object-cover object-center"
                />
                {canCrudRoom && (
                  <>
                    <div className="absolute inset-0 bg-black/30 group-hover:opacity-100 opacity-0 transition-opacity" aria-hidden />
                    <div className="absolute inset-0 flex items-end justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="pointer-events-auto">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 gap-1.5 bg-background/95 hover:bg-background shadow"
                          onClick={() => detailImageInputRef.current?.click()}
                          disabled={detailImageUploading}
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                          Thay ảnh
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-1.5 shadow pointer-events-auto"
                        onClick={handleDetailImageDelete}
                        disabled={detailImageUploading || !detailRoom.imageUrl}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </Button>
                    </div>
                  </>
                )}
                {detailImageUploading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-sm text-white font-medium">Đang xử lý...</span>
                  </div>
                )}
              </div>
              {detailRoom.description && (
                <div className="shrink-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Mô tả</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{detailRoom.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 shrink-0">
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
                {detailRoom.roomType && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Loại phòng</p>
                    <p>{ROOM_TYPES.find((t) => t.value === detailRoom.roomType)?.label ?? detailRoom.roomType}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
                  <p>
                    <Badge variant="outline" className={statusConfig[detailRoom.status]?.class}>
                      {statusConfig[detailRoom.status]?.label ?? detailRoom.status}
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="shrink-0">
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
              {detailRoom.layoutData && detailRoom.layoutData.trim() && (
                <div className="shrink-0">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Sơ đồ phòng (layout)</p>
                  <div className="rounded-lg border border-border bg-muted/10 p-3 overflow-auto max-h-[40vh]">
                    <RoomLayoutEditor
                      layoutData={detailRoom.layoutData}
                      capacity={detailRoom.capacity ?? 10}
                      onChange={() => {}}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              )}
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

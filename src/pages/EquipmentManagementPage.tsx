import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Mic, Monitor, PenTool, Plus, Search, Settings, Trash2, Wifi, type LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEquipment } from "@/hooks/useEquipment";
import { useRooms } from "@/hooks/useRooms";
import { createEquipment, deleteEquipment, updateEquipment } from "@/services/api/equipment";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  room: string;
  status: string;
  lastMaintenance: string;
}

interface EquipmentMeta {
  type?: string;
  room?: string;
  status?: string;
  lastMaintenance?: string;
}

const DESCRIPTION_META_PREFIX = "__PMM_EQ_META__:";

const typeIcons: Record<string, LucideIcon> = {
  "Máy chiếu": Monitor,
  TV: Monitor,
  Camera,
  "Hệ thống âm thanh": Mic,
  Micro: Mic,
  "Bảng trắng": PenTool,
};

const statusConfig: Record<string, { label: string; class: string }> = {
  good: { label: "Hoạt động tốt", class: "bg-success/15 text-success border-success/20" },
  repairing: { label: "Đang sửa chữa", class: "bg-warning/15 text-warning border-warning/20" },
  broken: { label: "Hỏng", class: "bg-destructive/15 text-destructive border-destructive/20" },
};

const equipmentTypes = ["Máy chiếu", "TV", "Camera", "Hệ thống âm thanh", "Micro", "Bảng trắng"];
const emptyEquipment: Omit<Equipment, "id" | "code"> = {
  name: "",
  type: "Máy chiếu",
  room: "",
  status: "good",
  lastMaintenance: "",
};

function parseMetaFromDescription(description?: string): EquipmentMeta {
  if (!description) return {};

  if (description.startsWith(DESCRIPTION_META_PREFIX)) {
    try {
      const raw = description.slice(DESCRIPTION_META_PREFIX.length);
      return JSON.parse(raw) as EquipmentMeta;
    } catch {
      return {};
    }
  }

  const [legacyType, legacyRoom] = description.split(" - ");
  return {
    type: legacyType?.trim(),
    room: legacyRoom?.trim(),
  };
}

function buildDescription(meta: EquipmentMeta): string {
  return `${DESCRIPTION_META_PREFIX}${JSON.stringify(meta)}`;
}

export default function EquipmentManagementPage() {
  const { toast } = useToast();
  const { data: apiEquipment = [] } = useEquipment();
  const { data: rooms = [] } = useRooms();
  const queryClient = useQueryClient();

  const equipmentList: Equipment[] = apiEquipment.map((e) => {
    const meta = parseMetaFromDescription(e.description);
    return {
      id: String(e.id),
      code: e.code || `EQ-${e.id}`,
      name: e.name,
      type: meta.type || "Thiết bị",
      room: meta.room || "-",
      status: meta.status || "good",
      lastMaintenance: meta.lastMaintenance || "-",
    };
  });

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  const [form, setForm] = useState(emptyEquipment);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = equipmentList.filter((eq) => eq.name.toLowerCase().includes(search.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: (data: Omit<Equipment, "id" | "code">) =>
      createEquipment({
        code: `EQ_${Date.now()}`,
        name: data.name,
        description: buildDescription({
          type: data.type,
          room: data.room,
          status: data.status,
          lastMaintenance: data.lastMaintenance,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Đã thêm", description: "Thiết bị đã được tạo." });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi tạo thiết bị",
        description: err?.message || "Không thể tạo thiết bị",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; code: string; data: Omit<Equipment, "id" | "code"> }) =>
      updateEquipment(params.id, {
        code: params.code,
        name: params.data.name,
        description: buildDescription({
          type: params.data.type,
          room: params.data.room,
          status: params.data.status,
          lastMaintenance: params.data.lastMaintenance,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Đã cập nhật", description: "Thiết bị đã được cập nhật." });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi cập nhật thiết bị",
        description: err?.message || "Không thể cập nhật thiết bị",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEquipment(id),
    onSuccess: () => {
      toast({ title: "Đã xóa", description: "Thiết bị đã được xóa." });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi xóa thiết bị",
        description: err?.message || "Không thể xóa thiết bị",
      });
    },
  });

  const openAdd = () => {
    setForm(emptyEquipment);
    setAddOpen(true);
  };

  const openEdit = (eq: Equipment) => {
    setEditingEq(eq);
    setForm({
      name: eq.name,
      type: eq.type === "Thiết bị" ? "Máy chiếu" : eq.type,
      room: eq.room === "-" ? "" : eq.room,
      status: eq.status,
      lastMaintenance: eq.lastMaintenance === "-" ? "" : eq.lastMaintenance,
    });
    setEditOpen(true);
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập tên thiết bị" });
      return;
    }
    setAddOpen(false);
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editingEq) return;
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập tên thiết bị" });
      return;
    }
    setEditOpen(false);
    updateMutation.mutate({ id: editingEq.id, code: editingEq.code, data: form });
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(null);
    deleteMutation.mutate(id);
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Tên thiết bị *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Loại</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {equipmentTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Trạng thái</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Phòng họp</Label>
        <Select value={form.room} onValueChange={(v) => setForm({ ...form, room: v })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Chọn phòng" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((r: { id: string; name: string }) => (
              <SelectItem key={r.id} value={r.name}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Bảo trì gần nhất</Label>
        <Input
          type="date"
          value={form.lastMaintenance}
          onChange={(e) => setForm({ ...form, lastMaintenance: e.target.value })}
          className="mt-1.5"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-display font-bold">Quản lý thiết bị</h1>
          <p className="mt-1 text-sm text-muted-foreground">Danh mục và tình trạng trang thiết bị phòng họp</p>
        </div>
        <Button onClick={openAdd} className="w-full gap-2 md:w-auto">
          <Plus className="h-4 w-4" /> Thêm thiết bị
        </Button>
      </div>

      <div className="flex max-w-sm items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm thiết bị theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã TB</TableHead>
                <TableHead>Tên thiết bị</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Phòng họp</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Bảo trì gần nhất</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((eq) => {
                const Icon = typeIcons[eq.type] || Wifi;
                const status = statusConfig[eq.status] || statusConfig.good;
                return (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium text-primary">{eq.code}</TableCell>
                    <TableCell>{eq.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{eq.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{eq.room}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.class}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{eq.lastMaintenance}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(eq)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteConfirm(eq.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Không tìm thấy thiết bị nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Thêm thiết bị</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAdd}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Cập nhật thiết bị</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdate}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xóa thiết bị này?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

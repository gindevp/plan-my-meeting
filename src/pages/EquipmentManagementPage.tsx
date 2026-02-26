import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Monitor, Camera, Mic, PenTool, Wifi, Settings, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEquipment } from "@/hooks/useEquipment";
import { useRooms } from "@/hooks/useRooms";

interface Equipment {
  id: string;
  name: string;
  type: string;
  room: string;
  status: string;
  lastMaintenance: string;
}

const typeIcons: Record<string, any> = {
  "Máy chiếu": Monitor, "TV": Monitor, "Camera": Camera,
  "Hệ thống âm thanh": Mic, "Micro": Mic, "Bảng trắng": PenTool,
};

const statusConfig: Record<string, { label: string; class: string }> = {
  good: { label: "Hoạt động tốt", class: "bg-success/15 text-success border-success/20" },
  repairing: { label: "Đang sửa chữa", class: "bg-warning/15 text-warning border-warning/20" },
  broken: { label: "Hỏng", class: "bg-destructive/15 text-destructive border-destructive/20" },
};

const equipmentTypes = ["Máy chiếu", "TV", "Camera", "Hệ thống âm thanh", "Micro", "Bảng trắng"];

const emptyEquipment: Omit<Equipment, "id"> = { name: "", type: "Máy chiếu", room: "", status: "good", lastMaintenance: "" };

export default function EquipmentManagementPage() {
  const { toast } = useToast();
  const { data: apiEquipment = [] } = useEquipment();
  const { data: rooms = [] } = useRooms();
  const equipmentList: Equipment[] = apiEquipment.map((e) => ({
    id: e.code || String(e.id),
    name: e.name,
    type: e.description || "Thiết bị",
    room: "-",
    status: "good",
    lastMaintenance: "",
  }));
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  const [form, setForm] = useState(emptyEquipment);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = equipmentList.filter((eq) =>
    eq.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(emptyEquipment);
    setAddOpen(true);
  };

  const openEdit = (eq: Equipment) => {
    setEditingEq(eq);
    setForm({ name: eq.name, type: eq.type, room: eq.room, status: eq.status, lastMaintenance: eq.lastMaintenance });
    setEditOpen(true);
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập tên thiết bị" });
      return;
    }
    setAddOpen(false);
    toast({ title: "Lưu ý", description: "Chức năng thêm thiết bị cần tích hợp API POST." });
  };

  const handleUpdate = () => {
    setEditOpen(false);
    toast({ title: "Lưu ý", description: "Chức năng cập nhật cần tích hợp API PUT." });
  };

  const handleDelete = (_id: string) => {
    setDeleteConfirm(null);
    toast({ title: "Lưu ý", description: "Chức năng xóa cần tích hợp API DELETE." });
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
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {equipmentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Trạng thái</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Phòng họp</Label>
        <Select value={form.room} onValueChange={(v) => setForm({ ...form, room: v })}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Chọn phòng" /></SelectTrigger>
          <SelectContent>
            {rooms.map((r: { id: string; name: string }) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Bảo trì gần nhất</Label>
        <Input type="date" value={form.lastMaintenance} onChange={(e) => setForm({ ...form, lastMaintenance: e.target.value })} className="mt-1.5" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Quản lý thiết bị</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh mục và tình trạng trang thiết bị phòng họp</p>
        </div>
        <Button onClick={openAdd} className="w-full md:w-auto gap-2">
          <Plus className="h-4 w-4" /> Thêm thiết bị
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm thiết bị theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                const status = statusConfig[eq.status];
                return (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium text-primary">{eq.id}</TableCell>
                    <TableCell>{eq.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{eq.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{eq.room}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status?.class}>{status?.label}</Badge>
                    </TableCell>
                    <TableCell>{eq.lastMaintenance}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(eq)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirm(eq.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Không tìm thấy thiết bị nào</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Thêm thiết bị</DialogTitle></DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button onClick={handleAdd}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Cập nhật thiết bị</DialogTitle></DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button onClick={handleUpdate}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận xóa</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xóa thiết bị này?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

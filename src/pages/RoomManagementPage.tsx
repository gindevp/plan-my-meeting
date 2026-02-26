import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { rooms as initialRooms, type Room } from "@/data/mockData";
import { Users, Monitor, Wifi, Mic, PenTool, Camera, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const equipmentIcons: Record<string, typeof Monitor> = {
  "Máy chiếu": Monitor, "TV 65\"": Monitor, "TV 55\"": Monitor,
  "Webcam": Camera, "Camera hội nghị": Camera,
  "Hệ thống âm thanh": Mic, "Micro không dây": Mic, "Bảng trắng": PenTool,
};

const statusConfig: Record<string, { label: string; class: string }> = {
  available: { label: "Sẵn sàng", class: "bg-success/15 text-success border-success/20" },
  occupied: { label: "Đang sử dụng", class: "bg-warning/15 text-warning border-warning/20" },
  maintenance: { label: "Bảo trì", class: "bg-destructive/15 text-destructive border-destructive/20" },
};

const emptyRoom: Omit<Room, "id"> = { name: "", capacity: 10, floor: "", equipment: [], status: "available" };

export default function RoomManagementPage() {
  const { toast } = useToast();
  const [roomList, setRoomList] = useState<Room[]>(initialRooms);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyRoom);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = roomList.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingRoom(null);
    setForm(emptyRoom);
    setModalOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setForm({ name: room.name, capacity: room.capacity, floor: room.floor, equipment: room.equipment, status: room.status });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.floor.trim()) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập đầy đủ thông tin" });
      return;
    }
    if (editingRoom) {
      setRoomList((prev) => prev.map((r) => (r.id === editingRoom.id ? { ...r, ...form } : r)));
      toast({ title: "Đã cập nhật", description: `Phòng ${form.name} đã được cập nhật.` });
    } else {
      const newRoom: Room = { ...form, id: `r${Date.now()}` };
      setRoomList((prev) => [...prev, newRoom]);
      toast({ title: "Đã thêm", description: `Phòng ${form.name} đã được thêm.` });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setRoomList((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
    toast({ title: "Đã xóa", description: "Phòng họp đã được xóa." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Quản lý phòng họp</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh sách và trạng thái phòng họp</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Thêm phòng họp
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm kiếm phòng họp..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((room) => {
          const status = statusConfig[room.status];
          return (
            <Card key={room.id} className="shadow-card hover:shadow-card-hover transition-all duration-300 animate-slide-up overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display font-bold text-lg text-primary">{room.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{room.floor}</p>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{room.capacity} người</span>
                  </div>
                  <Badge variant="outline" className={status.class}>{status.label}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Thiết bị</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.equipment.map((eq) => {
                      const Icon = equipmentIcons[eq] || Wifi;
                      return (
                        <Badge key={eq} variant="secondary" className="text-[10px] gap-1">
                          <Icon className="h-3 w-3" /> {eq}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(room)}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(room.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">Không tìm thấy phòng họp nào</div>
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
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sức chứa *</Label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div>
                <Label>Vị trí (tầng) *</Label>
                <Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Room["status"] })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Sẵn sàng</SelectItem>
                  <SelectItem value="occupied">Đang sử dụng</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSave}>{editingRoom ? "Cập nhật" : "Thêm"}</Button>
          </DialogFooter>
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

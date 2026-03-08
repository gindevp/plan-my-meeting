import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, SquarePen, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEquipment } from "@/hooks/useEquipment";
import { createEquipment, deleteEquipment, updateEquipment } from "@/services/api/equipment";
import { getRoomEquipmentsRaw } from "@/services/api/rooms";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { getEquipmentIcon, getEquipmentTypeIcon } from "@/lib/equipmentIcons";

const EQUIPMENT_TYPES = [
  { value: "dien_tu", label: "Điện tử" },
  { value: "am_thanh", label: "Âm thanh" },
  { value: "hinh_anh", label: "Hình ảnh" },
  { value: "mang", label: "Mạng" },
  { value: "van_phong_pham", label: "Văn phòng phẩm" },
  { value: "khac", label: "Khác" },
];

interface EquipmentForm {
  name: string;
  code: string;
  description: string;
  totalQuantity: number;
  equipmentType: string;
}

const emptyForm: EquipmentForm = {
  name: "",
  code: "",
  description: "",
  totalQuantity: 999,
  equipmentType: "",
};

export default function EquipmentManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;
  const { data: equipmentList = [] } = useEquipment();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const searchLower = search.toLowerCase().trim();
  const filtered = equipmentList.filter(
    (e) =>
      !searchLower ||
      e.name.toLowerCase().includes(searchLower) ||
      (e.code && e.code.toLowerCase().includes(searchLower)) ||
      (e.equipmentType && e.equipmentType.toLowerCase().includes(searchLower))
  );

  const getTypeLabel = (value?: string) => EQUIPMENT_TYPES.find((t) => t.value === value)?.label ?? value ?? "—";

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Vui lòng nhập tên thiết bị";
    if (form.totalQuantity < 0) return "Tổng số lượng không được âm";
    if (form.totalQuantity > 9999) return "Tổng số lượng không được vượt quá 9999";
    return null;
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    const err = validateForm();
    if (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateEquipment(editingId, {
          code: form.code.trim() || `EQ_${editingId}`,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          totalQuantity: form.totalQuantity,
          equipmentType: form.equipmentType || undefined,
        });
        toast({ title: "Đã cập nhật", description: "Thiết bị đã được cập nhật." });
      } else {
        await createEquipment({
          code: form.code.trim() || `EQ_${Date.now()}`,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          totalQuantity: form.totalQuantity,
          equipmentType: form.equipmentType || undefined,
        });
        toast({ title: "Đã thêm", description: "Thiết bị đã được tạo." });
      }
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi", description: e?.message ?? "Không thể lưu thiết bị." });
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    if (!isAdmin) return;
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (eq: (typeof equipmentList)[0]) => {
    if (!isAdmin) return;
    setEditingId(eq.id);
    setForm({
      name: eq.name,
      code: eq.code || "",
      description: eq.description || "",
      totalQuantity: eq.totalQuantity ?? 999,
      equipmentType: eq.equipmentType || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const raw = await getRoomEquipmentsRaw();
      const usedCount = raw.filter((re) => re.equipmentId === deleteConfirm.id).length;
      if (usedCount > 0) {
        toast({
          variant: "destructive",
          title: "Không thể xóa",
          description: `Thiết bị đang được sử dụng tại ${usedCount} phòng. Vui lòng gỡ khỏi phòng trước khi xóa.`,
        });
        setDeleteConfirm(null);
        return;
      }
      await deleteEquipment(deleteConfirm.id);
      toast({ title: "Đã xóa", description: "Thiết bị đã được xóa." });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setDeleteConfirm(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi", description: e?.message ?? "Không thể xóa thiết bị." });
    }
  };

  return (
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
      <PageHeader
        title="Quản lý thiết bị"
        description="Danh mục loại thiết bị phòng họp và tổng số lượng"
      >
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2 h-11">
            <Plus className="h-4 w-4" />
            Thêm thiết bị
          </Button>
        )}
      </PageHeader>
      </div>

      <div className="flex items-center gap-3 opacity-0 animate-auth-fade-in-up auth-stagger-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, mã thiết bị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
      </div>

      <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-2">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="font-semibold tracking-tight w-16"></TableHead>
              <TableHead className="font-medium">Mã</TableHead>
              <TableHead className="font-medium">Tên thiết bị</TableHead>
              <TableHead className="font-medium">Loại thiết bị</TableHead>
              <TableHead className="font-medium">Mô tả</TableHead>
              <TableHead className="font-medium text-right">Tổng số lượng</TableHead>
              {isAdmin && <TableHead className="text-right font-medium w-24">Thao tác</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((eq, i) => {
              const Icon = getEquipmentIcon(eq.name);
              return (
                <TableRow key={eq.id} className="hover:bg-muted/30 opacity-0 animate-auth-fade-in-up" style={{ animationDelay: `${0.2 + i * 0.03}s`, animationFillMode: "forwards" }}>
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{eq.code || "—"}</TableCell>
                  <TableCell className="font-medium">{eq.name}</TableCell>
                  <TableCell className="text-sm">
                    {eq.equipmentType ? (
                      <span className="inline-flex items-center gap-2">
                        {(() => {
                          const TypeIcon = getEquipmentTypeIcon(eq.equipmentType);
                          return <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />;
                        })()}
                        {getTypeLabel(eq.equipmentType)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {eq.description || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{eq.totalQuantity ?? 999}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(eq)}>
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirm({ id: eq.id, name: eq.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="p-0">
                  <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20">
                    <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {search ? "Không tìm thấy thiết bị" : "Chưa có thiết bị nào"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search ? "Thử tìm theo tên hoặc mã khác" : "Thêm thiết bị để bắt đầu"}
                    </p>
                    {isAdmin && !search && (
                      <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Thêm thiết bị
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">
              {editingId ? "Sửa thiết bị" : "Thêm thiết bị"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên thiết bị *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Máy chiếu, Camera, Micro..."
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Loại thiết bị</Label>
              <Select
                value={form.equipmentType || "none"}
                onValueChange={(v) => setForm({ ...form, equipmentType: v === "none" ? "" : v })}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue placeholder="Chọn loại thiết bị" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không chọn</SelectItem>
                  {EQUIPMENT_TYPES.map((t) => {
                    const TypeIcon = getEquipmentTypeIcon(t.value);
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 shrink-0" />
                          {t.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mã (tùy chọn)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Tự sinh nếu để trống"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả ngắn về thiết bị"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Tổng số lượng *</Label>
              <Input
                type="number"
                min={0}
                max={9999}
                value={form.totalQuantity}
                onChange={(e) => setForm({ ...form, totalQuantity: parseInt(e.target.value) || 0 })}
                className="mt-1.5 h-11"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Số lượng tối đa có thể phân bổ cho các phòng họp
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="font-display tracking-tight">Xóa thiết bị</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Bạn có chắc chắn muốn xóa thiết bị này? Nếu thiết bị đang được sử dụng tại phòng họp, bạn cần gỡ khỏi phòng trước.
                </AlertDialogDescription>
              </div>
            </div>
            {deleteConfirm && (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{deleteConfirm.name}</p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="h-11">Hủy</AlertDialogCancel>
            <Button variant="destructive" className="h-11 gap-2" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Xóa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

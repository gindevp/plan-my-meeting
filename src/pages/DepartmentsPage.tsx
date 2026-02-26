import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDepartments } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useMeetings } from "@/hooks/useMeetings";
import { createDepartment, deleteDepartment, updateDepartment } from "@/services/api/departments";
import { Plus, Building2, Users, CalendarDays, Edit2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DeptForm {
  name: string;
  code: string;
  description: string;
}

const emptyForm: DeptForm = { name: "", code: "", description: "" };

export default function DepartmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const { data: users = [] } = useUsers();
  const { data: meetings = [] } = useMeetings();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<DeptForm>(emptyForm);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: DeptForm) => createDepartment(data),
    onSuccess: () => {
      toast({ title: "Đã thêm", description: "Phòng ban đã được tạo." });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi tạo phòng ban", description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: DeptForm }) => updateDepartment(params.id, params.data),
    onSuccess: () => {
      toast({ title: "Đã cập nhật", description: "Phòng ban đã được cập nhật." });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi cập nhật phòng ban", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      toast({ title: "Đã xóa", description: "Phòng ban đã được xóa." });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi xóa phòng ban", description: err.message });
    },
  });

  const deptDetails = useMemo(
    () =>
      departments.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description ?? "",
        staffCount: users.filter((u) => u.department === d.name).length,
        meetingCount: meetings.filter((m) => m.department === d.name).length,
      })),
    [departments, users, meetings]
  );

  const filtered = deptDetails.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
  );

  const submitCreate = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast({ variant: "destructive", title: "Lỗi", description: "Nhập tên và mã phòng ban" });
      return;
    }
    setAddOpen(false);
    createMutation.mutate(form);
  };

  const submitUpdate = () => {
    if (!editingId) return;
    if (!form.name.trim() || !form.code.trim()) {
      toast({ variant: "destructive", title: "Lỗi", description: "Nhập tên và mã phòng ban" });
      return;
    }
    setEditOpen(false);
    updateMutation.mutate({ id: editingId, data: form });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-display font-bold text-foreground">Quản lý phòng ban</h1>
          <p className="text-sm text-muted-foreground">Cơ cấu tổ chức và phòng ban</p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setAddOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />Thêm phòng ban
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tổng phòng ban</p><p className="mt-1 text-2xl font-bold text-foreground">{departments.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tổng nhân viên</p><p className="mt-1 text-2xl font-bold text-foreground">{users.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cuộc họp tháng này</p><p className="mt-1 text-2xl font-bold text-foreground">{meetings.length}</p></CardContent></Card>
      </div>

      <Input placeholder="Tìm phòng ban..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((dept) => (
          <Card key={dept.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{dept.code}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingId(dept.id);
                      setForm({ name: dept.name, code: dept.code, description: dept.description });
                      setEditOpen(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirm(dept.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" />Nhân viên</span>
                <Badge variant="secondary">{dept.staffCount}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Cuộc họp</span>
                <Badge variant="secondary">{dept.meetingCount}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm phòng ban</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên phòng ban *</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Mã phòng ban *</Label><Input className="mt-1.5" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Mô tả</Label><Textarea className="mt-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button onClick={submitCreate}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cập nhật phòng ban</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên phòng ban *</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Mã phòng ban *</Label><Input className="mt-1.5" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Mô tả</Label><Textarea className="mt-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button onClick={submitUpdate}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận xóa</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xóa phòng ban này?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteConfirm) return;
                const id = deleteConfirm;
                setDeleteConfirm(null);
                deleteMutation.mutate(id);
              }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDepartments } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useMeetings } from "@/hooks/useMeetings";
import { createDepartment, deleteDepartment, updateDepartment } from "@/services/api/departments";
import type { DepartmentListItem } from "@/services/api/departments";
import { Plus, Building2, Users, CalendarDays, Edit2, Trash2, Search, Calendar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface DeptForm {
  name: string;
  code: string;
  description: string;
  status: string;
  managerId: string;
}

const emptyForm: DeptForm = {
  name: "",
  code: "",
  description: "",
  status: "ACTIVE",
  managerId: "",
};

export default function DepartmentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("__all__");
  const [form, setForm] = useState<DeptForm>(emptyForm);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DepartmentListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailDept, setDetailDept] = useState<typeof deptDetails[0] | null>(null);

  const { data: departments = [] } = useDepartments(
    filterStatus === "__all__" ? undefined : { status: filterStatus }
  );
  const { data: users = [] } = useUsers();
  const { data: meetings = [] } = useMeetings();

  const deptDetails = useMemo(
    () =>
      departments.map((d) => ({
        ...d,
        staffCount: users.filter((u) => u.departmentId != null && String(u.departmentId) === d.id).length,
        meetingCount: meetings.filter((m) => m.department === d.name).length,
      })),
    [departments, users, meetings]
  );

  const searchLower = search.toLowerCase().trim();
  const filtered = deptDetails.filter(
    (d) =>
      d.name.toLowerCase().includes(searchLower) ||
      d.code.toLowerCase().includes(searchLower) ||
      (d.managerLogin && d.managerLogin.toLowerCase().includes(searchLower))
  );

  const staffOfDetailDept = useMemo(() => {
    if (!detailDept) return [];
    return users.filter((u: any) => u.departmentId != null && String(u.departmentId) === String(detailDept.id));
  }, [detailDept, users]);

  const meetingsOfDetailDept = useMemo(() => {
    if (!detailDept) return [];
    return meetings.filter((m: any) => (m.department || "") === (detailDept.name || ""));
  }, [detailDept, meetings]);

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Nhập tên phòng ban";
    if (!form.code.trim()) return "Nhập mã phòng ban";
    return null;
  };

  const submitCreate = async () => {
    if (!isAdmin) return;
    const err = validateForm();
    if (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err });
      return;
    }
    setSaving(true);
    try {
      await createDepartment({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: form.status || "ACTIVE",
        managerId: form.managerId || null,
      });
      toast({ title: "Đã thêm", description: "Phòng ban đã được tạo." });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setAddOpen(false);
      setForm(emptyForm);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tạo phòng ban";
      toast({ variant: "destructive", title: "Lỗi", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const submitUpdate = async () => {
    if (!isAdmin || !editingId) return;
    const err = validateForm();
    if (err) {
      toast({ variant: "destructive", title: "Lỗi", description: err });
      return;
    }
    setSaving(true);
    try {
      await updateDepartment(editingId, {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: form.status || "ACTIVE",
        managerId: form.managerId || null,
      });
      toast({ title: "Đã cập nhật", description: "Phòng ban đã được cập nhật." });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setEditOpen(false);
      setEditingId(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi cập nhật phòng ban";
      toast({ variant: "destructive", title: "Lỗi", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDepartment(deleteConfirm.id);
      toast({ title: "Đã xóa", description: "Phòng ban đã được xóa." });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setDeleteConfirm(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không thể xóa phòng ban";
      toast({ variant: "destructive", title: "Lỗi", description: msg });
    }
  };

  const openAdd = () => {
    setForm(emptyForm);
    setSaving(false);
    setAddOpen(true);
  };

  const openEdit = (d: DepartmentListItem) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      code: d.code,
      description: d.description ?? "",
      status: d.status ?? "ACTIVE",
      managerId: d.managerId ?? "",
    });
    setSaving(false);
    setEditOpen(true);
  };

  return (
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
        <PageHeader
          title="Quản lý phòng ban"
          description="Cơ cấu tổ chức và phòng ban"
        >
          {isAdmin && (
            <Button onClick={openAdd} className="gap-2 h-11">
              <Plus className="h-4 w-4" />
              Thêm phòng ban
            </Button>
          )}
        </PageHeader>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 opacity-0 animate-auth-fade-in-up auth-stagger-1">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tổng phòng ban</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{departments.length}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tổng nhân viên</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Cuộc họp (danh sách)</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{meetings.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 opacity-0 animate-auth-fade-in-up auth-stagger-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm phòng ban, mã, trưởng phòng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <SearchableSelect
          options={[
            { value: "__all__", label: "Tất cả trạng thái" },
            { value: "ACTIVE", label: "Hoạt động" },
            { value: "DISABLED", label: "Ngừng hoạt động" },
          ]}
          value={filterStatus}
          onValueChange={setFilterStatus}
          placeholder="Trạng thái"
          searchPlaceholder="Tìm trạng thái..."
          emptyText="Không tìm thấy."
          triggerClassName="w-[180px] h-11"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-0 animate-auth-fade-in-up auth-stagger-3">
        {filtered.map((dept, i) => (
          <Card
            key={dept.id}
            className="card-elevated transition-all duration-300 hover:shadow-lg cursor-pointer"
            style={{ animationDelay: `${0.15 + i * 0.04}s`, animationFillMode: "forwards" }}
            onClick={() => setDetailDept(dept)}
          >
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
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(dept)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(dept)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(dept.status === "DISABLED" || dept.managerLogin) && (
                <div className="flex flex-wrap items-center gap-2">
                  {dept.status === "DISABLED" && (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      Ngừng hoạt động
                    </Badge>
                  )}
                  {dept.managerLogin && (
                    <span className="text-xs text-muted-foreground">
                      Trưởng phòng: {dept.managerLogin}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Nhân viên
                </span>
                <Badge variant="secondary">{dept.staffCount}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Cuộc họp
                </span>
                <Badge variant="secondary">{dept.meetingCount}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog chi tiết phòng ban: Tab 1 Nhân viên, Tab 2 Lịch họp */}
      <Dialog open={!!detailDept} onOpenChange={(open) => !open && setDetailDept(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {detailDept ? `${detailDept.name} (${detailDept.code})` : ""}
            </DialogTitle>
          </DialogHeader>
          {detailDept && (
            <Tabs defaultValue="staff" className="flex flex-col min-h-0 flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="staff" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Nhân viên ({staffOfDetailDept.length})
                </TabsTrigger>
                <TabsTrigger value="meetings" className="gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Lịch họp ({meetingsOfDetailDept.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="staff" className="mt-3 flex flex-col min-h-0">
                <p className="text-sm text-muted-foreground mb-2">Danh sách nhân viên hiện có</p>
                <div className="flex flex-col min-h-0 overflow-y-auto border rounded-lg divide-y max-h-[50vh]">
                  {staffOfDetailDept.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Chưa có nhân viên nào trong phòng ban này.
                    </div>
                  ) : (
                    staffOfDetailDept.map((u: any) => (
                      <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                        <UserAvatar userId={u.id} name={u.name || u.login} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{u.name || u.login}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[u.login, u.position].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              <TabsContent value="meetings" className="mt-3 flex flex-col min-h-0">
                <p className="text-sm text-muted-foreground mb-2">Danh sách lịch họp của phòng ban</p>
                <div className="flex flex-col min-h-0 overflow-y-auto border rounded-lg divide-y max-h-[50vh]">
                  {meetingsOfDetailDept.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Chưa có cuộc họp nào thuộc phòng ban này.
                    </div>
                  ) : (
                    meetingsOfDetailDept.map((m: any) => (
                      <div key={m.id} className="flex items-start gap-3 px-3 py-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <CalendarDays className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{m.title || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.startTime
                              ? new Date(m.startTime).toLocaleString("vi-VN", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "—"}
                            {m.status ? ` · ${String(m.status).toLowerCase()}` : ""}
                          </p>
                          {m.roomName && (
                            <p className="text-xs text-muted-foreground">Phòng: {m.roomName}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {filtered.length === 0 && (
        <Card className="opacity-0 animate-auth-fade-in-up auth-stagger-3">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "Không tìm thấy phòng ban" : "Chưa có phòng ban nào"}
            </p>
            {isAdmin && !search && (
              <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Thêm phòng ban
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">Thêm phòng ban</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên phòng ban *</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Phòng Kế toán"
              />
            </div>
            <div>
              <Label>Mã phòng ban *</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="VD: KT"
              />
            </div>
            <div>
              <Label>Trưởng phòng</Label>
              <SearchableSelect
                options={[{ value: "", label: "— Không chọn —" }, ...users.map((u) => ({ value: String(u.id), label: u.name || u.login }))]}
                value={form.managerId ?? ""}
                onValueChange={(v) => setForm({ ...form, managerId: v })}
                placeholder="Chọn trưởng phòng"
                searchPlaceholder="Tìm trưởng phòng..."
                emptyText="Không tìm thấy."
                triggerClassName="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <SearchableSelect
                options={[
                  { value: "ACTIVE", label: "Hoạt động" },
                  { value: "DISABLED", label: "Ngừng hoạt động" },
                ]}
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
                placeholder="Trạng thái"
                searchPlaceholder="Tìm trạng thái..."
                emptyText="Không tìm thấy."
                triggerClassName="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea
                className="mt-1.5 min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả ngắn (tùy chọn)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={submitCreate} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">Cập nhật phòng ban</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên phòng ban *</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Mã phòng ban *</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Trưởng phòng</Label>
              <SearchableSelect
                options={[{ value: "", label: "— Không chọn —" }, ...users.map((u) => ({ value: String(u.id), label: u.name || u.login }))]}
                value={form.managerId ?? ""}
                onValueChange={(v) => setForm({ ...form, managerId: v })}
                placeholder="Chọn trưởng phòng"
                searchPlaceholder="Tìm trưởng phòng..."
                emptyText="Không tìm thấy."
                triggerClassName="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <SearchableSelect
                options={[
                  { value: "ACTIVE", label: "Hoạt động" },
                  { value: "DISABLED", label: "Ngừng hoạt động" },
                ]}
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
                placeholder="Trạng thái"
                searchPlaceholder="Tìm trạng thái..."
                emptyText="Không tìm thấy."
                triggerClassName="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea
                className="mt-1.5 min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={submitUpdate} disabled={saving}>
              {saving ? "Đang lưu..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="font-display tracking-tight">
                  Xóa phòng ban
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Bạn có chắc chắn muốn xóa phòng ban này? Nhân viên thuộc phòng ban cần được chuyển phòng trước khi xóa.
                </AlertDialogDescription>
              </div>
            </div>
            {deleteConfirm && (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{deleteConfirm.name}</p>
                <p className="text-muted-foreground text-xs">{deleteConfirm.code}</p>
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

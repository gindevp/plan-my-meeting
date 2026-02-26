import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { createUser, deleteUser, updateUser } from "@/services/api/users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserRole = "admin" | "employee" | "secretary" | "room_manager";

const roleLabels: Record<UserRole, string> = {
  admin: "Quản trị viên",
  employee: "Nhân viên",
  secretary: "Thư ký",
  room_manager: "QL Phòng họp",
};

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "default",
  employee: "secondary",
  secretary: "outline",
  room_manager: "outline",
};

interface StaffForm {
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  department: string;
  position: string;
}

const emptyForm: StaffForm = {
  login: "",
  firstName: "",
  lastName: "",
  email: "",
  role: "employee",
  department: "",
  position: "",
};

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users = [] } = useUsers();
  const { data: departments = [] } = useDepartments();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const matchSearch =
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          (u.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          u.login.toLowerCase().includes(search.toLowerCase());
        const matchDept = filterDept === "all" || u.department === filterDept;
        return matchSearch && matchDept;
      }),
    [users, search, filterDept]
  );

  const createMutation = useMutation({
    mutationFn: (data: StaffForm) =>
      createUser({
        login: data.login,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
      }),
    onSuccess: () => {
      toast({ title: "Đã thêm", description: "Nhân viên đã được tạo." });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi tạo nhân viên", description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: StaffForm }) =>
      updateUser(params.id, {
        login: params.data.login,
        firstName: params.data.firstName,
        lastName: params.data.lastName,
        email: params.data.email,
        role: params.data.role,
      }),
    onSuccess: () => {
      toast({ title: "Đã cập nhật", description: "Nhân viên đã được cập nhật." });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi cập nhật nhân viên", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (login: string) => deleteUser(login),
    onSuccess: () => {
      toast({ title: "Đã xóa", description: "Nhân viên đã được xóa." });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi xóa nhân viên", description: err.message });
    },
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(-2)
      .toUpperCase();

  const submitCreate = () => {
    if (!form.login.trim() || !form.email.trim()) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập login và email" });
      return;
    }
    setAddOpen(false);
    createMutation.mutate(form);
  };

  const submitUpdate = () => {
    if (!editingUserId) return;
    if (!form.login.trim() || !form.email.trim()) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập login và email" });
      return;
    }
    setEditOpen(false);
    updateMutation.mutate({ id: editingUserId, data: form });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Quản lý nhân viên</h1>
          <p className="mt-1 text-sm text-muted-foreground">Danh sách nhân viên trong hệ thống</p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setAddOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />Thêm nhân viên
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tổng nhân viên", value: users.length },
          { label: "Quản trị viên", value: users.filter((u) => u.role === "admin").length },
          { label: "Phòng ban", value: new Set(users.map((u) => u.department).filter(Boolean)).size },
          { label: "Thư ký", value: users.filter((u) => u.role === "secretary").length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm nhân viên..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng ban</SelectItem>
            {departments.map((d: { id: string; name: string }) => (
              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead>Chức vụ</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const role = ((u.role as UserRole) || "employee") as UserRole;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium text-foreground">{u.name || u.login}</p>
                          <p className="text-xs text-muted-foreground">@{u.login}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.department ?? "—"}</TableCell>
                    <TableCell>{u.position ?? "—"}</TableCell>
                    <TableCell><Badge variant={roleBadgeVariant[role]}>{roleLabels[role]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const [firstName = "", ...rest] = (u.name || "").split(" ");
                          setEditingUserId(u.id);
                          setForm({
                            login: u.login,
                            firstName,
                            lastName: rest.join(" "),
                            email: u.email || "",
                            role,
                            department: u.department || "",
                            position: u.position || "",
                          });
                          setEditOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(u.login)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm nhân viên mới</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Login *</Label><Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Họ</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tên</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phòng ban</Label>
                <Select value={form.department || "none"} onValueChange={(v) => setForm({ ...form, department: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn</SelectItem>
                    {departments.map((d: { id: string; name: string }) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Vai trò</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>{Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Chức vụ</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button onClick={submitCreate}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cập nhật nhân viên</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Login *</Label><Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Họ</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tên</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phòng ban</Label>
                <Select value={form.department || "none"} onValueChange={(v) => setForm({ ...form, department: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn</SelectItem>
                    {departments.map((d: { id: string; name: string }) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Vai trò</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>{Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Chức vụ</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
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
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xóa nhân viên này?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteConfirm) return;
                const login = deleteConfirm;
                setDeleteConfirm(null);
                deleteMutation.mutate(login);
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

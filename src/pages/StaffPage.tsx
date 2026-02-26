import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/data/mockData";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { Plus, Search, Mail, Phone, Edit2, Trash2, Users } from "lucide-react";

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

export default function StaffPage() {
  const { data: users = [] } = useUsers();
  const { data: departments = [] } = useDepartments();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || (u.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchDept = filterDept === "all" || u.department === filterDept;
    return matchSearch && matchDept;
  });

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(-2).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Quản lý nhân viên</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh sách nhân viên trong hệ thống</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Thêm nhân viên</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Thêm nhân viên mới</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Họ tên</Label><Input placeholder="Nguyễn Văn A" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@company.com" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phòng ban</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>{departments.map((d: { id: string; name: string }) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Vai trò</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>{Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Chức vụ</Label><Input placeholder="Nhân viên" /></div>
              <Button className="w-full">Lưu</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tổng nhân viên", value: users.length, icon: Users },
          { label: "Quản trị viên", value: users.filter((u) => u.role === "admin").length, icon: Users },
          { label: "Phòng ban", value: new Set(users.map((u) => u.department).filter(Boolean)).size, icon: Users },
          { label: "Thư ký", value: users.filter((u) => u.role === "secretary").length, icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm nhân viên..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng ban</SelectItem>
            {departments.map((d: { id: string; name: string }) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback></Avatar>
                      <span className="font-medium text-foreground">{u.name || u.login}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.department}</TableCell>
                  <TableCell>{u.position}</TableCell>
                  <TableCell><Badge variant={roleBadgeVariant[u.role as UserRole] ?? "secondary"}>{roleLabels[u.role as UserRole] ?? u.role ?? "—"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

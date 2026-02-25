import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { departments, users, meetings } from "@/data/mockData";
import { Plus, Building2, Users, CalendarDays, Edit2, Trash2 } from "lucide-react";

const deptDetails = departments.map((d) => ({
  name: d,
  staffCount: users.filter((u) => u.department === d).length,
  meetingCount: meetings.filter((m) => m.department === d).length,
  head: users.find((u) => u.department === d && (u.position.includes("Trưởng") || u.position.includes("Giám đốc")))?.name || "—",
}));

export default function DepartmentsPage() {
  const [search, setSearch] = useState("");

  const filtered = deptDetails.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Quản lý phòng ban</h1>
          <p className="text-sm text-muted-foreground mt-1">Cơ cấu tổ chức và phòng ban</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Thêm phòng ban</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Thêm phòng ban mới</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Tên phòng ban</Label><Input placeholder="VD: Phòng Marketing" /></div>
              <div className="space-y-2"><Label>Mô tả</Label><Textarea placeholder="Mô tả ngắn về phòng ban..." /></div>
              <div className="space-y-2"><Label>Trưởng phòng</Label><Input placeholder="Họ tên trưởng phòng" /></div>
              <Button className="w-full">Lưu</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tổng phòng ban</p><p className="text-2xl font-bold text-foreground mt-1">{departments.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tổng nhân viên</p><p className="text-2xl font-bold text-foreground mt-1">{users.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cuộc họp tháng này</p><p className="text-2xl font-bold text-foreground mt-1">{meetings.length}</p></CardContent></Card>
      </div>

      {/* Search */}
      <Input placeholder="Tìm phòng ban..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {/* Department cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((dept) => (
          <Card key={dept.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{dept.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Nhân viên</span>
                <Badge variant="secondary">{dept.staffCount}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Cuộc họp</span>
                <Badge variant="secondary">{dept.meetingCount}</Badge>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Trưởng phòng</p>
                <p className="text-sm font-medium text-foreground">{dept.head}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

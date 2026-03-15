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
import { Plus, Search, SquarePen, Trash2, AlertTriangle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIncidents } from "@/hooks/useIncidents";
import { useMeetings } from "@/hooks/useMeetings";
import { useUsers } from "@/hooks/useUsers";
import {
  createIncident,
  deleteIncident,
  updateIncident,
  getIncident,
  type IncidentListItem,
} from "@/services/api/incidents";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Thấp" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HIGH", label: "Cao" },
];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Mới" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "RESOLVED", label: "Đã xử lý" },
];

interface IncidentForm {
  title: string;
  description: string;
  severity: string;
  status: string;
  meetingId: string;
  reportedById: string;
  assignedToId: string;
}

const emptyForm: IncidentForm = {
  title: "",
  description: "",
  severity: "MEDIUM",
  status: "OPEN",
  meetingId: "",
  reportedById: "",
  assignedToId: "",
};

export default function IncidentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("__all__");
  const [filterSeverity, setFilterSeverity] = useState<string>("__all__");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncidentForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<IncidentListItem | null>(null);
  const [detailIncident, setDetailIncident] = useState<IncidentListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: incidentList = [] } = useIncidents({
    status: filterStatus === "__all__" ? undefined : filterStatus,
    severity: filterSeverity === "__all__" ? undefined : filterSeverity,
  });
  const { data: meetings = [] } = useMeetings();
  const { data: users = [] } = useUsers();
  const queryClient = useQueryClient();

  const searchLower = search.toLowerCase().trim();
  const filtered = incidentList.filter(
    (i) =>
      !searchLower ||
      i.title.toLowerCase().includes(searchLower) ||
      i.meetingTitle.toLowerCase().includes(searchLower) ||
      (i.reportedByLogin && i.reportedByLogin.toLowerCase().includes(searchLower))
  );

  const severityVariant: Record<string, string> = {
    LOW: "bg-muted text-muted-foreground",
    MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    HIGH: "bg-destructive/15 text-destructive border border-destructive/20",
  };

  const statusVariant: Record<string, string> = {
    OPEN: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20",
    IN_PROGRESS: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    RESOLVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  };

  const getSeverityLabel = (v: string) => SEVERITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
  const getStatusLabel = (v: string) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;

  const validateForm = (): string | null => {
    if (!form.title.trim()) return "Vui lòng nhập tiêu đề";
    if (!form.reportedById) return "Vui lòng chọn người báo cáo";
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
        const current = incidentList.find((i) => i.id === editingId);
        await updateIncident(editingId, {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          severity: form.severity,
          status: form.status,
          reportedAt: current?.reportedAt ?? new Date().toISOString(),
          meetingId: form.meetingId,
          reportedById: form.reportedById,
          assignedToId: form.assignedToId || null,
        });
        toast({ title: "Đã cập nhật", description: "Sự cố đã được cập nhật." });
      } else {
        await createIncident({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          severity: form.severity,
          meetingId: form.meetingId || undefined,
          reportedById: form.reportedById,
          assignedToId: form.assignedToId || undefined,
        });
        toast({ title: "Đã thêm", description: "Sự cố đã được tạo." });
      }
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không thể lưu sự cố.";
      toast({ variant: "destructive", title: "Lỗi", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    if (!isAdmin) return;
    setEditingId(null);
    setForm(emptyForm);
    setSaving(false);
    setModalOpen(true);
  };

  const openEdit = (inc: IncidentListItem) => {
    if (!isAdmin) return;
    setEditingId(inc.id);
    const reportedById =
      inc.reportedById ?? users.find((u) => u.login === inc.reportedByLogin)?.id ?? "";
    setForm({
      title: inc.title,
      description: inc.description ?? "",
      severity: inc.severity ?? "MEDIUM",
      status: inc.status ?? "OPEN",
      meetingId: inc.meetingId ?? "",
      reportedById,
      assignedToId: inc.assignedToId ?? "",
    });
    setSaving(false);
    setModalOpen(true);
  };

  const openDetail = async (inc: IncidentListItem) => {
    try {
      const full = await getIncident(inc.id);
      setDetailIncident(full);
      setDetailOpen(true);
    } catch {
      setDetailIncident(inc);
      setDetailOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteIncident(deleteConfirm.id);
      toast({ title: "Đã xóa", description: "Sự cố đã được xóa." });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setDeleteConfirm(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không thể xóa sự cố.";
      toast({ variant: "destructive", title: "Lỗi", description: msg });
    }
  };

  return (
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
        <PageHeader
          title="Quản lý sự cố"
          description="Danh sách báo cáo sự cố trong các cuộc họp"
        >
          {isAdmin && (
            <Button onClick={openCreate} className="gap-2 h-11">
              <Plus className="h-4 w-4" />
              Thêm sự cố
            </Button>
          )}
        </PageHeader>
      </div>

      <div className="flex flex-wrap items-center gap-3 opacity-0 animate-auth-fade-in-up auth-stagger-1">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tiêu đề, cuộc họp, người báo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-11">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px] h-11">
            <SelectValue placeholder="Mức độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả mức độ</SelectItem>
            {SEVERITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-2">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="font-medium w-10"></TableHead>
              <TableHead className="font-medium">Tiêu đề</TableHead>
              <TableHead className="font-medium">Cuộc họp</TableHead>
              <TableHead className="font-medium">Người báo</TableHead>
              <TableHead className="font-medium">Người phụ trách</TableHead>
              <TableHead className="font-medium">Mức độ</TableHead>
              <TableHead className="font-medium">Trạng thái</TableHead>
              <TableHead className="font-medium">Thời gian báo</TableHead>
              {isAdmin && <TableHead className="text-right font-medium w-28">Thao tác</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inc, i) => (
              <TableRow
                key={inc.id}
                className="hover:bg-muted/30 opacity-0 animate-auth-fade-in-up"
                style={{ animationDelay: `${0.15 + i * 0.03}s`, animationFillMode: "forwards" }}
              >
                <TableCell>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate" title={inc.title}>
                  {inc.title || "—"}
                </TableCell>
                <TableCell className="max-w-[180px] truncate" title={inc.meetingTitle}>
                  {inc.meetingTitle || "—"}
                </TableCell>
                <TableCell className="text-sm">{inc.reportedByLogin || "—"}</TableCell>
                <TableCell className="text-sm max-w-[120px] truncate" title={inc.assignedToLogin ?? ""}>
                  {inc.assignedToLogin || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={severityVariant[inc.severity] ?? ""}>
                    {getSeverityLabel(inc.severity)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[inc.status] ?? ""}>
                    {getStatusLabel(inc.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {inc.reportedAt ? new Date(inc.reportedAt).toLocaleString("vi-VN") : "—"}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDetail(inc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(inc)}
                      >
                        <SquarePen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(inc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 9 : 8}
                  className="p-0"
                >
                  <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {search ? "Không tìm thấy sự cố" : "Chưa có sự cố nào"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search ? "Thử tìm theo tiêu đề hoặc cuộc họp" : "Thêm sự cố để bắt đầu"}
                    </p>
                    {isAdmin && !search && (
                      <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Thêm sự cố
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
              {editingId ? "Sửa sự cố" : "Thêm sự cố"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tiêu đề *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tiêu đề sự cố"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Cuộc họp (tùy chọn)</Label>
              <Select
                value={form.meetingId || "__none__"}
                onValueChange={(v) => setForm({ ...form, meetingId: v === "__none__" ? "" : v })}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue placeholder="Chọn cuộc họp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Chọn cuộc họp —</SelectItem>
                  {meetings.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Người báo cáo *</Label>
              <Select
                value={form.reportedById || "__none__"}
                onValueChange={(v) => setForm({ ...form, reportedById: v === "__none__" ? "" : v })}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue placeholder="Chọn người báo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Chọn người báo —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.login}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Người phụ trách (hỗ trợ)</Label>
              <Select
                value={form.assignedToId || "__none__"}
                onValueChange={(v) => setForm({ ...form, assignedToId: v === "__none__" ? "" : v })}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue placeholder="Chọn người phụ trách" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Không chọn —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.login}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mức độ</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm({ ...form, severity: v })}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingId && (
              <div>
                <Label>Trạng thái</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="mt-1.5 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Mô tả</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả chi tiết (tùy chọn)"
                className="mt-1.5 h-11"
              />
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

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={(open) => !open && setDetailOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Chi tiết sự cố
            </DialogTitle>
          </DialogHeader>
          {detailIncident && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tiêu đề</p>
                <p className="font-medium mt-0.5">{detailIncident.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cuộc họp</p>
                <p className="mt-0.5">{detailIncident.meetingTitle || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Người báo</p>
                <p className="mt-0.5">{detailIncident.reportedByLogin || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Người phụ trách</p>
                <p className="mt-0.5">{detailIncident.assignedToLogin || "—"}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={severityVariant[detailIncident.severity] ?? ""}>
                  {getSeverityLabel(detailIncident.severity)}
                </Badge>
                <Badge variant="outline" className={statusVariant[detailIncident.status] ?? ""}>
                  {getStatusLabel(detailIncident.status)}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Thời gian báo</p>
                <p className="mt-0.5 text-sm">
                  {detailIncident.reportedAt
                    ? new Date(detailIncident.reportedAt).toLocaleString("vi-VN")
                    : "—"}
                </p>
              </div>
              {detailIncident.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mô tả</p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{detailIncident.description}</p>
                </div>
              )}
            </div>
          )}
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
                <AlertDialogTitle className="font-display tracking-tight">Xóa sự cố</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Bạn có chắc chắn muốn xóa sự cố này?
                </AlertDialogDescription>
              </div>
            </div>
            {deleteConfirm && (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{deleteConfirm.title}</p>
                <p className="text-muted-foreground text-xs mt-1">{deleteConfirm.meetingTitle}</p>
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

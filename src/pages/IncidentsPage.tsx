import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllIncidents } from "@/services/api/meetings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Search } from "lucide-react";

export default function IncidentsPage() {
  const [search, setSearch] = useState("");

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["all-incidents"],
    queryFn: getAllIncidents,
  });

  const filtered = incidents.filter(
    (i: any) =>
      (i.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.meetingTitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.reportedBy ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const severityVariant: Record<string, string> = {
    LOW: "bg-muted text-muted-foreground",
    MEDIUM: "bg-warning/15 text-warning border border-warning/20",
    HIGH: "bg-destructive/15 text-destructive border border-destructive/20",
  };

  return (
    <div className="page-content">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Quản lý sự cố</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Danh sách báo cáo sự cố trong các cuộc họp
        </p>
      </div>

      <Card className="card-elevated overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danh sách sự cố
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tiêu đề, cuộc họp, người báo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8">Đang tải...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Không có sự cố nào.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Cuộc họp</TableHead>
                    <TableHead>Người báo</TableHead>
                    <TableHead>Mức độ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian báo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inc: any) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={inc.title}>
                        {inc.title || "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate" title={inc.meetingTitle}>
                        {inc.meetingTitle || "—"}
                      </TableCell>
                      <TableCell>{inc.reportedBy || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={severityVariant[inc.severity] ?? ""}>
                          {inc.severity === "LOW" ? "Thấp" : inc.severity === "HIGH" ? "Cao" : "Trung bình"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{inc.status || "OPEN"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {inc.reportedAt ? new Date(inc.reportedAt).toLocaleString("vi-VN") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

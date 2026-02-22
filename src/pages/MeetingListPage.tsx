import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { meetings, statusLabels, typeLabels, levelLabels, type MeetingStatus, type MeetingType } from "@/data/mockData";
import { Search, Filter, CalendarDays, MapPin, Video, Users, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const statusColorMap: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning border border-warning/20",
  approved: "bg-success/15 text-success border border-success/20",
  rejected: "bg-destructive/15 text-destructive border border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-info/15 text-info border border-info/20",
};

const typeIconMap: Record<string, typeof MapPin> = {
  offline: MapPin,
  online: Video,
  hybrid: Users,
};

export default function MeetingListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = meetings.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    const matchType = typeFilter === "all" || m.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Danh sách cuộc họp</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý và theo dõi tất cả cuộc họp</p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm cuộc họp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Hình thức" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả hình thức</SelectItem>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Meeting List */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((meeting) => {
              const TypeIcon = typeIconMap[meeting.type];
              return (
                <div key={meeting.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/20 transition-colors animate-slide-up">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/8">
                    <TypeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{meeting.title}</p>
                      <Badge variant="outline" className={`text-[10px] ${statusColorMap[meeting.status]}`}>
                        {statusLabels[meeting.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(meeting.startTime).toLocaleDateString('vi-VN')}
                      </span>
                      <span>
                        {new Date(meeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {meeting.roomName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {meeting.roomName}
                        </span>
                      )}
                      <span>{meeting.department}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {meeting.attendees.length}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Chi tiết
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="font-display">{meeting.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div className="flex gap-2">
                          <Badge variant="outline" className={statusColorMap[meeting.status]}>
                            {statusLabels[meeting.status]}
                          </Badge>
                          <Badge variant="outline">{typeLabels[meeting.type]}</Badge>
                          <Badge variant="outline">{levelLabels[meeting.level]}</Badge>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div><span className="text-muted-foreground">Thời gian:</span><br />{new Date(meeting.startTime).toLocaleString('vi-VN')}</div>
                          <div><span className="text-muted-foreground">Kết thúc:</span><br />{new Date(meeting.endTime).toLocaleString('vi-VN')}</div>
                          <div><span className="text-muted-foreground">Chủ trì:</span><br />{meeting.chairperson}</div>
                          <div><span className="text-muted-foreground">Đơn vị:</span><br />{meeting.department}</div>
                          {meeting.roomName && <div><span className="text-muted-foreground">Phòng họp:</span><br />{meeting.roomName}</div>}
                          {meeting.meetingLink && <div><span className="text-muted-foreground">Link họp:</span><br /><a href={meeting.meetingLink} className="text-info underline">{meeting.meetingLink}</a></div>}
                        </div>
                        <Separator />
                        <div>
                          <p className="font-medium mb-1">Mô tả</p>
                          <p className="text-muted-foreground">{meeting.description}</p>
                        </div>
                        {meeting.agenda.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <p className="font-medium mb-2">Chương trình họp</p>
                              <div className="space-y-2">
                                {meeting.agenda.map((item) => (
                                  <div key={item.order} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-secondary/50">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{item.order}</span>
                                    <div className="flex-1">
                                      <p className="font-medium">{item.title}</p>
                                      <p className="text-muted-foreground">{item.presenter} • {item.duration} phút</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        <Separator />
                        <div>
                          <p className="font-medium mb-1">Thành phần tham dự ({meeting.attendees.length})</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {meeting.attendees.map((a) => (
                              <Badge key={a} variant="secondary" className="text-[11px]">{a}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Không tìm thấy cuộc họp nào
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

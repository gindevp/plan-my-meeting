import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { meetings, statusLabels, typeLabels, levelLabels, type MeetingStatus } from "@/data/mockData";
import { Search, Filter, Eye, Pencil, Trash2, Plus, MapPin, Video, Users, CheckCircle, Clock, XCircle, FileX, FileEdit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

const statusTabs: { key: MeetingStatus | "cancelled"; label: string; icon: typeof CheckCircle }[] = [
  { key: "approved", label: "Đã phê duyệt", icon: CheckCircle },
  { key: "pending", label: "Chờ phê duyệt", icon: Clock },
  { key: "rejected", label: "Từ chối", icon: XCircle },
  { key: "cancelled", label: "Đã xóa", icon: FileX },
  { key: "draft", label: "Lưu nháp", icon: FileEdit },
];

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

export default function MeetingPlanPage() {
  const [activeTab, setActiveTab] = useState<string>("approved");
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<(typeof meetings)[0] | null>(null);
  const navigate = useNavigate();

  const filtered = meetings.filter((m) => {
    const matchStatus = m.status === activeTab;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getTabCount = (status: string) => meetings.filter((m) => m.status === status).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Quản lý kế hoạch lịch họp</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý và theo dõi các kế hoạch cuộc họp</p>
        </div>
        <Button onClick={() => navigate("/meetings/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Lên lịch họp
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {statusTabs.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm cuộc họp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowFilter(!showFilter)}>
          <Filter className="h-3.5 w-3.5" /> Bộ lọc
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên cuộc họp</TableHead>
              <TableHead>Cấp</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Cơ quan chủ trì</TableHead>
              <TableHead>Chủ trì</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((meeting) => {
              const TypeIcon = typeIconMap[meeting.type];
              return (
                <TableRow key={meeting.id} className="hover:bg-secondary/20">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">{meeting.attendees.length} đơn vị tham gia</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{levelLabels[meeting.level]}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {typeLabels[meeting.type]}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{meeting.department}</TableCell>
                  <TableCell className="text-sm">{meeting.chairperson}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(meeting.startTime).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(meeting.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {new Date(meeting.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] ${statusColorMap[meeting.status]}`}>
                      {statusLabels[meeting.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMeeting(meeting)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                  Không tìm thấy cuộc họp nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-lg">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selectedMeeting.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline" className={statusColorMap[selectedMeeting.status]}>
                    {statusLabels[selectedMeeting.status]}
                  </Badge>
                  <Badge variant="outline">{typeLabels[selectedMeeting.type]}</Badge>
                  <Badge variant="outline">{levelLabels[selectedMeeting.level]}</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Thời gian:</span><br />{new Date(selectedMeeting.startTime).toLocaleString("vi-VN")}</div>
                  <div><span className="text-muted-foreground">Kết thúc:</span><br />{new Date(selectedMeeting.endTime).toLocaleString("vi-VN")}</div>
                  <div><span className="text-muted-foreground">Chủ trì:</span><br />{selectedMeeting.chairperson}</div>
                  <div><span className="text-muted-foreground">Đơn vị:</span><br />{selectedMeeting.department}</div>
                  {selectedMeeting.roomName && <div><span className="text-muted-foreground">Phòng họp:</span><br />{selectedMeeting.roomName}</div>}
                  {selectedMeeting.meetingLink && <div><span className="text-muted-foreground">Link họp:</span><br /><a href={selectedMeeting.meetingLink} className="text-info underline">{selectedMeeting.meetingLink}</a></div>}
                </div>
                <Separator />
                <div>
                  <p className="font-medium mb-1">Mô tả</p>
                  <p className="text-muted-foreground">{selectedMeeting.description}</p>
                </div>
                {selectedMeeting.agenda.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">Chương trình họp</p>
                      <div className="space-y-2">
                        {selectedMeeting.agenda.map((item) => (
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
                  <p className="font-medium mb-1">Thành phần tham dự ({selectedMeeting.attendees.length})</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedMeeting.attendees.map((a) => (
                      <Badge key={a} variant="secondary" className="text-[11px]">{a}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

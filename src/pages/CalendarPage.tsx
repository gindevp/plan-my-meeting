import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { meetings, statusLabels, typeLabels } from "@/data/mockData";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type ViewMode = "day" | "week" | "month";

const typeBorderColor: Record<string, string> = {
  offline: "border-l-green-500",
  online: "border-l-blue-500",
  hybrid: "border-l-orange-500",
};

const statusColorMap: Record<string, string> = {
  approved: "text-green-600",
  pending: "text-orange-500",
  draft: "text-muted-foreground",
  rejected: "text-red-500",
  cancelled: "text-red-400",
  completed: "text-blue-600",
};

const statusDisplayLabels: Record<string, string> = {
  approved: "Sẵn sàng",
  pending: "Đang chuẩn bị",
  draft: "Nháp",
  rejected: "Từ chối",
  cancelled: "Hủy",
  completed: "Hoàn thành",
};

const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1));
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [weekIndex, setWeekIndex] = useState(0);
  const [modalDate, setModalDate] = useState<Date | null>(null);

  const today = new Date(2026, 1, 26);

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter((m) => {
      const d = new Date(m.startTime);
      return d.toDateString() === date.toDateString() && m.status !== "cancelled";
    });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate.getMonth(), currentDate.getFullYear()]);
  const weeks = useMemo(() => {
    const w: (Date | null)[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) w.push(monthDays.slice(i, i + 7));
    return w;
  }, [monthDays]);

  const capitalizedMonth = "Tháng " + (currentDate.getMonth() + 1) + " " + currentDate.getFullYear();

  // Navigation handlers
  const navigateDay = (dir: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const navigateWeek = (dir: number) => {
    const newIndex = weekIndex + dir;
    if (newIndex >= 0 && newIndex < weeks.length) {
      setWeekIndex(newIndex);
    }
  };

  const navigateMonth = (dir: number) => {
    const d = new Date(currentDate);
    d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  // Reset week index when switching to week mode or changing month
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "week") setWeekIndex(0);
  };

  const handleMonthClick = (monthIdx: number) => {
    const d = new Date(currentDate.getFullYear(), monthIdx, 1);
    setCurrentDate(d);
    setViewMode("day");
  };

  const renderMeetingCard = (m: (typeof meetings)[0]) => (
    <div
      key={m.id}
      className={`bg-card border-l-[3px] ${typeBorderColor[m.type]} rounded-r px-2 py-1.5 text-[11px] leading-tight cursor-pointer hover:bg-accent/40 transition-colors`}
    >
      <p className="font-semibold text-foreground truncate">{m.title}</p>
      <p className="text-muted-foreground mt-0.5 flex items-center gap-1">
        <span>⏱</span> {formatTime(m.startTime)}-{formatTime(m.endTime)}
      </p>
      <p className={`mt-0.5 font-medium ${statusColorMap[m.status] || "text-muted-foreground"}`}>
        {statusDisplayLabels[m.status] || statusLabels[m.status]}
      </p>
    </div>
  );

  const modalMeetings = modalDate ? getMeetingsForDay(modalDate) : [];

  // Mini calendar for month overview
  const renderMiniMonth = (monthIdx: number) => {
    const year = currentDate.getFullYear();
    const miniDays = getMonthDays(new Date(year, monthIdx, 1));
    const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

    return (
      <div
        key={monthIdx}
        className="border border-border rounded-lg p-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => handleMonthClick(monthIdx)}
      >
        <p className="text-sm font-semibold mb-2 text-center">{monthNames[monthIdx]}</p>
        <div className="grid grid-cols-7 gap-0.5">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <div key={d} className="text-[8px] text-muted-foreground text-center">{d}</div>
          ))}
          {miniDays.map((day, i) => {
            const hasMeetings = day ? getMeetingsForDay(day).length > 0 : false;
            const isToday = day?.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`text-[9px] text-center h-4 flex items-center justify-center rounded-sm ${
                  !day ? "" : isToday ? "bg-primary text-primary-foreground font-bold" : hasMeetings ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {day?.getDate() || ""}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Lịch họp</h1>
          <p className="text-sm text-muted-foreground mt-1">Xem lịch các cuộc họp theo ngày, tuần, tháng</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-blue-500 inline-block rounded" /> Trực tuyến
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-green-500 inline-block rounded" /> Trực tiếp
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-orange-500 inline-block rounded" /> Kết hợp
            </span>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Bộ lọc
          </Button>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        {/* Nav bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {viewMode === "day" && (
              <>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDay(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDay(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-semibold ml-2">{capitalizedMonth}</h2>
              </>
            )}
            {viewMode === "week" && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateWeek(-1)}
                  disabled={weekIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateWeek(1)}
                  disabled={weekIndex >= weeks.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-semibold ml-2">
                  {capitalizedMonth} — Tuần {weekIndex + 1}
                </h2>
              </>
            )}
            {viewMode === "month" && (
              <>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-semibold ml-2">Năm {currentDate.getFullYear()}</h2>
              </>
            )}
          </div>
          <div className="flex bg-secondary rounded-lg p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange(mode)}
                className="text-xs h-7 px-3"
              >
                {mode === "day" ? "Ngày" : mode === "week" ? "Tuần" : "Tháng"}
              </Button>
            ))}
          </div>
        </div>

        {/* Day View (monthly calendar grid) */}
        {viewMode === "day" && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map((name) => (
                <div key={name} className="px-3 py-2 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
                  {name}
                </div>
              ))}
            </div>
            <div className="divide-y divide-border">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 min-h-[120px]">
                  {week.map((day, di) => {
                    const dayMeetings = day ? getMeetingsForDay(day) : [];
                    const isToday = day?.toDateString() === today.toDateString();
                    const maxShow = 2;
                    const remaining = dayMeetings.length - maxShow;
                    return (
                      <div
                        key={di}
                        className={`border-r border-border last:border-r-0 p-1.5 cursor-pointer hover:bg-accent/20 transition-colors ${!day ? "bg-muted/20" : ""}`}
                        onClick={() => day && setModalDate(day)}
                      >
                        {day && (
                          <>
                            <p className={`text-xs mb-1 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                              {day.getDate()}
                            </p>
                            <div className="space-y-1">
                              {dayMeetings.slice(0, maxShow).map(renderMeetingCard)}
                              {remaining > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setModalDate(day); }}
                                  className="text-[10px] text-primary font-medium px-1 hover:underline"
                                >
                                  +{remaining} cuộc họp nữa
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Week View */}
        {viewMode === "week" && weeks[weekIndex] && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map((name) => (
                <div key={name} className="px-3 py-2 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
                  {name}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {weeks[weekIndex].map((day, di) => {
                const dayMeetings = day ? getMeetingsForDay(day) : [];
                const isToday = day?.toDateString() === today.toDateString();
                const maxShow = 5;
                const remaining = dayMeetings.length - maxShow;
                return (
                  <div
                    key={di}
                    className={`border-r border-border last:border-r-0 p-2 cursor-pointer hover:bg-accent/20 transition-colors ${!day ? "bg-muted/20" : ""}`}
                    onClick={() => day && setModalDate(day)}
                  >
                    {day && (
                      <>
                        <p className={`text-xs mb-2 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {day.getDate()}/{day.getMonth() + 1}
                        </p>
                        <div className="space-y-1.5">
                          {dayMeetings.slice(0, maxShow).map(renderMeetingCard)}
                          {remaining > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setModalDate(day); }}
                              className="text-[10px] text-primary font-medium px-1 hover:underline"
                            >
                              +{remaining} cuộc họp nữa
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Month View (year overview with mini calendars) */}
        {viewMode === "month" && (
          <div className="p-5 grid grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => renderMiniMonth(i))}
          </div>
        )}
      </div>

      {/* Day Meetings Modal */}
      <Dialog open={!!modalDate} onOpenChange={() => setModalDate(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {modalDate && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Cuộc họp ngày {modalDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {modalMeetings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Không có cuộc họp nào trong ngày này</p>
                ) : (
                  modalMeetings.map((m) => (
                    <div key={m.id} className={`border-l-[3px] ${typeBorderColor[m.type]} rounded-r-lg p-3 bg-secondary/30`}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">{m.title}</p>
                        <Badge variant="outline" className={`text-[10px] ${statusColorMap[m.status] ? "" : ""}`}>
                          {statusLabels[m.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>⏱ {formatTime(m.startTime)} - {formatTime(m.endTime)}</span>
                        <span>{typeLabels[m.type]}</span>
                        {m.roomName && <span>📍 {m.roomName}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.attendees.map((a) => (
                          <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { meetings, statusLabels, typeLabels } from "@/data/mockData";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

type ViewMode = "week" | "month";

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
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const today = new Date(2026, 1, 22);

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter((m) => {
      const d = new Date(m.startTime);
      return d.toDateString() === date.toDateString() && m.status !== "cancelled";
    });
  };

  const navigateMonth = (dir: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    // Fill remaining cells to complete last row
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const monthLabel = currentDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const capitalizedMonth = "Tháng " + (currentDate.getMonth() + 1) + " " + currentDate.getFullYear();

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

  const monthDays = getMonthDays(currentDate);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < monthDays.length; i += 7) {
    weeks.push(monthDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Lịch họp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Xem lịch các cuộc họp theo ngày, tuần, tháng
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
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
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold ml-2">{capitalizedMonth}</h2>
          </div>
          <div className="flex bg-secondary rounded-lg p-0.5">
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="text-xs h-7 px-3"
            >
              Tuần
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="text-xs h-7 px-3"
            >
              Tháng
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {dayNames.map((name) => (
            <div key={name} className="px-3 py-2 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {viewMode === "month" ? (
          <div className="divide-y divide-border">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 min-h-[120px]">
                {week.map((day, di) => {
                  const dayMeetings = day ? getMeetingsForDay(day) : [];
                  const isToday = day?.toDateString() === today.toDateString();
                  return (
                    <div
                      key={di}
                      className={`border-r border-border last:border-r-0 p-1.5 ${
                        !day ? "bg-muted/20" : ""
                      }`}
                    >
                      {day && (
                        <>
                          <p
                            className={`text-xs mb-1 ${
                              isToday
                                ? "text-primary font-bold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {day.getDate()}
                          </p>
                          <div className="space-y-1">
                            {dayMeetings.slice(0, 3).map(renderMeetingCard)}
                            {dayMeetings.length > 3 && (
                              <p className="text-[10px] text-muted-foreground px-1">
                                +{dayMeetings.length - 3} cuộc họp
                              </p>
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
        ) : (
          /* Week view */
          <div className="divide-y divide-border">
            {(() => {
              const weekDays = getWeekDays(currentDate);
              return (
                <div className="grid grid-cols-7 min-h-[400px]">
                  {weekDays.map((day, di) => {
                    const dayMeetings = getMeetingsForDay(day);
                    const isToday = day.toDateString() === today.toDateString();
                    return (
                      <div key={di} className="border-r border-border last:border-r-0 p-2">
                        <p className={`text-xs mb-2 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {day.getDate()}/{day.getMonth() + 1}
                        </p>
                        <div className="space-y-1.5">
                          {dayMeetings.map(renderMeetingCard)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

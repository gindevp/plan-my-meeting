import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { typeLabels } from "@/data/mockData";
import { useMeetings } from "@/hooks/useMeetings";
import { useAuth } from "@/contexts/AuthContext";
import { getAllParticipants } from "@/services/api/meetings";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

type ViewMode = "day" | "week" | "month" | "year";

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

/** Trạng thái theo thời gian thực trên lịch: chỉ dùng cho cuộc họp đã phê duyệt. */
type RuntimeStatus = "preparing" | "in_progress" | "ended";
const runtimeStatusLabels: Record<RuntimeStatus, string> = {
  preparing: "Đang chuẩn bị",
  in_progress: "Đang họp",
  ended: "Đã kết thúc",
};
const runtimeStatusColor: Record<RuntimeStatus, string> = {
  preparing: "text-amber-600",
  in_progress: "text-green-600",
  ended: "text-muted-foreground",
};

function getMeetingRuntimeStatus(m: { startTime: string; endTime: string; status?: string }): RuntimeStatus {
  if (m.status === "completed") return "ended";
  const now = Date.now();
  const start = new Date(m.startTime).getTime();
  const end = new Date(m.endTime).getTime();
  if (now < start) return "preparing";
  if (now >= end) return "ended";
  return "in_progress";
}

const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const normalizeLevel = (level?: string) => {
  const value = String(level ?? "").trim().toLowerCase();
  if (["corporate", "company", "tong_cong_ty", "tổng công ty", "cap_tong_cong_ty"].includes(value)) return "company";
  if (["department", "phong_ban", "phòng ban", "team"].includes(value)) return "department";
  return value || "department";
};

export default function CalendarPage() {
  const { data: meetings = [] } = useMeetings();
  const { user } = useAuth();
  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;

  const { data: allParticipantsForPlan = [] } = useQuery({
    queryKey: ["all-participants"],
    queryFn: getAllParticipants,
  });

  const participantMeetingIds = useMemo(() => {
    const ids = new Set<string>();
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (p.userId != null && String(p.userId) === String(user?.id) && String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" && p.meeting?.id != null) {
        ids.add(String(p.meeting.id));
      }
    });
    return ids;
  }, [allParticipantsForPlan, user?.id]);

  const participantMeetingsAsList = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (p.userId == null || String(p.userId) !== String(user?.id) || String(p.meeting?.status ?? "").toUpperCase() !== "APPROVED" || !p.meeting?.id) return;
      const id = String(p.meeting.id);
      if (seen.has(id)) return;
      seen.add(id);
      const m = p.meeting;
      list.push({
        id,
        title: m.title ?? "",
        type: "offline",
        level: "department",
        status: "approved",
        startTime: m.startTime,
        endTime: m.endTime,
        roomName: undefined,
        meetingLink: undefined,
        organizer: m.chairperson ?? "",
        chairperson: m.chairperson ?? "",
        host: undefined,
        hostId: undefined,
        secretaryId: undefined,
        department: m.department ?? "",
        description: "",
        requesterId: undefined,
        attendees: [],
        agenda: [],
      });
    });
    return list;
  }, [allParticipantsForPlan, user?.id]);

  const meetingsForTabs = useMemo(() => {
    const fromApi = meetings as any[];
    if (isAdmin) {
      const filteredApi = fromApi.filter((m: any) => m.status !== "draft" && m.status !== "cancelled");
      const existingIds = new Set(filteredApi.map((m: any) => String(m.id)));
      const onlyFromParticipant = participantMeetingsAsList.filter((m: any) => !existingIds.has(m.id) && m.status !== "draft" && m.status !== "cancelled");
      return [...filteredApi, ...onlyFromParticipant];
    }
    const filteredApi = fromApi.filter(
      (m: any) =>
        m.status !== "cancelled" &&
        (m.requesterId === user?.id || m.hostId === user?.id || participantMeetingIds.has(String(m.id)))
    );
    const existingIds = new Set(filteredApi.map((m: any) => String(m.id)));
    const onlyFromParticipant = participantMeetingsAsList.filter((m: any) => !existingIds.has(m.id));
    return [...filteredApi, ...onlyFromParticipant];
  }, [meetings, participantMeetingsAsList, isAdmin, user?.id, participantMeetingIds]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [weekIndex, setWeekIndex] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredMeetings = useMemo(() => {
    return meetingsForTabs.filter((m: any) => {
      if (filterStartDate && filterStartTime) {
        const filterStart = new Date(`${filterStartDate}T${filterStartTime}`).getTime();
        if (new Date(m.endTime).getTime() < filterStart) return false;
      }
      if (filterEndDate && filterEndTime) {
        const filterEnd = new Date(`${filterEndDate}T${filterEndTime}`).getTime();
        if (new Date(m.startTime).getTime() > filterEnd) return false;
      }
      if (filterLevel) {
        const mLevel = normalizeLevel(m.level);
        if (mLevel !== filterLevel) return false;
      }
      if (filterType && m.type !== filterType) return false;
      return true;
    });
  }, [meetingsForTabs, filterStartDate, filterStartTime, filterEndDate, filterEndTime, filterLevel, filterType]);

  /** Chỉ cuộc họp đã phê duyệt hoặc đã hoàn thành mới hiển thị trên lịch (thời gian thực). */
  const calendarMeetings = useMemo(
    () => filteredMeetings.filter((m: any) => m.status === "approved" || m.status === "completed"),
    [filteredMeetings]
  );

  const today = new Date();

  const getMeetingsForDay = (date: Date) => {
    return calendarMeetings.filter((m: any) => {
      const d = new Date(m.startTime);
      return d.toDateString() === date.toDateString();
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

  const capitalizedMonth = `Tháng ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`;

  const dayMeetingsSorted = useMemo(
    () =>
      getMeetingsForDay(currentDate).sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ),
    [calendarMeetings, currentDate]
  );

  const timelineHours = Array.from({ length: 24 }, (_, i) => i);
  const minutesPerDay = 24 * 60;
  const dayPixelHeight = 24 * 64;
  const timeColWidth = 72;

  const dayLayoutMeetings = useMemo(() => {
    const toMinutes = (iso: string) => {
      const d = new Date(iso);
      return d.getHours() * 60 + d.getMinutes();
    };

    type LayoutMeeting = {
      meeting: (typeof meetings)[0];
      start: number;
      end: number;
      column: number;
      columnsInGroup: number;
    };

    const normalized = dayMeetingsSorted.map(meeting => {
      const start = toMinutes(meeting.startTime);
      let end = toMinutes(meeting.endTime);
      if (end <= start) end = Math.min(start + 30, minutesPerDay);
      return { meeting, start, end, column: 0, columnsInGroup: 1 } as LayoutMeeting;
    });

    const result: LayoutMeeting[] = [];
    let group: LayoutMeeting[] = [];
    let groupEnd = -1;

    const finalizeGroup = () => {
      if (group.length === 0) return;

      const activeByColumn = new Map<number, number>();
      group
        .sort((a, b) => a.start - b.start || a.end - b.end)
        .forEach(item => {
          for (const [col, endMinute] of Array.from(activeByColumn.entries())) {
            if (endMinute <= item.start) activeByColumn.delete(col);
          }

          let col = 0;
          while (activeByColumn.has(col)) col++;
          item.column = col;
          activeByColumn.set(col, item.end);
        });

      const columnsInGroup = Math.max(...group.map(g => g.column)) + 1;
      group.forEach(item => {
        item.columnsInGroup = columnsInGroup;
        result.push(item);
      });

      group = [];
      groupEnd = -1;
    };

    normalized.forEach(item => {
      if (group.length === 0) {
        group = [item];
        groupEnd = item.end;
        return;
      }

      if (item.start < groupEnd) {
        group.push(item);
        groupEnd = Math.max(groupEnd, item.end);
      } else {
        finalizeGroup();
        group = [item];
        groupEnd = item.end;
      }
    });

    finalizeGroup();
    return result;
  }, [dayMeetingsSorted]);

  const navigateDay = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir);
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
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const navigateYear = (dir: number) => {
    const d = new Date(currentDate);
    d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "week") setWeekIndex(0);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  const handleMonthClick = (monthIdx: number) => {
    const d = new Date(currentDate.getFullYear(), monthIdx, 1);
    setCurrentDate(d);
    setViewMode("month");
  };

  const renderMeetingCard = (m: (typeof meetings)[0]) => {
    const runtimeStatus = getMeetingRuntimeStatus(m);
    return (
      <div
        key={m.id}
        className={`bg-card border-l-[3px] ${typeBorderColor[m.type]} rounded-r px-2 py-1.5 text-[11px] leading-tight cursor-pointer hover:bg-accent/40 transition-all duration-200 hover:scale-[1.02]`}
      >
        <p className="font-semibold text-foreground truncate">{m.title}</p>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1">
          <span>⏱</span> {formatTime(m.startTime)}-{formatTime(m.endTime)}
        </p>
        <p className={`mt-0.5 font-medium ${runtimeStatusColor[runtimeStatus] || "text-muted-foreground"}`}>
          {runtimeStatusLabels[runtimeStatus]}
        </p>
      </div>
    );
  };

  const renderMiniMonth = (monthIdx: number) => {
    const year = currentDate.getFullYear();
    const miniDays = getMonthDays(new Date(year, monthIdx, 1));
    const monthNames = [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12",
    ];

    return (
      <div
        key={monthIdx}
        className="border border-border rounded-lg p-3 cursor-pointer hover:bg-accent/30 transition-all duration-200 hover:scale-[1.02] opacity-0 animate-auth-fade-in-up"
        style={{ animationDelay: `${monthIdx * 0.04}s`, animationFillMode: "forwards" }}
        onClick={() => handleMonthClick(monthIdx)}
      >
        <p className="text-sm font-semibold mb-2 text-center">{monthNames[monthIdx]}</p>
        <div className="grid grid-cols-7 gap-0.5">
          {dayNames.map(d => (
            <div key={d} className="text-[8px] text-muted-foreground text-center">
              {d}
            </div>
          ))}
          {miniDays.map((day, i) => {
            const hasMeetings = day ? getMeetingsForDay(day).length > 0 : false;
            const isToday = day?.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`text-[9px] text-center h-4 flex items-center justify-center rounded-sm ${
                  !day
                    ? ""
                    : isToday
                    ? "bg-primary text-primary-foreground font-bold"
                    : hasMeetings
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-muted-foreground"
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
    <div className="page-content">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 opacity-0 animate-auth-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight">Lịch họp</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Xem lịch các cuộc họp theo ngày, tuần, tháng, năm</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-3 sm:w-4 h-0.5 bg-blue-500 inline-block rounded" /> Trực tuyến
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 sm:w-4 h-0.5 bg-green-500 inline-block rounded" /> Trực tiếp
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 sm:w-4 h-0.5 bg-orange-500 inline-block rounded" /> Kết hợp
            </span>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 transition-all duration-200 hover:scale-[1.02] h-8 sm:h-9" onClick={() => setShowFilter(!showFilter)}>
            <Filter className="h-3.5 w-3.5" /> Bộ lọc
          </Button>
        </div>
      </div>

      {showFilter && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4 opacity-0 animate-auth-scale-in">
          <p className="text-sm font-medium">Lọc theo thời gian và điều kiện</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Từ ngày</Label>
              <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Từ giờ</Label>
              <Input type="time" value={filterStartTime} onChange={e => setFilterStartTime(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Đến ngày</Label>
              <Input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Đến giờ</Label>
              <Input type="time" value={filterEndTime} onChange={e => setFilterEndTime(e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Cấp họp</Label>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="">Tất cả</option>
                <option value="company">Tổng công ty</option>
                <option value="department">Phòng ban</option>
                <option value="team">Nhóm/Team</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Loại họp</Label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="">Tất cả</option>
                <option value="offline">Trực tiếp</option>
                <option value="online">Trực tuyến</option>
                <option value="hybrid">Kết hợp</option>
              </select>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setFilterStartDate(""); setFilterStartTime(""); setFilterEndDate(""); setFilterEndTime(""); setFilterLevel(""); setFilterType(""); }}>
            Xóa bộ lọc
          </Button>
        </div>
      )}

      <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-sm opacity-0 animate-auth-fade-in-up auth-stagger-1 transition-all duration-300 hover:shadow-md overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 min-w-0 px-3 sm:px-5 py-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 sm:h-8 text-xs sm:text-sm"
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setViewMode("day");
              }}
            >
              Hôm nay
            </Button>
            {viewMode === "day" && (
              <>
                <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={() => navigateDay(-1)}>
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={() => navigateDay(1)}>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <h2 className="text-sm sm:text-base font-semibold ml-1 sm:ml-2 truncate min-w-0">
                  {currentDate.toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </h2>
              </>
            )}
            {viewMode === "week" && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                  onClick={() => navigateWeek(-1)}
                  disabled={weekIndex === 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                  onClick={() => navigateWeek(1)}
                  disabled={weekIndex >= weeks.length - 1}
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <h2 className="text-sm sm:text-base font-semibold ml-1 sm:ml-2 truncate">
                  {capitalizedMonth} — Tuần {weekIndex + 1}
                </h2>
              </>
            )}
            {viewMode === "month" && (
              <>
                <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <h2 className="text-sm sm:text-base font-semibold ml-1 sm:ml-2">{capitalizedMonth}</h2>
              </>
            )}
            {viewMode === "year" && (
              <>
                <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={() => navigateYear(-1)}>
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={() => navigateYear(1)}>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <h2 className="text-sm sm:text-base font-semibold ml-1 sm:ml-2">Năm {currentDate.getFullYear()}</h2>
              </>
            )}
          </div>
          <div className="flex bg-secondary rounded-lg p-0.5 shrink-0">
            {(["day", "week", "month", "year"] as ViewMode[]).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange(mode)}
                className="text-[10px] sm:text-xs h-6 sm:h-7 px-2 sm:px-3"
              >
                {mode === "day" ? "Ngày" : mode === "week" ? "Tuần" : mode === "month" ? "Tháng" : "Năm"}
              </Button>
            ))}
          </div>
        </div>

        {viewMode === "day" && (
          <div className="relative">
            {currentDate.toDateString() === today.toDateString() && (() => {
              const now = new Date();
              const minutesFromMidnight = now.getHours() * 60 + now.getMinutes();
              const topPx = (minutesFromMidnight / minutesPerDay) * dayPixelHeight;
              return (
                <div
                  className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                  style={{ top: `${topPx}px` }}
                >
                  <div className="w-14 sm:w-[72px] h-px bg-primary shrink-0" />
                  <div className="flex-1 h-px bg-primary" />
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 -ml-1" />
                </div>
              );
            })()}
            <div className="absolute inset-0 pointer-events-none divide-y divide-border">
              {timelineHours.map(hour => (
                <div key={hour} className="grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr] h-16">
                  <div className="px-1.5 sm:px-3 py-3 text-[10px] sm:text-xs text-muted-foreground border-r border-border bg-muted/10 pointer-events-auto">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div className="border-r-0" />
                </div>
              ))}
            </div>

            <div className="relative grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr]" style={{ height: `${dayPixelHeight}px` }}>
              <div className="border-r border-border bg-muted/10" />
              <div className="relative">
                {dayLayoutMeetings.map(item => {
                  const top = (item.start / minutesPerDay) * dayPixelHeight;
                  const height = Math.max(((item.end - item.start) / minutesPerDay) * dayPixelHeight, 28);
                  const widthPercent = 100 / item.columnsInGroup;
                  const leftPercent = item.column * widthPercent;
                  const runtimeStatus = getMeetingRuntimeStatus(item.meeting);

                  return (
                    <div
                      key={item.meeting.id}
                      className={`absolute border-l-[4px] ${typeBorderColor[item.meeting.type]} bg-secondary/70 rounded-r-md p-2 overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:z-20`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `calc(${leftPercent}% + 4px)`,
                        width: `calc(${widthPercent}% - 8px)`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate">{item.meeting.title}</p>
                        <Badge variant="outline" className={`text-[9px] shrink-0 ${runtimeStatusColor[runtimeStatus]}`}>
                          {runtimeStatusLabels[runtimeStatus]}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {formatTime(item.meeting.startTime)} - {formatTime(item.meeting.endTime)} • {typeLabels[item.meeting.type]}
                      </p>
                      {item.meeting.roomName && (
                        <p className="text-[10px] text-muted-foreground truncate">{item.meeting.roomName}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === "month" && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map(name => (
                <div
                  key={name}
                  className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium text-muted-foreground border-r border-border last:border-r-0 text-center"
                >
                  {name}
                </div>
              ))}
            </div>
            <div className="divide-y divide-border">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 min-h-[80px] sm:min-h-[120px]">
                  {week.map((day, di) => {
                    const dayMeetings = day ? getMeetingsForDay(day) : [];
                    const isToday = day?.toDateString() === today.toDateString();
                    const maxShow = 2;
                    const remaining = dayMeetings.length - maxShow;
                    return (
                      <div
                        key={di}
                        className={`border-r border-border last:border-r-0 p-1.5 cursor-pointer hover:bg-accent/20 transition-colors ${
                          !day ? "bg-muted/20" : ""
                        }`}
                        onClick={() => day && handleDayClick(day)}
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
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDayClick(day);
                                  }}
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

        {viewMode === "week" && weeks[weekIndex] && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map(name => (
                <div
                  key={name}
                  className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-center text-[10px] sm:text-sm font-medium text-muted-foreground border-r border-border last:border-r-0"
                >
                  {name}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[280px] sm:min-h-[400px]">
              {weeks[weekIndex].map((day, di) => {
                const dayMeetings = day ? getMeetingsForDay(day) : [];
                const isToday = day?.toDateString() === today.toDateString();
                const maxShow = 5;
                const remaining = dayMeetings.length - maxShow;
                return (
                  <div
                    key={di}
                    className={`border-r border-border last:border-r-0 p-2 cursor-pointer hover:bg-accent/20 transition-colors ${
                      !day ? "bg-muted/20" : ""
                    }`}
                    onClick={() => day && handleDayClick(day)}
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
                              onClick={e => {
                                e.stopPropagation();
                                handleDayClick(day);
                              }}
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

        {viewMode === "year" && (
          <div className="p-3 sm:p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 12 }, (_, i) => renderMiniMonth(i))}
          </div>
        )}
      </div>
    </div>
  );
}

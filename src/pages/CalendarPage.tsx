import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { meetings, statusLabels, typeLabels } from "@/data/mockData";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "week" | "month";

const typeColorMap: Record<string, string> = {
  offline: "bg-meeting-offline text-success-foreground",
  online: "bg-meeting-online text-info-foreground",
  hybrid: "bg-meeting-hybrid text-primary-foreground",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 23)); // Feb 23, 2026
  const [viewMode, setViewMode] = useState<ViewMode>("week");

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

  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7AM to 6PM

  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter(m => {
      const meetingDate = new Date(m.startTime);
      return meetingDate.toDateString() === date.toDateString() && m.status !== 'cancelled';
    });
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
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
    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Lịch họp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-lg p-0.5">
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="text-xs"
            >
              Tuần
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="text-xs"
            >
              Tháng
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(2026, 1, 23))}>
              Hôm nay
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "week" ? (
        <Card className="shadow-card overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-3 text-xs font-medium text-muted-foreground border-r border-border" />
              {weekDays.map((day, i) => {
                const isToday = day.toDateString() === new Date(2026, 1, 23).toDateString();
                return (
                  <div
                    key={i}
                    className={`p-3 text-center border-r border-border last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <p className="text-xs text-muted-foreground">{dayNames[i]}</p>
                    <p className={`text-lg font-display font-bold mt-0.5 ${isToday ? "text-primary" : ""}`}>
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="max-h-[520px] overflow-y-auto">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0 min-h-[56px]">
                  <div className="p-2 text-[11px] text-muted-foreground border-r border-border text-right pr-3 pt-0">
                    {hour}:00
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const dayMeetings = getMeetingsForDay(day).filter(m => {
                      const startHour = new Date(m.startTime).getHours();
                      return startHour === hour;
                    });
                    return (
                      <div key={dayIndex} className="border-r border-border last:border-r-0 p-0.5 relative">
                        {dayMeetings.map((meeting) => {
                          const startH = new Date(meeting.startTime).getHours();
                          const endH = new Date(meeting.endTime).getHours();
                          const duration = endH - startH;
                          return (
                            <div
                              key={meeting.id}
                              className={`${typeColorMap[meeting.type]} rounded-md px-1.5 py-1 text-[10px] leading-tight cursor-pointer hover:opacity-90 transition-opacity`}
                              style={{ minHeight: `${Math.max(duration * 56 - 4, 24)}px` }}
                            >
                              <p className="font-medium truncate">{meeting.title}</p>
                              <p className="opacity-80 mt-0.5">
                                {new Date(meeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-px">
              {dayNames.map((name) => (
                <div key={name} className="p-2 text-center text-xs font-semibold text-muted-foreground">
                  {name}
                </div>
              ))}
              {getMonthDays(currentDate).map((day, i) => {
                const dayMeetings = day ? getMeetingsForDay(day) : [];
                const isToday = day?.toDateString() === new Date(2026, 1, 23).toDateString();
                return (
                  <div
                    key={i}
                    className={`min-h-[100px] p-1.5 border border-border rounded-lg ${
                      day ? "bg-card" : "bg-secondary/30"
                    } ${isToday ? "ring-2 ring-primary/30" : ""}`}
                  >
                    {day && (
                      <>
                        <p className={`text-xs font-medium mb-1 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {day.getDate()}
                        </p>
                        <div className="space-y-0.5">
                          {dayMeetings.slice(0, 2).map((m) => (
                            <div key={m.id} className={`${typeColorMap[m.type]} rounded px-1 py-0.5 text-[9px] truncate`}>
                              {m.title}
                            </div>
                          ))}
                          {dayMeetings.length > 2 && (
                            <p className="text-[9px] text-muted-foreground px-1">+{dayMeetings.length - 2} cuộc họp</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

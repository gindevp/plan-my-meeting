import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, DoorOpen, ClipboardList, Clock, Building2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusLabels, typeLabels } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useMeetings } from "@/hooks/useMeetings";
import { useRooms } from "@/hooks/useRooms";
import { useMeetingTasks } from "@/hooks/useMeetingTasks";
import { useDepartments } from "@/hooks/useDepartments";
import { useIncidents } from "@/hooks/useIncidents";
import { useQuery } from "@tanstack/react-query";
import { getAllParticipants } from "@/services/api/meetings";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const statusColorMap: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning border border-warning/20",
  approved: "bg-success/15 text-success border border-success/20",
  rejected: "bg-destructive/15 text-destructive border border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-info/15 text-info border border-info/20",
};

const typeColorMap: Record<string, string> = {
  offline: "bg-meeting-offline/15 text-meeting-offline",
  online: "bg-meeting-online/15 text-meeting-online",
  hybrid: "bg-meeting-hybrid/15 text-meeting-hybrid",
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="mt-1 space-y-0.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: meetings = [] } = useMeetings();
  const { data: rooms = [] } = useRooms();
  const { data: tasks = [] } = useMeetingTasks();
  const { data: departments = [] } = useDepartments();
  const { data: incidents = [] } = useIncidents();
  const { data: allParticipantsForPlan = [] } = useQuery({
    queryKey: ["all-participants"],
    queryFn: getAllParticipants,
  });

  const isAdmin = user?.authorities?.includes("ROLE_ADMIN") ?? false;
  const isSecretary = user?.authorities?.includes("ROLE_SECRETARY") ?? false;
  const userDepartmentId = user?.departmentId != null ? String(user.departmentId) : null;

  const participantMeetingIds = useMemo(() => {
    const ids = new Set<string>();
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (p.userId != null && String(p.userId) === String(user?.id) && String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" && p.meeting?.id != null) {
        ids.add(String(p.meeting.id));
      }
    });
    return ids;
  }, [allParticipantsForPlan, user?.id]);

  const secretaryDepartmentMeetingIds = useMemo(() => {
    const ids = new Set<string>();
    if (!isSecretary || !userDepartmentId) return ids;
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (p.userId == null && p.departmentId != null && String(p.departmentId) === userDepartmentId && String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" && p.meeting?.id != null) {
        ids.add(String(p.meeting.id));
      }
      if (p.userId != null && p.departmentId != null && String(p.departmentId) === userDepartmentId && String(p.meeting?.status ?? "").toUpperCase() === "APPROVED" && p.meeting?.id != null) {
        ids.add(String(p.meeting.id));
      }
    });
    return ids;
  }, [allParticipantsForPlan, isSecretary, userDepartmentId]);

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
        status: "approved",
        startTime: m.startTime,
        endTime: m.endTime,
        roomName: undefined,
        requesterId: undefined,
        hostId: undefined,
      });
    });
    return list;
  }, [allParticipantsForPlan, user?.id]);

  const secretaryDepartmentMeetingsAsList = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();
    (allParticipantsForPlan as any[]).forEach((p: any) => {
      if (!isSecretary || !userDepartmentId || p.meeting?.id == null) return;
      const deptMatch = p.departmentId != null && String(p.departmentId) === userDepartmentId;
      if (!deptMatch) return;
      if (String(p.meeting?.status ?? "").toUpperCase() !== "APPROVED") return;
      const id = String(p.meeting.id);
      if (seen.has(id)) return;
      seen.add(id);
      const m = p.meeting;
      list.push({
        id,
        title: m.title ?? "",
        type: "offline",
        status: "approved",
        startTime: m.startTime,
        endTime: m.endTime,
        roomName: undefined,
        requesterId: undefined,
        hostId: undefined,
      });
    });
    return list;
  }, [allParticipantsForPlan, isSecretary, userDepartmentId]);

  const meetingsForTabs = useMemo(() => {
    const fromApi = meetings as any[];
    const existingIds = new Set(fromApi.map((m: any) => String(m.id)));
    const onlyFromParticipant = participantMeetingsAsList.filter((m: any) => !existingIds.has(m.id));
    const fromSecretaryDept = secretaryDepartmentMeetingsAsList.filter((m: any) => !existingIds.has(String(m.id)));
    return [...fromApi, ...onlyFromParticipant, ...fromSecretaryDept];
  }, [meetings, participantMeetingsAsList, secretaryDepartmentMeetingsAsList]);

  const upcomingMeetings = useMemo(() => {
    const now = Date.now();
    return (meetingsForTabs as any[])
      .filter((m) => {
        const status = String(m.status ?? "").toLowerCase();
        if (status !== "approved") return false;
        const startTs = m.startTime ? new Date(m.startTime).getTime() : NaN;
        if (!Number.isFinite(startTs) || startTs < now) return false;
        const isOwner =
          (m.requesterId != null && String(m.requesterId) === String(user?.id)) ||
          (m.hostId != null && String(m.hostId) === String(user?.id)) ||
          (m.secretaryId != null && String(m.secretaryId) === String(user?.id));
        const isParticipant = participantMeetingIds.has(String(m.id));
        const isSecretaryDept = secretaryDepartmentMeetingIds.has(String(m.id));
        const visibleToUser = isAdmin || isOwner || isParticipant || isSecretaryDept;
        return visibleToUser;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  }, [meetingsForTabs, user?.id, isAdmin, participantMeetingIds, secretaryDepartmentMeetingIds]);

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.login ?? "User";

  const stats = [
    { label: "Cuộc họp hôm nay", value: meetings.filter((m) => new Date(m.startTime).toDateString() === new Date().toDateString()).length, icon: CalendarDays, color: "text-info" },
    { label: "Phòng ban", value: departments.length, icon: Building2, color: "text-primary" },
    { label: "Phòng trống", value: rooms.filter((r) => r.status === "available").length, icon: DoorOpen, color: "text-success" },
    { label: "Chờ duyệt", value: meetings.filter((m) => m.status === "pending").length, icon: Clock, color: "text-warning" },
    { label: "Nhiệm vụ đang làm", value: tasks.filter((t) => t.status === "in_progress").length, icon: ClipboardList, color: "text-accent" },
    { label: "Sự cố", value: (incidents as any[]).length, icon: AlertTriangle, color: "text-destructive" },
  ];

  const meetingsByType = [
    { name: "Trực tiếp", value: meetings.filter((m) => m.type === "offline").length, color: "hsl(152, 60%, 40%)" },
    { name: "Trực tuyến", value: meetings.filter((m) => m.type === "online").length, color: "hsl(210, 80%, 52%)" },
    { name: "Kết hợp", value: meetings.filter((m) => m.type === "hybrid").length, color: "hsl(280, 60%, 50%)" },
  ];

  const meetingsByStatus = useMemo(() => {
    const order: { key: string; label: string; color: string }[] = [
      { key: "pending", label: "Chờ duyệt", color: "hsl(40, 90%, 50%)" },
      { key: "approved", label: "Đã duyệt", color: "hsl(152, 60%, 40%)" },
      { key: "rejected", label: "Từ chối", color: "hsl(0, 70%, 50%)" },
      { key: "completed", label: "Hoàn thành", color: "hsl(210, 80%, 52%)" },
      { key: "draft", label: "Nháp", color: "hsl(220, 10%, 55%)" },
      { key: "cancelled", label: "Đã xóa", color: "hsl(220, 10%, 65%)" },
    ];
    return order
      .map((o) => ({
        key: o.key,
        name: o.label,
        value: (meetings as any[]).filter((m: any) => String(m.status) === o.key).length,
        color: o.color,
      }))
      .filter((x) => x.value > 0);
  }, [meetings]);

  const meetingsStatusStackData = useMemo(() => {
    const row: any = { name: "Phân bổ" };
    (meetingsByStatus as any[]).forEach((s: any) => {
      row[String(s.key)] = s.value ?? 0;
    });
    return [row];
  }, [meetingsByStatus]);

  const tasksByStatus = useMemo(() => {
    const order: { key: string; label: string; color: string }[] = [
      { key: "not_started", label: "Chưa bắt đầu", color: "hsl(40, 90%, 50%)" },
      { key: "in_progress", label: "Đang làm", color: "hsl(210, 80%, 52%)" },
      { key: "completed", label: "Hoàn thành", color: "hsl(152, 60%, 40%)" },
      { key: "overdue", label: "Quá hạn", color: "hsl(0, 70%, 50%)" },
    ];
    return order
      .map((o) => ({
        key: o.key,
        name: o.label,
        value: (tasks as any[]).filter((t: any) => String(t.status) === o.key).length,
        color: o.color,
      }))
      .filter((x) => x.value > 0);
  }, [tasks]);

  const incidentsBySeverity = useMemo(() => {
    const options = [
      { key: "LOW", name: "Thấp", color: "hsl(152, 60%, 40%)" },
      { key: "MEDIUM", name: "Trung bình", color: "hsl(40, 90%, 50%)" },
      { key: "HIGH", name: "Cao", color: "hsl(0, 70%, 50%)" },
    ];
    return options
      .map((o) => ({
        key: o.key,
        name: o.name,
        color: o.color,
        value: (incidents as any[]).filter((i: any) => String(i.severity || "").toUpperCase() === o.key).length,
      }))
      .filter((x) => x.value > 0);
  }, [incidents]);

  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const nowDate = new Date();
  const startOfWeek = new Date(nowDate);
  startOfWeek.setDate(nowDate.getDate() - ((nowDate.getDay() + 6) % 7));
  const weeklyData = dayNames.map((day, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const count = meetings.filter((m) => new Date(m.startTime).toDateString() === d.toDateString()).length;
    const incidentCount = (incidents as any[]).filter((it: any) => {
      const raw = it?.createdAt ?? it?.reportedAt ?? it?.time ?? null;
      if (!raw) return false;
      const dt = new Date(raw);
      if (Number.isNaN(dt.getTime())) return false;
      return dt.toDateString() === d.toDateString();
    }).length;
    return { day, meetings: count, incidents: incidentCount };
  });

  const staggerClasses = ["auth-stagger-1", "auth-stagger-2", "auth-stagger-3", "auth-stagger-4", "auth-stagger-1", "auth-stagger-2"];

  return (
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-display font-bold tracking-tight text-foreground">Tổng quan</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Xin chào, {displayName}. Đây là tóm tắt hoạt động họp hôm nay.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 lg:gap-5">
        {stats.map((stat, i) => (
          <Card key={stat.label} className={`card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up ${staggerClasses[i]} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}>
            <CardContent className="p-3 sm:p-4 lg:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{stat.label}</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-display font-bold mt-0.5 sm:mt-1">{stat.value}</p>
                </div>
                <div className={`flex h-8 w-8 sm:h-9 sm:w-9 lg:h-11 lg:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-secondary ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 lg:auto-rows-fr">
        {/* Row 1 - left */}
        <Card className="lg:col-span-2 card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-display">Cuộc họp trong tuần</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <defs>
                  <linearGradient id="meetingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(222, 60%, 22%)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(222, 60%, 22%)" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="incidentsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 70%, 50%)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(0, 70%, 50%)" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar name="Cuộc họp" dataKey="meetings" fill="url(#meetingsGradient)" radius={[8, 8, 0, 0]} />
                <Bar name="Sự cố" dataKey="incidents" fill="url(#incidentsGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 1 - right */}
        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-3 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-display">Theo hình thức</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={meetingsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={52}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {meetingsByType.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2 justify-center">
              {meetingsByType.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Row 2 - left */}
        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-display">Theo trạng thái nhiệm vụ</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={tasksByStatus as any[]} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
                <Bar name="Nhiệm vụ" dataKey="value" radius={[0, 0, 0, 0]}>
                  {(tasksByStatus as any[]).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2 justify-center">
              {tasksByStatus.map((item: any) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Row 2 - middle */}
        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-3 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-display">Theo trạng thái cuộc họp</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={meetingsStatusStackData} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
                {(meetingsByStatus as any[]).map((s: any) => (
                  <Bar key={s.key} name={s.name} dataKey={s.key} stackId="meetingStatus" fill={s.color} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2 justify-center">
              {meetingsByStatus.map((item: any) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Meetings - span 2 chart rows on right */}
        <Card className="lg:col-start-3 lg:row-start-1 lg:row-span-2 h-full card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-4 transition-all duration-300 hover:shadow-lg flex flex-col">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-display">Cuộc họp sắp tới</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {upcomingMeetings.length === 0 ? (
                <p className="px-4 sm:px-6 py-5 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">Không có cuộc họp sắp tới</p>
              ) : (
                upcomingMeetings.map((meeting, i) => (
                <div
                  key={meeting.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/plans?tab=approved&meetingId=${meeting.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/plans?tab=approved&meetingId=${meeting.id}`)}
                  className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 hover:bg-secondary/30 transition-all duration-200 opacity-0 animate-auth-fade-in-up cursor-pointer"
                  style={{ animationDelay: `${0.5 + i * 0.08}s`, animationFillMode: "forwards" }}
                >
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{meeting.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      {new Date(meeting.startTime).toLocaleDateString('vi-VN')} • {new Date(meeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] sm:text-xs shrink-0 ${typeColorMap[meeting.type] ?? typeColorMap.offline}`}>
                    {typeLabels[meeting.type] ?? typeLabels.offline}
                  </Badge>
                  <Badge variant="outline" className={`hidden sm:inline-flex text-[10px] sm:text-xs shrink-0 ${statusColorMap[meeting.status] ?? statusColorMap.approved}`}>
                    {statusLabels[meeting.status] ?? statusLabels.approved}
                  </Badge>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Row 3 - left filler chart */}
        <Card className="lg:col-span-2 card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-3 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-display">Sự cố theo mức độ</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={incidentsBySeverity as any[]} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
                <Bar name="Sự cố" dataKey="value" radius={[0, 0, 0, 0]}>
                  {(incidentsBySeverity as any[]).map((entry: any, index: number) => (
                    <Cell key={`incident-severity-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2 justify-center">
              {(incidentsBySeverity as any[]).length > 0 ? (
                incidentsBySeverity.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Chưa có dữ liệu sự cố</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

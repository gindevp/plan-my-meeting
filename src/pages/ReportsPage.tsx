import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMeetings } from "@/hooks/useMeetings";
import { useRooms } from "@/hooks/useRooms";
import { useMeetingTasks } from "@/hooks/useMeetingTasks";
import { useDepartments } from "@/hooks/useDepartments";
import { useIncidents } from "@/hooks/useIncidents";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { CalendarDays, DoorOpen, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const MONTH_LABELS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export default function ReportsPage() {
  const { data: meetings = [] } = useMeetings();
  const { data: rooms = [] } = useRooms();
  const { data: tasks = [] } = useMeetingTasks();
  const { data: departments = [] } = useDepartments();
  const { data: incidents = [] } = useIncidents();

  const [timePeriod, setTimePeriod] = useState("month");
  const [department, setDepartment] = useState("all");

  const filteredMeetings = useMemo(() => {
    let list = meetings as any[];
    if (department !== "all") {
      list = list.filter((m: any) => (m.department || "") === department);
    }
    return list;
  }, [meetings, department]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    if (timePeriod === "month") {
      return MONTH_LABELS.map((month, i) => {
        const monthNum = i + 1;
        const inMonth = filteredMeetings.filter((m: any) => {
          const d = m.startTime ? new Date(m.startTime) : null;
          return d && d.getFullYear() === currentYear && d.getMonth() + 1 === monthNum;
        });
        return {
          month,
          meetings: inMonth.length,
          completed: inMonth.filter((m: any) => m.status === "completed").length,
        };
      });
    }
    if (timePeriod === "quarter") {
      return ["Q1", "Q2", "Q3", "Q4"].map((q, i) => {
        const startMonth = i * 3 + 1;
        const inQuarter = filteredMeetings.filter((m: any) => {
          const d = m.startTime ? new Date(m.startTime) : null;
          if (!d || d.getFullYear() !== currentYear) return false;
          const mth = d.getMonth() + 1;
          return mth >= startMonth && mth < startMonth + 3;
        });
        return {
          month: q,
          meetings: inQuarter.length,
          completed: inQuarter.filter((m: any) => m.status === "completed").length,
        };
      });
    }
    if (timePeriod === "year") {
      return [currentYear - 2, currentYear - 1, currentYear].map((y) => {
        const inYear = filteredMeetings.filter((m: any) => {
          const d = m.startTime ? new Date(m.startTime) : null;
          return d && d.getFullYear() === y;
        });
        return {
          month: String(y),
          meetings: inYear.length,
          completed: inYear.filter((m: any) => m.status === "completed").length,
        };
      });
    }
    return [];
  }, [timePeriod, filteredMeetings]);

  const totalMeetings = meetings.length;
  const meetingsByType = [
    { name: "Trực tiếp", value: meetings.filter((m) => m.type === "offline").length, color: "hsl(152, 60%, 40%)" },
    { name: "Trực tuyến", value: meetings.filter((m) => m.type === "online").length, color: "hsl(210, 80%, 52%)" },
    { name: "Kết hợp", value: meetings.filter((m) => m.type === "hybrid").length, color: "hsl(280, 60%, 50%)" },
  ];

  const meetingsByLevel = [
    { name: "Tổng công ty", value: meetings.filter((m) => m.level === "company").length, color: "hsl(222, 60%, 30%)" },
    { name: "Phòng ban", value: meetings.filter((m) => m.level === "department").length, color: "hsl(222, 50%, 50%)" },
  ];

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const cancelledOrRejected = meetings.filter((m) => m.status === "cancelled" || m.status === "rejected").length;
  const cancelRate = totalMeetings > 0 ? Math.round((cancelledOrRejected / totalMeetings) * 100) : 0;

  const roomUsageData = rooms.map((room) => ({
    name: room.name.replace("Phòng họp ", ""),
    count: meetings.filter((m) => m.roomId === room.id).length,
  }));

  const taskStatusData = [
    { name: "Hoàn thành", value: tasks.filter((t) => t.status === "completed").length, color: "hsl(152, 60%, 40%)" },
    { name: "Đang làm", value: tasks.filter((t) => t.status === "in_progress").length, color: "hsl(210, 80%, 52%)" },
    { name: "Chưa bắt đầu", value: tasks.filter((t) => t.status === "not_started").length, color: "hsl(40, 90%, 50%)" },
    { name: "Quá hạn", value: tasks.filter((t) => t.status === "overdue").length, color: "hsl(0, 70%, 50%)" },
  ];

  const summaryStats = [
  { label: "Tổng cuộc họp", value: totalMeetings, icon: CalendarDays, color: "text-primary" },
  { label: "Phòng họp", value: rooms.length, icon: DoorOpen, color: "text-info" },
  { label: "Tỷ lệ hoàn thành NV", value: `${taskCompletionRate}%`, icon: CheckCircle2, color: "text-success" },
  { label: "Tỷ lệ hủy/từ chối", value: `${cancelRate}%`, icon: XCircle, color: "text-destructive" },
  ];
  const staggerClasses = ["auth-stagger-1", "auth-stagger-2", "auth-stagger-3", "auth-stagger-4"];

  const incidentByStatus = useMemo(() => {
    const list = incidents as any[];
    const statusLabels: Record<string, string> = { OPEN: "Mới", IN_PROGRESS: "Đang xử lý", RESOLVED: "Đã xử lý" };
    const order = ["OPEN", "IN_PROGRESS", "RESOLVED"];
    return order.map((status) => ({
      name: statusLabels[status] ?? status,
      count: list.filter((i: any) => (i.status || "") === status).length,
    }));
  }, [incidents]);

  const incidentBySeverity = useMemo(() => {
    const list = incidents as any[];
    return [
      { name: "Thấp", value: list.filter((i: any) => (i.severity || "") === "LOW").length, color: "hsl(152, 60%, 40%)" },
      { name: "Trung bình", value: list.filter((i: any) => (i.severity || "") === "MEDIUM").length, color: "hsl(40, 90%, 50%)" },
      { name: "Cao", value: list.filter((i: any) => (i.severity || "") === "HIGH").length, color: "hsl(0, 70%, 50%)" },
    ];
  }, [incidents]);

  return (
    <div className="page-content">
      <div className="opacity-0 animate-auth-fade-in-up">
      <PageHeader
        title="Báo cáo & Thống kê"
        description="Tổng hợp dữ liệu hoạt động họp và sử dụng tài nguyên"
      >
        <div className="flex flex-wrap items-center gap-2">
          <SearchableSelect
            options={[
              { value: "month", label: "Theo tháng" },
              { value: "quarter", label: "Theo quý" },
              { value: "year", label: "Theo năm" },
            ]}
            value={timePeriod}
            onValueChange={setTimePeriod}
            placeholder="Kỳ báo cáo"
            searchPlaceholder="Tìm kỳ..."
            emptyText="Không tìm thấy."
            triggerClassName="w-[130px] h-11"
          />
          <SearchableSelect
            options={[{ value: "all", label: "Tất cả" }, ...departments.map((d: { id: string; name: string }) => ({ value: d.name, label: d.name }))]}
            value={department}
            onValueChange={setDepartment}
            placeholder="Phòng ban"
            searchPlaceholder="Tìm phòng ban..."
            emptyText="Không tìm thấy."
            triggerClassName="w-[150px] h-11"
          />
        </div>
      </PageHeader>
      </div>

      {/* Summary Stats - giống Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-5">
        {summaryStats.map((stat, i) => (
          <Card key={stat.label} className={`card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up ${staggerClasses[i]} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`} style={{ animationDelay: `${0.1 + i * 0.05}s`, animationFillMode: "forwards" }}>
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

      {/* Row 1: Monthly Trend + By Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold tracking-tight">Xu hướng cuộc họp theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 90%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="meetings" name="Tổng họp" stroke="hsl(222, 60%, 22%)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="completed" name="Hoàn thành" stroke="hsl(152, 60%, 40%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-3 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold tracking-tight">Theo hình thức họp</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={meetingsByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={0} stroke="none" dataKey="value">
                  {meetingsByType.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
              {meetingsByType.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Room Usage + By Level */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold tracking-tight">Tần suất sử dụng phòng họp</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={roomUsageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 90%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Số cuộc họp" fill="hsl(210, 80%, 52%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-3 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold tracking-tight">Theo cấp họp</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={meetingsByLevel} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={0} stroke="none" dataKey="value">
                  {meetingsByLevel.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
              {meetingsByLevel.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row: Thống kê sự cố */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Thống kê sự cố theo trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={incidentByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 90%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Số sự cố" fill="hsl(0, 70%, 50%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-3 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Thống kê sự cố theo mức độ
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={incidentBySeverity}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={0}
                  stroke="none"
                  dataKey="value"
                >
                  {incidentBySeverity.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
              {incidentBySeverity.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Task Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-2 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold tracking-tight">Trạng thái nhiệm vụ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={0} stroke="none" dataKey="value">
                  {taskStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
              {taskStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated overflow-hidden opacity-0 animate-auth-fade-in-up auth-stagger-3 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold tracking-tight">Chi tiết nhiệm vụ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Hoàn thành", value: completedTasks, total: totalTasks, color: "bg-success" },
              { label: "Đang thực hiện", value: tasks.filter(t => t.status === 'in_progress').length, total: totalTasks, color: "bg-info" },
              { label: "Chưa bắt đầu", value: tasks.filter(t => t.status === 'not_started').length, total: totalTasks, color: "bg-warning" },
              { label: "Quá hạn", value: tasks.filter(t => t.status === 'overdue').length, total: totalTasks, color: "bg-destructive" },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium tabular-nums">{item.value}/{item.total}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMeetings } from "@/hooks/useMeetings";
import { useRooms } from "@/hooks/useRooms";
import { useMeetingTasks } from "@/hooks/useMeetingTasks";
import { useDepartments } from "@/hooks/useDepartments";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Download, FileText, CalendarDays, DoorOpen, CheckCircle2, XCircle, TrendingUp, ClipboardList } from "lucide-react";

const monthlyTrend = [
  { month: "T1", meetings: 18, completed: 15 },
  { month: "T2", meetings: 24, completed: 20 },
  { month: "T3", meetings: 12, completed: 10 },
  { month: "T4", meetings: 20, completed: 17 },
  { month: "T5", meetings: 16, completed: 14 },
  { month: "T6", meetings: 22, completed: 19 },
  { month: "T7", meetings: 14, completed: 12 },
  { month: "T8", meetings: 25, completed: 22 },
  { month: "T9", meetings: 19, completed: 16 },
  { month: "T10", meetings: 21, completed: 18 },
  { month: "T11", meetings: 17, completed: 15 },
  { month: "T12", meetings: 23, completed: 20 },
];

export default function ReportsPage() {
  const { data: meetings = [] } = useMeetings();
  const { data: rooms = [] } = useRooms();
  const { data: tasks = [] } = useMeetingTasks();
  const { data: departments = [] } = useDepartments();

  const totalMeetings = meetings.length;
  const meetingsByType = [
    { name: "Trực tiếp", value: meetings.filter((m) => m.type === "offline").length, color: "hsl(152, 60%, 40%)" },
    { name: "Trực tuyến", value: meetings.filter((m) => m.type === "online").length, color: "hsl(210, 80%, 52%)" },
    { name: "Kết hợp", value: meetings.filter((m) => m.type === "hybrid").length, color: "hsl(280, 60%, 50%)" },
  ];

  const meetingsByLevel = [
    { name: "Tổng công ty", value: meetings.filter((m) => m.level === "company").length, color: "hsl(222, 60%, 30%)" },
    { name: "Phòng ban", value: meetings.filter((m) => m.level === "department").length, color: "hsl(222, 50%, 50%)" },
    { name: "Nhóm/Team", value: meetings.filter((m) => m.level === "team").length, color: "hsl(222, 40%, 70%)" },
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

  const [timePeriod, setTimePeriod] = useState("month");
  const [department, setDepartment] = useState("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Báo cáo & Thống kê</h1>
          <p className="text-sm text-muted-foreground mt-1">Tổng hợp dữ liệu hoạt động họp và sử dụng tài nguyên</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Theo tháng</SelectItem>
              <SelectItem value="quarter">Theo quý</SelectItem>
              <SelectItem value="year">Theo năm</SelectItem>
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {departments.map((d: { id: string; name: string }) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Xuất PDF
          </Button>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-display font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Monthly Trend + By Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Xu hướng cuộc họp theo tháng</CardTitle>
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

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Theo hình thức họp</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={meetingsByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {meetingsByType.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {meetingsByType.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Room Usage + By Level */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Tần suất sử dụng phòng họp</CardTitle>
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

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Theo cấp họp</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={meetingsByLevel} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {meetingsByLevel.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {meetingsByLevel.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Task Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Trạng thái nhiệm vụ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {taskStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {taskStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Chi tiết nhiệm vụ</CardTitle>
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
                  <span className="font-medium">{item.value}/{item.total}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
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

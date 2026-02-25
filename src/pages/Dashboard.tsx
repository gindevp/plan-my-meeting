import { CalendarDays, DoorOpen, ClipboardList, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { meetings, rooms, tasks, statusLabels, typeLabels } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const stats = [
  { label: "Cuộc họp hôm nay", value: 3, icon: CalendarDays, color: "text-info" },
  { label: "Phòng trống", value: rooms.filter(r => r.status === 'available').length, icon: DoorOpen, color: "text-success" },
  { label: "Chờ duyệt", value: meetings.filter(m => m.status === 'pending').length, icon: Clock, color: "text-warning" },
  { label: "Nhiệm vụ đang làm", value: tasks.filter(t => t.status === 'in_progress').length, icon: ClipboardList, color: "text-accent" },
];

const meetingsByType = [
  { name: "Trực tiếp", value: meetings.filter(m => m.type === 'offline').length, color: "hsl(152, 60%, 40%)" },
  { name: "Trực tuyến", value: meetings.filter(m => m.type === 'online').length, color: "hsl(210, 80%, 52%)" },
  { name: "Kết hợp", value: meetings.filter(m => m.type === 'hybrid').length, color: "hsl(280, 60%, 50%)" },
];

const weeklyData = [
  { day: "T2", meetings: 4 },
  { day: "T3", meetings: 6 },
  { day: "T4", meetings: 3 },
  { day: "T5", meetings: 7 },
  { day: "T6", meetings: 5 },
  { day: "T7", meetings: 1 },
  { day: "CN", meetings: 0 },
];

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

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.login ?? "User";

  const upcomingMeetings = meetings
    .filter(m => m.status === 'approved' || m.status === 'pending')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Tổng quan</h1>
        <p className="text-sm text-muted-foreground mt-1">Xin chào, {displayName}. Đây là tóm tắt hoạt động họp hôm nay.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow duration-300">
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

      {/* Charts + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Cuộc họp trong tuần</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 90%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="meetings" fill="hsl(222, 60%, 22%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Theo hình thức</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={meetingsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
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
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Cuộc họp sắp tới</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{meeting.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(meeting.startTime).toLocaleDateString('vi-VN')} • {new Date(meeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge variant="outline" className={typeColorMap[meeting.type]}>
                  {typeLabels[meeting.type]}
                </Badge>
                <Badge variant="outline" className={statusColorMap[meeting.status]}>
                  {statusLabels[meeting.status]}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

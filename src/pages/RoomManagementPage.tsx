import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rooms } from "@/data/mockData";
import { Users, Monitor, Wifi, Mic, PenTool, Camera } from "lucide-react";

const equipmentIcons: Record<string, typeof Monitor> = {
  "Máy chiếu": Monitor,
  "TV 65\"": Monitor,
  "TV 55\"": Monitor,
  "Webcam": Camera,
  "Camera hội nghị": Camera,
  "Hệ thống âm thanh": Mic,
  "Micro không dây": Mic,
  "Bảng trắng": PenTool,
};

const statusConfig: Record<string, { label: string; class: string }> = {
  available: { label: "Sẵn sàng", class: "bg-success/15 text-success border-success/20" },
  occupied: { label: "Đang sử dụng", class: "bg-warning/15 text-warning border-warning/20" },
  maintenance: { label: "Bảo trì", class: "bg-destructive/15 text-destructive border-destructive/20" },
};

export default function RoomManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Quản lý phòng họp</h1>
        <p className="text-sm text-muted-foreground mt-1">Danh sách và trạng thái phòng họp</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const status = statusConfig[room.status];
          return (
            <Card key={room.id} className="shadow-card hover:shadow-card-hover transition-all duration-300 animate-slide-up overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display font-bold text-lg text-primary">{room.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{room.floor}</p>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{room.capacity} người</span>
                  </div>
                  <Badge variant="outline" className={status.class}>
                    {status.label}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Thiết bị</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.equipment.map((eq) => {
                      const Icon = equipmentIcons[eq] || Wifi;
                      return (
                        <Badge key={eq} variant="secondary" className="text-[10px] gap-1">
                          <Icon className="h-3 w-3" />
                          {eq}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

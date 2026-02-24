import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Monitor, Camera, Mic, PenTool, Wifi, Settings, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const equipmentList = [
  { id: "EQ001", name: "Máy chiếu Sony 4K", type: "Máy chiếu", room: "Phòng họp Hội đồng", status: "good", lastMaintenance: "2024-01-15" },
  { id: "EQ002", name: "Hệ thống âm thanh Bosch", type: "Hệ thống âm thanh", room: "Phòng họp Hội đồng", status: "good", lastMaintenance: "2023-12-10" },
  { id: "EQ003", name: "TV Samsung 65\"", type: "TV", room: "Phòng họp Sáng tạo", status: "repairing", lastMaintenance: "2024-02-01" },
  { id: "EQ004", name: "Logitech MeetUp", type: "Camera", room: "Phòng họp Nhanh A", status: "good", lastMaintenance: "2024-01-20" },
  { id: "EQ005", name: "Micro không dây Shure", type: "Micro", room: "Phòng họp Đào tạo", status: "good", lastMaintenance: "2024-02-15" },
];

const typeIcons: Record<string, any> = {
  "Máy chiếu": Monitor,
  "TV": Monitor,
  "Camera": Camera,
  "Hệ thống âm thanh": Mic,
  "Micro": Mic,
  "Bảng trắng": PenTool,
};

const statusConfig: Record<string, { label: string; class: string }> = {
  good: { label: "Hoạt động tốt", class: "bg-success/15 text-success border-success/20" },
  repairing: { label: "Đang sửa chữa", class: "bg-warning/15 text-warning border-warning/20" },
  broken: { label: "Hỏng", class: "bg-destructive/15 text-destructive border-destructive/20" },
};

export default function EquipmentManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Quản lý thiết bị</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh mục và tình trạng trang thiết bị phòng họp</p>
        </div>
        <Button className="w-full md:w-auto gap-2">
          <Plus className="h-4 w-4" />
          Thêm thiết bị
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm thiết bị..." className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã TB</TableHead>
                <TableHead>Tên thiết bị</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Phòng họp</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Bảo trì gần nhất</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentList.map((eq) => {
                const Icon = typeIcons[eq.type] || Wifi;
                const status = statusConfig[eq.status];
                return (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium text-primary">{eq.id}</TableCell>
                    <TableCell>{eq.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{eq.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{eq.room}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.class}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{eq.lastMaintenance}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

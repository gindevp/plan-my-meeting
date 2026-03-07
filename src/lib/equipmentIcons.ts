import { Camera, Cpu, Mic, Monitor, Package, PenTool, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function getEquipmentIcon(name: string): LucideIcon {
  const n = (name ?? "").toLowerCase();
  if (n.includes("chiếu") || n.includes("projector") || n.includes("máy chiếu")) return Monitor;
  if (n.includes("tv") || n.includes("màn hình")) return Monitor;
  if (n.includes("camera") || n.includes("webcam") || n.includes("máy quay")) return Camera;
  if (n.includes("âm thanh") || n.includes("micro") || n.includes("mic") || n.includes("loa") || n.includes("speaker")) return Mic;
  if (n.includes("bảng") || n.includes("board") || n.includes("trắng") || n.includes("bút") || n.includes("pen")) return PenTool;
  if (n.includes("wifi") || n.includes("mạng") || n.includes("router")) return Wifi;
  if (n.includes("máy tính") || n.includes("laptop") || n.includes("pc") || n.includes("điện tử")) return Cpu;
  return Cpu;
}

/** Icon theo loại thiết bị (equipmentType value) */
export function getEquipmentTypeIcon(type?: string): LucideIcon {
  switch (type) {
    case "dien_tu":
      return Cpu;
    case "am_thanh":
      return Mic;
    case "hinh_anh":
      return Monitor;
    case "mang":
      return Wifi;
    case "van_phong_pham":
      return PenTool;
    case "khac":
      return Package;
    default:
      return Package;
  }
}

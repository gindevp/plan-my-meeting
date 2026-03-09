import type { LayoutItem } from "@/services/api/rooms";

const CANVAS_W = 400;
const CANVAS_H = 300;

function id() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createLayoutItem(
  type: LayoutItem["type"],
  x: number,
  y: number,
  w: number = 40,
  h: number = 40,
  rotation = 0
): LayoutItem {
  return { id: id(), type, x, y, width: w, height: h, rotation };
}

/** Layout mẫu theo loại phòng (gợi ý số ghế và bố trí). */
export const LAYOUT_TEMPLATES: Record<string, LayoutItem[]> = {
  /** Hình tròn: ghế xếp vòng quanh bàn tròn */
  CIRCLE: (() => {
    const items: LayoutItem[] = [];
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const tableR = 55;
    items.push(createLayoutItem("table", cx - tableR, cy - tableR, tableR * 2, tableR * 2));
    const chairW = 32;
    const chairH = 32;
    const n = 10;
    const chairR = 95;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + chairR * Math.cos(angle) - chairW / 2;
      const y = cy + chairR * Math.sin(angle) - chairH / 2;
      const rot = (i / n) * 360;
      items.push(createLayoutItem("chair", x, y, chairW, chairH, rot));
    }
    items.push(createLayoutItem("door", CANVAS_W - 44, 0, 40, 50));
    return items;
  })(),
  BOARDROOM: (() => {
    const items: LayoutItem[] = [];
    const tableW = 200;
    const tableH = 80;
    items.push(createLayoutItem("table", (CANVAS_W - tableW) / 2, (CANVAS_H - tableH) / 2, tableW, tableH));
    const chairW = 36;
    const chairH = 36;
    const padding = 8;
    // Top row
    for (let i = 0; i < 6; i++) {
      items.push(createLayoutItem("chair", (CANVAS_W - 6 * (chairW + padding) + padding) / 2 + i * (chairW + padding), (CANVAS_H - tableH) / 2 - chairH - padding, chairW, chairH));
    }
    // Bottom row
    for (let i = 0; i < 6; i++) {
      items.push(createLayoutItem("chair", (CANVAS_W - 6 * (chairW + padding) + padding) / 2 + i * (chairW + padding), (CANVAS_H + tableH) / 2 + padding, chairW, chairH, 180));
    }
    items.push(createLayoutItem("door", CANVAS_W - 40, 0, 40, 50));
    return items;
  })(),
  CLASSROOM: (() => {
    const items: LayoutItem[] = [];
    const deskW = 50;
    const deskH = 35;
    const chairW = 32;
    const chairH = 32;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 30 + col * (deskW + 25);
        const y = 30 + row * (deskH + chairH + 15);
        items.push(createLayoutItem("table", x, y, deskW, deskH));
        items.push(createLayoutItem("chair", x, y + deskH + 5, chairW, chairH));
      }
    }
    items.push(createLayoutItem("whiteboard", CANVAS_W / 2 - 60, 5, 120, 20));
    items.push(createLayoutItem("door", CANVAS_W - 40, CANVAS_H - 50, 40, 50));
    return items;
  })(),
  THEATER: (() => {
    const items: LayoutItem[] = [];
    items.push(createLayoutItem("podium", CANVAS_W / 2 - 30, 20, 60, 40));
    const chairW = 28;
    const chairH = 28;
    for (let row = 0; row < 5; row++) {
      const count = row < 2 ? 8 : 10;
      const startX = (CANVAS_W - count * (chairW + 6)) / 2;
      for (let col = 0; col < count; col++) {
        items.push(createLayoutItem("chair", startX + col * (chairW + 6), 80 + row * (chairH + 8), chairW, chairH));
      }
    }
    items.push(createLayoutItem("door", CANVAS_W - 40, CANVAS_H - 50, 40, 50));
    return items;
  })(),
  U_SHAPE: (() => {
    const items: LayoutItem[] = [];
    const blockW = 60;
    const blockH = 35;
    // U shape: top bar + left + right
    const topY = 40;
    for (let i = 0; i < 6; i++) {
      items.push(createLayoutItem("table", 80 + i * (blockW + 5), topY, blockW, blockH));
    }
    for (let i = 0; i < 3; i++) {
      items.push(createLayoutItem("table", 80, topY + (i + 1) * (blockH + 8), blockW, blockH));
      items.push(createLayoutItem("table", 80 + 5 * (blockW + 5), topY + (i + 1) * (blockH + 8), blockW, blockH));
    }
    for (let i = 0; i < 8; i++) {
      const x = 85 + (i % 6) * (blockW + 5);
      const y = i < 6 ? topY + blockH + 10 : topY + 2 * (blockH + 8) + 10;
      items.push(createLayoutItem("chair", x, y, 32, 32));
    }
    items.push(createLayoutItem("door", CANVAS_W - 40, 0, 40, 50));
    return items;
  })(),
  WORKSHOP: (() => {
    const items: LayoutItem[] = [];
    const tableW = 70;
    const tableH = 50;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const x = 40 + col * (tableW + 30);
        const y = 40 + row * (tableH + 50);
        items.push(createLayoutItem("table", x, y, tableW, tableH));
        items.push(createLayoutItem("chair", x, y + tableH + 5, 34, 34));
        items.push(createLayoutItem("chair", x + tableW - 34, y + tableH + 5, 34, 34));
      }
    }
    items.push(createLayoutItem("whiteboard", 20, 10, 80, 25));
    items.push(createLayoutItem("door", CANVAS_W - 40, CANVAS_H - 50, 40, 50));
    return items;
  })(),
};

export const LAYOUT_OBJECT_TYPES: { type: LayoutItem["type"]; label: string }[] = [
  { type: "chair", label: "Ghế" },
  { type: "table", label: "Bàn" },
  { type: "podium", label: "Bục phát biểu" },
  { type: "projector", label: "Máy chiếu" },
  { type: "screen", label: "Màn hình" },
  { type: "camera", label: "Camera" },
  { type: "whiteboard", label: "Bảng viết" },
  { type: "door", label: "Cửa ra vào" },
];

/** Mẫu layout mặc định để người dùng chọn (key, label). */
export const LAYOUT_TEMPLATE_OPTIONS: { key: string; label: string }[] = [
  { key: "CIRCLE", label: "Hình tròn" },
  { key: "U_SHAPE", label: "Hình chữ U" },
  { key: "BOARDROOM", label: "Hội trường (bàn dài)" },
  { key: "THEATER", label: "Rạp (xếp tầng)" },
  { key: "CLASSROOM", label: "Phòng học" },
  { key: "WORKSHOP", label: "Workshop (bàn nhóm)" },
];

export function countChairsInLayout(layoutData: string | undefined): number {
  const items = getLayoutItems(layoutData);
  return items.filter((i) => i.type === "chair").length;
}

/** layoutData có thể là mảng LayoutItem[] (cũ) hoặc object { w?, h?, items: LayoutItem[] }. */
export function parseLayoutData(layoutData: string | undefined): { w?: number; h?: number; items: LayoutItem[] } {
  if (!layoutData?.trim()) return { items: [] };
  try {
    const parsed = JSON.parse(layoutData);
    if (Array.isArray(parsed)) return { items: parsed as LayoutItem[] };
    if (parsed && Array.isArray(parsed.items))
      return { w: parsed.w, h: parsed.h, items: parsed.items as LayoutItem[] };
    return { items: [] };
  } catch {
    return { items: [] };
  }
}

export function getLayoutItems(layoutData: string | undefined): LayoutItem[] {
  return parseLayoutData(layoutData).items;
}

export function serializeLayoutData(w: number, h: number, items: LayoutItem[]): string {
  return JSON.stringify({ w, h, items });
}

/** Scale layout items from one canvas size to another (e.g. 400x300 template → 800x600). */
export function scaleLayoutItems(
  items: LayoutItem[],
  fromW: number,
  fromH: number,
  toW: number,
  toH: number
): LayoutItem[] {
  const scaleX = toW / fromW;
  const scaleY = toH / fromH;
  return items.map((item) => ({
    ...item,
    id: id(),
    x: Math.round(item.x * scaleX),
    y: Math.round(item.y * scaleY),
    width: Math.max(20, Math.round(item.width * scaleX)),
    height: Math.max(20, Math.round(item.height * scaleY)),
  }));
}

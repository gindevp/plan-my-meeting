import { useState, useCallback, useEffect, useRef } from "react";
import type { LayoutItem } from "@/services/api/rooms";
import {
  createLayoutItem,
  LAYOUT_OBJECT_TYPES,
  countChairsInLayout,
  parseLayoutData,
  serializeLayoutData,
} from "@/lib/roomLayoutTemplates";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Armchair,
  RectangleHorizontal,
  Mic2,
  Projector,
  Monitor,
  Video,
  LayoutList,
  DoorOpen,
  GripHorizontal,
  type LucideIcon,
} from "lucide-react";

const DEFAULT_CANVAS_W = 400;
const DEFAULT_CANVAS_H = 300;
const MIN_CANVAS_W = 400;
const MIN_CANVAS_H = 300;
const MAX_CANVAS_W = 1400;
const MAX_CANVAS_H = 1000;

const TYPE_ICONS: Record<LayoutItem["type"], LucideIcon> = {
  chair: Armchair,
  table: RectangleHorizontal,
  podium: Mic2,
  projector: Projector,
  screen: Monitor,
  camera: Video,
  whiteboard: LayoutList,
  door: DoorOpen,
};

interface RoomLayoutEditorProps {
  layoutData: string;
  capacity: number;
  onChange: (layoutData: string) => void;
  disabled?: boolean;
  /** Ẩn toolbar (kéo thả, xóa) và chỉ hiển thị sơ đồ — dùng trong xem chi tiết. */
  readOnly?: boolean;
  /** Kích thước canvas mặc định (khi chưa lưu kích thước). Dùng size container để canvas lấp đầy bên phải. */
  defaultCanvasWidth?: number;
  defaultCanvasHeight?: number;
}

export function RoomLayoutEditor({
  layoutData,
  capacity,
  onChange,
  disabled,
  readOnly = false,
  defaultCanvasWidth = DEFAULT_CANVAS_W,
  defaultCanvasHeight = DEFAULT_CANVAS_H,
}: RoomLayoutEditorProps) {
  const parsed = parseLayoutData(layoutData);
  const initialW = parsed.w ?? defaultCanvasWidth;
  const initialH = parsed.h ?? defaultCanvasHeight;

  const [canvasW, setCanvasW] = useState(() => Math.min(MAX_CANVAS_W, Math.max(MIN_CANVAS_W, initialW)));
  const [canvasH, setCanvasH] = useState(() => Math.min(MAX_CANVAS_H, Math.max(MIN_CANVAS_H, initialH)));
  const [items, setItems] = useState<LayoutItem[]>(() => parsed.items ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ id: string; startX: number; startY: number; item: LayoutItem } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const sizeDuringResize = useRef({ w: canvasW, h: canvasH });

  useEffect(() => {
    sizeDuringResize.current = { w: canvasW, h: canvasH };
  }, [canvasW, canvasH]);

  // Đồng bộ kích thước từ layoutData khi mở form (key đổi) hoặc default thay đổi (container đo xong)
  useEffect(() => {
    const p = parseLayoutData(layoutData);
    if (p.w != null && p.h != null) {
      setCanvasW(Math.min(MAX_CANVAS_W, Math.max(MIN_CANVAS_W, p.w)));
      setCanvasH(Math.min(MAX_CANVAS_H, Math.max(MIN_CANVAS_H, p.h)));
    } else {
      const w = Math.min(MAX_CANVAS_W, Math.max(MIN_CANVAS_W, defaultCanvasWidth));
      const h = Math.min(MAX_CANVAS_H, Math.max(MIN_CANVAS_H, defaultCanvasHeight));
      setCanvasW(w);
      setCanvasH(h);
    }
    if (p.items.length > 0 && items.length === 0) setItems(p.items);
  }, [layoutData, defaultCanvasWidth, defaultCanvasHeight]);

  const emit = useCallback(
    (nextItems: LayoutItem[], w?: number, h?: number) => {
      const tw = w ?? canvasW;
      const th = h ?? canvasH;
      setItems(nextItems);
      onChange(serializeLayoutData(tw, th, nextItems));
    },
    [onChange, canvasW, canvasH]
  );

  const getSize = (type: LayoutItem["type"]) => {
    if (type === "door") return { w: 40, h: 50 };
    if (type === "whiteboard") return { w: 100, h: 24 };
    return { w: 40, h: 40 };
  };

  const addItem = (type: LayoutItem["type"]) => {
    const { w, h } = getSize(type);
    const item = createLayoutItem(type, canvasW / 2 - w / 2, canvasH / 2 - h / 2, w, h);
    emit([...items, item]);
    setSelectedId(item.id);
  };

  const addItemAt = (type: LayoutItem["type"], clientX: number, clientY: number, canvasRect: DOMRect) => {
    const { w, h } = getSize(type);
    const x = Math.round(clientX - canvasRect.left - w / 2);
    const y = Math.round(clientY - canvasRect.top - h / 2);
    const clampedX = Math.max(0, Math.min(canvasW - w, x));
    const clampedY = Math.max(0, Math.min(canvasH - h, y));
    const item = createLayoutItem(type, clampedX, clampedY, w, h);
    emit([...items, item]);
    setSelectedId(item.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    emit(items.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  const moveItemTo = (id: string, x: number, y: number) => {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === id
          ? {
              ...i,
              x: Math.max(0, Math.min(canvasW - i.width, x)),
              y: Math.max(0, Math.min(canvasH - i.height, y)),
            }
          : i
      );
      onChange(serializeLayoutData(canvasW, canvasH, next));
      return next;
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizeStart) return;
    if (!dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newX = dragStart.item.x + (x - dragStart.startX);
    const newY = dragStart.item.y + (y - dragStart.startY);
    const clampedX = Math.max(0, Math.min(canvasW - dragStart.item.width, newX));
    const clampedY = Math.max(0, Math.min(canvasH - dragStart.item.height, newY));
    moveItemTo(dragStart.id, clampedX, clampedY);
    setDragStart({
      ...dragStart,
      startX: x,
      startY: y,
      item: { ...dragStart.item, x: clampedX, y: clampedY },
    });
  };

  const handleCanvasMouseUp = () => setDragStart(null);

  const handleItemMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    if (disabled) return;
    const canvas = e.currentTarget.parentElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    const item = items.find((i) => i.id === id);
    if (item) setDragStart({ id, startX, startY, item });
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("layout-type") as LayoutItem["type"] | "";
    if (!type || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    addItemAt(type, e.clientX, e.clientY, rect);
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // Kéo góc để đổi kích thước khung phòng
  useEffect(() => {
    if (!resizeStart) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.startX;
      const dy = e.clientY - resizeStart.startY;
      let newW = Math.round(resizeStart.startW + dx);
      let newH = Math.round(resizeStart.startH + dy);
      newW = Math.min(MAX_CANVAS_W, Math.max(MIN_CANVAS_W, newW));
      newH = Math.min(MAX_CANVAS_H, Math.max(MIN_CANVAS_H, newH));
      setCanvasW(newW);
      setCanvasH(newH);
      sizeDuringResize.current = { w: newW, h: newH };
    };
    const onUp = () => {
      const { w: newW, h: newH } = sizeDuringResize.current;
      const clamped = items.map((i) => ({
        ...i,
        x: Math.min(i.x, Math.max(0, newW - i.width)),
        y: Math.min(i.y, Math.max(0, newH - i.height)),
      }));
      setItems(clamped);
      onChange(serializeLayoutData(newW, newH, clamped));
      setResizeStart(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizeStart, items, onChange]);

  const chairsCount = countChairsInLayout(JSON.stringify(items));
  const overCapacity = chairsCount > capacity;
  const noChairs = items.length > 0 && chairsCount === 0;
  const underCapacity = chairsCount > 0 && chairsCount < capacity;

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Kéo thả vào sơ đồ:</span>
          {LAYOUT_OBJECT_TYPES.map(({ type, label }) => {
            const Icon = TYPE_ICONS[type];
            return (
              <Button
                key={type}
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 px-3"
                onClick={() => addItem(type)}
                disabled={disabled}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("layout-type", type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Button>
            );
          })}
          {selectedId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-destructive hover:text-destructive"
              onClick={removeSelected}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Xóa
            </Button>
          )}
        </div>
      )}
      <div className="relative inline-block">
        <div
          className="relative rounded-lg border-2 border-dashed border-border bg-muted/20 overflow-hidden"
          style={{ width: canvasW, height: canvasH }}
          onMouseMove={dragStart ? handleCanvasMouseMove : undefined}
          onMouseLeave={handleCanvasMouseUp}
          onMouseUp={handleCanvasMouseUp}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
        >
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <div
                key={item.id}
                className={`absolute flex items-center justify-center cursor-move select-none border-2 rounded ${
                  selectedId === item.id
                    ? "border-primary bg-primary/10 z-10"
                    : "border-border bg-background hover:border-primary/50"
                } ${disabled ? "cursor-default" : ""}`}
                style={{
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
                }}
                onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                title={item.type}
              >
                <Icon className="h-[60%] w-[60%] text-muted-foreground" />
              </div>
            );
          })}
        </div>
        {!disabled && !readOnly && (
          <button
            type="button"
            className="absolute bottom-1 right-1 p-1.5 rounded-md bg-muted hover:bg-muted/80 border border-border cursor-nwse-resize shadow-sm"
            title="Kéo để thay đổi kích thước khung phòng"
            onMouseDown={(e) => {
              e.preventDefault();
              setResizeStart({ startX: e.clientX, startY: e.clientY, startW: canvasW, startH: canvasH });
            }}
          >
            <GripHorizontal className="h-4 w-4 rotate-[-45deg] text-muted-foreground" />
          </button>
        )}
      </div>
      {!readOnly && (
        <p className="text-xs text-muted-foreground">Kéo góc dưới phải của khung để thay đổi kích thước phòng. Khung: {canvasW} × {canvasH}</p>
      )}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">
          Số ghế trong layout: <strong>{chairsCount}</strong> / Sức chứa phòng: <strong>{capacity}</strong>
        </span>
        {!readOnly && overCapacity && (
          <span className="text-destructive font-medium">Số ghế vượt quá sức chứa. Cần giảm ghế hoặc tăng sức chứa.</span>
        )}
        {!readOnly && noChairs && (
          <span className="text-amber-600 dark:text-amber-500">Layout chưa bố trí ghế ngồi.</span>
        )}
        {!readOnly && underCapacity && !overCapacity && (
          <span className="text-muted-foreground">Layout có ít ghế hơn sức chứa phòng.</span>
        )}
      </div>
    </div>
  );
}

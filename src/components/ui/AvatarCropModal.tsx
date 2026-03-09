import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const PREVIEW_SIZE = 300;
const OUTPUT_SIZE = 256;

interface AvatarCropModalProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
}

export function AvatarCropModal({ open, file, onClose, onSave }: AvatarCropModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file || !open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const img = new Image();
    img.onload = () => {
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!previewUrl) return;
      dragStart.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [previewUrl, offset]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset({ x: dragStart.current.offsetX + dx, y: dragStart.current.offsetY + dy });
    },
    []
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragStart.current = null;
  }, []);

  const handleSave = async () => {
    if (!previewUrl || !file) return;
    setSaving(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = previewUrl;
      });
      const { w, h } = imageSize;
      if (w === 0 || h === 0) return;

      const cropSize = Math.min(PREVIEW_SIZE / zoom, w, h);
      const cropX = Math.max(0, Math.min(w - cropSize, w / 2 - offset.x / zoom - cropSize / 2));
      const cropY = Math.max(0, Math.min(h - cropSize, h / 2 - offset.y / zoom - cropSize / 2));

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.92)
      );
      if (blob) await onSave(blob);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Căn chỉnh ảnh đại diện</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Kéo ảnh để căn vị trí, chỉnh zoom rồi bấm Lưu.
        </p>
        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-lg border bg-muted flex items-center justify-center"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => (dragStart.current = null)}
        >
          {previewUrl && imageSize.w > 0 && imageSize.h > 0 && (
            <img
              src={previewUrl}
              alt=""
              className="absolute max-w-none select-none pointer-events-none"
              style={{
                width: imageSize.w * zoom,
                height: imageSize.h * zoom,
                left: PREVIEW_SIZE / 2 - (imageSize.w * zoom) / 2 + offset.x,
                top: PREVIEW_SIZE / 2 - (imageSize.h * zoom) / 2 + offset.y,
              }}
              draggable={false}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Thu phóng</label>
          <Slider
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            min={0.5}
            max={3}
            step={0.1}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || !previewUrl}>
            {saving ? "Đang lưu..." : "Lưu ảnh"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

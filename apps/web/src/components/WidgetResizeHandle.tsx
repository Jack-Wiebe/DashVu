"use client";

import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Grip } from "lucide-react";
import { MAX_WIDGET_HEIGHT, MAX_WIDGET_WIDTH, type WidgetSize } from "@dashvu/validators";
import { parseWidgetSize, widgetSize } from "@dashvu/core";

import { cn } from "@/lib/utils";

interface WidgetResizeHandleProps {
  size: WidgetSize;
  disabled?: boolean;
  onPreview: (size: WidgetSize | null) => void;
  onResize: (size: WidgetSize) => void;
}

interface DragMetrics {
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
  cellWidth: number;
  cellHeight: number;
  columns: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const readMetrics = (handle: HTMLElement, size: WidgetSize): DragMetrics | null => {
  const section = handle.closest("section");
  const grid = section?.parentElement;
  if (!section || !grid) return null;

  const gridStyle = window.getComputedStyle(grid);
  const columns = Math.max(
    1,
    gridStyle.gridTemplateColumns.split(" ").filter((entry) => entry.trim()).length
  );
  const gapX = parseFloat(gridStyle.columnGap) || 0;
  const gapY = parseFloat(gridStyle.rowGap) || 0;
  const rect = section.getBoundingClientRect();
  const span = parseWidgetSize(size);
  const renderedWidth = Math.min(span.width, columns);

  return {
    startWidth: renderedWidth,
    startHeight: span.height,
    startX: 0,
    startY: 0,
    cellWidth: renderedWidth > 0 ? (rect.width + gapX) / renderedWidth : rect.width,
    cellHeight: span.height > 0 ? (rect.height + gapY) / span.height : rect.height,
    columns,
  };
};

const WidgetResizeHandle = ({ size, disabled, onPreview, onResize }: WidgetResizeHandleProps) => {
  const [dragging, setDragging] = useState(false);
  const metricsRef = useRef<DragMetrics | null>(null);
  const latestRef = useRef<string | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    const metrics = readMetrics(event.currentTarget, size);
    if (!metrics) return;

    event.preventDefault();
    event.stopPropagation();
    metricsRef.current = { ...metrics, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const metrics = metricsRef.current;
    if (!dragging || !metrics) return;

    const width = clamp(
      metrics.startWidth + Math.round((event.clientX - metrics.startX) / metrics.cellWidth),
      1,
      Math.min(MAX_WIDGET_WIDTH, metrics.columns)
    );
    const height = clamp(
      metrics.startHeight + Math.round((event.clientY - metrics.startY) / metrics.cellHeight),
      1,
      MAX_WIDGET_HEIGHT
    );

    const token = widgetSize(width, height);
    latestRef.current = token;
    onPreview(token);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const latest = latestRef.current;
    metricsRef.current = null;
    latestRef.current = null;
    setDragging(false);

    if (latest && latest !== size) onResize(latest);
    onPreview(null);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const span = parseWidgetSize(size);
    const metrics = readMetrics(event.currentTarget, size);
    const columns = Math.min(MAX_WIDGET_WIDTH, metrics?.columns ?? MAX_WIDGET_WIDTH);
    let width = span.width;
    let height = span.height;

    if (event.key === "ArrowRight") width = clamp(width + 1, 1, columns);
    else if (event.key === "ArrowLeft") width = clamp(width - 1, 1, columns);
    else if (event.key === "ArrowUp") height = clamp(height + 1, 1, MAX_WIDGET_HEIGHT);
    else if (event.key === "ArrowDown") height = clamp(height - 1, 1, MAX_WIDGET_HEIGHT);
    else return;

    event.preventDefault();
    const token = widgetSize(width, height);
    if (token !== size) onResize(token);
  };

  return (
    <div
      role="separator"
      aria-label={`Resize widget (currently ${size})`}
      aria-orientation="horizontal"
      tabIndex={0}
      title="Drag to resize"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute bottom-1 right-1 z-10 flex h-4 w-4 touch-none items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring",
        dragging ? "bg-accent text-foreground" : null,
        disabled ? "pointer-events-none opacity-30" : "cursor-nwse-resize"
      )}
    >
      <Grip className="h-3 w-3 -rotate-45" />
    </div>
  );
};

export default WidgetResizeHandle;

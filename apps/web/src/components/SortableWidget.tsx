"use client";

import { useSortable } from "@dnd-kit/sortable";
import type { WidgetSize } from "@dashvu/validators";
import { ChevronDown, ChevronUp, GripVertical, Maximize2, Trash2 } from "lucide-react";

import { WIDGET_REGISTRY } from "@/lib/widget-registry";
import type { WidgetConfig } from "@/types/widget";
import Widget from "./Widget";

interface SortableWidgetProps {
  widget: WidgetConfig;
  editMode: boolean;
  saving: boolean;
  index: number;
  total: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onResize: (id: string, size: WidgetSize) => void;
  onSettingsChange: (id: string, settings: Record<string, unknown>) => void;
}

const SortableWidget = ({
  widget,
  editMode,
  saving,
  index,
  total,
  onMove,
  onRemove,
  onResize,
  onSettingsChange,
}: SortableWidgetProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const sizes = WIDGET_REGISTRY[widget.kind].sizes;
  const nextSize = sizes[(sizes.indexOf(widget.size) + 1) % sizes.length];
  const canResize = sizes.length > 1;

  return (
    <Widget
      config={widget}
      innerRef={setNodeRef}
      onSettingsChange={(settings) => onSettingsChange(widget.id, settings)}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined,
      }}
      actions={
        editMode ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Drag to reorder"
              disabled={saving}
              className="touch-none cursor-grab rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Move widget up"
              disabled={index === 0 || saving}
              onClick={() => onMove(index, -1)}
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Move widget down"
              disabled={index === total - 1 || saving}
              onClick={() => onMove(index, 1)}
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Change size (currently ${widget.size}, next ${nextSize})`}
              title={`Size: ${widget.size} — click to change`}
              disabled={saving || !canResize}
              onClick={() => onResize(widget.id, nextSize)}
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Remove widget"
              disabled={saving}
              onClick={() => onRemove(widget.id)}
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-600/20 hover:text-red-400 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null
      }
    />
  );
};

export default SortableWidget;

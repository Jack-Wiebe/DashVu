"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import type { WidgetSize } from "@dashvu/validators";
import { ChevronDown, ChevronUp, GripVertical, Settings, Trash2 } from "lucide-react";

import type { WidgetConfig } from "@/types/widget";
import { useSettings } from "./SettingsDrawer";
import Widget from "./Widget";
import WidgetResizeHandle from "./WidgetResizeHandle";

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
  const { openWidgetSettings } = useSettings();
  const [previewSize, setPreviewSize] = useState<WidgetSize | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  return (
    <Widget
      config={previewSize ? { ...widget, size: previewSize } : widget}
      innerRef={setNodeRef}
      pending={!widget.groupId}
      index={index}
      onSettingsChange={(settings) => onSettingsChange(widget.id, settings)}
      resizeHandle={
        editMode ? (
          <WidgetResizeHandle
            size={widget.size}
            disabled={saving}
            onPreview={setPreviewSize}
            onResize={(size) => onResize(widget.id, size)}
          />
        ) : null
      }
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
              className="touch-none cursor-grab rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
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
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Move widget down"
              disabled={index === total - 1 || saving}
              onClick={() => onMove(index, 1)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Widget settings"
              disabled={saving}
              onClick={() => openWidgetSettings(widget.id)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Remove widget"
              disabled={saving}
              onClick={() => onRemove(widget.id)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-600/20 hover:text-red-400 disabled:opacity-30"
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

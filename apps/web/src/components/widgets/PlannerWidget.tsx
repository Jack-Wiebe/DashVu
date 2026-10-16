"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AppRouter } from "@dashvu/api";
import type { PlannerMode } from "@dashvu/validators";
import { Check, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";

type PlannerItem = inferRouterOutputs<AppRouter>["planner"]["list"][number];

const MODES: PlannerMode[] = ["notes", "todos", "countdown"];

const MODE_LABELS: Record<PlannerMode, string> = {
  notes: "Notes",
  todos: "Todos",
  countdown: "Countdown",
};

const PLACEHOLDERS: Record<PlannerMode, string> = {
  notes: "Add a note…",
  todos: "Add a task…",
  countdown: "Add an event…",
};

function readMode(settings: Record<string, unknown> | null | undefined): PlannerMode {
  const mode = settings?.mode;
  return typeof mode === "string" && (MODES as string[]).includes(mode)
    ? (mode as PlannerMode)
    : "notes";
}

function formatTarget(dateIso: string): string {
  return new Date(dateIso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRemaining(dateIso: string): string {
  const diff = new Date(dateIso).getTime() - Date.now();
  if (Number.isNaN(diff)) return "";
  if (diff <= 0) return "passed";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

interface SortableItemProps {
  item: PlannerItem;
  mode: PlannerMode;
  editing: boolean;
  editDraft: string;
  onEditDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}

const SortableItem = ({
  item,
  mode,
  editing,
  editDraft,
  onEditDraftChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onToggle,
  onRemove,
}: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined,
      }}
      className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {mode === "todos" ? (
        <button
          type="button"
          aria-label={item.checked ? "Mark incomplete" : "Mark complete"}
          onClick={onToggle}
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
            item.checked
              ? "border-emerald-500 bg-emerald-500 text-zinc-900"
              : "border-muted-foreground hover:border-foreground"
          )}
        >
          {item.checked ? <Check className="h-3 w-3" /> : null}
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={editDraft}
            onChange={(event) => onEditDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCommitEdit();
              if (event.key === "Escape") onCancelEdit();
            }}
            onBlur={onCommitEdit}
            className="w-full rounded bg-muted px-1.5 py-0.5 text-sm text-foreground outline-none"
          />
        ) : (
          <p
            className={cn(
              "break-words text-sm text-foreground",
              mode === "todos" && item.checked && "text-muted-foreground line-through"
            )}
          >
            {item.text}
          </p>
        )}

        {mode === "countdown" && item.date ? (
          <p className="text-xs text-muted-foreground">
            {formatTarget(item.date)} · {formatRemaining(item.date)}
          </p>
        ) : null}
      </div>

      {!editing ? (
        <button
          type="button"
          aria-label="Edit"
          onClick={onStartEdit}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <button
        type="button"
        aria-label="Delete"
        onClick={onRemove}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-600/20 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
};

const PlannerWidget = ({
  widgetId,
  className,
  settings,
  onSettingsChange,
}: WidgetComponentProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const mode = readMode(settings);
  const listInput = { widgetId, mode };

  const query = trpc.planner.list.useQuery(listInput);
  const items = query.data ?? [];

  const [draft, setDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const invalidate = () => utils.planner.list.invalidate();

  const onMutationError = (title: string) => {
    invalidate();
    toast({ variant: "destructive", title });
  };

  const create = trpc.planner.create.useMutation({
    onMutate: ({ text, date }) => {
      const optimistic: PlannerItem = {
        id: `temp-${crypto.randomUUID()}`,
        mode,
        position: items.length,
        text,
        checked: false,
        date: date ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      utils.planner.list.setData(listInput, (prev) => [...(prev ?? []), optimistic]);
    },
    onError: () => onMutationError("Could not add item"),
    onSettled: () => invalidate(),
  });

  const update = trpc.planner.update.useMutation({
    onMutate: ({ id, ...patch }) => {
      utils.planner.list.setData(listInput, (prev) =>
        (prev ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
    },
    onError: () => onMutationError("Could not save item"),
  });

  const remove = trpc.planner.remove.useMutation({
    onMutate: ({ id }) => {
      utils.planner.list.setData(listInput, (prev) =>
        (prev ?? []).filter((item) => item.id !== id)
      );
    },
    onError: () => onMutationError("Could not delete item"),
  });

  const removeChecked = trpc.planner.removeChecked.useMutation({
    onMutate: () => {
      utils.planner.list.setData(listInput, (prev) => (prev ?? []).filter((item) => !item.checked));
    },
    onError: () => onMutationError("Could not clear completed"),
    onSettled: () => invalidate(),
  });

  const reorder = trpc.planner.reorder.useMutation({
    onMutate: ({ ids }) => {
      utils.planner.list.setData(listInput, (prev) => {
        if (!prev) return prev;
        const byId = new Map(prev.map((item) => [item.id, item]));
        return ids.map((id) => byId.get(id)).filter((item): item is PlannerItem => Boolean(item));
      });
    },
    onError: () => onMutationError("Could not reorder items"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const changeMode = (next: PlannerMode) => {
    setEditingId(null);
    setDraft("");
    setDateDraft("");
    onSettingsChange?.({ ...(settings ?? {}), mode: next });
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (mode === "countdown" && !dateDraft) {
      toast({ variant: "destructive", title: "Pick a date for the countdown" });
      return;
    }
    create.mutate({
      widgetId,
      mode,
      text,
      date: mode === "countdown" ? new Date(dateDraft).toISOString() : undefined,
    });
    setDraft("");
    setDateDraft("");
  };

  const commitEdit = () => {
    const text = editDraft.trim();
    if (editingId && text) update.mutate({ id: editingId, text });
    setEditingId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(items, oldIndex, newIndex);
    utils.planner.list.setData(listInput, next);
    reorder.mutate({ widgetId, mode, ids: next.map((item) => item.id) });
  };

  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <div className={cn(className, "flex h-full flex-col gap-2")}>
      <div className="flex items-center gap-1 rounded-md bg-muted/60 p-0.5">
        {MODES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => changeMode(value)}
            className={cn(
              "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              value === mode
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {MODE_LABELS[value]}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex items-center gap-1.5"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={PLACEHOLDERS[mode]}
          className="min-w-0 flex-1 rounded-md border border-border bg-muted/60 px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
        />
        {mode === "countdown" ? (
          <input
            type="datetime-local"
            value={dateDraft}
            onChange={(event) => setDateDraft(event.target.value)}
            className="rounded-md border border-border bg-muted/60 px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring"
          />
        ) : null}
        <Button type="submit" size="xs" variant="ghost" aria-label="Add" disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="m-auto px-2 text-center text-sm text-muted-foreground">
          {query.isLoading ? "Loading…" : "Nothing here yet. Add your first item above."}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  mode={mode}
                  editing={editingId === item.id}
                  editDraft={editDraft}
                  onEditDraftChange={setEditDraft}
                  onStartEdit={() => {
                    setEditingId(item.id);
                    setEditDraft(item.text);
                  }}
                  onCommitEdit={commitEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onToggle={() => update.mutate({ id: item.id, checked: !item.checked })}
                  onRemove={() => remove.mutate({ id: item.id })}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {mode === "todos" && checkedCount > 0 ? (
        <button
          type="button"
          onClick={() => removeChecked.mutate({ widgetId, mode })}
          className="self-start text-xs text-muted-foreground transition-colors hover:text-foreground/80"
        >
          Clear completed ({checkedCount})
        </button>
      ) : null}
    </div>
  );
};

export default PlannerWidget;

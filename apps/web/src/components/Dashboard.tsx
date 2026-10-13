"use client";

import { useRef, useState } from "react";
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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { AppRouter } from "@dashvu/api";
import type { WidgetKind, WidgetSize } from "@dashvu/validators";
import { Check, Pencil, Plus } from "lucide-react";

import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc/client";
import { createWidget, WIDGET_KINDS, WIDGET_REGISTRY } from "@/lib/widget-registry";

import SortableWidget from "./SortableWidget";
import { Button } from "./ui/Button";

type DashboardData = inferRouterOutputs<AppRouter>["dashboard"]["getMine"];
type DashboardWidget = DashboardData["widgets"][number];

const Dashboard = ({ initialDashboard }: { initialDashboard: DashboardData }) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data } = trpc.dashboard.getMine.useQuery(undefined, {
    initialData: initialDashboard,
  });

  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(pickerRef, () => setPickerOpen(false));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveLayout = trpc.dashboard.saveLayout.useMutation({
    onError: () => {
      toast({
        variant: "destructive",
        title: "Could not save layout",
        description: "Your changes were reverted.",
      });
      utils.dashboard.getMine.invalidate();
    },
  });

  const widgets = data?.widgets ?? [];
  const saving = saveLayout.isPending;

  const persist = (next: DashboardWidget[]) => {
    if (!data) return;

    const normalized = next.map((widget, index) => ({ ...widget, position: index }));

    utils.dashboard.getMine.setData(undefined, (prev) =>
      prev ? { ...prev, widgets: normalized } : prev
    );

    saveLayout.mutate({ dashboardId: data.id, widgets: normalized });
  };

  const addWidget = (kind: WidgetKind) => {
    persist([...widgets, { ...createWidget(kind), position: widgets.length }]);
  };

  const removeWidget = (id: string) => {
    persist(widgets.filter((widget) => widget.id !== id));
  };

  const moveWidget = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= widgets.length) return;

    const next = [...widgets];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const resizeWidget = (id: string, size: WidgetSize) => {
    persist(widgets.map((widget) => (widget.id === id ? { ...widget, size } : widget)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = widgets.findIndex((widget) => widget.id === active.id);
    const newIndex = widgets.findIndex((widget) => widget.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    persist(arrayMove(widgets, oldIndex, newIndex));
  };

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-lg font-medium text-slate-100">{data?.name ?? "Dashboard"}</h1>

        <div className="flex items-center gap-2">
          {editMode ? (
            <div className="relative" ref={pickerRef}>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => setPickerOpen((open) => !open)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add widget
              </Button>

              {pickerOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
                  {WIDGET_KINDS.map((kind) => {
                    const definition = WIDGET_REGISTRY[kind];
                    const Icon = definition.Icon;
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => {
                          addWidget(kind);
                          setPickerOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
                      >
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                        {definition.defaultTitle}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            onClick={() => {
              setEditMode((current) => !current);
              setPickerOpen(false);
            }}
          >
            {editMode ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                Done
              </>
            ) : (
              <>
                <Pencil className="mr-1 h-4 w-4" />
                Edit layout
              </>
            )}
          </Button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-700 p-10 text-center text-sm text-slate-300">
          <p>No widgets yet.</p>
          <p>
            {editMode
              ? 'Use "Add widget" to build your dashboard.'
              : 'Click "Edit layout" to add widgets.'}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={widgets.map((widget) => widget.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-8 text-slate-100 md:grid-cols-2 lg:grid-cols-3">
              {widgets.map((widget, index) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  editMode={editMode}
                  saving={saving}
                  index={index}
                  total={widgets.length}
                  onMove={moveWidget}
                  onRemove={removeWidget}
                  onResize={resizeWidget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default Dashboard;

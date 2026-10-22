"use client";

import { useEffect, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { useDashboards } from "./DashboardsProvider";
import SortableWidget from "./SortableWidget";

const Dashboard = () => {
  const {
    ready,
    activeId,
    widgets,
    activeLoading,
    editMode,
    saving,
    moveWidget,
    removeWidget,
    resizeWidget,
    updateSettings,
    handleDragEnd,
  } = useDashboards();
  const [mounted, setMounted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!ready || !activeId) return null;

  return (
    <div className="py-8">
      {activeLoading ? (
        <div className="grid grid-cols-1 gap-8 text-foreground md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-96 animate-pulse rounded-md border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-10 text-center text-sm text-foreground/80">
          <p>No widgets yet.</p>
          <p>
            {editMode
              ? 'Use "Add widget" in the top bar to build your dashboard.'
              : 'Click "Edit layout" in the top bar to add widgets.'}
          </p>
        </div>
      ) : mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={widgets.map((widget) => widget.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid auto-rows-[24rem] grid-cols-1 gap-8 text-foreground md:grid-cols-2 lg:grid-cols-3">
              {widgets.map((widget, index) => (
                <SortableWidget
                  key={`${widget.id}-${index}`}
                  widget={widget}
                  editMode={editMode}
                  saving={saving}
                  index={index}
                  total={widgets.length}
                  onMove={moveWidget}
                  onRemove={removeWidget}
                  onResize={resizeWidget}
                  onSettingsChange={updateSettings}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid auto-rows-[24rem] grid-cols-1 gap-8 text-foreground md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget, index) => (
            <SortableWidget
              key={`${widget.id}-${index}`}
              widget={widget}
              editMode={editMode}
              saving={saving}
              index={index}
              total={widgets.length}
              onMove={moveWidget}
              onRemove={removeWidget}
              onResize={resizeWidget}
              onSettingsChange={updateSettings}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

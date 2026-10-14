"use client";

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!ready || !activeId) return null;

  return (
    <div className="py-8">
      {activeLoading ? (
        <div className="grid grid-cols-1 gap-8 text-slate-100 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-96 animate-pulse rounded-md border border-zinc-800 bg-zinc-800/40"
            />
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-700 p-10 text-center text-sm text-slate-300">
          <p>No widgets yet.</p>
          <p>
            {editMode
              ? 'Use "Add widget" in the top bar to build your dashboard.'
              : 'Click "Edit layout" in the top bar to add widgets.'}
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
                  onSettingsChange={updateSettings}
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

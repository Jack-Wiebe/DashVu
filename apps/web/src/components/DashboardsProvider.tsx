"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import type { AppRouter } from "@dashvu/api";
import type { WidgetKind, WidgetSize } from "@dashvu/validators";

import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc/client";
import { createWidget } from "@/lib/widget-registry";

type Bootstrap = inferRouterOutputs<AppRouter>["dashboard"]["bootstrap"];
export type DashboardSummary = Bootstrap["dashboards"][number];
export type ActiveDashboard = Bootstrap["active"];
export type DashboardWidget = Omit<
  ActiveDashboard["widgets"][number],
  "groupId" | "shareSettings"
> & {
  groupId?: string;
  shareSettings?: boolean;
};

interface DashboardsContextValue {
  ready: boolean;
  dashboards: DashboardSummary[];
  activeId: string | null;
  active: ActiveDashboard | null;
  widgets: DashboardWidget[];
  activeLoading: boolean;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  saving: boolean;
  switchTo: (id: string) => void;
  createDashboard: (name?: string) => Promise<string | null>;
  renameDashboard: (id: string, name: string) => Promise<void>;
  removeDashboard: (id: string) => Promise<void>;
  reorderDashboards: (ids: string[]) => void;
  addWidget: (kind: WidgetKind) => void;
  removeWidget: (id: string) => void;
  moveWidget: (index: number, direction: -1 | 1) => void;
  resizeWidget: (id: string, size: WidgetSize) => void;
  updateSettings: (id: string, settings: Record<string, unknown>) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

const DashboardsContext = createContext<DashboardsContextValue | null>(null);

export function useDashboards(): DashboardsContextValue {
  const context = useContext(DashboardsContext);
  if (!context) {
    throw new Error("useDashboards must be used within a DashboardsProvider");
  }
  return context;
}

export function DashboardsProvider({
  initial,
  children,
}: {
  initial: Bootstrap | null;
  children: ReactNode;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const ready = Boolean(initial);

  const [activeId, setActiveId] = useState<string | null>(initial?.activeId ?? null);
  const [editMode, setEditModeState] = useState(false);

  const list = trpc.dashboard.list.useQuery(undefined, {
    enabled: ready,
    initialData: initial?.dashboards,
  });

  const activeQuery = trpc.dashboard.get.useQuery(
    { id: activeId ?? "" },
    {
      enabled: ready && Boolean(activeId),
      initialData: initial && activeId === initial.activeId ? initial.active : undefined,
    }
  );

  const saveLayout = trpc.dashboard.saveLayout.useMutation({
    onError: () => {
      toast({
        variant: "destructive",
        title: "Could not save layout",
        description: "Your changes were reverted.",
      });
      utils.dashboard.get.invalidate();
    },
  });

  const setActive = trpc.dashboard.setActive.useMutation({
    onError: () => utils.dashboard.list.invalidate(),
  });

  const create = trpc.dashboard.create.useMutation({
    onSuccess: () => utils.dashboard.list.invalidate(),
  });

  const rename = trpc.dashboard.rename.useMutation({
    onSuccess: () => utils.dashboard.list.invalidate(),
  });

  const remove = trpc.dashboard.remove.useMutation({
    onSuccess: () => {
      utils.dashboard.list.invalidate();
      utils.dashboard.get.invalidate();
    },
  });

  const reorder = trpc.dashboard.reorder.useMutation({
    onError: () => utils.dashboard.list.invalidate(),
  });

  const dashboards = list.data ?? [];
  const widgets = activeQuery.data?.widgets ?? [];
  const active = activeQuery.data ?? null;

  const persist = (next: DashboardWidget[]) => {
    if (!activeId) return;
    const normalized = next.map((widget, index) => ({ ...widget, position: index }));

    utils.dashboard.get.setData({ id: activeId }, (prev) =>
      prev ? { ...prev, widgets: normalized as ActiveDashboard["widgets"] } : prev
    );
    saveLayout.mutate({ dashboardId: activeId, widgets: normalized });
  };

  const value: DashboardsContextValue = {
    ready,
    dashboards,
    activeId,
    active,
    widgets,
    activeLoading: activeQuery.isLoading && ready,
    editMode,
    setEditMode: setEditModeState,
    saving: saveLayout.isPending,
    switchTo: (id) => {
      if (id === activeId) return;
      setActiveId(id);
      setActive.mutate({ id });
    },
    createDashboard: async (name) => {
      const created = await create.mutateAsync(name ? { name } : {});
      if (created?.id) {
        utils.dashboard.get.setData(
          { id: created.id },
          {
            id: created.id,
            name: created.name,
            widgets: [],
          }
        );
        setActiveId(created.id);
      }
      return created?.id ?? null;
    },
    renameDashboard: async (id, name) => {
      const previous = dashboards;
      utils.dashboard.list.setData(undefined, (prev) =>
        prev?.map((dashboard) => (dashboard.id === id ? { ...dashboard, name } : dashboard))
      );
      try {
        await rename.mutateAsync({ id, name });
      } catch {
        utils.dashboard.list.setData(undefined, previous);
      }
    },
    removeDashboard: async (id) => {
      await remove.mutateAsync({ id });
      if (id === activeId) {
        const next = dashboards.find((dashboard) => dashboard.id !== id);
        if (next) setActiveId(next.id);
      }
    },
    reorderDashboards: (ids) => {
      utils.dashboard.list.setData(undefined, (prev) => {
        if (!prev) return prev;
        const byId = new Map(prev.map((dashboard) => [dashboard.id, dashboard]));
        return ids
          .map((id, index) => {
            const dashboard = byId.get(id);
            return dashboard ? { ...dashboard, position: index } : null;
          })
          .filter((dashboard): dashboard is DashboardSummary => dashboard !== null);
      });
      reorder.mutate({ ids });
    },
    addWidget: (kind) => {
      persist([...widgets, { ...createWidget(kind), position: widgets.length }]);
    },
    removeWidget: (id) => {
      persist(widgets.filter((widget) => widget.id !== id));
    },
    moveWidget: (index, direction) => {
      const target = index + direction;
      if (target < 0 || target >= widgets.length) return;
      const next = [...widgets];
      [next[index], next[target]] = [next[target], next[index]];
      persist(next);
    },
    resizeWidget: (id, size) => {
      persist(widgets.map((widget) => (widget.id === id ? { ...widget, size } : widget)));
    },
    updateSettings: (id, settings) => {
      persist(widgets.map((widget) => (widget.id === id ? { ...widget, settings } : widget)));
    },
    handleDragEnd: (event) => {
      const { active: dragged, over } = event;
      if (!over || dragged.id === over.id) return;
      const from = widgets.findIndex((widget) => widget.id === dragged.id);
      const to = widgets.findIndex((widget) => widget.id === over.id);
      if (from === -1 || to === -1) return;
      persist(arrayMove(widgets, from, to));
    },
  };

  return <DashboardsContext.Provider value={value}>{children}</DashboardsContext.Provider>;
}

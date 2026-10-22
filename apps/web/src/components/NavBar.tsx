"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { Check, MoreVertical, Pencil, Plus, Settings } from "lucide-react";

import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { cn, menuSurfaceClass } from "@/lib/utils";
import { WIDGET_KINDS, WIDGET_REGISTRY } from "@/lib/widget-registry";

import { useDashboards, type DashboardSummary } from "./DashboardsProvider";
import { useSettings } from "./SettingsDrawer";
import { Icons } from "./Icons";
import UserAuthButton from "./UserAuthButton";
import { Button } from "./ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const DashboardTab = ({
  dashboard,
  active,
  editMode,
  renaming,
  canDelete,
  onSelect,
  onRenameStart,
  onRenameDone,
  onRenameCancel,
  onDelete,
}: {
  dashboard: DashboardSummary;
  active: boolean;
  editMode: boolean;
  renaming: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onRenameStart: () => void;
  onRenameDone: (name: string) => void;
  onRenameCancel: () => void;
  onDelete: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dashboard.id,
    disabled: !editMode,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  if (renaming) {
    return (
      <input
        ref={inputRef}
        defaultValue={dashboard.name}
        maxLength={40}
        aria-label="Dashboard name"
        onBlur={(event) => onRenameDone(event.target.value.trim())}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            onRenameCancel();
          }
        }}
        className="w-28 rounded border border-input bg-muted px-2 py-1 text-sm text-foreground outline-none focus:border-ring"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined,
      }}
      className="flex items-center"
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "whitespace-nowrap rounded px-2 py-1 text-sm transition-colors",
          active
            ? "bg-muted text-foreground"
            : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
          editMode && "touch-none cursor-grab active:cursor-grabbing"
        )}
        {...(editMode ? { ...attributes, ...listeners } : {})}
      >
        {dashboard.name}
      </button>

      {editMode ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Options for ${dashboard.name}`}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={menuSurfaceClass}>
            <DropdownMenuItem onSelect={onRenameStart}>Rename</DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canDelete}
              onSelect={onDelete}
              className="text-red-400 focus:text-red-300"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
};

const DashboardTabs = ({ listRef }: { listRef: RefObject<HTMLDivElement | null> }) => {
  const {
    dashboards,
    activeId,
    editMode,
    switchTo,
    reorderDashboards,
    renameDashboard,
    removeDashboard,
    createDashboard,
  } = useDashboards();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = dashboards.findIndex((dashboard) => dashboard.id === active.id);
    const to = dashboards.findIndex((dashboard) => dashboard.id === over.id);
    if (from === -1 || to === -1) return;

    reorderDashboards(arrayMove(dashboards, from, to).map((dashboard) => dashboard.id));
  };

  const startCreate = async () => {
    const id = await createDashboard();
    if (id) setRenamingId(id);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      <div ref={listRef} className="flex items-center gap-1">
        {editMode && mounted ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={dashboards.map((dashboard) => dashboard.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex items-center gap-1">
                {dashboards.map((dashboard) => (
                  <DashboardTab
                    key={dashboard.id}
                    dashboard={dashboard}
                    active={dashboard.id === activeId}
                    editMode={editMode}
                    renaming={renamingId === dashboard.id}
                    canDelete={dashboards.length > 1}
                    onSelect={() => switchTo(dashboard.id)}
                    onRenameStart={() => setRenamingId(dashboard.id)}
                    onRenameDone={(name) => {
                      setRenamingId(null);
                      if (name && name !== dashboard.name) void renameDashboard(dashboard.id, name);
                    }}
                    onRenameCancel={() => setRenamingId(null)}
                    onDelete={() => void removeDashboard(dashboard.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex items-center gap-1">
            {dashboards.map((dashboard) => (
              <DashboardTab
                key={dashboard.id}
                dashboard={dashboard}
                active={dashboard.id === activeId}
                editMode={editMode}
                renaming={renamingId === dashboard.id}
                canDelete={dashboards.length > 1}
                onSelect={() => switchTo(dashboard.id)}
                onRenameStart={() => setRenamingId(dashboard.id)}
                onRenameDone={(name) => {
                  setRenamingId(null);
                  if (name && name !== dashboard.name) void renameDashboard(dashboard.id, name);
                }}
                onRenameCancel={() => setRenamingId(null)}
                onDelete={() => void removeDashboard(dashboard.id)}
              />
            ))}
          </div>
        )}

        {editMode ? (
          <button
            type="button"
            aria-label="Add dashboard"
            onClick={() => void startCreate()}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

const AddWidgetMenu = () => {
  const { addWidget, saving } = useDashboards();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={() => setOpen((value) => !value)}
      >
        <Plus className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">Add widget</span>
      </Button>

      {open ? (
        <div className={cn("absolute right-0 top-full z-30 mt-1 w-44 p-1", menuSurfaceClass)}>
          {WIDGET_KINDS.map((kind) => {
            const definition = WIDGET_REGISTRY[kind];
            const Icon = definition.Icon;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  addWidget(kind);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {definition.defaultTitle}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const EditToggle = () => {
  const { editMode, setEditMode } = useDashboards();

  return (
    <Button
      size="sm"
      variant={editMode ? "default" : "outline"}
      onClick={() => setEditMode(!editMode)}
    >
      {editMode ? (
        <>
          <Check className="mr-1 h-4 w-4" />
          Done
        </>
      ) : (
        <>
          <Pencil className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">Edit layout</span>
        </>
      )}
    </Button>
  );
};

const NavBar = () => {
  const { data: session } = useSession();
  const { ready, editMode } = useDashboards();
  const { openAppSettings } = useSettings();
  const signedIn = Boolean(session) && ready;

  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const [welcomeHidden, setWelcomeHidden] = useState(false);

  useEffect(() => {
    const nodes = [
      containerRef.current,
      logoRef.current,
      listRef.current,
      controlsRef.current,
      welcomeRef.current,
    ].filter((node): node is HTMLDivElement | HTMLAnchorElement => node !== null);

    if (nodes.length === 0) return;

    const measure = () => {
      const welcome = welcomeRef.current;
      if (!welcome) return;

      const welcomeRect = welcome.getBoundingClientRect();
      if (welcomeRect.width === 0) {
        setWelcomeHidden(false);
        return;
      }

      const leftEdge = Math.max(
        logoRef.current?.getBoundingClientRect().right ?? 0,
        listRef.current?.getBoundingClientRect().right ?? 0
      );
      const rightEdge = controlsRef.current?.getBoundingClientRect().left ?? window.innerWidth;

      setWelcomeHidden(welcomeRect.left < leftEdge + 8 || welcomeRect.right > rightEdge - 8);
    };

    const observer = new ResizeObserver(measure);
    nodes.forEach((node) => observer.observe(node));
    measure();
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [session, ready]);

  return (
    <div className="fixed top-0 inset-x-0 h-14 bg-background border-b border-border z-[10] text-foreground">
      <div
        ref={containerRef}
        className="container relative max-w-screen-2xl h-full mx-auto flex items-center gap-3"
      >
        <Link href="/" ref={logoRef} className="flex shrink-0 gap-2 items-center">
          <Icons.logo className="h-8 w-8 sm:h-6 sm:w-6"></Icons.logo>
          <p className="hidden text-sm font-medium md:block">DashVu</p>
        </Link>

        {signedIn ? <DashboardTabs listRef={listRef} /> : <div className="flex-1" />}

        <div
          ref={welcomeRef}
          style={{ visibility: welcomeHidden ? "hidden" : undefined }}
          className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-xs md:text-base lg:block"
        >
          {!session ? "Welcome to DashVu " : "Welcome back " + session?.user?.name}
        </div>

        <div ref={controlsRef} className="ml-auto flex shrink-0 items-center gap-2">
          {signedIn && <EditToggle />}
          {signedIn && editMode && <AddWidgetMenu />}
          {signedIn ? (
            <button
              type="button"
              aria-label="Settings"
              onClick={openAppSettings}
              className="rounded p-1.5 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </button>
          ) : (
            <UserAuthButton />
          )}
        </div>
      </div>
    </div>
  );
};

export default NavBar;

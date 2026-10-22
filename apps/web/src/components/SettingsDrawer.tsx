"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { signOut, useSession } from "next-auth/react";
import { Check, LogOut, Minus, Plus } from "lucide-react";
import { parseWidgetSize, widgetSize } from "@dashvu/core";
import {
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_WIDTH,
  type WidgetKind,
  type WidgetSize,
} from "@dashvu/validators";

import { cn } from "@/lib/utils";
import { THEMES } from "@/lib/themes";
import { trpc } from "@/lib/trpc/client";
import { WIDGET_REGISTRY } from "@/lib/widget-registry";

import { useDashboards } from "./DashboardsProvider";
import { usePreferences } from "./PreferencesProvider";
import { Button } from "./ui/Button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Switch } from "./ui/switch";

type SettingsTarget = { scope: "app" } | { scope: "widget"; widgetId: string } | null;

interface SettingsContextValue {
  openAppSettings: () => void;
  openWidgetSettings: (widgetId: string) => void;
  close: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-medium text-foreground">{label}</span>
    {children}
    {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
  </div>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 border-b border-border p-4 last:border-b-0">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    {children}
  </section>
);

function nextInstanceName(base: string, existing: string[]): string {
  const root = base.replace(/\s+\d+$/, "").trim() || base;
  const names = new Set(existing);
  if (!names.has(root)) return root;
  let n = 2;
  while (names.has(`${root} ${n}`)) n += 1;
  return `${root} ${n}`;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const SizeStepper = ({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) => (
  <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="flex items-center gap-1">
      <Button
        type="button"
        size="xs"
        variant="outline"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="min-w-[1.5rem] text-center text-sm tabular-nums">{value}</span>
      <Button
        type="button"
        size="xs"
        variant="outline"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </span>
  </div>
);

const SizeField = ({
  size,
  saving,
  onResize,
}: {
  size: WidgetSize;
  saving: boolean;
  onResize: (size: WidgetSize) => void;
}) => {
  const span = parseWidgetSize(size);
  const apply = (width: number, height: number) =>
    onResize(widgetSize(clamp(width, 1, MAX_WIDGET_WIDTH), clamp(height, 1, MAX_WIDGET_HEIGHT)));

  return (
    <Field
      label="Size"
      hint={`Width 1-${MAX_WIDGET_WIDTH} columns, height 1-${MAX_WIDGET_HEIGHT} rows.`}
    >
      <div className="flex flex-col gap-2">
        <SizeStepper
          label="Width"
          value={span.width}
          min={1}
          max={MAX_WIDGET_WIDTH}
          disabled={saving}
          onChange={(width) => apply(width, span.height)}
        />
        <SizeStepper
          label="Height"
          value={span.height}
          min={1}
          max={MAX_WIDGET_HEIGHT}
          disabled={saving}
          onChange={(height) => apply(span.width, height)}
        />
        <span className="text-center text-xs text-muted-foreground">{size}</span>
      </div>
    </Field>
  );
};

const WidgetSettingsPanel = ({ widgetId }: { widgetId: string }) => {
  const { widgets, resizeWidget, renameInstance, setWidgetInstance, createInstance, saving } =
    useDashboards();
  const widget = widgets.find((entry) => entry.id === widgetId);

  const [name, setName] = useState(widget?.title ?? "");
  const [creating, setCreating] = useState(false);

  const kind = widget?.kind ?? "spotify";
  const instances = trpc.dashboard.listInstances.useQuery({ kind }, { enabled: Boolean(widget) });

  useEffect(() => {
    setName(widget?.title ?? "");
  }, [widget?.groupId, widget?.title]);

  if (!widget) {
    return <SheetDescription>This widget is no longer available.</SheetDescription>;
  }

  const groupId = widget.groupId;

  const commitName = () => {
    const trimmed = name.trim();
    if (!groupId || !trimmed || trimmed === widget.title) return;
    renameInstance(groupId, trimmed);
  };

  const createNew = async () => {
    if (!groupId) return;
    setCreating(true);
    try {
      const base = WIDGET_REGISTRY[widget.kind].defaultTitle;
      const existing = (instances.data ?? []).map((instance) => instance.name);
      const created = await createInstance(
        widget.kind as WidgetKind,
        nextInstanceName(base, existing)
      );
      if (created) setWidgetInstance(widget.id, created.id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Section title="General">
        <Field label="Name">
          <input
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <SizeField
          size={widget.size}
          saving={saving}
          onResize={(token) => resizeWidget(widget.id, token)}
        />
      </Section>

      <Section title="Instance">
        <Field
          label="Shared instance"
          hint="Widgets sharing an instance also share its settings and content."
        >
          <div className="flex flex-col gap-1">
            {(instances.data ?? []).map((instance) => {
              const active = instance.id === groupId;
              return (
                <button
                  key={instance.id}
                  type="button"
                  onClick={() => !active && setWidgetInstance(widget.id, instance.id)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
                    active
                      ? "border-ring bg-accent text-accent-foreground"
                      : "border-border text-foreground hover:bg-accent"
                  )}
                >
                  <span className="truncate">{instance.name}</span>
                  <span className="flex items-center gap-2">
                    {instance.isDefault ? (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Default
                      </span>
                    ) : null}
                    {active ? <Check className="h-4 w-4" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!groupId || creating}
          onClick={() => void createNew()}
        >
          <Plus className="mr-1 h-4 w-4" />
          Create new instance
        </Button>
      </Section>
    </div>
  );
};

const AppSettingsPanel = () => {
  const { data: session } = useSession();
  const { theme, setTheme, reduceMotion, setReduceMotion } = usePreferences();
  const user = session?.user;

  return (
    <div className="flex flex-col">
      <Section title="Account">
        <div className="flex items-center gap-3">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-10 w-10 rounded-full border border-border" />
          ) : (
            <div className="h-10 w-10 rounded-full border border-border bg-muted" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{user?.name ?? "Signed in"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => void signOut()}
        >
          <LogOut className="mr-1 h-4 w-4" />
          Sign out
        </Button>
      </Section>

      <Section title="Appearance">
        <Field label="Theme">
          <div className="flex gap-2">
            {THEMES.map((definition) => (
              <Button
                key={definition.id}
                type="button"
                size="sm"
                variant={definition.id === theme ? "default" : "outline"}
                onClick={() => setTheme(definition.id)}
              >
                {definition.label}
              </Button>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">Reduce motion</span>
            <span className="text-xs text-muted-foreground">
              Pause animated widgets like the art canvas.
            </span>
          </div>
          <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
        </div>
      </Section>
    </div>
  );
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<SettingsTarget>(null);

  const value: SettingsContextValue = {
    openAppSettings: () => setTarget({ scope: "app" }),
    openWidgetSettings: (widgetId) => setTarget({ scope: "widget", widgetId }),
    close: () => setTarget(null),
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
      <Sheet open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{target?.scope === "widget" ? "Widget settings" : "Settings"}</SheetTitle>
            <SheetDescription>
              {target?.scope === "widget"
                ? "Configure this widget and the instance it shares."
                : "Manage your account and appearance."}
            </SheetDescription>
          </SheetHeader>

          {target?.scope === "widget" ? (
            <WidgetSettingsPanel widgetId={target.widgetId} />
          ) : target?.scope === "app" ? (
            <AppSettingsPanel />
          ) : null}
        </SheetContent>
      </Sheet>
    </SettingsContext.Provider>
  );
}

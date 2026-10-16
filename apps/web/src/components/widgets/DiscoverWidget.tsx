"use client";

import type { DiscoverTab } from "@dashvu/validators";
import { ExternalLink, RefreshCw } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";

const TABS: Array<{ id: DiscoverTab; label: string }> = [
  { id: "art", label: "Art" },
  { id: "space", label: "Space" },
];

function readTab(settings: Record<string, unknown> | null | undefined): DiscoverTab {
  return settings?.tab === "space" ? "space" : "art";
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const DiscoverWidget: React.FC<WidgetComponentProps> = ({
  className,
  settings,
  onSettingsChange,
}) => {
  const tab = readTab(settings);

  const art = trpc.discover.getArt.useQuery(undefined, {
    enabled: tab === "art",
    staleTime: 30 * 60 * 1000,
  });
  const space = trpc.discover.getSpace.useQuery(undefined, {
    enabled: tab === "space",
    staleTime: 30 * 60 * 1000,
  });

  const active = tab === "art" ? art : space;
  const isFetching = active.isFetching;

  const selectTab = (next: DiscoverTab) => {
    onSettingsChange?.({ ...(settings ?? {}), tab: next });
  };

  return (
    <div className={cn(className, "flex h-full flex-col gap-2")}>
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 rounded-md bg-muted/60 p-0.5">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => selectTab(entry.id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                entry.id === tab
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button
          size="xs"
          variant="ghost"
          aria-label="Refresh"
          disabled={isFetching}
          onClick={() => void active.refetch()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {active.isLoading ? (
          <div className="flex h-full flex-col gap-2">
            <div className="min-h-0 flex-1 animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        ) : active.isError ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load this right now.</p>
            <Button size="xs" variant="outline" onClick={() => void active.refetch()}>
              Try again
            </Button>
          </div>
        ) : tab === "art" && art.data ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded bg-muted/60">
              {art.data.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={art.data.imageUrl}
                  alt={art.data.title}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
            <div className="shrink-0">
              <p className="text-sm font-medium text-foreground">{art.data.title}</p>
              <p className="text-xs text-muted-foreground">
                {[art.data.artist, art.data.date].filter(Boolean).join(" · ")}
              </p>
              <a
                href={art.data.url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground/80"
              >
                {art.data.source}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : tab === "space" && space.data ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded bg-muted/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={space.data.imageUrl}
                alt={space.data.title}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="shrink-0">
              <p className="text-sm font-medium text-foreground">{space.data.title}</p>
              <p className="text-xs text-muted-foreground">
                {[space.data.credit, formatDate(space.data.date)].filter(Boolean).join(" · ")}
              </p>
              {space.data.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {space.data.description}
                </p>
              ) : null}
              <a
                href={space.data.url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground/80"
              >
                {space.data.source}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : (
          <p className="m-auto text-sm text-muted-foreground">Nothing to show today.</p>
        )}
      </div>
    </div>
  );
};

export default DiscoverWidget;

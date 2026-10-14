"use client";

import { useRef, useState } from "react";
import { formatRelativeTime } from "@dashvu/core";
import type { NewsSource } from "@dashvu/validators";
import { Check, ExternalLink, MessageSquare, RefreshCw, Settings, TrendingUp } from "lucide-react";

import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { trpc } from "@/lib/trpc/client";
import { cn, menuSurfaceClass } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";

interface SourceDefinition {
  id: NewsSource;
  label: string;
  full: string;
}

const SOURCES: SourceDefinition[] = [
  { id: "hackerNews", label: "HN", full: "Hacker News" },
  { id: "spaceflightNews", label: "Spaceflight", full: "Spaceflight News" },
  { id: "bbcNews", label: "BBC", full: "BBC News" },
  { id: "alJazeera", label: "Al Jazeera", full: "Al Jazeera" },
  { id: "allsides", label: "AllSides", full: "AllSides" },
];

const LIMITS = [5, 10, 15];

interface NewsSettings {
  source: NewsSource;
  limit: number;
}

function readSettings(settings: Record<string, unknown> | null | undefined): NewsSettings {
  const source = SOURCES.some((entry) => entry.id === settings?.source)
    ? (settings?.source as NewsSource)
    : "alJazeera";
  const limit =
    typeof settings?.limit === "number" && LIMITS.includes(settings.limit)
      ? (settings.limit as number)
      : 10;

  return { source, limit };
}

const NewsWidget: React.FC<WidgetComponentProps> = ({ className, settings, onSettingsChange }) => {
  const prefs = readSettings(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(settingsRef, () => setSettingsOpen(false));

  const query = trpc.news.getBriefing.useQuery(
    { source: prefs.source, limit: prefs.limit },
    { staleTime: 5 * 60 * 1000 }
  );
  const items = query.data ?? [];

  const selectSource = (source: NewsSource) => {
    onSettingsChange?.({ ...(settings ?? {}), source });
  };

  const selectLimit = (limit: number) => {
    onSettingsChange?.({ ...(settings ?? {}), limit });
    setSettingsOpen(false);
  };

  return (
    <div className={cn(className, "flex h-full flex-col gap-2")}>
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-md bg-zinc-900/60 p-0.5">
          {SOURCES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              title={entry.full}
              onClick={() => selectSource(entry.id)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition-colors",
                entry.id === prefs.source
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <Button
          size="xs"
          variant="ghost"
          aria-label="Refresh headlines"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
        </Button>

        <div className="relative" ref={settingsRef}>
          <Button
            size="xs"
            variant="ghost"
            aria-label="Number of headlines"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>

          {settingsOpen ? (
            <div className={cn("absolute right-0 top-full z-30 mt-1 w-32 p-1", menuSurfaceClass)}>
              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Headlines
              </p>
              {LIMITS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectLimit(value)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
                >
                  <Check className={cn("h-3.5 w-3.5", prefs.limit !== value && "opacity-0")} />
                  {value}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
        {query.isLoading ? (
          <ul className="space-y-2">
            {Array.from({ length: Math.min(prefs.limit, 6) }).map((_, index) => (
              <li key={index} className="space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded bg-zinc-800" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-zinc-800" />
              </li>
            ))}
          </ul>
        ) : query.isError ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-slate-500">Couldn&apos;t load headlines right now.</p>
            <Button size="xs" variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="m-auto text-sm text-slate-500">No headlines available.</p>
        ) : (
          <ol className="flex flex-col gap-0.5">
            {items.map((item, index) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex gap-2 rounded px-1 py-1.5 transition-colors hover:bg-zinc-800/60"
                >
                  <span className="w-4 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-500">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-1 text-sm text-slate-100 group-hover:text-white">
                      <span className="min-w-0 flex-1">{item.title}</span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                      {item.site ? <span className="truncate">{item.site}</span> : null}
                      {typeof item.points === "number" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          {item.points}
                        </span>
                      ) : null}
                      {typeof item.comments === "number" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <MessageSquare className="h-3 w-3" />
                          {item.comments}
                        </span>
                      ) : null}
                      {item.publishedAt ? (
                        <span>{formatRelativeTime(item.publishedAt)}</span>
                      ) : null}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default NewsWidget;

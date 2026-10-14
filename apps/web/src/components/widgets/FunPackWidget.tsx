"use client";

import { useRef, useState } from "react";
import { Check, ExternalLink, RefreshCw, Settings } from "lucide-react";

import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { trpc } from "@/lib/trpc/client";
import { cn, menuSurfaceClass } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";

interface PackSettings {
  showQuote: boolean;
  showJoke: boolean;
  showFact: boolean;
  showOnThisDay: boolean;
}

const DEFAULT_SETTINGS: PackSettings = {
  showQuote: true,
  showJoke: true,
  showFact: true,
  showOnThisDay: true,
};

const ITEM_LABELS: Record<keyof PackSettings, string> = {
  showQuote: "Quote",
  showJoke: "Dad joke",
  showFact: "Fun fact",
  showOnThisDay: "On this day",
};

function readSettings(settings: Record<string, unknown> | null | undefined): PackSettings {
  const read = (key: keyof PackSettings) =>
    typeof settings?.[key] === "boolean" ? (settings[key] as boolean) : DEFAULT_SETTINGS[key];

  return {
    showQuote: read("showQuote"),
    showJoke: read("showJoke"),
    showFact: read("showFact"),
    showOnThisDay: read("showOnThisDay"),
  };
}

const ItemCard: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <div className={cn("rounded-md border border-zinc-800 bg-zinc-900/40 p-3", className)}>
    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
    {children}
  </div>
);

const ItemError: React.FC = () => (
  <p className="text-xs italic text-slate-500">Couldn&apos;t load this right now.</p>
);

const ItemSkeleton: React.FC = () => (
  <div className="space-y-1.5">
    <div className="h-3 w-full animate-pulse rounded bg-zinc-800" />
    <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800" />
  </div>
);

const FunPackWidget: React.FC<WidgetComponentProps> = ({
  className,
  settings,
  onSettingsChange,
}) => {
  const prefs = readSettings(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(settingsRef, () => setSettingsOpen(false));

  const query = trpc.funPack.getPack.useQuery();
  const { quote, joke, fact, onThisDay } = query.data ?? {};

  const toggle = (key: keyof PackSettings) => {
    onSettingsChange?.({ ...(settings ?? {}), [key]: !prefs[key] });
  };

  const visibleCount = Object.values(prefs).filter(Boolean).length;

  return (
    <div className={cn(className, "flex h-full flex-col gap-3")}>
      <div className="flex items-center justify-end gap-1">
        <Button
          size="xs"
          variant="ghost"
          aria-label="Refresh"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
        </Button>

        <div className="relative" ref={settingsRef}>
          <Button
            size="xs"
            variant="ghost"
            aria-label="Choose items"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>

          {settingsOpen ? (
            <div className={cn("absolute right-0 top-full z-30 mt-1 w-44 p-1", menuSurfaceClass)}>
              {(Object.keys(DEFAULT_SETTINGS) as Array<keyof PackSettings>).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
                >
                  <Check className={cn("h-3.5 w-3.5", !prefs[key] && "opacity-0")} />
                  {ITEM_LABELS[key]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {visibleCount === 0 ? (
          <p className="m-auto text-sm text-slate-500">
            All items are hidden. Use the settings button to show some.
          </p>
        ) : null}

        {prefs.showQuote ? (
          <ItemCard label="Quote of the day">
            {query.isLoading ? (
              <ItemSkeleton />
            ) : quote?.status === "ok" ? (
              <div className="space-y-1">
                <p className="text-sm text-slate-100">&ldquo;{quote.data.text}&rdquo;</p>
                <p className="text-xs text-slate-400">
                  {quote.data.author ? `— ${quote.data.author}` : null}
                </p>
              </div>
            ) : (
              <ItemError />
            )}
          </ItemCard>
        ) : null}

        {prefs.showJoke ? (
          <ItemCard label="Dad joke">
            {query.isLoading ? (
              <ItemSkeleton />
            ) : joke?.status === "ok" ? (
              <p className="text-sm text-slate-100">{joke.data.text}</p>
            ) : (
              <ItemError />
            )}
          </ItemCard>
        ) : null}

        {prefs.showFact ? (
          <ItemCard label="Fun fact">
            {query.isLoading ? (
              <ItemSkeleton />
            ) : fact?.status === "ok" ? (
              <p className="text-sm text-slate-100">{fact.data.text}</p>
            ) : (
              <ItemError />
            )}
          </ItemCard>
        ) : null}

        {prefs.showOnThisDay ? (
          <ItemCard label="On this day">
            {query.isLoading ? (
              <ItemSkeleton />
            ) : onThisDay?.status === "ok" ? (
              <div className="flex gap-3">
                {onThisDay.data.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={onThisDay.data.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded object-cover"
                  />
                ) : null}
                <div className="space-y-1">
                  <p className="text-sm text-slate-100">{onThisDay.data.text}</p>
                  {onThisDay.data.year ? (
                    <p className="text-xs text-slate-400">{onThisDay.data.year}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <ItemError />
            )}
          </ItemCard>
        ) : null}
      </div>

      <a
        href="https://zenquotes.io/"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300"
      >
        Quotes by ZenQuotes
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
};

export default FunPackWidget;

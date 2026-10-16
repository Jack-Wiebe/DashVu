"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, RefreshCw, Search, Volume2 } from "lucide-react";

import type { DictionaryEntry } from "@dashvu/core";
import type { DictionaryTab } from "@dashvu/validators";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";

const TABS: Array<{ id: DictionaryTab; label: string }> = [
  { id: "dictionary", label: "Dictionary" },
  { id: "thesaurus", label: "Thesaurus" },
  { id: "wotd", label: "Word of the Day" },
];

function readTab(settings: Record<string, unknown> | null | undefined): DictionaryTab {
  const value = settings?.mode;
  return value === "thesaurus" || value === "wotd" ? value : "dictionary";
}

function readWord(settings: Record<string, unknown> | null | undefined): string {
  const value = settings?.word;
  return typeof value === "string" ? value : "";
}

function WordChip({ word, onClick }: { word: string; onClick: (word: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(word)}
      className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
    >
      {word}
    </button>
  );
}

function EntryView({
  entry,
  onWord,
  onPlay,
}: {
  entry: DictionaryEntry;
  onWord: (word: string) => void;
  onPlay: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-lg font-medium capitalize">{entry.word}</h3>
        {entry.phonetic ? (
          <span className="text-sm text-muted-foreground">{entry.phonetic}</span>
        ) : null}
        {entry.audio ? (
          <button
            type="button"
            onClick={onPlay}
            aria-label="Play pronunciation"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {entry.meanings.map((meaning, index) => (
        <div key={`${meaning.partOfSpeech}-${index}`} className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {meaning.partOfSpeech}
          </span>
          <ol className="flex list-decimal flex-col gap-1.5 pl-4">
            {meaning.definitions.map((definition, defIndex) => (
              <li key={defIndex} className="text-sm text-foreground/90">
                <p>{definition.definition}</p>
                {definition.example ? (
                  <p className="text-xs italic text-muted-foreground">{definition.example}</p>
                ) : null}
                {definition.synonyms.length > 0 || definition.antonyms.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {definition.synonyms.map((synonym) => (
                      <WordChip key={`s-${synonym}`} word={synonym} onClick={onWord} />
                    ))}
                    {definition.antonyms.map((antonym) => (
                      <WordChip key={`a-${antonym}`} word={antonym} onClick={onWord} />
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

const DictionaryWidget: React.FC<WidgetComponentProps> = ({
  className,
  settings,
  onSettingsChange,
}) => {
  const tab = readTab(settings);
  const savedWord = readWord(settings);

  const [query, setQuery] = useState(savedWord);
  const [debounced, setDebounced] = useState(savedWord);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setQuery(savedWord);
    setDebounced(savedWord);
  }, [savedWord]);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 450);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const element = audioRef.current;
    return () => {
      element?.pause();
    };
  }, []);

  const playAudio = (url: string | null) => {
    const element = audioRef.current;
    if (!element || !url) return;
    element.src = url;
    element.currentTime = 0;
    void element.play().catch(() => undefined);
  };

  const commitWord = (next: string, mode?: DictionaryTab) => {
    const value = next.trim();
    if (!value) return;
    setQuery(value);
    setDebounced(value);
    onSettingsChange?.({ ...(settings ?? {}), word: value, ...(mode ? { mode } : {}) });
  };

  const selectTab = (next: DictionaryTab) => {
    onSettingsChange?.({ ...(settings ?? {}), mode: next });
  };

  const hasWord = debounced.length > 0;
  const showSearch = tab !== "wotd";

  const lookup = trpc.dictionary.lookup.useQuery(
    { word: debounced },
    { enabled: hasWord && tab === "dictionary", retry: false }
  );
  const synonyms = trpc.dictionary.related.useQuery(
    { word: debounced, relation: "syn" },
    { enabled: hasWord && tab === "thesaurus", retry: false }
  );
  const antonyms = trpc.dictionary.related.useQuery(
    { word: debounced, relation: "ant" },
    { enabled: hasWord && tab === "thesaurus", retry: false }
  );
  const wotd = trpc.dictionary.wordOfTheDay.useQuery(undefined, {
    enabled: tab === "wotd",
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });

  const isFetching =
    tab === "dictionary"
      ? lookup.isFetching
      : tab === "thesaurus"
        ? synonyms.isFetching || antonyms.isFetching
        : wotd.isFetching;

  const refresh = () => {
    if (tab === "dictionary") void lookup.refetch();
    else if (tab === "thesaurus") {
      void synonyms.refetch();
      void antonyms.refetch();
    } else void wotd.refetch();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    commitWord(query);
  };

  const renderThesaurus = () => {
    if (!hasWord) {
      return <Hint>Type a word to find synonyms and antonyms.</Hint>;
    }
    if (synonyms.isLoading || antonyms.isLoading) return <Skeleton />;
    if (synonyms.isError || antonyms.isError) {
      return <ErrorState onRetry={refresh} />;
    }

    const synList = synonyms.data ?? [];
    const antList = antonyms.data ?? [];

    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-medium capitalize">{debounced}</h3>
        <section className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Synonyms
          </span>
          {synList.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {synList.map((item) => (
                <WordChip key={item.word} word={item.word} onClick={commitWord} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">None found.</p>
          )}
        </section>
        <section className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Antonyms
          </span>
          {antList.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {antList.map((item) => (
                <WordChip key={item.word} word={item.word} onClick={commitWord} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">None found.</p>
          )}
        </section>
      </div>
    );
  };

  const renderDictionary = () => {
    if (!hasWord) return <Hint>Type a word to look it up.</Hint>;
    if (lookup.isLoading) return <Skeleton />;
    if (lookup.isError) return <ErrorState onRetry={refresh} />;
    if (!lookup.data) {
      return (
        <p className="m-auto text-center text-sm text-muted-foreground">
          No definition found for &ldquo;{debounced}&rdquo;.
        </p>
      );
    }
    return (
      <EntryView
        entry={lookup.data}
        onWord={commitWord}
        onPlay={() => playAudio(lookup.data?.audio ?? null)}
      />
    );
  };

  const renderWotd = () => {
    if (wotd.isLoading) return <Skeleton />;
    if (wotd.isError || !wotd.data) return <ErrorState onRetry={refresh} />;

    return (
      <div className="flex flex-col gap-3">
        {wotd.data.entry ? (
          <EntryView
            entry={wotd.data.entry}
            onWord={commitWord}
            onPlay={() => playAudio(wotd.data?.entry?.audio ?? null)}
          />
        ) : (
          <p className="text-lg font-medium capitalize">{wotd.data.word}</p>
        )}
        <Button
          size="xs"
          variant="outline"
          className="self-start"
          onClick={() => commitWord(wotd.data?.word ?? "", "dictionary")}
        >
          Look up
        </Button>
      </div>
    );
  };

  return (
    <div className={cn(className, "flex flex-col gap-2")}>
      <div className="flex items-center gap-1">
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/60 p-0.5">
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
          onClick={refresh}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </Button>
      </div>

      {showSearch ? (
        <form onSubmit={onSubmit} className="flex items-center gap-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a word…"
            className="min-w-0 flex-1 rounded border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-ring"
          />
          <Button type="submit" size="xs" variant="outline" aria-label="Search">
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </Button>
        </form>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {tab === "dictionary"
          ? renderDictionary()
          : tab === "thesaurus"
            ? renderThesaurus()
            : renderWotd()}
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="m-auto text-center text-sm text-muted-foreground">{children}</p>;
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted/60" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted/60" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm text-muted-foreground">Couldn&apos;t load this right now.</p>
      <Button size="xs" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export default DictionaryWidget;

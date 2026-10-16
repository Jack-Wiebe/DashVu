"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Download, Pause, Play, Settings, Shuffle } from "lucide-react";

import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import {
  ART_PALETTES,
  ART_STYLES,
  PALETTES,
  createArt,
  type ArtInstance,
  type ArtPalette,
  type ArtStyle,
} from "@/lib/generative-art";
import { cn, menuSurfaceClass } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { usePreferences } from "../PreferencesProvider";
import { Button } from "../ui/Button";

interface CanvasSettings {
  style: ArtStyle;
  palette: ArtPalette;
  seed: number | null;
  animated: boolean;
}

const DEFAULT_SETTINGS: CanvasSettings = {
  style: "flow",
  palette: "aurora",
  seed: null,
  animated: true,
};

function readSettings(settings: Record<string, unknown> | null | undefined): CanvasSettings {
  const style = ART_STYLES.some((entry) => entry.id === settings?.style)
    ? (settings?.style as ArtStyle)
    : DEFAULT_SETTINGS.style;
  const palette = ART_PALETTES.includes(settings?.palette as ArtPalette)
    ? (settings?.palette as ArtPalette)
    : DEFAULT_SETTINGS.palette;
  const seed = typeof settings?.seed === "number" ? settings.seed : DEFAULT_SETTINGS.seed;
  const animated =
    typeof settings?.animated === "boolean" ? settings.animated : DEFAULT_SETTINGS.animated;

  return { style, palette, seed, animated };
}

const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);

const GenerativeArtWidget: React.FC<WidgetComponentProps> = ({
  className,
  settings,
  onSettingsChange,
}) => {
  const config = readSettings(settings);
  const { reduceMotion: reduceMotionPreference } = usePreferences();
  const [fallbackSeed] = useState(randomSeed);
  const seed = config.seed ?? fallbackSeed;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<ArtInstance | null>(null);
  const timeRef = useRef(0);
  const drawRef = useRef<((timeSec: number) => void) | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [visible, setVisible] = useState(true);
  const [docVisible, setDocVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(settingsRef, () => setSettingsOpen(false));

  const styleAnimated = ART_STYLES.find((entry) => entry.id === config.style)?.animated ?? false;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      clearTimeout(timer);
      timer = setTimeout(() => {
        setSize({
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
        });
      }, 120);
    });

    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? true),
      {
        threshold: 0.05,
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setDocVisible(document.visibilityState === "visible");

    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const art = createArt(config.style, seed, size.width, size.height, PALETTES[config.palette]);
    artRef.current = art;
    timeRef.current = 0;

    drawRef.current = (timeSec: number) => art.draw(ctx, size.width, size.height, timeSec);
    art.draw(ctx, size.width, size.height, 0);
  }, [config.style, config.palette, seed, size.width, size.height]);

  useEffect(() => {
    const shouldRun =
      config.animated &&
      styleAnimated &&
      visible &&
      docVisible &&
      !reducedMotion &&
      !reduceMotionPreference;
    const draw = drawRef.current;

    if (!shouldRun || !draw) {
      draw?.(timeRef.current);
      return;
    }

    let raf = 0;
    let last = 0;

    const tick = (ts: number) => {
      if (!last) last = ts;
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      timeRef.current += dt;
      draw(timeRef.current);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    config.animated,
    config.style,
    styleAnimated,
    visible,
    docVisible,
    reducedMotion,
    reduceMotionPreference,
  ]);

  const update = useCallback(
    (patch: Partial<CanvasSettings>) => {
      onSettingsChange?.({ ...(settings ?? {}), ...patch });
    },
    [onSettingsChange, settings]
  );

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `dashvu-art-${config.style}-${seed}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [config.style, seed]);

  return (
    <div className={cn(className, "flex h-full flex-col gap-2")}>
      <div className="flex items-center justify-end gap-1">
        <Button
          size="xs"
          variant="ghost"
          aria-label="New seed"
          onClick={() => update({ seed: randomSeed() })}
        >
          <Shuffle className="h-3.5 w-3.5" />
        </Button>

        {styleAnimated ? (
          <Button
            size="xs"
            variant="ghost"
            aria-label={config.animated ? "Pause" : "Play"}
            onClick={() => update({ animated: !config.animated })}
          >
            {config.animated ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        ) : null}

        <Button size="xs" variant="ghost" aria-label="Download PNG" onClick={download}>
          <Download className="h-3.5 w-3.5" />
        </Button>

        <div className="relative" ref={settingsRef}>
          <Button
            size="xs"
            variant="ghost"
            aria-label="Art settings"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>

          {settingsOpen ? (
            <div className={cn("absolute right-0 top-full z-30 mt-1 w-44 p-1", menuSurfaceClass)}>
              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Style
              </p>
              {ART_STYLES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => update({ style: entry.id })}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Check className={cn("h-3.5 w-3.5", config.style !== entry.id && "opacity-0")} />
                  {entry.label}
                </button>
              ))}

              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Palette
              </p>
              {ART_PALETTES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => update({ palette: id })}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Check className={cn("h-3.5 w-3.5", config.palette !== id && "opacity-0")} />
                  {PALETTES[id].label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => update({ animated: !config.animated })}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Check className={cn("h-3.5 w-3.5", !config.animated && "opacity-0")} />
                Animate
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-md"
        style={{ backgroundColor: PALETTES[config.palette].bg }}
      >
        <canvas ref={canvasRef} role="img" aria-label="Generative art" className="block" />
      </div>
    </div>
  );
};

export default GenerativeArtWidget;

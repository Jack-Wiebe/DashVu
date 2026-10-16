"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TileLayer as LeafletTileLayer } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import { Pause, Play } from "lucide-react";
import "leaflet/dist/leaflet.css";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { Button } from "../ui/Button";
import { Slider } from "../ui/slider";

const FRAME_MS = 600;
const FADE_START = 0.5;
const TILE_COLOR = 2;
const TILE_OPTIONS = "1_1";
const RADAR_OPACITY = 0.7;
const PRELOAD_TIMEOUT_MS = 4000;

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

interface WeatherRadarProps {
  latitude: number;
  longitude: number;
  className?: string;
}

const WeatherRadar = ({ latitude, longitude, className }: WeatherRadarProps) => {
  const radar = trpc.weather.getRadar.useQuery(undefined, {
    retry: false,
    refetchInterval: 5 * 60 * 1000,
  });

  const frames = radar.data?.frames ?? [];
  const total = frames.length;

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);

  const layerRefs = useRef<Array<LeafletTileLayer | null>>([]);
  const loadedRef = useRef<Set<number>>(new Set());
  const progressRef = useRef(0);
  const baseRef = useRef(0);

  const applyOpacities = useCallback(
    (base: number, current: number, next: number) => {
      const nextIndex = (base + 1) % total;
      for (let i = 0; i < total; i += 1) {
        layerRefs.current[i]?.setOpacity(i === base ? current : i === nextIndex ? next : 0);
      }
    },
    [total]
  );

  const handleLayerLoad = useCallback(
    (index: number) => {
      if (loadedRef.current.has(index)) return;
      loadedRef.current.add(index);
      if (loadedRef.current.size >= total) setReady(true);
    },
    [total]
  );

  useEffect(() => {
    setReady(false);
    loadedRef.current = new Set();
    progressRef.current = 0;
    baseRef.current = 0;
    setFrameIndex(0);
  }, [latitude, longitude]);

  useEffect(() => {
    if (ready || total === 0) return;
    const id = setTimeout(() => setReady(true), PRELOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [ready, total]);

  useEffect(() => {
    if (!playing || !ready || total <= 1) {
      const base = Math.floor(progressRef.current) % Math.max(total, 1);
      applyOpacities(base, RADAR_OPACITY, 0);
      setFrameIndex(base);
      return;
    }

    let raf = 0;
    let last = 0;

    const tick = (ts: number) => {
      if (!last) last = ts;
      const delta = ts - last;
      last = ts;

      progressRef.current = (progressRef.current + delta / FRAME_MS) % total;

      const base = Math.floor(progressRef.current) % total;
      const frac = progressRef.current - Math.floor(progressRef.current);

      let current = RADAR_OPACITY;
      let next = 0;
      if (frac > FADE_START) {
        const t = (frac - FADE_START) / (1 - FADE_START);
        const eased = t * t * (3 - 2 * t);
        current = RADAR_OPACITY * (1 - eased);
        next = RADAR_OPACITY * eased;
      }

      applyOpacities(base, current, next);

      if (base !== baseRef.current) {
        baseRef.current = base;
        setFrameIndex(base);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, ready, total, applyOpacities]);

  const scrubTo = useCallback(
    (index: number) => {
      const bounded = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
      progressRef.current = bounded;
      baseRef.current = bounded;
      setFrameIndex(bounded);
      applyOpacities(bounded, RADAR_OPACITY, 0);
      setPlaying(false);
    },
    [applyOpacities, total]
  );

  if (radar.isLoading) {
    return (
      <div
        className={cn(className, "flex flex-1 items-center justify-center text-muted-foreground")}
      >
        Loading radar…
      </div>
    );
  }

  if (radar.isError || !radar.data || total === 0) {
    return (
      <div
        className={cn(className, "flex flex-1 items-center justify-center text-muted-foreground")}
      >
        Radar unavailable.
      </div>
    );
  }

  const host = radar.data.host;
  const frame = frames[frameIndex % total];
  const frameTime = frame
    ? new Date(frame.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={cn(className, "flex flex-1 flex-col")}>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md">
        <MapContainer
          key={`${latitude}:${longitude}`}
          center={[latitude, longitude]}
          zoom={7}
          minZoom={2}
          maxZoom={12}
          scrollWheelZoom={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          {frames.map((radarFrame, index) => (
            <TileLayer
              key={index}
              ref={(layer) => {
                layerRefs.current[index] = layer;
              }}
              eventHandlers={{ load: () => handleLayerLoad(index) }}
              url={`${host}${radarFrame.path}/256/{z}/{x}/{y}/${TILE_COLOR}/${TILE_OPTIONS}.png`}
              opacity={0}
              tileSize={256}
              maxNativeZoom={7}
              maxZoom={12}
              updateWhenIdle
              keepBuffer={4}
            />
          ))}
          <CircleMarker
            center={[latitude, longitude]}
            radius={5}
            pathOptions={{ color: "#22c55e" }}
          />
          <InvalidateSize />
        </MapContainer>

        {!ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-foreground/80">
            Loading radar…
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button size="xs" variant="ghost" onClick={() => setPlaying((value) => !value)}>
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          {total > 1 ? (
            <Slider
              className="flex-1"
              min={0}
              max={total - 1}
              step={1}
              value={[frameIndex]}
              onValueChange={(values) => scrubTo(values[0] ?? 0)}
              aria-label="Radar timeline"
            />
          ) : (
            <span className="flex-1" />
          )}
          <span className="w-10 shrink-0 text-right tabular-nums">{frameTime}</span>
        </div>
        <span>© OpenStreetMap · Radar © RainViewer</span>
      </div>
    </div>
  );
};

export default WeatherRadar;

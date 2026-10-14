"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { MapPin, Search, Star } from "lucide-react";

import { describeWeatherCode } from "@dashvu/core";

import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { trpc } from "@/lib/trpc/client";
import { cn, menuSurfaceClass } from "@/lib/utils";
import { weatherIconForCode } from "@/lib/weather-icons";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";
import { Switch } from "../ui/switch";

const WeatherRadar = dynamic(() => import("./WeatherRadar"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center text-slate-400">Loading radar…</div>
  ),
});

interface Location {
  label: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_LOCATION: Location = {
  label: "London, United Kingdom",
  latitude: 51.5074,
  longitude: -0.1278,
};

function readDefaultCity(settings: Record<string, unknown> | null | undefined): Location | null {
  const value = settings?.defaultCity;
  if (!value || typeof value !== "object") return null;

  const { label, latitude, longitude } = value as Record<string, unknown>;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;

  return {
    label: typeof label === "string" ? label : "Saved location",
    latitude,
    longitude,
  };
}

function weekday(date: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
    new Date(`${date}T00:00:00`)
  );
}

const WeatherWidget: React.FC<WidgetComponentProps> = ({
  className,
  settings,
  onSettingsChange,
}) => {
  const savedDefault = readDefaultCity(settings);
  const savedLat = savedDefault?.latitude ?? null;
  const savedLon = savedDefault?.longitude ?? null;
  const savedLabel = savedDefault?.label ?? null;
  const [location, setLocation] = useState<Location>(() => savedDefault ?? DEFAULT_LOCATION);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [radarView, setRadarView] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  useOnClickOutside(searchRef, (event) => {
    if (!searchOpen) return;
    if (searchButtonRef.current?.contains(event.target as Node)) return;
    setSearchOpen(false);
  });

  useEffect(() => {
    if (savedLat !== null && savedLon !== null) {
      setLocation({
        label: savedLabel ?? "Saved location",
        latitude: savedLat,
        longitude: savedLon,
      });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setLocation({
          label: "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => undefined
    );

    return () => {
      cancelled = true;
    };
  }, [savedLat, savedLon, savedLabel]);

  const search = trpc.weather.searchLocations.useQuery(
    { query: submitted },
    { enabled: submitted.length > 1, retry: false }
  );

  const overview = trpc.weather.getOverview.useQuery(
    { latitude: location.latitude, longitude: location.longitude },
    { refetchInterval: 10 * 60 * 1000, retry: false }
  );

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(query.trim());
  };

  const selectLocation = (result: NonNullable<typeof search.data>[number]) => {
    setLocation({
      label: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setQuery("");
    setSubmitted("");
    setSearchOpen(false);
  };

  const isDefault =
    savedDefault !== null &&
    savedDefault.latitude === location.latitude &&
    savedDefault.longitude === location.longitude;

  const toggleDefault = () => {
    if (!onSettingsChange) return;

    const next = { ...(settings ?? {}) };
    if (isDefault) {
      delete next.defaultCity;
    } else {
      next.defaultCity = {
        label: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }
    onSettingsChange(next);
  };

  return (
    <div className={cn(className, "flex flex-col gap-3 text-sm")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 text-xs text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{location.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {onSettingsChange ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={toggleDefault}
              aria-label={isDefault ? "Clear default city" : "Set current city as default"}
              title={isDefault ? "Default city" : "Set as default"}
            >
              <Star className={cn("h-3.5 w-3.5", isDefault && "fill-current text-amber-400")} />
            </Button>
          ) : null}
          <Button
            ref={searchButtonRef}
            size="xs"
            variant="ghost"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className={cn(!radarView && "text-slate-200")}>Week</span>
        <Switch checked={radarView} onCheckedChange={setRadarView} aria-label="Toggle radar view" />
        <span className={cn(radarView && "text-slate-200")}>Radar</span>
      </div>

      {radarView ? (
        <WeatherRadar
          latitude={location.latitude}
          longitude={location.longitude}
          className="min-h-0 flex-1"
        />
      ) : overview.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-slate-400">Loading…</div>
      ) : overview.isError || !overview.data ? (
        <div className="flex flex-1 items-center justify-center text-center text-slate-400">
          Could not load weather.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-4xl font-light">
              {Math.round(overview.data.current.temperatureC ?? 0)}°C
            </p>
            <p className="text-slate-300">
              {describeWeatherCode(overview.data.current.weatherCode)}
            </p>
            <p className="text-xs text-slate-400">
              Wind {Math.round(overview.data.current.windSpeedKph ?? 0)} km/h
            </p>
          </div>

          <ul className="grid grid-cols-7 gap-1 border-t border-zinc-800 pt-2 text-xs">
            {overview.data.daily.map((day) => {
              const Icon = weatherIconForCode(day.weatherCode);
              return (
                <li key={day.date} className="flex flex-col items-center gap-1">
                  <span className="text-slate-400">{weekday(day.date)}</span>
                  <Icon className="h-4 w-4" />
                  <span className="text-slate-200">{Math.round(day.tempMaxC ?? 0)}°</span>
                  <span className="text-slate-500">{Math.round(day.tempMinC ?? 0)}°</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {searchOpen ? (
        <div ref={searchRef} className="relative flex flex-col gap-2">
          <form onSubmit={onSearch} className="flex items-center gap-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a city…"
              className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-zinc-500"
            />
            <Button type="submit" size="xs" variant="outline">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </form>

          {search.data && search.data.length > 0 ? (
            <ul
              className={cn(
                "absolute left-0 top-full z-30 mt-1 max-h-32 w-full overflow-y-auto p-1",
                menuSurfaceClass
              )}
            >
              {search.data.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => selectLocation(result)}
                    className="w-full rounded-sm px-2 py-1 text-left text-xs text-zinc-200 transition-colors hover:bg-zinc-800"
                  >
                    {[result.name, result.admin1, result.country].filter(Boolean).join(", ")}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default WeatherWidget;

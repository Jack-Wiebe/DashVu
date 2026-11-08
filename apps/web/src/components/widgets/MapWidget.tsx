"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistance, formatDuration, type GeoPlace, type GeoPoint } from "@dashvu/core";
import {
  geoPlaceSchema,
  mapSettingsSchema,
  MAX_MAP_STOPS,
  type GeoPlaceInput,
  type TravelMode,
} from "@dashvu/validators";
import {
  Bike,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Footprints,
  GripVertical,
  LocateFixed,
  MapPin,
  Maximize2,
  MoreVertical,
  Pin,
  Plus,
  Sparkles,
  Star,
  TrainFront,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { trpc } from "@/lib/trpc/client";
import { cn, menuSurfaceClass } from "@/lib/utils";
import type { WidgetComponentProps } from "@/types/widget";

import { Button } from "../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import type { MapMarker, MapSegment } from "./MapCanvas";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

type MapLocation = GeoPlaceInput;

interface SavedLocation {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

let geolocationPromptStarted = false;

const MAX_POINTS = MAX_MAP_STOPS + 1;
const MIN_MAP_PCT = 20;
const MAX_MAP_PCT = 70;

function clampMapPct(value: number): number {
  return Math.min(MAX_MAP_PCT, Math.max(MIN_MAP_PCT, value));
}

const MODES: { value: TravelMode; label: string; Icon: LucideIcon }[] = [
  { value: "driving", label: "Drive", Icon: Car },
  { value: "cycling", label: "Bike", Icon: Bike },
  { value: "walking", label: "Walk", Icon: Footprints },
  { value: "transit", label: "Transit", Icon: TrainFront },
];

interface MapState {
  mode: TravelMode;
  points: MapLocation[];
  pinnedIds: string[];
  favourites: MapLocation[];
}

function readSettings(settings: Record<string, unknown> | null | undefined): MapState {
  const raw = settings ?? {};
  const parsed = mapSettingsSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};

  let points = data.points ?? [];
  if (points.length === 0) {
    const legacyOrigin = geoPlaceSchema.safeParse(raw.origin);
    const legacyStops = Array.isArray(raw.stops)
      ? raw.stops
          .map((stop) => geoPlaceSchema.safeParse(stop))
          .filter((result) => result.success)
          .map((result) => result.data)
      : [];
    points = [...(legacyOrigin.success ? [legacyOrigin.data] : []), ...legacyStops];
  }

  return {
    mode: data.mode ?? "driving",
    points,
    pinnedIds: data.pinnedIds ?? [],
    favourites: data.favourites ?? [],
  };
}

function toLocation(place: GeoPlace): MapLocation {
  return {
    id: crypto.randomUUID(),
    label: place.label,
    lat: place.lat,
    lon: place.lon,
    kind: place.kind ?? null,
  };
}

function transitColor(mode: string): string {
  switch (mode) {
    case "WALK":
      return "#9ca3af";
    case "BUS":
    case "COACH":
      return "#f59e0b";
    case "TRAM":
    case "LIGHT_RAIL":
      return "#ef4444";
    case "SUBWAY":
    case "METRO":
      return "#eab308";
    case "FERRY":
      return "#06b6d4";
    default:
      return "#3b82f6";
  }
}

interface SortablePointProps {
  point: MapLocation;
  index: number;
  isDestination: boolean;
  editing: boolean;
  pinned: boolean;
  canPin: boolean;
  saved: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onTogglePin: () => void;
  onToggleSaved: () => void;
}

const SortablePoint = ({
  point,
  index,
  isDestination,
  editing,
  pinned,
  canPin,
  saved,
  onEdit,
  onRemove,
  onTogglePin,
  onToggleSaved,
}: SortablePointProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: point.id,
  });
  const isOrigin = index === 0;
  const badge = isOrigin ? "S" : isDestination ? "E" : index;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined,
      }}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1",
        editing ? "border-ring bg-accent/60" : "border-border bg-muted/40"
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab touch-none text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-medium tabular-nums",
          isOrigin
            ? "bg-green-500/25 text-green-600 dark:text-green-400"
            : isDestination
              ? "bg-rose-500/25 text-rose-600 dark:text-rose-400"
              : "bg-primary/20"
        )}
      >
        {badge}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs">{point.label}</span>
      {canPin ? (
        <button
          type="button"
          aria-label={pinned ? "Unpin stop" : "Pin stop in place"}
          title={pinned ? "Unpin stop" : "Pin stop in place"}
          onClick={onTogglePin}
          className={cn(
            "transition-colors hover:text-foreground",
            pinned ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current")} />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={saved ? "Remove from saved locations" : "Save location"}
        title={saved ? "Remove from saved locations" : "Save location"}
        onClick={onToggleSaved}
        className={cn(
          "transition-colors hover:text-foreground",
          saved ? "text-amber-400" : "text-muted-foreground"
        )}
      >
        <Star className={cn("h-3.5 w-3.5", saved && "fill-current")} />
      </button>
      <button
        type="button"
        aria-label="Set location on map"
        title="Set location on map"
        onClick={onEdit}
        className={cn(
          "transition-colors hover:text-foreground",
          editing ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Crosshair className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Remove stop"
        onClick={onRemove}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
};

const MapWidget: React.FC<WidgetComponentProps> = ({
  widgetId,
  className,
  settings,
  onSettingsChange,
  index = 0,
}) => {
  const utils = trpc.useUtils();

  const [state, setState] = useState<MapState>(() => readSettings(settings));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mapKey, setMapKey] = useState<string>(() => `${widgetId}`);
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useState<{
    query: string;
    lat?: number;
    lon?: number;
  } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mapPct, setMapPct] = useState(50);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startY: number; startPct: number; height: number } | null>(null);
  const mapPctInit = useRef(false);
  const viewportRef = useRef<GeoPoint | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const editingIdRef = useRef<string | null>(null);
  editingIdRef.current = editingId;
  const pickModeRef = useRef(false);
  pickModeRef.current = pickMode;
  const autoLocationRef = useRef(false);
  const favouritesMigrationRef = useRef(false);

  const signature = useMemo(() => JSON.stringify(settings ?? {}), [settings]);
  useEffect(() => {
    setState(readSettings(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPanelOpen(window.sessionStorage.getItem(`map-panel-${widgetId}`) !== "0");
  }, [widgetId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = Number(window.sessionStorage.getItem(`map-height-${widgetId}`));
    if (Number.isFinite(stored) && stored >= MIN_MAP_PCT && stored <= MAX_MAP_PCT) {
      setMapPct(stored);
    }
    mapPctInit.current = true;
  }, [widgetId]);

  useEffect(() => {
    if (!mapPctInit.current || typeof window === "undefined") return;
    window.sessionStorage.setItem(`map-height-${widgetId}`, String(Math.round(mapPct)));
  }, [mapPct, widgetId]);

  useEffect(() => {
    if (editingId !== null) searchInputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchParams(null);
      setSearchOpen(false);
      return;
    }
    setSearchOpen(true);
    const id = setTimeout(() => {
      setSearchParams({
        query: trimmed,
        lat: viewportRef.current?.lat,
        lon: viewportRef.current?.lon,
      });
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  useOnClickOutside(searchRef, () => setSearchOpen(false));

  const commit = useCallback(
    (partial: Partial<MapState>) => {
      const next = { ...stateRef.current, ...partial };
      stateRef.current = next;
      setState(next);
      onSettingsChange?.(next);
    },
    [onSettingsChange]
  );

  const savedQuery = trpc.map.listSavedLocations.useQuery(undefined, { enabled: mounted });
  const userStateQuery = trpc.map.getUserState.useQuery(undefined, {
    enabled: mounted,
    staleTime: 60_000,
  });
  const updateUserState = trpc.map.updateUserState.useMutation();
  const createSaved = trpc.map.createSavedLocation.useMutation({
    onSuccess: () => utils.map.listSavedLocations.invalidate(),
  });
  const renameSaved = trpc.map.renameSavedLocation.useMutation({
    onSuccess: () => utils.map.listSavedLocations.invalidate(),
  });
  const removeSaved = trpc.map.removeSavedLocation.useMutation({
    onSuccess: () => utils.map.listSavedLocations.invalidate(),
  });
  const importFavourites = trpc.map.importSavedLocations.useMutation({
    onSuccess: () => {
      utils.map.listSavedLocations.invalidate();
      commit({ favourites: [] });
    },
    onError: () => {
      favouritesMigrationRef.current = false;
    },
  });

  const search = trpc.map.geocode.useQuery(
    { query: searchParams?.query ?? "", lat: searchParams?.lat, lon: searchParams?.lon },
    {
      enabled: Boolean(searchParams?.query && searchParams.query.length > 1),
      retry: false,
      staleTime: 60_000,
    }
  );

  const routeInput = useMemo(() => {
    if (state.points.length < 2) return null;
    const [origin, ...stops] = state.points;
    return {
      mode: state.mode,
      origin: { lat: origin.lat, lon: origin.lon },
      stops: stops.map((stop) => ({ lat: stop.lat, lon: stop.lon })),
    };
  }, [state.mode, state.points]);

  const routeQuery = trpc.map.route.useQuery(
    routeInput ?? { mode: "driving", origin: { lat: 0, lon: 0 }, stops: [{ lat: 0, lon: 0 }] },
    { enabled: routeInput !== null, retry: false }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      state.points.map((point, index) => {
        const role =
          index === 0 ? "origin" : index === state.points.length - 1 ? "destination" : "stop";
        return { id: point.id, role, index, lat: point.lat, lon: point.lon };
      }),
    [state.points]
  );

  const segments = useMemo<MapSegment[]>(() => {
    const data = routeQuery.data;
    if (!data) return [];
    if (data.mode === "transit") {
      const itinerary = data.itineraries[0];
      if (!itinerary) return [];
      return itinerary.legs
        .map((leg, index) => {
          const points =
            leg.geometry && leg.geometry.length > 1
              ? leg.geometry
              : leg.fromPoint && leg.toPoint
                ? [leg.fromPoint, leg.toPoint]
                : [];
          return {
            id: `leg-${index}`,
            points,
            color: transitColor(leg.mode),
            dashed: leg.mode === "WALK",
          };
        })
        .filter((segment) => segment.points.length > 1);
    }
    return [{ id: "route", points: data.geometry, color: "#3b82f6" }];
  }, [routeQuery.data]);

  const reversePlace = useCallback(
    async (point: GeoPoint): Promise<GeoPlace> => {
      try {
        const results = await utils.map.reverse.fetch(point);
        if (results[0]) return results[0];
      } catch {
        /* fall through to coordinate label */
      }
      return {
        id: `${point.lat},${point.lon}`,
        label: `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`,
        lat: point.lat,
        lon: point.lon,
        kind: null,
      };
    },
    [utils]
  );

  const applyLocation = useCallback(
    (place: GeoPlace, options?: { append?: boolean }) => {
      const current = options?.append ? null : editingIdRef.current;
      const next = toLocation(place);
      const points = stateRef.current.points;
      let updated: MapLocation[];
      if (current && points.some((p) => p.id === current)) {
        updated = points.map((p) => (p.id === current ? { ...next, id: p.id } : p));
      } else if (points.length >= MAX_POINTS) {
        updated = points;
      } else {
        updated = [...points, next];
      }
      commit({ points: updated });
      setEditingId(null);
      setPickMode(false);
    },
    [commit]
  );

  const persistLastKnown = useCallback(
    (place: GeoPlace) => {
      updateUserState.mutate({
        lastKnownLocation: {
          id: place.id,
          label: place.label,
          lat: place.lat,
          lon: place.lon,
          kind: place.kind ?? null,
        },
      });
    },
    [updateUserState]
  );

  const locateAt = useCallback(
    async (point: GeoPoint) => {
      const place = await reversePlace(point);
      applyLocation(place);
    },
    [applyLocation, reversePlace]
  );

  const onPick = useCallback(
    (point: GeoPoint) => {
      if (editingIdRef.current === null && !pickModeRef.current) return;
      setPickMode(false);
      setQuery("");
      setSearchOpen(false);
      void locateAt(point);
    },
    [locateAt]
  );

  const onMarkerDrag = useCallback(
    async (id: string, point: GeoPoint) => {
      const place = await reversePlace(point);
      const points = stateRef.current.points.map((p) =>
        p.id === id ? { ...p, lat: point.lat, lon: point.lon, label: place.label } : p
      );
      commit({ points });
    },
    [commit, reversePlace]
  );

  const onViewportChange = useCallback((center: GeoPoint) => {
    viewportRef.current = center;
  }, []);

  const onResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = contentRef.current;
    if (!container) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      startY: event.clientY,
      startPct: mapPct,
      height: container.clientHeight,
    };
  };

  const onResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = resizeRef.current;
    if (!drag || !drag.height) return;
    const deltaPct = ((event.clientY - drag.startY) / drag.height) * 100;
    setMapPct(clampMapPct(drag.startPct + deltaPct));
  };

  const onResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const place = await reversePlace({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        persistLastKnown(place);
        applyLocation(place, { append: true });
      },
      () => undefined
    );
  };

  const selectResult = (place: GeoPlace) => {
    applyLocation(place);
    setQuery("");
    setSearchOpen(false);
  };

  const savedFor = (point: { lat: number; lon: number }) =>
    savedQuery.data?.find(
      (location) =>
        Math.abs(location.lat - point.lat) < 1e-6 && Math.abs(location.lon - point.lon) < 1e-6
    );

  const toggleSaved = (place: { label: string; lat: number; lon: number }) => {
    const existing = savedFor(place);
    if (existing) {
      removeSaved.mutate({ id: existing.id });
    } else {
      createSaved.mutate({ label: place.label, lat: place.lat, lon: place.lon });
    }
  };

  const startRename = (location: SavedLocation) => {
    setRenamingId(location.id);
    setRenameValue(location.label);
  };

  const submitRename = () => {
    if (!renamingId) return;
    const label = renameValue.trim();
    if (!label) return;
    renameSaved.mutate({ id: renamingId, label });
    setRenamingId(null);
    setRenameValue("");
  };

  useEffect(() => {
    if (!mounted || state.favourites.length === 0 || favouritesMigrationRef.current) return;
    favouritesMigrationRef.current = true;
    importFavourites.mutate({
      locations: state.favourites.map(({ label, lat, lon }) => ({ label, lat, lon })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, state.favourites]);

  useEffect(() => {
    if (!mounted || autoLocationRef.current || state.points.length > 0) return;
    if (userStateQuery.isLoading) return;

    autoLocationRef.current = true;
    const lastKnown = userStateQuery.data?.lastKnownLocation;
    const promptedAt = userStateQuery.data?.geolocationPromptedAt;
    const fallback = () => {
      if (lastKnown && stateRef.current.points.length === 0) {
        applyLocation(lastKnown, { append: true });
      }
    };

    void (async () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        fallback();
        return;
      }

      let permission: PermissionState | "unknown" = "unknown";
      try {
        permission = (await navigator.permissions.query({ name: "geolocation" })).state;
      } catch {
        /* permissions API unavailable */
      }

      if (permission === "denied") {
        fallback();
        return;
      }
      if (permission !== "granted" && (promptedAt || geolocationPromptStarted)) {
        fallback();
        return;
      }
      if (permission !== "granted") {
        geolocationPromptStarted = true;
        updateUserState.mutate({ geolocationPromptedAt: new Date().toISOString() });
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const place = await reversePlace({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          persistLastKnown(place);
          if (stateRef.current.points.length === 0) applyLocation(place, { append: true });
        },
        fallback,
        { timeout: 10000, maximumAge: 300_000 }
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, state.points.length, userStateQuery.isLoading, userStateQuery.data]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.points.findIndex((point) => point.id === active.id);
    const newIndex = state.points.findIndex((point) => point.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    commit({ points: arrayMove(state.points, oldIndex, newIndex) });
  };

  const optimize = async () => {
    if (state.points.length < 2) return;
    const [origin, ...stops] = state.points;
    const pinned = new Set(state.pinnedIds);
    setOptimizing(true);
    try {
      const result = await utils.map.optimize.fetch({
        mode: state.mode,
        origin: { lat: origin.lat, lon: origin.lon },
        stops: stops.map((stop) => ({ lat: stop.lat, lon: stop.lon })),
        pinnedIndices: stops.flatMap((stop, index) => (pinned.has(stop.id) ? [index] : [])),
      });
      const reordered = result.order
        .map((index) => stops[index])
        .filter((stop): stop is MapLocation => Boolean(stop));
      if (reordered.length === stops.length) commit({ points: [origin, ...reordered] });
    } finally {
      setOptimizing(false);
    }
  };

  const clearPoints = () => {
    setEditingId(null);
    setPickMode(false);
    commit({ points: [], pinnedIds: [] });
  };

  const togglePanel = () => {
    setPanelOpen((value) => {
      const next = !value;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`map-panel-${widgetId}`, next ? "1" : "0");
      }
      return next;
    });
  };

  const data = routeQuery.data;
  const transitItinerary = data && data.mode === "transit" ? data.itineraries[0] : undefined;

  const summary = (() => {
    if (!routeInput)
      return state.points.length === 0 ? "Add stops to plan a route" : "Add at least two stops";
    if (routeQuery.isLoading) return "Calculating…";
    if (routeQuery.isError) return "Route unavailable";
    if (!data) return null;
    if (data.mode === "transit") {
      return transitItinerary
        ? `${formatDuration(transitItinerary.durationSeconds)} · ${transitItinerary.legs.length} legs`
        : "No transit route";
    }
    return `${formatDistance(data.distanceMeters)} · ${formatDuration(data.durationSeconds)}`;
  })();

  const pinnedSet = useMemo(() => new Set(state.pinnedIds), [state.pinnedIds]);
  const pinnedMiddleCount = state.points
    .slice(1, -1)
    .filter((point) => pinnedSet.has(point.id)).length;
  const movableCount = Math.max(0, state.points.length - 2 - pinnedMiddleCount);
  const togglePin = (id: string) => {
    const next = new Set(pinnedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commit({ pinnedIds: [...next] });
  };
  const removePoint = (point: MapLocation) => {
    setEditingId((value) => (value === point.id ? null : value));
    commit({
      points: state.points.filter((item) => item.id !== point.id),
      pinnedIds: state.pinnedIds.filter((id) => id !== point.id),
    });
  };
  const cancelTarget = () => {
    setEditingId(null);
    setPickMode(false);
  };

  const renderEditor = (isExpanded: boolean) => (
    <>
      <div className="flex shrink-0 items-center gap-1 rounded-md bg-muted/60 p-0.5">
        {MODES.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => commit({ mode: value })}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded px-1 py-1 text-xs font-medium transition-colors",
              value === state.mode
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className={cn(isExpanded ? "inline" : "hidden sm:inline")}>{label}</span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          "relative flex min-h-0 flex-col",
          isExpanded ? "h-[55vh] shrink-0" : panelOpen ? "shrink-0" : "flex-1"
        )}
        style={!isExpanded && panelOpen ? { height: `${mapPct}%` } : undefined}
      >
        <MapCanvas
          markers={markers}
          segments={segments}
          onPick={onPick}
          onMarkerDrag={onMarkerDrag}
          onViewportChange={onViewportChange}
          pickActive={pickMode || editingId !== null}
          className="min-h-0 flex-1"
          mapKey={mapKey}
        />

        <div ref={searchRef} className="absolute inset-x-2 top-2 z-20">
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border bg-background/95 px-2 py-1 shadow-sm backdrop-blur",
              pickMode || editingId ? "border-ring" : "border-border"
            )}
          >
            <Crosshair className="h-3.5 w-3.5 shrink-0" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  if (searchOpen) {
                    setSearchOpen(false);
                  } else {
                    cancelTarget();
                    setQuery("");
                  }
                }
              }}
              placeholder={
                editingId
                  ? "Update location…"
                  : pickMode
                    ? "Click map or search…"
                    : "Search a place or address…"
              }
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              aria-label="Use my location"
              title="Use my location"
              onClick={useMyLocation}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <LocateFixed className="h-3.5 w-3.5" />
            </button>
            {query || pickMode || editingId ? (
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => {
                  cancelTarget();
                  setQuery("");
                  setSearchOpen(false);
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {searchOpen && search.data && search.data.length > 0 ? (
            <ul
              className={cn(
                "absolute left-0 top-full z-30 mt-1 max-h-56 w-full overflow-y-auto p-1",
                menuSurfaceClass
              )}
            >
              {search.data.map((place) => {
                const saved = Boolean(savedFor(place));
                return (
                  <li key={place.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => selectResult(place)}
                      className="min-w-0 flex-1 truncate rounded-sm px-2 py-1 text-left text-xs text-foreground/80 transition-colors hover:bg-accent"
                    >
                      {place.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSaved(place)}
                      aria-label={saved ? "Remove from saved locations" : "Save location"}
                      title={saved ? "Remove from saved locations" : "Save location"}
                      className="transition-colors hover:text-foreground"
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          saved ? "fill-current text-amber-400" : "text-muted-foreground"
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      {!isExpanded && panelOpen ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize map"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          className="group flex shrink-0 cursor-row-resize touch-none items-center justify-center py-0.5"
        >
          <span className="h-1 w-10 rounded-full bg-border transition-colors group-hover:bg-ring" />
        </div>
      ) : null}

      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground">{summary}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="xs"
            variant={pickMode ? "default" : "ghost"}
            onClick={() => {
              setEditingId(null);
              setPickMode((value) => !value);
            }}
            disabled={state.points.length >= MAX_POINTS && !pickMode}
            aria-label="Add stop"
            title="Add stop"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {state.mode !== "transit" && state.points.length > 2 ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={optimize}
              disabled={optimizing || movableCount < 2}
              aria-label="Optimize stop order"
              title={
                movableCount < 2
                  ? "Pin fewer stops to optimize"
                  : "Optimize unpinned stops between fixed endpoints"
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className={cn("ml-1", isExpanded ? "inline" : "hidden sm:inline")}>
                {optimizing ? "…" : "Optimize"}
              </span>
            </Button>
          ) : null}
          <Button
            size="xs"
            variant="ghost"
            onClick={clearPoints}
            disabled={state.points.length === 0}
            aria-label="Clear stops"
            title="Clear stops"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {isExpanded ? null : (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setExpanded(true)}
              aria-label="Expand map"
              title="Expand map"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className={cn("flex min-h-0 flex-col gap-2", panelOpen ? "flex-1" : "shrink-0")}>
        <button
          type="button"
          onClick={togglePanel}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {panelOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
          Stops ({state.points.length})
        </button>

        {panelOpen ? (
          <div
            className={cn(
              "min-h-0 flex-col gap-2 overflow-y-auto pr-1",
              isExpanded ? "flex max-h-[40vh]" : "flex flex-1"
            )}
          >
            {state.points.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Search, add a stop, or use your location.
              </p>
            ) : mounted ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={state.points.map((point) => point.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-1">
                    {state.points.map((point, index) => (
                      <SortablePoint
                        key={point.id}
                        point={point}
                        index={index}
                        isDestination={index === state.points.length - 1}
                        editing={editingId === point.id}
                        pinned={pinnedSet.has(point.id)}
                        canPin={index > 0 && index < state.points.length - 1}
                        saved={Boolean(savedFor(point))}
                        onEdit={() => {
                          setPickMode(false);
                          setEditingId((value) => (value === point.id ? null : point.id));
                        }}
                        onRemove={() => removePoint(point)}
                        onTogglePin={() => togglePin(point.id)}
                        onToggleSaved={() => toggleSaved(point)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : (
              <ul className="flex flex-col gap-1">
                {state.points.map((point, index) => (
                  <SortablePoint
                    key={point.id}
                    point={point}
                    index={index}
                    isDestination={index === state.points.length - 1}
                    editing={editingId === point.id}
                    pinned={pinnedSet.has(point.id)}
                    canPin={index > 0 && index < state.points.length - 1}
                    saved={Boolean(savedFor(point))}
                    onEdit={() => {
                      setPickMode(false);
                      setEditingId((value) => (value === point.id ? null : point.id));
                    }}
                    onRemove={() => removePoint(point)}
                    onTogglePin={() => togglePin(point.id)}
                    onToggleSaved={() => toggleSaved(point)}
                  />
                ))}
              </ul>
            )}

            {savedQuery.data && savedQuery.data.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Saved locations
                </span>
                <div className="flex flex-wrap gap-1">
                  {savedQuery.data.map((location) =>
                    renamingId === location.id ? (
                      <form
                        key={location.id}
                        onSubmit={(event) => {
                          event.preventDefault();
                          submitRename();
                        }}
                        className="flex items-center gap-1 rounded-full border border-ring bg-background px-2 py-0.5"
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          className="w-28 bg-transparent text-[11px] text-foreground outline-none"
                        />
                        <button
                          type="submit"
                          aria-label="Save name"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel rename"
                          onClick={() => setRenamingId(null)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    ) : (
                      <div
                        key={location.id}
                        className="flex max-w-full items-center rounded-full border border-border bg-muted/40 text-[11px] text-muted-foreground"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            applyLocation(
                              {
                                id: location.id,
                                label: location.label,
                                lat: location.lat,
                                lon: location.lon,
                                kind: null,
                              },
                              { append: true }
                            )
                          }
                          className="min-w-0 truncate py-0.5 pl-2 pr-1 transition-colors hover:text-foreground"
                        >
                          <Star className="mr-1 inline h-3 w-3 fill-current text-amber-400" />
                          {location.label}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Saved location options"
                              className="py-0.5 pl-1 pr-2 transition-colors hover:text-foreground"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => startRename(location)}>
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => removeSaved.mutate({ id: location.id })}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : null}

            {transitItinerary ? (
              <ul className="flex flex-col gap-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
                {transitItinerary.legs.map((leg, index) => (
                  <li key={index} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: transitColor(leg.mode) }}
                    />
                    <span className="w-14 shrink-0 uppercase">{leg.mode}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {leg.routeName ? `${leg.routeName}: ` : ""}
                      {leg.fromName} → {leg.toName}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div className={cn(className, "flex h-full flex-col gap-2 text-sm")}>
      <div ref={contentRef} className="flex min-h-0 flex-1 flex-col gap-2">
        {renderEditor(false)}
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Map
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">{renderEditor(true)}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapWidget;

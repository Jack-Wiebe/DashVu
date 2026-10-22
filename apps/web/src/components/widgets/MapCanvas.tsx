"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { GeoPoint } from "@dashvu/core";

import { cn } from "@/lib/utils";

const DEFAULT_CENTER: [number, number] = [51.5074, -0.1278];

export interface MapMarker extends GeoPoint {
  id: string;
  role: "origin" | "stop";
  index?: number;
}

export interface MapSegment {
  id: string;
  points: GeoPoint[];
  color: string;
  dashed?: boolean;
}

function badgeIcon(text: string, background: string): L.DivIcon {
  const html = `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${background};color:#fff;font-size:11px;font-weight:600;line-height:1;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.45)">${text}</div>`;
  return L.divIcon({ html, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
}

interface MapCanvasProps {
  markers: MapMarker[];
  segments: MapSegment[];
  onPick?: (point: GeoPoint) => void;
  onMarkerDrag?: (id: string, point: GeoPoint) => void;
  onViewportChange?: (center: GeoPoint) => void;
  pickActive?: boolean;
  className?: string;
  mapKey?: string;
}

const MapCanvas = ({
  markers,
  segments,
  onPick,
  onMarkerDrag,
  onViewportChange,
  pickActive,
  className,
  mapKey,
}: MapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(markers);
  const onMarkerDragRef = useRef(onMarkerDrag);
  const onPickRef = useRef(onPick);
  const onViewportChangeRef = useRef(onViewportChange);
  const [ready, setReady] = useState(false);

  markersRef.current = markers;
  onMarkerDragRef.current = onMarkerDrag;
  onPickRef.current = onPick;
  onViewportChangeRef.current = onViewportChange;

  const focus = markers[0] ?? null;
  const points = useMemo(() => markers.map(({ lat, lon }) => ({ lat, lon })), [markers]);
  const signature = useMemo(
    () =>
      markers
        .map((m) => `${m.id}:${m.role}:${m.index ?? 0}:${m.lat.toFixed(5)},${m.lon.toFixed(5)}`)
        .join("|"),
    [markers]
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setReady(false);
    const anyContainer = container as any;
    if (anyContainer._leaflet_id) {
      try {
        delete anyContainer._leaflet_id;
      } catch {}
    }

    const map = L.map(container, {
      center: focus ? [focus.lat, focus.lon] : DEFAULT_CENTER,
      zoom: focus ? 12 : 4,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    polylineLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      onPickRef.current?.({ lat: e.latlng.lat, lon: e.latlng.lng });
    });
    map.on("moveend", () => {
      const c = map.getCenter();
      onViewportChangeRef.current?.({ lat: c.lat, lon: c.lng });
    });

    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();
    map.on("focus", enable);
    map.on("blur", disable);
    container.addEventListener("mouseleave", disable);

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);

    mapRef.current = map;
    setReady(true);

    return () => {
      container.removeEventListener("mouseleave", disable);
      try {
        ro.disconnect();
      } catch {}
      try {
        map.off();
      } catch {}
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
      markerLayerRef.current = null;
      polylineLayerRef.current = null;
      if ((container as any)._leaflet_id) {
        try {
          delete (container as any)._leaflet_id;
        } catch {}
      }
    };
  }, [mapKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], Math.max(map.getZoom(), 12), { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }, [signature, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer || !ready) return;

    markerLayer.clearLayers();
    for (const marker of markersRef.current) {
      const icon =
        marker.role === "origin"
          ? badgeIcon("S", "#22c55e")
          : badgeIcon(String(marker.index ?? "•"), "#3b82f6");
      const m = L.marker([marker.lat, marker.lon], {
        icon,
        draggable: Boolean(onMarkerDragRef.current),
      });
      if (onMarkerDragRef.current) {
        m.on("dragend", (e) => {
          const latlng = (e.target as L.Marker).getLatLng();
          onMarkerDragRef.current?.(marker.id, { lat: latlng.lat, lon: latlng.lng });
        });
      }
      markerLayer.addLayer(m);
    }
  }, [markers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const polylineLayer = polylineLayerRef.current;
    if (!map || !polylineLayer || !ready) return;

    polylineLayer.clearLayers();
    for (const segment of segments) {
      if (segment.points.length > 1) {
        const latlngs = segment.points.map((p) => [p.lat, p.lon] as [number, number]);
        const pl = L.polyline(latlngs, {
          color: segment.color,
          weight: 4,
          opacity: 0.85,
          dashArray: segment.dashed ? "6 6" : undefined,
        });
        polylineLayer.addLayer(pl);
      }
    }
  }, [segments, ready]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate min-h-0 h-full w-full overflow-hidden rounded-md border border-border",
        pickActive && "cursor-crosshair",
        className
      )}
    >
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Loading map…
        </div>
      )}
      <span className="pointer-events-none absolute bottom-0 right-0 z-[500] rounded-tl bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        © OpenStreetMap
      </span>
    </div>
  );
};

export default MapCanvas;

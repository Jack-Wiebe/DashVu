"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { GeoPoint } from "@dashvu/core";

import { cn } from "@/lib/utils";

const DEFAULT_CENTER: [number, number] = [51.5074, -0.1278];

export interface MapMarker extends GeoPoint {
  id: string;
  role: "origin" | "stop";
  /** 1-based index shown on stop markers. */
  index?: number;
}

export interface MapSegment {
  id: string;
  points: GeoPoint[];
  color: string;
  dashed?: boolean;
}

function markerSignature(markers: MapMarker[]): string {
  return markers
    .map(
      (marker) =>
        `${marker.id}:${marker.role}:${marker.index ?? 0}:${marker.lat.toFixed(5)},${marker.lon.toFixed(5)}`
    )
    .join("|");
}

function badgeIcon(text: string, background: string): L.DivIcon {
  const html = `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${background};color:#fff;font-size:11px;font-weight:600;line-height:1;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.45)">${text}</div>`;
  return L.divIcon({ html, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
}

interface ControllerProps {
  points: GeoPoint[];
  signature: string;
  onPick?: (point: GeoPoint) => void;
  onViewportChange?: (center: GeoPoint) => void;
}

function Controller({ points, signature, onPick, onViewportChange }: ControllerProps) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    const id = setTimeout(() => map.invalidateSize(), 0);
    return () => {
      clearTimeout(id);
      observer.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], Math.max(map.getZoom(), 12), { animate: false });
      return;
    }
    const bounds = L.latLngBounds(
      points.map((point) => [point.lat, point.lon] as [number, number])
    );
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature]);

  useEffect(() => {
    const container = map.getContainer();
    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();
    map.on("focus", enable);
    map.on("blur", disable);
    map.on("click", enable);
    container.addEventListener("mouseleave", disable);
    return () => {
      map.off("focus", enable);
      map.off("blur", disable);
      map.off("click", enable);
      container.removeEventListener("mouseleave", disable);
    };
  }, [map]);

  useMapEvents({
    click: (event) => onPick?.({ lat: event.latlng.lat, lon: event.latlng.lng }),
    moveend: () => {
      const center = map.getCenter();
      onViewportChange?.({ lat: center.lat, lon: center.lng });
    },
  });

  return null;
}

interface MapCanvasProps {
  markers: MapMarker[];
  segments: MapSegment[];
  onPick?: (point: GeoPoint) => void;
  onMarkerDrag?: (id: string, point: GeoPoint) => void;
  onViewportChange?: (center: GeoPoint) => void;
  pickActive?: boolean;
  className?: string;
}

const MapCanvas = ({
  markers,
  segments,
  onPick,
  onMarkerDrag,
  onViewportChange,
  pickActive,
  className,
}: MapCanvasProps) => {
  const focus = markers[0] ?? null;
  const points = useMemo(() => markers.map(({ lat, lon }) => ({ lat, lon })), [markers]);
  const signature = useMemo(() => markerSignature(markers), [markers]);

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const marker of markers) {
      map.set(
        marker.id,
        marker.role === "origin"
          ? badgeIcon("S", "#22c55e")
          : badgeIcon(String(marker.index ?? "•"), "#3b82f6")
      );
    }
    return map;
  }, [markers]);

  return (
    <div
      className={cn(
        "relative isolate min-h-0 overflow-hidden rounded-md border border-border",
        pickActive && "cursor-crosshair",
        className
      )}
    >
      <MapContainer
        center={focus ? [focus.lat, focus.lon] : DEFAULT_CENTER}
        zoom={focus ? 12 : 4}
        scrollWheelZoom={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />

        {segments.map((segment) =>
          segment.points.length > 1 ? (
            <Polyline
              key={segment.id}
              positions={segment.points.map((point) => [point.lat, point.lon] as [number, number])}
              pathOptions={{
                color: segment.color,
                weight: 4,
                opacity: 0.85,
                dashArray: segment.dashed ? "6 6" : undefined,
              }}
            />
          ) : null
        )}

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lon]}
            icon={icons.get(marker.id)}
            draggable={Boolean(onMarkerDrag)}
            eventHandlers={{
              dragend: (event) => {
                const latlng = event.target.getLatLng();
                onMarkerDrag?.(marker.id, { lat: latlng.lat, lon: latlng.lng });
              },
            }}
          />
        ))}

        <Controller
          points={points}
          signature={signature}
          onPick={onPick}
          onViewportChange={onViewportChange}
        />
      </MapContainer>

      <span className="pointer-events-none absolute bottom-0 right-0 z-[500] rounded-tl bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        © OpenStreetMap
      </span>
    </div>
  );
};

export default MapCanvas;

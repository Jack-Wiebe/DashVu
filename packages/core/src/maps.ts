/**
 * Shared "Map" (route planner) types and pure helpers used by the API
 * connectors, routers, and the web widget. No runtime dependencies so it can
 * live in `@dashvu/core`.
 */

export type TravelMode = "driving" | "cycling" | "walking" | "transit";

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface GeoPlace extends GeoPoint {
  id: string;
  label: string;
  /** Optional source/feature type, e.g. `house`, `city`, `bus_stop`. */
  kind?: string | null;
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
  geometry?: GeoPoint[];
}

export interface RouteResult {
  mode: TravelMode;
  distanceMeters: number;
  durationSeconds: number;
  geometry: GeoPoint[];
  legs: RouteLeg[];
  /** Visiting order (indices into the requested points), for `optimize`. */
  order?: number[];
}

export interface TransitLeg extends RouteLeg {
  mode: string;
  routeName: string | null;
  fromName: string;
  toName: string;
  fromPoint?: GeoPoint;
  toPoint?: GeoPoint;
  startTime: string | null;
  endTime: string | null;
}

export interface TransitItinerary {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  legs: TransitLeg[];
}

/** Normalized request shared by every routing engine (OSRM, Valhalla, ...). */
export interface RoutingRequest {
  action: "route" | "optimize";
  mode: TravelMode;
  /** Origin first, then the stops in order. */
  points: GeoPoint[];
}

const EARTH_RADIUS_M = 6_371_008.8;

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Decode an encoded polyline (Google algorithm). `precision` is the number of
 * decimal places encoded: 5 for OSM/Google, 6 for Valhalla, 7 for MOTIS.
 */
export function decodePolyline(encoded: string, precision = 5): GeoPoint[] {
  const factor = 10 ** precision;
  const coordinates: GeoPoint[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({ lat: lat / factor, lon: lon / factor });
  }

  return coordinates;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (totalMinutes > 0) return `${totalMinutes} min`;
  return "<1 min";
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
  return `${Math.round(meters)} m`;
}

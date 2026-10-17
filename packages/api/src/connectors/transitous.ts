import "server-only";
import {
  decodePolyline,
  type Connector,
  type ConnectorDefinition,
  type GeoPoint,
  type RatePolicy,
  type TransitItinerary,
  type TransitLeg,
} from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const BASE_URL = "https://api.transitous.org/api/v1/plan";
const CACHE_TTL_MS = 60 * 1000;

const policy: RatePolicy = { points: 20, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "transitous",
  authKind: "keyless",
  capabilities: ["transit"],
  cacheTtlMs: CACHE_TTL_MS,
  ratePolicy: policy,
};

export interface TransitousRequest {
  from: GeoPoint;
  to: GeoPoint;
  /** ISO date-time; defaults to now. */
  time?: string;
  numItineraries?: number;
}

interface MotisLeg {
  mode: string;
  from?: { name?: string; lat?: number; lon?: number };
  to?: { name?: string; lat?: number; lon?: number };
  startTime?: string;
  endTime?: string;
  duration?: number;
  distance?: number;
  routeShortName?: string;
  routeLongName?: string;
  legGeometry?: { points: string; precision?: number };
}

interface MotisItinerary {
  startTime: string;
  endTime: string;
  duration?: number;
  legs: MotisLeg[];
}

interface MotisResponse {
  itineraries?: MotisItinerary[];
}

function secondsBetween(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const diff = (Date.parse(end) - Date.parse(start)) / 1000;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function readPoint(endpoint?: { lat?: number; lon?: number }): GeoPoint | undefined {
  if (typeof endpoint?.lat !== "number" || typeof endpoint?.lon !== "number") return undefined;
  return { lat: endpoint.lat, lon: endpoint.lon };
}

function toLeg(leg: MotisLeg): TransitLeg {
  const fromPoint = readPoint(leg.from);
  const toPoint = readPoint(leg.to);
  const decoded = leg.legGeometry
    ? decodePolyline(leg.legGeometry.points, leg.legGeometry.precision ?? 7)
    : [];
  const geometry = decoded.length > 1 ? decoded : fromPoint && toPoint ? [fromPoint, toPoint] : [];

  return {
    mode: leg.mode,
    routeName: leg.routeShortName ?? leg.routeLongName ?? null,
    fromName: leg.from?.name ?? "",
    toName: leg.to?.name ?? "",
    fromPoint,
    toPoint,
    startTime: leg.startTime ?? null,
    endTime: leg.endTime ?? null,
    distanceMeters: leg.distance ?? 0,
    durationSeconds: leg.duration ?? secondsBetween(leg.startTime, leg.endTime),
    geometry,
  };
}

export const transitousConnector: Connector<TransitousRequest, TransitItinerary[]> = {
  definition,
  async invoke(_userId, { from, to, time, numItineraries = 3 }) {
    rateLimit(policy, "transitous");

    const key = `transitous:${from.lat.toFixed(5)},${from.lon.toFixed(5)}->${to.lat.toFixed(5)},${to.lon.toFixed(5)}:${time ?? "now"}`;

    return fetchCached(key, definition.cacheTtlMs, async () => {
      const url = new URL(BASE_URL);
      url.searchParams.set("fromPlace", `${from.lat},${from.lon}`);
      url.searchParams.set("toPlace", `${to.lat},${to.lon}`);
      url.searchParams.set("numItineraries", String(numItineraries));
      if (time) url.searchParams.set("time", time);

      const response = await fetchWithRetry(url, {
        retries: 1,
        timeoutMs: 12000,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Transitous request failed (${response.status})`);

      const data = (await response.json()) as MotisResponse;

      return (data.itineraries ?? []).map((itinerary) => ({
        startTime: itinerary.startTime,
        endTime: itinerary.endTime,
        durationSeconds:
          itinerary.duration ?? secondsBetween(itinerary.startTime, itinerary.endTime),
        legs: itinerary.legs.map(toLeg),
      }));
    });
  },
};

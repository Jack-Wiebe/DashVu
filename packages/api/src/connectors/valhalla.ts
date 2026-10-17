import "server-only";
import {
  decodePolyline,
  type Connector,
  type ConnectorDefinition,
  type GeoPoint,
  type RatePolicy,
  type RouteLeg,
  type RouteResult,
  type RoutingRequest,
} from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const BASE_URL = "https://valhalla1.openstreetmap.de";
const CACHE_TTL_MS = 5 * 60 * 1000;

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "valhalla",
  authKind: "keyless",
  capabilities: ["route", "optimize"],
  cacheTtlMs: CACHE_TTL_MS,
  ratePolicy: policy,
};

const COSTING: Record<"driving" | "cycling" | "walking", string> = {
  driving: "auto",
  cycling: "bicycle",
  walking: "pedestrian",
};

interface ValhallaLeg {
  summary: { length: number; time: number };
  shape: string;
}

interface ValhallaTrip {
  summary: { length: number; time: number };
  legs: ValhallaLeg[];
  locations?: Array<{ original_index?: number }>;
}

interface ValhallaResponse {
  trip?: ValhallaTrip;
  error?: string;
}

export const valhallaConnector: Connector<RoutingRequest, RouteResult> = {
  definition,
  async invoke(_userId, { action, mode, points }) {
    if (mode === "transit") {
      throw new Error("Valhalla transit requires transit tiles");
    }
    if (points.length < 2) {
      throw new Error("At least two points are required");
    }

    rateLimit(policy, "valhalla");

    const costing = COSTING[mode];
    const body = JSON.stringify({
      locations: points.map((point) => ({ lat: point.lat, lon: point.lon })),
      costing,
    });
    const endpoint = action === "optimize" ? "optimized_route" : "route";
    const key = `valhalla:${mode}:${action}:${points.map((p) => `${p.lon},${p.lat}`).join(";")}`;

    return fetchCached(key, definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry(`${BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        retries: 1,
        timeoutMs: 12000,
      });
      if (!response.ok) throw new Error(`Valhalla request failed (${response.status})`);

      const data = (await response.json()) as ValhallaResponse;
      const trip = data.trip;
      if (!trip) throw new Error(data.error ?? "Valhalla returned no trip");

      const legs: RouteLeg[] = trip.legs.map((leg) => ({
        distanceMeters: leg.summary.length * 1000,
        durationSeconds: leg.summary.time,
        geometry: decodePolyline(leg.shape, 6),
      }));

      const geometry: GeoPoint[] = legs.flatMap((leg) => leg.geometry ?? []);

      const order =
        action === "optimize"
          ? (trip.locations ?? []).map((location, index) => location.original_index ?? index)
          : undefined;

      return {
        mode,
        distanceMeters: trip.summary.length * 1000,
        durationSeconds: trip.summary.time,
        geometry,
        legs,
        order,
      };
    });
  },
};

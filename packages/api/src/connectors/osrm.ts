import "server-only";
import type {
  Connector,
  ConnectorDefinition,
  GeoPoint,
  RatePolicy,
  RouteLeg,
  RouteResult,
  RoutingRequest,
} from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const BASE_URL = "https://routing.openstreetmap.de";
const CACHE_TTL_MS = 5 * 60 * 1000;

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "osrm",
  authKind: "keyless",
  capabilities: ["route", "optimize"],
  cacheTtlMs: CACHE_TTL_MS,
  ratePolicy: policy,
};

const PROFILES: Record<"driving" | "cycling" | "walking", { service: string; profile: string }> = {
  driving: { service: "routed-car", profile: "car" },
  cycling: { service: "routed-bike", profile: "bike" },
  walking: { service: "routed-foot", profile: "foot" },
};

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: { coordinates: Array<[number, number]> };
  legs?: Array<{ distance: number; duration: number }>;
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
  trips?: OsrmRoute[];
  waypoints?: Array<{ waypoint_index: number }>;
}

function toGeometry(coordinates: Array<[number, number]>): GeoPoint[] {
  return coordinates.map(([lon, lat]) => ({ lat, lon }));
}

const OSRM_OPTIONS = "overview=full&geometries=geojson&steps=false";

export const osrmConnector: Connector<RoutingRequest, RouteResult> = {
  definition,
  async invoke(_userId, { action, mode, points }) {
    if (mode === "transit") {
      throw new Error("OSRM does not support transit routing");
    }
    if (points.length < 2) {
      throw new Error("At least two points are required");
    }

    rateLimit(policy, "osrm");

    const { service, profile } = PROFILES[mode];
    const coordinates = points.map((point) => `${point.lon},${point.lat}`).join(";");
    const query =
      action === "optimize"
        ? `roundtrip=false&source=first&destination=any&${OSRM_OPTIONS}`
        : OSRM_OPTIONS;
    const url = `${BASE_URL}/${service}/${action === "optimize" ? "trip" : "route"}/v1/${profile}/${coordinates}?${query}`;

    return fetchCached(`osrm:${mode}:${action}:${coordinates}`, definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry(url, { retries: 1, timeoutMs: 10000 });
      if (!response.ok) throw new Error(`OSRM request failed (${response.status})`);

      const data = (await response.json()) as OsrmResponse;
      const route = (data.trips ?? data.routes ?? [])[0];
      if (data.code !== "Ok" || !route) {
        throw new Error(data.message ?? `OSRM returned ${data.code}`);
      }

      const legs: RouteLeg[] = (route.legs ?? []).map((leg) => ({
        distanceMeters: leg.distance,
        durationSeconds: leg.duration,
      }));

      const order =
        action === "optimize"
          ? (data.waypoints ?? []).map((waypoint) => waypoint.waypoint_index)
          : undefined;

      return {
        mode,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        geometry: toGeometry(route.geometry.coordinates),
        legs,
        order,
      };
    });
  },
};

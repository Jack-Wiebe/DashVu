import "server-only";
import type { Connector, ConnectorDefinition, GeoPlace, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const BASE_URL = "https://photon.komoot.io";
const CACHE_TTL_MS = 5 * 60 * 1000;

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "photon",
  authKind: "keyless",
  capabilities: ["geocode", "reverseGeocode"],
  cacheTtlMs: CACHE_TTL_MS,
  ratePolicy: policy,
};

export type PhotonRequest =
  | { action: "search"; query: string; limit?: number; lat?: number; lon?: number }
  | { action: "reverse"; lat: number; lon: number };

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
    osm_value?: string;
  };
}

function labelFor(properties: PhotonFeature["properties"]): string {
  const parts: string[] = [];
  if (properties.name) parts.push(properties.name);
  if (properties.housenumber && properties.street) {
    parts.push(`${properties.housenumber} ${properties.street}`);
  } else if (properties.street && properties.street !== properties.name) {
    parts.push(properties.street);
  }
  const locality = properties.city ?? properties.state;
  if (locality && !parts.includes(locality)) parts.push(locality);
  if (properties.country) parts.push(properties.country);
  return parts.join(", ") || properties.name || "Unknown place";
}

function toPlace(feature: PhotonFeature, index: number): GeoPlace {
  const [lon, lat] = feature.geometry.coordinates;
  const properties = feature.properties;
  const id =
    properties.osm_type && properties.osm_id
      ? `${properties.osm_type}/${properties.osm_id}`
      : `${lat.toFixed(5)},${lon.toFixed(5)}#${index}`;

  return {
    id,
    label: labelFor(properties),
    lat,
    lon,
    kind: properties.type ?? properties.osm_value ?? null,
  };
}

export const photonConnector: Connector<PhotonRequest, GeoPlace[]> = {
  definition,
  async invoke(_userId, request) {
    rateLimit(policy, "photon");

    if (request.action === "reverse") {
      const key = `photon:reverse:${request.lat.toFixed(5)},${request.lon.toFixed(5)}`;
      return fetchCached(key, definition.cacheTtlMs, async () => {
        const url = new URL(`${BASE_URL}/reverse`);
        url.searchParams.set("lat", String(request.lat));
        url.searchParams.set("lon", String(request.lon));
        url.searchParams.set("limit", "1");

        const response = await fetchWithRetry(url, { timeoutMs: 8000 });
        if (!response.ok) throw new Error(`Photon reverse failed (${response.status})`);

        const data = (await response.json()) as { features?: PhotonFeature[] };
        return (data.features ?? []).map(toPlace);
      });
    }

    const limit = request.limit ?? 6;
    const query = request.query.trim();
    const biasKey =
      typeof request.lat === "number" && typeof request.lon === "number"
        ? `${request.lat.toFixed(2)},${request.lon.toFixed(2)}`
        : "none";
    const key = `photon:search:${limit}:${biasKey}:${query.toLowerCase()}`;

    return fetchCached(key, definition.cacheTtlMs, async () => {
      const url = new URL(`${BASE_URL}/api/`);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("lang", "en");
      if (typeof request.lat === "number" && typeof request.lon === "number") {
        url.searchParams.set("lat", String(request.lat));
        url.searchParams.set("lon", String(request.lon));
      }

      const response = await fetchWithRetry(url, { timeoutMs: 8000 });
      if (!response.ok) throw new Error(`Photon search failed (${response.status})`);

      const data = (await response.json()) as { features?: PhotonFeature[] };
      return (data.features ?? []).map(toPlace);
    });
  },
};

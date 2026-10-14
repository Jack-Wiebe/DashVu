import "server-only";
import type { Connector, ConnectorDefinition, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

export interface GeocodeRequest {
  query: string;
}

export interface GeocodeResult {
  id: number;
  name: string;
  country: string | null;
  admin1: string | null;
  latitude: number;
  longitude: number;
}

const policy: RatePolicy = { points: 60, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "openMeteoGeocoding",
  authKind: "keyless",
  capabilities: ["geocode"],
  cacheTtlMs: 24 * 60 * 60 * 1000,
  ratePolicy: policy,
};

export const openMeteoGeocodingConnector: Connector<GeocodeRequest, GeocodeResult[]> = {
  definition,
  async invoke(_userId, { query }) {
    rateLimit(policy, "openMeteoGeocoding");

    const normalized = query.trim().toLowerCase();

    return fetchCached(`openMeteoGeocoding:${normalized}`, definition.cacheTtlMs, async () => {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", query.trim());
      url.searchParams.set("count", "8");
      url.searchParams.set("language", "en");
      url.searchParams.set("format", "json");

      const response = await fetchWithRetry(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo geocoding failed (${response.status})`);
      }

      const data = (await response.json()) as {
        results?: Array<{
          id: number;
          name: string;
          country?: string;
          admin1?: string;
          latitude: number;
          longitude: number;
        }>;
      };

      return (data.results ?? []).map((result) => ({
        id: result.id,
        name: result.name,
        country: result.country ?? null,
        admin1: result.admin1 ?? null,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
    });
  },
};

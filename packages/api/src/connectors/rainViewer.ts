import "server-only";
import type { Connector, ConnectorDefinition } from "@dashvu/core";

import { fetchCached } from "../cache";
import { rateLimit } from "../ratelimit";

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RainViewerResponse {
  host: string;
  frames: RadarFrame[];
  updatedAt: number;
}

const definition: ConnectorDefinition = {
  id: "rainViewer",
  authKind: "keyless",
  capabilities: ["radar"],
  cacheTtlMs: 3 * 60 * 1000,
  ratePolicy: { points: 60, windowMs: 60 * 1000, scope: "provider" },
};

interface RainViewerPayload {
  host?: string;
  generated?: number;
  radar?: {
    past?: RadarFrame[];
    nowcast?: RadarFrame[];
  };
}

export const rainViewerConnector: Connector<void, RainViewerResponse> = {
  definition,
  async invoke() {
    rateLimit(definition.ratePolicy, "rainViewer");

    return fetchCached("rainViewer:meta", definition.cacheTtlMs, async () => {
      const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      if (!response.ok) {
        throw new Error(`RainViewer request failed (${response.status})`);
      }

      const data = (await response.json()) as RainViewerPayload;
      if (!data.host) {
        throw new Error("RainViewer response is missing a tile host.");
      }

      return {
        host: data.host,
        frames: [...(data.radar?.past ?? []), ...(data.radar?.nowcast ?? [])],
        updatedAt: data.generated ? data.generated * 1000 : Date.now(),
      };
    });
  },
};

import "server-only";
import type { Connector, ConnectorDefinition, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

export interface JokeItem {
  text: string;
  source: string;
  url: string;
}

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "icanhazdadjoke",
  authKind: "keyless",
  capabilities: ["joke"],
  cacheTtlMs: 5 * 60 * 1000,
  ratePolicy: policy,
};

export const icanhazdadjokeConnector: Connector<void, JokeItem> = {
  definition,
  async invoke() {
    rateLimit(policy, "icanhazdadjoke");

    return fetchCached("icanhazdadjoke:random", definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry("https://icanhazdadjoke.com/", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`icanhazdadjoke request failed (${response.status})`);
      }

      const data = (await response.json()) as { joke?: string };
      if (!data.joke) {
        throw new Error("icanhazdadjoke response is missing a joke.");
      }

      return { text: data.joke, source: "icanhazdadjoke", url: "https://icanhazdadjoke.com/" };
    });
  },
};

import "server-only";
import type { Connector, ConnectorDefinition, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

export interface FactItem {
  text: string;
  source: string;
  url: string;
}

const policy: RatePolicy = { points: 60, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "uselessFacts",
  authKind: "keyless",
  capabilities: ["funFact"],
  cacheTtlMs: 5 * 60 * 1000,
  ratePolicy: policy,
};

export const uselessFactsConnector: Connector<void, FactItem> = {
  definition,
  async invoke() {
    rateLimit(policy, "uselessFacts");

    return fetchCached("uselessFacts:random", definition.cacheTtlMs, async () => {
      const url = new URL("https://uselessfacts.jsph.pl/api/v2/facts/random");
      url.searchParams.set("language", "en");

      const response = await fetchWithRetry(url);
      if (!response.ok) {
        throw new Error(`uselessFacts request failed (${response.status})`);
      }

      const data = (await response.json()) as { text?: string };
      if (!data.text) {
        throw new Error("uselessFacts response is missing a fact.");
      }

      return { text: data.text, source: "uselessfacts", url: "https://uselessfacts.jsph.pl/" };
    });
  },
};

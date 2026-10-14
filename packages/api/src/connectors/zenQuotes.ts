import "server-only";
import type { Connector, ConnectorDefinition, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

export interface QuoteItem {
  text: string;
  author: string | null;
  source: string;
  url: string;
}

const policy: RatePolicy = { points: 5, windowMs: 30 * 1000 };

const definition: ConnectorDefinition = {
  id: "zenQuotes",
  authKind: "keyless",
  capabilities: ["quoteOfTheDay"],
  cacheTtlMs: 12 * 60 * 60 * 1000,
  ratePolicy: policy,
};

interface ZenQuotesPayload {
  q?: string;
  a?: string;
}

export const zenQuotesConnector: Connector<void, QuoteItem> = {
  definition,
  async invoke() {
    rateLimit(policy, "zenQuotes");

    return fetchCached("zenQuotes:today", definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry("https://zenquotes.io/api/today");
      if (!response.ok) {
        throw new Error(`ZenQuotes request failed (${response.status})`);
      }

      const [first] = (await response.json()) as ZenQuotesPayload[];
      if (!first?.q) {
        throw new Error("ZenQuotes response is missing a quote.");
      }

      return {
        text: first.q,
        author: first.a ?? null,
        source: "ZenQuotes",
        url: "https://zenquotes.io/",
      };
    });
  },
};

import "server-only";
import type { Connector, ConnectorDefinition, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

export interface OnThisDayItem {
  text: string;
  year: number | null;
  imageUrl: string | null;
  source: string;
  url: string;
}

const policy: RatePolicy = { points: 60, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "wikimediaOnThisDay",
  authKind: "keyless",
  capabilities: ["onThisDay"],
  cacheTtlMs: 12 * 60 * 60 * 1000,
  ratePolicy: policy,
};

interface WikimediaEvent {
  text?: string;
  year?: number;
  pages?: Array<{ thumbnail?: { source?: string } }>;
}

export const wikimediaOnThisDayConnector: Connector<void, OnThisDayItem> = {
  definition,
  async invoke() {
    rateLimit(policy, "wikimediaOnThisDay");

    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");

    return fetchCached(`wikimediaOnThisDay:${month}-${day}`, definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry(
        `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${month}/${day}`
      );
      if (!response.ok) {
        throw new Error(`Wikimedia onthisday request failed (${response.status})`);
      }

      const data = (await response.json()) as { selected?: WikimediaEvent[] };
      const events = (data.selected ?? []).filter((event) => event.text);
      if (events.length === 0) {
        throw new Error("Wikimedia onthisday response is empty.");
      }

      const event = events[Math.floor(Math.random() * events.length)];

      return {
        text: event.text!,
        year: event.year ?? null,
        imageUrl: event.pages?.[0]?.thumbnail?.source ?? null,
        source: "Wikipedia",
        url: `https://en.wikipedia.org/wiki/Wikipedia:On_this_day/${month}/${day}`,
      };
    });
  },
};

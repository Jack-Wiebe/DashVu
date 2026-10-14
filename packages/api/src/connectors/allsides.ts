import "server-only";
import type { Connector, ConnectorDefinition, NewsItem, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";
import { parseFeed, toIsoString } from "../rss";

export interface AllSidesRequest {
  limit: number;
}

const FEED_URL = "https://www.allsides.com/rss/news";

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "allsides",
  authKind: "keyless",
  capabilities: ["newsBriefing"],
  cacheTtlMs: 15 * 60 * 1000,
  ratePolicy: policy,
};

export const allsidesConnector: Connector<AllSidesRequest, NewsItem[]> = {
  definition,
  async invoke(_userId, { limit }) {
    rateLimit(policy, "allsides");

    return fetchCached("allsides:news", definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry(FEED_URL);
      if (!response.ok) {
        throw new Error(`AllSides feed request failed (${response.status})`);
      }

      const { items } = parseFeed(await response.text());

      return items.slice(0, limit).map((item) => ({
        id: item.guid ?? item.link,
        title: item.title,
        url: item.link,
        source: "AllSides",
        site: null,
        points: null,
        comments: null,
        publishedAt: toIsoString(item.pubDate),
      }));
    });
  },
};

import "server-only";
import type { Connector, ConnectorDefinition, NewsItem, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";
import { parseFeed, toIsoString } from "../rss";

export interface BbcNewsRequest {
  limit: number;
}

const FEED_URL = "https://feeds.bbci.co.uk/news/rss.xml";

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "bbcNews",
  authKind: "keyless",
  capabilities: ["newsBriefing"],
  cacheTtlMs: 10 * 60 * 1000,
  ratePolicy: policy,
};

export const bbcNewsConnector: Connector<BbcNewsRequest, NewsItem[]> = {
  definition,
  async invoke(_userId, { limit }) {
    rateLimit(policy, "bbcNews");

    return fetchCached("bbcNews:news", definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry(FEED_URL);
      if (!response.ok) {
        throw new Error(`BBC News feed request failed (${response.status})`);
      }

      const { items } = parseFeed(await response.text());

      return items.slice(0, limit).map((item) => ({
        id: item.guid ?? item.link,
        title: item.title,
        url: item.link,
        source: "BBC News",
        site: "BBC News",
        points: null,
        comments: null,
        publishedAt: toIsoString(item.pubDate),
      }));
    });
  },
};

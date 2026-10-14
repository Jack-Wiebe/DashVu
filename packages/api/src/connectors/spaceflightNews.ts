import "server-only";
import type { Connector, ConnectorDefinition, NewsItem, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

export interface SpaceflightNewsRequest {
  limit: number;
}

interface SpaceflightArticle {
  id?: number;
  title?: string;
  url?: string;
  news_site?: string;
  published_at?: string;
}

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "spaceflightNews",
  authKind: "keyless",
  capabilities: ["newsBriefing"],
  cacheTtlMs: 15 * 60 * 1000,
  ratePolicy: policy,
};

export const spaceflightNewsConnector: Connector<SpaceflightNewsRequest, NewsItem[]> = {
  definition,
  async invoke(_userId, { limit }) {
    rateLimit(policy, "spaceflightNews");

    return fetchCached(`spaceflightNews:${limit}`, definition.cacheTtlMs, async () => {
      const url = new URL("https://api.spaceflightnewsapi.net/v4/articles/");
      url.searchParams.set("limit", String(limit));

      const response = await fetchWithRetry(url);
      if (!response.ok) {
        throw new Error(`Spaceflight News request failed (${response.status})`);
      }

      const data = (await response.json()) as { results?: SpaceflightArticle[] };

      return (data.results ?? [])
        .filter((article) => Boolean(article.title && article.url))
        .map((article) => ({
          id: String(article.id ?? article.url),
          title: article.title ?? "",
          url: article.url ?? "",
          source: "Spaceflight News",
          site: article.news_site ?? null,
          points: null,
          comments: null,
          publishedAt: article.published_at ?? null,
        }));
    });
  },
};

import "server-only";
import type { Connector, ConnectorDefinition, NewsItem, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

export interface HackerNewsRequest {
  limit: number;
}

interface HackerNewsStory {
  id?: number;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  time?: number;
  dead?: boolean;
  deleted?: boolean;
}

const policy: RatePolicy = { points: 60, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "hackerNews",
  authKind: "keyless",
  capabilities: ["newsBriefing"],
  cacheTtlMs: 10 * 60 * 1000,
  ratePolicy: policy,
};

const TOP_STORIES_TTL = 10 * 60 * 1000;
const ITEM_TTL = 24 * 60 * 60 * 1000;
const MAX_STORIES = 30;

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export const hackerNewsConnector: Connector<HackerNewsRequest, NewsItem[]> = {
  definition,
  async invoke(_userId, { limit }) {
    rateLimit(policy, "hackerNews");

    const ids = await fetchCached<number[]>("hackerNews:topstories", TOP_STORIES_TTL, async () => {
      const response = await fetchWithRetry(
        "https://hacker-news.firebaseio.com/v0/topstories.json"
      );
      if (!response.ok) {
        throw new Error(`Hacker News topstories failed (${response.status})`);
      }

      const data = (await response.json()) as unknown;
      return Array.isArray(data) ? data.filter((id): id is number => typeof id === "number") : [];
    });

    const selected = ids.slice(0, Math.min(limit, MAX_STORIES));
    const settled = await Promise.allSettled(
      selected.map((id) =>
        fetchCached<HackerNewsStory | null>(`hackerNews:item:${id}`, ITEM_TTL, async () => {
          const response = await fetchWithRetry(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`
          );
          if (!response.ok) {
            throw new Error(`Hacker News item ${id} failed (${response.status})`);
          }
          return (await response.json()) as HackerNewsStory | null;
        })
      )
    );

    return settled
      .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
      .filter((story) => Boolean(story.title && !story.deleted && !story.dead))
      .map((story) => {
        const url = story.url ?? `https://news.ycombinator.com/item?id=${story.id}`;

        return {
          id: String(story.id ?? url),
          title: story.title ?? "",
          url,
          source: "Hacker News",
          site: story.url ? hostOf(story.url) : "news.ycombinator.com",
          points: story.score ?? null,
          comments: story.descendants ?? null,
          publishedAt: story.time ? new Date(story.time * 1000).toISOString() : null,
        };
      });
  },
};

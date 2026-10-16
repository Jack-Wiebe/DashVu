import "server-only";
import type {
  Connector,
  ConnectorDefinition,
  RatePolicy,
  RelatedRelation,
  RelatedWord,
} from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const BASE_URL = "https://api.datamuse.com/words";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const policy: RatePolicy = { points: 60, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "datamuse",
  authKind: "keyless",
  capabilities: ["thesaurus"],
  cacheTtlMs: CACHE_TTL_MS,
  ratePolicy: policy,
};

interface DatamuseResult {
  word?: string;
  score?: number;
}

const PARAM_BY_RELATION: Record<RelatedRelation, string> = {
  syn: "rel_syn",
  ant: "rel_ant",
  ml: "ml",
};

const LIMIT_BY_RELATION: Record<RelatedRelation, number> = {
  syn: 30,
  ant: 30,
  ml: 20,
};

export const datamuseConnector: Connector<
  { word: string; relation: RelatedRelation },
  RelatedWord[]
> = {
  definition,
  async invoke(_userId, { word, relation }) {
    rateLimit(policy, "datamuse");

    const normalized = word.trim().toLowerCase();
    const key = `datamuse:${relation}:${normalized}`;

    return fetchCached(key, definition.cacheTtlMs, async () => {
      const params = new URLSearchParams({
        [PARAM_BY_RELATION[relation]]: normalized,
        max: String(LIMIT_BY_RELATION[relation]),
      });

      const response = await fetchWithRetry(`${BASE_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Datamuse lookup failed (${response.status})`);
      }

      const body = (await response.json()) as DatamuseResult[];
      if (!Array.isArray(body)) return [];

      return body
        .filter((item): item is { word: string; score?: number } => typeof item.word === "string")
        .map((item) => ({
          word: item.word,
          score: typeof item.score === "number" ? item.score : null,
        }));
    });
  },
};

import "server-only";
import type { Connector, ConnectorDefinition, DictionaryEntry, RatePolicy } from "@dashvu/core";
import { stripHtml } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const BASE_URL = "https://en.wiktionary.org/api/rest_v1/page/definition";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MEANINGS = 6;
const MAX_DEFINITIONS = 8;

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "wiktionary",
  authKind: "keyless",
  capabilities: ["dictionary"],
  cacheTtlMs: CACHE_TTL_MS,
  ratePolicy: policy,
};

interface WiktionaryDefinition {
  definition?: string;
  parsedExamples?: Array<{ example?: string }>;
  examples?: string[];
}

interface WiktionaryMeaning {
  partOfSpeech?: string;
  definitions?: WiktionaryDefinition[];
}

interface WiktionaryResponse {
  en?: WiktionaryMeaning[];
}

function exampleFor(definition: WiktionaryDefinition): string | null {
  const parsed = definition.parsedExamples?.find((item) => item.example)?.example;
  const raw = parsed ?? definition.examples?.[0];
  if (!raw) return null;
  const cleaned = stripHtml(raw);
  return cleaned.length > 0 ? cleaned : null;
}

export const wiktionaryConnector: Connector<{ word: string }, DictionaryEntry | null> = {
  definition,
  async invoke(_userId, { word }) {
    rateLimit(policy, "wiktionary");

    const normalized = word.trim().toLowerCase();
    const key = `wiktionary:en:${normalized}`;

    return fetchCached(key, definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry(`${BASE_URL}/${encodeURIComponent(normalized)}`, {
        retries: 1,
        timeoutMs: 6000,
      });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Wiktionary lookup failed (${response.status})`);
      }

      const body = (await response.json()) as WiktionaryResponse;
      const meanings = (body.en ?? [])
        .filter((meaning) => meaning.partOfSpeech !== "Symbol")
        .map((meaning) => {
          const definitions = (meaning.definitions ?? [])
            .map((item) => ({
              definition: stripHtml(item.definition ?? ""),
              example: exampleFor(item),
              synonyms: [] as string[],
              antonyms: [] as string[],
            }))
            .filter((item) => item.definition.length > 0)
            .slice(0, MAX_DEFINITIONS);

          return {
            partOfSpeech: meaning.partOfSpeech?.trim() || "—",
            definitions,
          };
        })
        .filter((meaning) => meaning.definitions.length > 0)
        .slice(0, MAX_MEANINGS);

      if (meanings.length === 0) return null;

      return { word: normalized, phonetic: null, audio: null, meanings };
    });
  },
};

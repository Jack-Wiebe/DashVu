import "server-only";
import type { Connector, ConnectorDefinition, DictionaryEntry, RatePolicy } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "dictionaryApi",
  authKind: "keyless",
  capabilities: ["dictionary"],
  cacheTtlMs: CACHE_TTL_MS,
  ratePolicy: policy,
};

interface ApiDefinition {
  definition?: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface ApiMeaning {
  partOfSpeech?: string;
  definitions?: ApiDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface ApiPhonetic {
  text?: string;
  audio?: string;
}

interface ApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: ApiPhonetic[];
  meanings?: ApiMeaning[];
}

function uniqueStrings(...lists: Array<string[] | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      const value = raw.trim();
      const key = value.toLowerCase();
      if (!value || seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

function cleanText(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function normalize(body: ApiEntry[]): DictionaryEntry | null {
  const entry = body[0];
  if (!entry?.word) return null;

  const phonetics = entry.phonetics ?? [];
  const phonetic =
    cleanText(entry.phonetic) ?? cleanText(phonetics.find((item) => item.text)?.text);
  const audio = phonetics.find((item) => item.audio)?.audio ?? null;

  const meanings = (entry.meanings ?? [])
    .map((meaning) => {
      const definitions = (meaning.definitions ?? [])
        .map((item) => ({
          definition: cleanText(item.definition) ?? "",
          example: cleanText(item.example),
          synonyms: uniqueStrings(item.synonyms, meaning.synonyms),
          antonyms: uniqueStrings(item.antonyms, meaning.antonyms),
        }))
        .filter((item) => item.definition.length > 0);

      return {
        partOfSpeech: cleanText(meaning.partOfSpeech) ?? "—",
        definitions,
      };
    })
    .filter((meaning) => meaning.definitions.length > 0);

  if (meanings.length === 0) return null;

  return { word: entry.word, phonetic, audio, meanings };
}

export const dictionaryApiConnector: Connector<{ word: string }, DictionaryEntry | null> = {
  definition,
  async invoke(_userId, { word }) {
    rateLimit(policy, "dictionaryApi");

    const normalized = word.trim().toLowerCase();
    const key = `dictionaryApi:en:${normalized}`;

    return fetchCached(key, definition.cacheTtlMs, async () => {
      const response = await fetchWithRetry(`${BASE_URL}/${encodeURIComponent(normalized)}`, {
        retries: 0,
        timeoutMs: 4500,
      });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Dictionary lookup failed (${response.status})`);
      }

      const body = (await response.json()) as ApiEntry[];
      if (!Array.isArray(body)) return null;
      return normalize(body);
    });
  },
};

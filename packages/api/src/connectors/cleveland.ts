import "server-only";
import type { Artwork, Connector, ConnectorDefinition, RatePolicy } from "@dashvu/core";
import { dailyIndex, utcDateKey, utcDayNumber } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const SEARCH_URL = "https://openaccess-api.clevelandart.org/api/artworks/";
const FIELDS = "id,title,creation_date,creators,url,images";

const ART_QUERIES = [
  "impressionism",
  "landscape",
  "portrait",
  "still life",
  "japanese print",
  "sculpture",
  "seascape",
  "flowers",
  "cityscape",
  "modern art",
  "photography",
  "drawing",
];

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "cleveland",
  authKind: "keyless",
  capabilities: ["artOfTheDay"],
  cacheTtlMs: 24 * 60 * 60 * 1000,
  ratePolicy: policy,
};

interface ClevelandArtwork {
  id: number;
  title?: string;
  creation_date?: string;
  creators?: Array<{ description?: string }>;
  url?: string;
  images?: { web?: { url?: string } };
}

interface ClevelandSearchResponse {
  data?: ClevelandArtwork[];
}

function cleanText(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export const clevelandConnector: Connector<void, Artwork> = {
  definition,
  async invoke() {
    rateLimit(policy, "cleveland");

    const day = utcDayNumber();
    const query = ART_QUERIES[day % ART_QUERIES.length];

    return fetchCached(`cleveland:artOfTheDay:${utcDateKey()}`, definition.cacheTtlMs, async () => {
      const params = new URLSearchParams({
        q: query,
        has_image: "1",
        limit: "100",
        fields: FIELDS,
      });

      const response = await fetchWithRetry(`${SEARCH_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Cleveland Museum of Art search failed (${response.status})`);
      }

      const body = (await response.json()) as ClevelandSearchResponse;
      const candidates = (body.data ?? []).filter((item) => item.images?.web?.url);

      if (candidates.length === 0) {
        throw new Error("Cleveland Museum of Art returned no artworks with images.");
      }

      const item = candidates[dailyIndex(candidates.length)];

      return {
        id: String(item.id),
        title: cleanText(item.title) ?? "Untitled",
        artist: cleanText(item.creators?.[0]?.description),
        date: cleanText(item.creation_date),
        imageUrl: item.images?.web?.url ?? null,
        source: "Cleveland Museum of Art",
        url: item.url ?? `https://www.clevelandart.org/art/${item.id}`,
      };
    });
  },
};

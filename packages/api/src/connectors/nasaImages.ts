import "server-only";
import type { Connector, ConnectorDefinition, RatePolicy, SpaceImage } from "@dashvu/core";
import { dailyIndex, utcDateKey, utcDayNumber } from "@dashvu/core";

import { fetchCached } from "../cache";
import { fetchWithRetry } from "../http";
import { rateLimit } from "../ratelimit";

const SEARCH_URL = "https://images-api.nasa.gov/search";
const MAX_IMAGE_BYTES = 2_000_000;

const SPACE_QUERIES = [
  "nebula",
  "galaxy",
  "supernova remnant",
  "jupiter",
  "saturn",
  "mars surface",
  "earth from space",
  "apollo mission",
  "hubble telescope",
  "james webb space telescope",
  "aurora from space",
  "milky way",
];

const policy: RatePolicy = { points: 30, windowMs: 60 * 1000 };

const definition: ConnectorDefinition = {
  id: "nasaImages",
  authKind: "keyless",
  capabilities: ["spaceOfTheDay"],
  cacheTtlMs: 24 * 60 * 60 * 1000,
  ratePolicy: policy,
};

interface NasaLink {
  href?: string;
  render?: string;
  width?: number;
  size?: number;
}

interface NasaItem {
  data?: Array<{
    nasa_id?: string;
    title?: string;
    description?: string;
    date_created?: string;
    center?: string;
  }>;
  links?: NasaLink[];
}

interface NasaSearchResponse {
  collection?: { items?: NasaItem[] };
}

function derivativeRank(href: string): number {
  if (/~orig\./.test(href)) return 0;
  if (/~medium\./.test(href)) return 1;
  if (/~small\./.test(href)) return 2;
  if (/~thumb\./.test(href)) return 3;
  return 4;
}

function pickImage(links: NasaLink[] | undefined): string | null {
  const images = (links ?? []).filter(
    (link): link is NasaLink & { href: string } =>
      link.render === "image" && typeof link.href === "string"
  );
  if (images.length === 0) return null;

  const affordable = images.filter((link) => (link.size ?? 0) <= MAX_IMAGE_BYTES);
  const pool = affordable.length > 0 ? affordable : images;

  const best = pool.reduce((current, link) => {
    const rank = derivativeRank(link.href);
    const bestRank = derivativeRank(current.href);
    if (rank !== bestRank) return rank < bestRank ? link : current;
    return (link.size ?? 0) < (current.size ?? 0) ? link : current;
  });

  return best.href;
}

export const nasaImagesConnector: Connector<void, SpaceImage> = {
  definition,
  async invoke() {
    rateLimit(policy, "nasaImages");

    const day = utcDayNumber();
    const query = SPACE_QUERIES[day % SPACE_QUERIES.length];

    return fetchCached(
      `nasaImages:spaceOfTheDay:${utcDateKey()}`,
      definition.cacheTtlMs,
      async () => {
        const params = new URLSearchParams({
          q: query,
          media_type: "image",
          page_size: "20",
        });

        const response = await fetchWithRetry(`${SEARCH_URL}?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`NASA images search failed (${response.status})`);
        }

        const body = (await response.json()) as NasaSearchResponse;
        const candidates = (body.collection?.items ?? []).flatMap((item) => {
          const meta = item.data?.[0];
          const imageUrl = pickImage(item.links);
          if (!meta?.nasa_id || !meta.title || !imageUrl) return [];
          return [
            {
              id: meta.nasa_id,
              title: meta.title,
              description: meta.description?.trim() || null,
              imageUrl,
              credit: meta.center?.trim() || null,
              date: meta.date_created ?? null,
              source: "NASA",
              url: `https://images.nasa.gov/details-${meta.nasa_id}`,
            } satisfies SpaceImage,
          ];
        });

        if (candidates.length === 0) {
          throw new Error("NASA images returned no results.");
        }

        return candidates[dailyIndex(candidates.length)];
      }
    );
  },
};

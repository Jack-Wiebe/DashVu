import "server-only";
import { XMLParser } from "fast-xml-parser";

/**
 * Minimal RSS 2.0 parsing shared by the keyless news connectors. Only the
 * fields DashVu needs are extracted; anything else in the feed is ignored.
 */

export interface RssFeedItem {
  title: string;
  link: string;
  guid: string | null;
  pubDate: string | null;
}

export interface ParsedFeed {
  channelTitle: string | null;
  items: RssFeedItem[];
}

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  parseTagValue: false,
});

function asText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return asText((value as Record<string, unknown>)["#text"]);
  }
  return null;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseFeed(xml: string): ParsedFeed {
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { title?: unknown; item?: unknown } };
  };

  const channel = parsed.rss?.channel;
  const items = asArray(channel?.item as Record<string, unknown> | undefined)
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      const title = asText(item.title);
      const link = asText(item.link);

      return {
        title,
        link,
        guid: asText(item.guid),
        pubDate: asText(item.pubDate),
      };
    })
    .filter(
      (
        item
      ): item is { title: string; link: string; guid: string | null; pubDate: string | null } =>
        Boolean(item.title && item.link)
    );

  return { channelTitle: asText(channel?.title), items };
}

export function toIsoString(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

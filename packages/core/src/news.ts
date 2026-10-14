/**
 * Shared news types and pure helpers used by the API connectors and the web
 * widget. No runtime dependencies so it can live in `@dashvu/core`.
 */

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  /** Display label for the originating feed, e.g. "Hacker News". */
  source: string;
  /** Publisher/site for the individual story, when known. */
  site: string | null;
  points: number | null;
  comments: number | null;
  /** ISO-8601 timestamp, or null when the feed does not provide one. */
  publishedAt: string | null;
}

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const diffSeconds = Math.round((now - then) / 1000);
  const past = diffSeconds >= 0;
  const seconds = Math.abs(diffSeconds);
  const suffix = past ? "ago" : "from now";

  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ${suffix}`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ${suffix}`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ${suffix}`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ${suffix}`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ${suffix}`;

  return `${Math.round(days / 365)}y ${suffix}`;
}

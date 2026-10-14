/**
 * Shared "Discover" (art/space of the day) types and pure helpers used by the
 * API connectors and the web widget. No runtime dependencies so it can live in
 * `@dashvu/core`.
 */

export interface Artwork {
  id: string;
  title: string;
  artist: string | null;
  date: string | null;
  imageUrl: string | null;
  source: string;
  url: string;
}

export interface SpaceImage {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  credit: string | null;
  date: string | null;
  source: string;
  url: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function utcDayNumber(now: number = Date.now()): number {
  return Math.floor(now / MS_PER_DAY);
}

export function utcDateKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function dailyIndex(length: number, now: number = Date.now()): number {
  if (length <= 0) return 0;
  return ((utcDayNumber(now) % length) + length) % length;
}

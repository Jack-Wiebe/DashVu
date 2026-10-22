export interface WidgetSpan {
  width: number;
  height: number;
}

const TOKEN = /^([1-9][0-9]?)w([1-9][0-9]?)h$/;

const LEGACY_SIZES: Record<string, string> = {
  sm: "1w1h",
  md: "2w1h",
  wide: "2w1h",
  lrg: "2w2h",
  xl: "2w2h",
};

export function parseWidgetSize(size: string | null | undefined): WidgetSpan {
  const match = TOKEN.exec(size ?? "");
  if (!match) return { width: 1, height: 1 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function widgetSize(width: number, height: number): string {
  return `${width}w${height}h`;
}

export function isWidgetSize(value: string): boolean {
  return /^[1-3]w[1-6]h$/.test(value);
}

export function normalizeWidgetSize(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (isWidgetSize(raw)) return raw;
  return LEGACY_SIZES[raw] ?? "1w1h";
}

import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./news";

const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const ahead = (ms: number) => new Date(NOW + ms).toISOString();

describe("formatRelativeTime", () => {
  it("returns an empty string for unparseable input", () => {
    expect(formatRelativeTime("", NOW)).toBe("");
    expect(formatRelativeTime("not-a-date", NOW)).toBe("");
  });

  it("says just now below 45 seconds", () => {
    expect(formatRelativeTime(ago(10_000), NOW)).toBe("just now");
    expect(formatRelativeTime(ago(44_000), NOW)).toBe("just now");
  });

  it("uses minutes, hours, and days for recent history", () => {
    expect(formatRelativeTime(ago(45_000), NOW)).toBe("1m ago");
    expect(formatRelativeTime(ago(120_000), NOW)).toBe("2m ago");
    expect(formatRelativeTime(ago(2 * 3_600_000), NOW)).toBe("2h ago");
    expect(formatRelativeTime(ago(3 * 86_400_000), NOW)).toBe("3d ago");
  });

  it("escalates to weeks, months, and years", () => {
    expect(formatRelativeTime(ago(10 * 86_400_000), NOW)).toBe("1w ago");
    expect(formatRelativeTime(ago(30 * 86_400_000), NOW)).toBe("4w ago");
    expect(formatRelativeTime(ago(40 * 86_400_000), NOW)).toBe("1mo ago");
    expect(formatRelativeTime(ago(400 * 86_400_000), NOW)).toBe("1y ago");
  });

  it("uses a from now suffix for future timestamps", () => {
    expect(formatRelativeTime(ahead(44_000), NOW)).toBe("just now");
    expect(formatRelativeTime(ahead(60_000), NOW)).toBe("1m from now");
    expect(formatRelativeTime(ahead(2 * 3_600_000), NOW)).toBe("2h from now");
  });
});

import { describe, expect, it } from "vitest";

import { dailyIndex, utcDateKey, utcDayNumber } from "./discover";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe("utcDayNumber", () => {
  it("counts whole days since the epoch", () => {
    expect(utcDayNumber(0)).toBe(0);
    expect(utcDayNumber(MS_PER_DAY - 1)).toBe(0);
    expect(utcDayNumber(MS_PER_DAY)).toBe(1);
    expect(utcDayNumber(2 * MS_PER_DAY)).toBe(2);
  });
});

describe("utcDateKey", () => {
  it("formats the UTC calendar date", () => {
    expect(utcDateKey(Date.UTC(2026, 0, 15))).toBe("2026-01-15");
    expect(utcDateKey(Date.UTC(2026, 11, 31, 23, 59, 59))).toBe("2026-12-31");
  });
});

describe("dailyIndex", () => {
  const now = Date.UTC(2026, 10, 11, 9, 30);

  it("returns 0 for empty or invalid lengths", () => {
    expect(dailyIndex(0, now)).toBe(0);
    expect(dailyIndex(-3, now)).toBe(0);
  });

  it("stays within [0, length) and is deterministic", () => {
    for (const length of [1, 5, 7, 31]) {
      const index = dailyIndex(length, now);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(length);
      expect(dailyIndex(length, now)).toBe(index);
    }
  });

  it("advances one slot per UTC day", () => {
    const today = dailyIndex(7, now);
    expect(dailyIndex(7, now + MS_PER_DAY)).toBe((today + 1) % 7);
  });
});

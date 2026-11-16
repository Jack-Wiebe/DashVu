import { describe, expect, it } from "vitest";

import { calendarEventsInputSchema, calendarSettingsSchema } from "./calendar";

describe("calendarEventsInputSchema", () => {
  it("defaults to an empty query", () => {
    expect(calendarEventsInputSchema.parse(undefined)).toEqual({});
    expect(calendarEventsInputSchema.parse({})).toEqual({});
  });

  it("accepts full ISO datetimes for time bounds", () => {
    expect(
      calendarEventsInputSchema.parse({
        timeMin: "2026-11-01T00:00:00.000Z",
        timeMax: "2026-11-30T23:59:59.000Z",
      })
    ).toEqual({ timeMin: "2026-11-01T00:00:00.000Z", timeMax: "2026-11-30T23:59:59.000Z" });
    expect(() => calendarEventsInputSchema.parse({ timeMin: "2026-11-01" })).toThrow();
  });

  it("requires YYYY-MM-DD for client-local dates", () => {
    expect(
      calendarEventsInputSchema.parse({
        timeMinDate: "2026-11-01",
        timeMaxDate: "2026-11-30",
        today: "2026-11-11",
      })
    ).toEqual({ timeMinDate: "2026-11-01", timeMaxDate: "2026-11-30", today: "2026-11-11" });
    expect(() => calendarEventsInputSchema.parse({ timeMinDate: "11-01-2026" })).toThrow();
    expect(() => calendarEventsInputSchema.parse({ today: "2026-11-11T00:00:00Z" })).toThrow();
  });

  it("bounds maxResults to whole numbers 1-250", () => {
    expect(calendarEventsInputSchema.parse({ maxResults: 250 }).maxResults).toBe(250);
    expect(() => calendarEventsInputSchema.parse({ maxResults: 0 })).toThrow();
    expect(() => calendarEventsInputSchema.parse({ maxResults: 251 })).toThrow();
    expect(() => calendarEventsInputSchema.parse({ maxResults: 2.5 })).toThrow();
  });

  it("bounds excludeCalendarIds to 200 non-empty ids", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `cal-${i}`);
    expect(
      calendarEventsInputSchema.parse({ excludeCalendarIds: ids }).excludeCalendarIds
    ).toHaveLength(200);
    expect(() =>
      calendarEventsInputSchema.parse({ excludeCalendarIds: [...ids, "extra"] })
    ).toThrow();
    expect(() => calendarEventsInputSchema.parse({ excludeCalendarIds: [""] })).toThrow();
  });
});

describe("calendarSettingsSchema", () => {
  it("defaults hiddenCalendarIds to an empty list", () => {
    expect(calendarSettingsSchema.parse({})).toEqual({ hiddenCalendarIds: [] });
  });

  it("bounds hiddenCalendarIds to 200 non-empty ids", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `cal-${i}`);
    expect(calendarSettingsSchema.parse({ hiddenCalendarIds: ids }).hiddenCalendarIds).toHaveLength(
      200
    );
    expect(() => calendarSettingsSchema.parse({ hiddenCalendarIds: [...ids, "extra"] })).toThrow();
    expect(() => calendarSettingsSchema.parse({ hiddenCalendarIds: [""] })).toThrow();
  });
});

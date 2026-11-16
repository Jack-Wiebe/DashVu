import { describe, expect, it } from "vitest";

import {
  MAX_MAP_STOPS,
  geocodeInputSchema,
  mapSettingsSchema,
  mapUserStateSchema,
  optimizeInputSchema,
  routeInputSchema,
  savedLocationInputSchema,
  savedLocationsImportSchema,
  travelModeSchema,
} from "./maps";

const origin = { lat: 48.85, lon: 2.35 };
const stop = (i: number) => ({ lat: 0, lon: i });
const place = (i: number) => ({ id: `p${i}`, label: `Place ${i}`, lat: 0, lon: 0 });
const stops = (count: number) => Array.from({ length: count }, (_, i) => stop(i));
const places = (count: number) => Array.from({ length: count }, (_, i) => place(i));

describe("travelModeSchema", () => {
  it("accepts the four travel modes", () => {
    for (const mode of ["driving", "cycling", "walking", "transit"] as const) {
      expect(travelModeSchema.parse(mode)).toBe(mode);
    }
  });

  it("rejects other modes", () => {
    expect(() => travelModeSchema.parse("flying")).toThrow();
    expect(() => travelModeSchema.parse("")).toThrow();
  });
});

describe("geocodeInputSchema", () => {
  it("trims and bounds the query to 2-120 characters", () => {
    expect(geocodeInputSchema.parse({ query: "  Paris  " })).toEqual({ query: "Paris" });
    expect(() => geocodeInputSchema.parse({ query: "a" })).toThrow();
    expect(() => geocodeInputSchema.parse({ query: "x".repeat(121) })).toThrow();
  });

  it("accepts optional viewport bias coordinates", () => {
    expect(geocodeInputSchema.parse({ query: "par", lat: 48.85, lon: 2.35 })).toEqual({
      query: "par",
      lat: 48.85,
      lon: 2.35,
    });
    expect(() => geocodeInputSchema.parse({ query: "par", lat: 91 })).toThrow();
  });
});

describe("routeInputSchema", () => {
  const base = { mode: "driving" as const, origin };

  it("requires between 1 and MAX_MAP_STOPS stops", () => {
    expect(routeInputSchema.parse({ ...base, stops: stops(1) }).stops).toHaveLength(1);
    expect(routeInputSchema.parse({ ...base, stops: stops(MAX_MAP_STOPS) }).stops).toHaveLength(
      MAX_MAP_STOPS
    );
    expect(() => routeInputSchema.parse({ ...base, stops: [] })).toThrow();
    expect(() => routeInputSchema.parse({ ...base, stops: stops(MAX_MAP_STOPS + 1) })).toThrow();
  });

  it("requires a valid mode and origin", () => {
    expect(() => routeInputSchema.parse({ mode: "flying", origin, stops: stops(1) })).toThrow();
    expect(() =>
      routeInputSchema.parse({ mode: "driving", origin: { lat: 999, lon: 0 }, stops: stops(1) })
    ).toThrow();
  });
});

describe("optimizeInputSchema", () => {
  const base = { mode: "driving" as const, origin, stops: stops(3) };

  it("accepts a missing pinnedIndices", () => {
    expect(optimizeInputSchema.parse(base).pinnedIndices).toBeUndefined();
  });

  it("bounds pinned indices to [0, MAX_MAP_STOPS - 1]", () => {
    expect(optimizeInputSchema.parse({ ...base, pinnedIndices: [0, 2] }).pinnedIndices).toEqual([
      0, 2,
    ]);
    expect(() => optimizeInputSchema.parse({ ...base, pinnedIndices: [MAX_MAP_STOPS] })).toThrow();
    expect(() => optimizeInputSchema.parse({ ...base, pinnedIndices: [-1] })).toThrow();
    expect(() => optimizeInputSchema.parse({ ...base, pinnedIndices: [1.5] })).toThrow();
  });
});

describe("saved location schemas", () => {
  it("requires a trimmed label on a saved location", () => {
    expect(savedLocationInputSchema.parse({ ...origin, label: "  Home  " })).toEqual({
      ...origin,
      label: "Home",
    });
    expect(() => savedLocationInputSchema.parse({ ...origin, label: "" })).toThrow();
  });

  it("caps imports at 50 locations", () => {
    expect(savedLocationsImportSchema.parse({ locations: places(50) }).locations).toHaveLength(50);
    expect(() => savedLocationsImportSchema.parse({ locations: places(51) })).toThrow();
  });
});

describe("mapSettingsSchema", () => {
  it("accepts empty settings", () => {
    expect(mapSettingsSchema.parse({})).toEqual({});
  });

  it("bounds points to MAX_MAP_STOPS + 1", () => {
    expect(mapSettingsSchema.parse({ points: places(MAX_MAP_STOPS + 1) }).points).toHaveLength(
      MAX_MAP_STOPS + 1
    );
    expect(() => mapSettingsSchema.parse({ points: places(MAX_MAP_STOPS + 2) })).toThrow();
  });

  it("bounds pinnedIds and favourites", () => {
    expect(
      mapSettingsSchema.parse({ pinnedIds: Array.from({ length: 25 }, (_, i) => `p${i}`) })
        .pinnedIds
    ).toHaveLength(25);
    expect(() =>
      mapSettingsSchema.parse({ pinnedIds: Array.from({ length: 26 }, (_, i) => `p${i}`) })
    ).toThrow();
    expect(mapSettingsSchema.parse({ favourites: places(50) }).favourites).toHaveLength(50);
    expect(() => mapSettingsSchema.parse({ favourites: places(51) })).toThrow();
  });

  it("rejects an invalid mode", () => {
    expect(() => mapSettingsSchema.parse({ mode: "teleport" })).toThrow();
  });
});

describe("mapUserStateSchema", () => {
  it("accepts an empty object and optional fields", () => {
    expect(mapUserStateSchema.parse({})).toEqual({});
    expect(mapUserStateSchema.parse({ geolocationPromptedAt: "2026-11-11T10:00:00.000Z" })).toEqual(
      { geolocationPromptedAt: "2026-11-11T10:00:00.000Z" }
    );
  });

  it("requires a full ISO datetime for geolocationPromptedAt", () => {
    expect(() => mapUserStateSchema.parse({ geolocationPromptedAt: "2026-11-11" })).toThrow();
    expect(() => mapUserStateSchema.parse({ geolocationPromptedAt: "soon" })).toThrow();
  });

  it("validates lastKnownLocation as a geo place", () => {
    expect(mapUserStateSchema.parse({ lastKnownLocation: place(1) }).lastKnownLocation).toEqual(
      place(1)
    );
    expect(() =>
      mapUserStateSchema.parse({ lastKnownLocation: { id: "", label: "x", lat: 0, lon: 0 } })
    ).toThrow();
  });
});

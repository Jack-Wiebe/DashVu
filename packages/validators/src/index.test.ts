import { describe, expect, it } from "vitest";

import {
  DEFAULT_WIDGET_LAYOUT,
  instanceNameSchema,
  saveLayoutSchema,
  userPreferencesUpdateSchema,
  weatherCurrentInputSchema,
  weatherSearchInputSchema,
  widgetInstanceUpdateSchema,
  widgetKindSchema,
  widgetLayoutItemSchema,
  widgetSizeSchema,
} from "./index";

const KINDS = [
  "spotify",
  "gallery",
  "calendar",
  "weather",
  "funPack",
  "planner",
  "canvas",
  "news",
  "discover",
  "dictionary",
  "map",
  "calculator",
] as const;

describe("widgetKindSchema", () => {
  it("accepts every supported kind", () => {
    expect(KINDS).toHaveLength(12);
    for (const kind of KINDS) {
      expect(widgetKindSchema.parse(kind)).toBe(kind);
    }
  });

  it("rejects unknown kinds", () => {
    expect(() => widgetKindSchema.parse("spotify2")).toThrow();
    expect(() => widgetKindSchema.parse("")).toThrow();
    expect(() => widgetKindSchema.parse("Spotify")).toThrow();
  });
});

describe("widgetSizeSchema", () => {
  it("accepts grid tokens with width 1-3 and height 1-6", () => {
    expect(widgetSizeSchema.parse("1w1h")).toBe("1w1h");
    expect(widgetSizeSchema.parse("3w6h")).toBe("3w6h");
  });

  it("rejects out-of-range tokens and legacy classes", () => {
    expect(() => widgetSizeSchema.parse("0w1h")).toThrow();
    expect(() => widgetSizeSchema.parse("4w1h")).toThrow();
    expect(() => widgetSizeSchema.parse("1w7h")).toThrow();
    expect(() => widgetSizeSchema.parse("sm")).toThrow();
    expect(() => widgetSizeSchema.parse("lg:col-span-1")).toThrow();
    expect(() => widgetSizeSchema.parse("")).toThrow();
    expect(() => widgetSizeSchema.parse("2w2h ")).toThrow();
  });
});

describe("widgetLayoutItemSchema", () => {
  const item = {
    id: "w-1",
    kind: "spotify",
    size: "1w1h",
    position: 0,
  };

  it("accepts a placement without optional fields", () => {
    expect(widgetLayoutItemSchema.parse(item)).toEqual(item);
  });

  it("keeps optional groupId and instanceName", () => {
    const parsed = widgetLayoutItemSchema.parse({
      ...item,
      groupId: "g-1",
      instanceName: "  My Spotify  ",
    });
    expect(parsed.groupId).toBe("g-1");
    expect(parsed.instanceName).toBe("My Spotify");
  });

  it("requires non-negative integer positions", () => {
    expect(() => widgetLayoutItemSchema.parse({ ...item, position: -1 })).toThrow();
    expect(() => widgetLayoutItemSchema.parse({ ...item, position: 1.5 })).toThrow();
  });

  it("bounds instanceName to 1-60 trimmed characters", () => {
    expect(() => widgetLayoutItemSchema.parse({ ...item, instanceName: "" })).toThrow();
    expect(() => widgetLayoutItemSchema.parse({ ...item, instanceName: "   " })).toThrow();
    expect(() => widgetLayoutItemSchema.parse({ ...item, instanceName: "x".repeat(61) })).toThrow();
    expect(
      widgetLayoutItemSchema.parse({ ...item, instanceName: "x".repeat(60) }).instanceName
    ).toBe("x".repeat(60));
  });
});

describe("saveLayoutSchema", () => {
  it("requires a dashboardId", () => {
    expect(() => saveLayoutSchema.parse({ widgets: [] })).toThrow();
    expect(() => saveLayoutSchema.parse({ dashboardId: "", widgets: [] })).toThrow();
  });

  it("allows an empty widget list (clearing a dashboard)", () => {
    expect(saveLayoutSchema.parse({ dashboardId: "d-1", widgets: [] })).toEqual({
      dashboardId: "d-1",
      widgets: [],
    });
  });

  it("rejects invalid placements inside widgets", () => {
    expect(() =>
      saveLayoutSchema.parse({
        dashboardId: "d-1",
        widgets: [{ id: "w-1", kind: "nope", size: "1w1h", position: 0 }],
      })
    ).toThrow();
  });
});

describe("instanceNameSchema", () => {
  it("trims and bounds the name", () => {
    expect(instanceNameSchema.parse("  Home  ")).toBe("Home");
    expect(() => instanceNameSchema.parse("")).toThrow();
    expect(() => instanceNameSchema.parse("x".repeat(61))).toThrow();
    expect(instanceNameSchema.parse("x".repeat(60))).toBe("x".repeat(60));
  });
});

describe("widgetInstanceUpdateSchema", () => {
  it("accepts id-only updates and nullable settings", () => {
    expect(widgetInstanceUpdateSchema.parse({ groupId: "g-1" })).toEqual({ groupId: "g-1" });
    expect(widgetInstanceUpdateSchema.parse({ groupId: "g-1", settings: null }).settings).toBe(
      null
    );
    expect(
      widgetInstanceUpdateSchema.parse({ groupId: "g-1", settings: { a: 1 } }).settings
    ).toEqual({ a: 1 });
  });

  it("requires a groupId", () => {
    expect(() => widgetInstanceUpdateSchema.parse({ name: "x" })).toThrow();
    expect(() => widgetInstanceUpdateSchema.parse({ groupId: "" })).toThrow();
  });
});

describe("userPreferencesUpdateSchema", () => {
  it("accepts an empty patch", () => {
    expect(userPreferencesUpdateSchema.parse({})).toEqual({});
  });

  it("trims the theme id and rejects blank themes", () => {
    expect(userPreferencesUpdateSchema.parse({ theme: "  dark  " }).theme).toBe("dark");
    expect(() => userPreferencesUpdateSchema.parse({ theme: "   " })).toThrow();
  });
});

describe("weather input schemas", () => {
  it("bounds coordinates", () => {
    expect(weatherCurrentInputSchema.parse({ latitude: 48.85, longitude: 2.35 })).toEqual({
      latitude: 48.85,
      longitude: 2.35,
    });
    expect(() => weatherCurrentInputSchema.parse({ latitude: 91, longitude: 0 })).toThrow();
    expect(() => weatherCurrentInputSchema.parse({ latitude: 0, longitude: 181 })).toThrow();
  });

  it("requires a 1-120 character query", () => {
    expect(weatherSearchInputSchema.parse({ query: "Paris" })).toEqual({ query: "Paris" });
    expect(() => weatherSearchInputSchema.parse({ query: "" })).toThrow();
    expect(() => weatherSearchInputSchema.parse({ query: "x".repeat(121) })).toThrow();
  });
});

describe("DEFAULT_WIDGET_LAYOUT", () => {
  it("only contains valid kinds, sizes, and titles", () => {
    expect(DEFAULT_WIDGET_LAYOUT.length).toBeGreaterThan(0);
    for (const entry of DEFAULT_WIDGET_LAYOUT) {
      expect(() => widgetKindSchema.parse(entry.kind)).not.toThrow();
      expect(() => widgetSizeSchema.parse(entry.size)).not.toThrow();
      expect(entry.title.length).toBeGreaterThan(0);
    }
  });

  it("has unique sequential positions starting at 0", () => {
    const positions = DEFAULT_WIDGET_LAYOUT.map((entry) => entry.position);
    expect(new Set(positions).size).toBe(positions.length);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions.map((_, index) => index));
  });
});

import { describe, expect, it } from "vitest";

import { isWidgetSize, normalizeWidgetSize, parseWidgetSize, widgetSize } from "./widget-size";

describe("parseWidgetSize", () => {
  it("parses valid grid tokens", () => {
    expect(parseWidgetSize("1w1h")).toEqual({ width: 1, height: 1 });
    expect(parseWidgetSize("2w3h")).toEqual({ width: 2, height: 3 });
    expect(parseWidgetSize("3w6h")).toEqual({ width: 3, height: 6 });
  });

  it("returns 1x1 for invalid, legacy, or missing input", () => {
    expect(parseWidgetSize("lg:col-span-1")).toEqual({ width: 1, height: 1 });
    expect(parseWidgetSize("sm")).toEqual({ width: 1, height: 1 });
    expect(parseWidgetSize("")).toEqual({ width: 1, height: 1 });
    expect(parseWidgetSize(null)).toEqual({ width: 1, height: 1 });
    expect(parseWidgetSize(undefined)).toEqual({ width: 1, height: 1 });
  });
});

describe("widgetSize", () => {
  it("builds a token from width and height", () => {
    expect(widgetSize(1, 1)).toBe("1w1h");
    expect(widgetSize(2, 4)).toBe("2w4h");
  });
});

describe("isWidgetSize", () => {
  it("accepts width 1-3 and height 1-6", () => {
    expect(isWidgetSize("1w1h")).toBe(true);
    expect(isWidgetSize("3w6h")).toBe(true);
  });

  it("rejects out-of-range and malformed tokens", () => {
    expect(isWidgetSize("0w1h")).toBe(false);
    expect(isWidgetSize("4w1h")).toBe(false);
    expect(isWidgetSize("1w7h")).toBe(false);
    expect(isWidgetSize("1w0h")).toBe(false);
    expect(isWidgetSize("12w1h")).toBe(false);
    expect(isWidgetSize("sm")).toBe(false);
    expect(isWidgetSize("lg:col-span-1")).toBe(false);
    expect(isWidgetSize("")).toBe(false);
  });
});

describe("normalizeWidgetSize", () => {
  it("returns valid tokens unchanged", () => {
    expect(normalizeWidgetSize("2w2h")).toBe("2w2h");
  });

  it("tolerates case and surrounding whitespace", () => {
    expect(normalizeWidgetSize("  2W2H  ")).toBe("2w2h");
  });

  it("maps legacy class names to grid tokens", () => {
    expect(normalizeWidgetSize("sm")).toBe("1w1h");
    expect(normalizeWidgetSize("md")).toBe("2w1h");
    expect(normalizeWidgetSize("wide")).toBe("2w1h");
    expect(normalizeWidgetSize("lrg")).toBe("2w2h");
    expect(normalizeWidgetSize("xl")).toBe("2w2h");
  });

  it("falls back to 1w1h for unknown input", () => {
    expect(normalizeWidgetSize("lg:col-span-1")).toBe("1w1h");
    expect(normalizeWidgetSize("gargantuan")).toBe("1w1h");
    expect(normalizeWidgetSize(null)).toBe("1w1h");
    expect(normalizeWidgetSize(undefined)).toBe("1w1h");
  });
});

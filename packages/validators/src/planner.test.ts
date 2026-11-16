import { describe, expect, it } from "vitest";

import {
  plannerItemCreateSchema,
  plannerItemRemoveSchema,
  plannerItemTextSchema,
  plannerItemUpdateSchema,
  plannerItemsInputSchema,
  plannerItemsReorderSchema,
  plannerModeSchema,
} from "./planner";

describe("plannerModeSchema", () => {
  it("accepts the three planner modes", () => {
    for (const mode of ["notes", "todos", "countdown"] as const) {
      expect(plannerModeSchema.parse(mode)).toBe(mode);
    }
  });

  it("rejects unknown modes", () => {
    expect(() => plannerModeSchema.parse("shopping")).toThrow();
  });
});

describe("plannerItemTextSchema", () => {
  it("trims and bounds text to 1-500 characters", () => {
    expect(plannerItemTextSchema.parse("  buy milk  ")).toBe("buy milk");
    expect(plannerItemTextSchema.parse("x".repeat(500))).toBe("x".repeat(500));
    expect(() => plannerItemTextSchema.parse("")).toThrow();
    expect(() => plannerItemTextSchema.parse("   ")).toThrow();
    expect(() => plannerItemTextSchema.parse("x".repeat(501))).toThrow();
  });
});

describe("plannerItemsInputSchema", () => {
  it("requires a widgetId and mode", () => {
    expect(plannerItemsInputSchema.parse({ widgetId: "w-1", mode: "todos" })).toEqual({
      widgetId: "w-1",
      mode: "todos",
    });
    expect(() => plannerItemsInputSchema.parse({ widgetId: "", mode: "todos" })).toThrow();
    expect(() => plannerItemsInputSchema.parse({ widgetId: "w-1" })).toThrow();
  });
});

describe("plannerItemCreateSchema", () => {
  it("accepts an item without a date", () => {
    expect(
      plannerItemCreateSchema.parse({ widgetId: "w-1", mode: "countdown", text: "Launch" })
    ).toEqual({ widgetId: "w-1", mode: "countdown", text: "Launch", date: undefined });
  });

  it("accepts null and ISO dates, rejects other strings", () => {
    const base = { widgetId: "w-1", mode: "countdown" as const, text: "Launch" };
    expect(plannerItemCreateSchema.parse({ ...base, date: null }).date).toBeNull();
    expect(plannerItemCreateSchema.parse({ ...base, date: "2026-12-31T00:00:00.000Z" }).date).toBe(
      "2026-12-31T00:00:00.000Z"
    );
    expect(() => plannerItemCreateSchema.parse({ ...base, date: "2026-12-31" })).toThrow();
  });
});

describe("plannerItemUpdateSchema", () => {
  it("allows an id-only patch", () => {
    expect(plannerItemUpdateSchema.parse({ id: "i-1" })).toEqual({ id: "i-1" });
  });

  it("validates optional fields when present", () => {
    expect(plannerItemUpdateSchema.parse({ id: "i-1", text: "  new  ", checked: true }).text).toBe(
      "new"
    );
    expect(() => plannerItemUpdateSchema.parse({ id: "i-1", text: "" })).toThrow();
    expect(() => plannerItemUpdateSchema.parse({ id: "i-1", checked: "yes" })).toThrow();
    expect(() => plannerItemUpdateSchema.parse({ id: "" })).toThrow();
  });
});

describe("plannerItemRemoveSchema", () => {
  it("requires a non-empty id", () => {
    expect(plannerItemRemoveSchema.parse({ id: "i-1" })).toEqual({ id: "i-1" });
    expect(() => plannerItemRemoveSchema.parse({})).toThrow();
    expect(() => plannerItemRemoveSchema.parse({ id: "" })).toThrow();
  });
});

describe("plannerItemsReorderSchema", () => {
  it("accepts an empty id list but rejects empty ids", () => {
    expect(plannerItemsReorderSchema.parse({ widgetId: "w-1", mode: "notes", ids: [] })).toEqual({
      widgetId: "w-1",
      mode: "notes",
      ids: [],
    });
    expect(() =>
      plannerItemsReorderSchema.parse({ widgetId: "w-1", mode: "notes", ids: [""] })
    ).toThrow();
  });
});

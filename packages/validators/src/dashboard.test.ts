import { describe, expect, it } from "vitest";

import {
  dashboardCreateSchema,
  dashboardNameSchema,
  dashboardRenameSchema,
  dashboardReorderSchema,
} from "./dashboard";

describe("dashboardNameSchema", () => {
  it("trims and bounds the name to 1-40 characters", () => {
    expect(dashboardNameSchema.parse("  Home  ")).toBe("Home");
    expect(dashboardNameSchema.parse("x".repeat(40))).toBe("x".repeat(40));
    expect(() => dashboardNameSchema.parse("")).toThrow();
    expect(() => dashboardNameSchema.parse("   ")).toThrow();
    expect(() => dashboardNameSchema.parse("x".repeat(41))).toThrow();
  });
});

describe("dashboardCreateSchema", () => {
  it("makes the name optional", () => {
    expect(dashboardCreateSchema.parse({})).toEqual({});
    expect(dashboardCreateSchema.parse({ name: "Work" })).toEqual({ name: "Work" });
  });
});

describe("dashboardRenameSchema", () => {
  it("requires both id and name", () => {
    expect(dashboardRenameSchema.parse({ id: "d-1", name: "Work" })).toEqual({
      id: "d-1",
      name: "Work",
    });
    expect(() => dashboardRenameSchema.parse({ id: "d-1" })).toThrow();
    expect(() => dashboardRenameSchema.parse({ id: "d-1", name: "" })).toThrow();
    expect(() => dashboardRenameSchema.parse({ id: "", name: "Work" })).toThrow();
  });
});

describe("dashboardReorderSchema", () => {
  it("requires at least one non-empty id", () => {
    expect(dashboardReorderSchema.parse({ ids: ["a", "b"] })).toEqual({
      ids: ["a", "b"],
    });
    expect(() => dashboardReorderSchema.parse({ ids: [] })).toThrow();
    expect(() => dashboardReorderSchema.parse({ ids: [""] })).toThrow();
  });
});

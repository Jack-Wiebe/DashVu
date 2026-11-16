import { describe, expect, it } from "vitest";

import { newsBriefingInputSchema, newsSourceSchema } from "./news";

describe("newsSourceSchema", () => {
  it("accepts the five supported sources", () => {
    for (const source of [
      "hackerNews",
      "spaceflightNews",
      "bbcNews",
      "alJazeera",
      "allsides",
    ] as const) {
      expect(newsSourceSchema.parse(source)).toBe(source);
    }
  });

  it("rejects unknown sources", () => {
    expect(() => newsSourceSchema.parse("reddit")).toThrow();
    expect(() => newsSourceSchema.parse("")).toThrow();
  });
});

describe("newsBriefingInputSchema", () => {
  it("defaults to alJazeera with 10 items", () => {
    expect(newsBriefingInputSchema.parse({})).toEqual({ source: "alJazeera", limit: 10 });
  });

  it("keeps explicit values", () => {
    expect(newsBriefingInputSchema.parse({ source: "hackerNews", limit: 25 })).toEqual({
      source: "hackerNews",
      limit: 25,
    });
  });

  it("bounds the limit to whole numbers 1-25", () => {
    expect(newsBriefingInputSchema.parse({ limit: 1 }).limit).toBe(1);
    expect(() => newsBriefingInputSchema.parse({ limit: 0 })).toThrow();
    expect(() => newsBriefingInputSchema.parse({ limit: 26 })).toThrow();
    expect(() => newsBriefingInputSchema.parse({ limit: 2.5 })).toThrow();
  });
});

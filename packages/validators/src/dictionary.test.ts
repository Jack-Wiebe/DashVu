import { describe, expect, it } from "vitest";

import {
  dictionaryLookupInputSchema,
  dictionaryRelatedInputSchema,
  dictionaryTabSchema,
  dictionaryWordSchema,
} from "./dictionary";

describe("dictionaryTabSchema", () => {
  it("accepts the three tabs", () => {
    for (const tab of ["dictionary", "thesaurus", "wotd"] as const) {
      expect(dictionaryTabSchema.parse(tab)).toBe(tab);
    }
  });

  it("rejects unknown tabs", () => {
    expect(() => dictionaryTabSchema.parse("quiz")).toThrow();
  });
});

describe("dictionaryWordSchema", () => {
  it("trims and bounds the word to 1-60 characters", () => {
    expect(dictionaryWordSchema.parse("  serendipity  ")).toBe("serendipity");
    expect(dictionaryWordSchema.parse("x".repeat(60))).toBe("x".repeat(60));
    expect(() => dictionaryWordSchema.parse("")).toThrow();
    expect(() => dictionaryWordSchema.parse("   ")).toThrow();
    expect(() => dictionaryWordSchema.parse("x".repeat(61))).toThrow();
  });
});

describe("dictionaryLookupInputSchema", () => {
  it("requires a word", () => {
    expect(dictionaryLookupInputSchema.parse({ word: "sonder" })).toEqual({ word: "sonder" });
    expect(() => dictionaryLookupInputSchema.parse({})).toThrow();
    expect(() => dictionaryLookupInputSchema.parse({ word: "" })).toThrow();
  });
});

describe("dictionaryRelatedInputSchema", () => {
  it("defaults the relation to synonyms", () => {
    expect(dictionaryRelatedInputSchema.parse({ word: "happy" })).toEqual({
      word: "happy",
      relation: "syn",
    });
  });

  it("accepts the three relations and rejects others", () => {
    for (const relation of ["syn", "ant", "ml"] as const) {
      expect(dictionaryRelatedInputSchema.parse({ word: "happy", relation }).relation).toBe(
        relation
      );
    }
    expect(() => dictionaryRelatedInputSchema.parse({ word: "happy", relation: "foo" })).toThrow();
  });
});

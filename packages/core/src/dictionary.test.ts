import { describe, expect, it } from "vitest";

import { WORD_OF_THE_DAY, stripHtml } from "./dictionary";

describe("stripHtml", () => {
  it("removes tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
    expect(stripHtml("<a href='https://x.test'>link</a>")).toBe("link");
  });

  it("decodes named, decimal, and hex entities", () => {
    expect(stripHtml("a &amp; b")).toBe("a & b");
    expect(stripHtml("3 &lt; 4 &gt; 2")).toBe("3 < 4 > 2");
    expect(stripHtml("&quot;hi&quot; &apos;there&apos;")).toBe("\"hi\" 'there'");
    expect(stripHtml("it&#39;s")).toBe("it's");
    expect(stripHtml("caf&#233;")).toBe("café");
    expect(stripHtml("caf&#xE9;")).toBe("café");
  });

  it("leaves unknown entities untouched", () => {
    expect(stripHtml("fish &chips;")).toBe("fish &chips;");
  });

  it("collapses whitespace and trims", () => {
    expect(stripHtml("  a \n\t b  ")).toBe("a b");
  });

  it("handles empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("WORD_OF_THE_DAY", () => {
  it("is a non-empty list of unique lowercase words", () => {
    expect(WORD_OF_THE_DAY.length).toBeGreaterThan(0);
    expect(new Set(WORD_OF_THE_DAY).size).toBe(WORD_OF_THE_DAY.length);
    for (const word of WORD_OF_THE_DAY) {
      expect(word).toMatch(/^[a-z]+$/);
    }
  });
});

import { describe, expect, it } from "vitest";

import { parseFeed, toIsoString } from "./rss";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>BBC World</title>
    <item>
      <title>First story</title>
      <link>https://www.bbc.com/news/1</link>
      <guid isPermaLink="false">news-1</guid>
      <pubDate>Mon, 10 Nov 2025 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second story</title>
      <link>https://www.bbc.com/news/2</link>
    </item>
  </channel>
</rss>`;

describe("parseFeed", () => {
  it("extracts the channel title and items in order", () => {
    const feed = parseFeed(FEED);
    expect(feed.channelTitle).toBe("BBC World");
    expect(feed.items).toEqual([
      {
        title: "First story",
        link: "https://www.bbc.com/news/1",
        guid: "news-1",
        pubDate: "Mon, 10 Nov 2025 12:00:00 GMT",
      },
      {
        title: "Second story",
        link: "https://www.bbc.com/news/2",
        guid: null,
        pubDate: null,
      },
    ]);
  });

  it("drops items that lack a title or link", () => {
    const feed = parseFeed(`<?xml version="1.0"?>
<rss><channel><title>Feed</title>
  <item><title>No link</title></item>
  <item><link>https://x.test/no-title</link></item>
  <item><title>Keep</title><link>https://x.test/keep</link></item>
</channel></rss>`);
    expect(feed.items).toEqual([
      { title: "Keep", link: "https://x.test/keep", guid: null, pubDate: null },
    ]);
  });

  it("handles a single item that is not wrapped in an array", () => {
    const feed = parseFeed(
      "<rss><channel><title>T</title><item><title>One</title><link>https://x.test/1</link></item></channel></rss>"
    );
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].title).toBe("One");
  });

  it("returns an empty result for empty or non-RSS input", () => {
    expect(parseFeed("")).toEqual({ channelTitle: null, items: [] });
    expect(parseFeed("<html><body>hi</body></html>")).toEqual({
      channelTitle: null,
      items: [],
    });
  });

  it("keeps numeric-looking values as strings", () => {
    const feed = parseFeed(
      "<rss><channel><item><title>123</title><link>https://x.test/2</link><guid>7</guid></item></channel></rss>"
    );
    expect(feed.items[0]).toEqual({
      title: "123",
      link: "https://x.test/2",
      guid: "7",
      pubDate: null,
    });
  });

  it("reads the text node of mixed-content elements", () => {
    const feed = parseFeed("<rss><channel><title>Hello <b>world</b></title></channel></rss>");
    expect(feed.channelTitle).toBe("Hello");
  });
});

describe("toIsoString", () => {
  it("converts RFC and ISO dates to ISO", () => {
    expect(toIsoString("Mon, 10 Nov 2025 12:00:00 GMT")).toBe("2025-11-10T12:00:00.000Z");
    expect(toIsoString("2025-11-10T12:00:00.000Z")).toBe("2025-11-10T12:00:00.000Z");
  });

  it("returns null for missing or invalid values", () => {
    expect(toIsoString(null)).toBeNull();
    expect(toIsoString("")).toBeNull();
    expect(toIsoString("not a date")).toBeNull();
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseSyndicationFeed } from "./rss.js";

test("parseSyndicationFeed parses RSS items", () => {
  const stories = parseSyndicationFeed(
    `<?xml version="1.0"?><rss><channel><item><title>Example story</title><link>https://example.com/a</link><description>Summary</description><pubDate>Tue, 15 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>`,
    { id: "example", type: "rss", url: "https://example.com/feed.xml", publisher: "Example" },
    "2026-09-16T00:00:00.000Z",
  );
  assert.equal(stories.length, 1);
  assert.equal(stories[0]?.title, "Example story");
  assert.equal(stories[0]?.url, "https://example.com/a");
  assert.equal(stories[0]?.source.publisher, "Example");
});

test("parseSyndicationFeed parses Atom links", () => {
  const stories = parseSyndicationFeed(
    `<feed><entry><title>Atom story</title><link rel="alternate" href="https://example.com/b"/><summary>Atom summary</summary><updated>2026-09-16T10:00:00Z</updated></entry></feed>`,
    { id: "atom", type: "rss", url: "https://example.com/atom.xml" },
  );
  assert.equal(stories.length, 1);
  assert.equal(stories[0]?.url, "https://example.com/b");
});

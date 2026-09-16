import type { DiscoveryAdapter } from "./adapters.js";
import type { PublicationManifest, PublicationSource } from "./manifest.js";
import type { SourceRef, StoryCandidate } from "./types.js";

function textBetween(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return undefined;
  return match[1]
    ?.replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\s+/g, " ")
    .trim();
}

function atomLink(block: string): string | undefined {
  const alternate = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i);
  const anyHref = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  return alternate?.[1] ?? anyHref?.[1] ?? textBetween(block, "link");
}

function stableId(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `story-${(hash >>> 0).toString(16)}`;
}

function parseDate(value?: string): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

export function parseSyndicationFeed(
  xml: string,
  source: PublicationSource,
  retrievedAt = new Date().toISOString(),
): StoryCandidate[] {
  const blocks = [
    ...xml.matchAll(/<item(?:\\s[^>]*)?>([\\s\\S]*?)<\\/item>/gi),
    ...xml.matchAll(/<entry(?:\\s[^>]*)?>([\\s\\S]*?)<\\/entry>/gi),
  ].map((match) => match[1] ?? "");

  const stories: StoryCandidate[] = [];
  for (const block of blocks) {
    const title = textBetween(block, "title");
    const url = textBetween(block, "link") ?? atomLink(block);
    if (!title || !url) continue;

    const sourceRef: SourceRef = {
      id: `${source.id}:${stableId(url)}`,
      url,
      title,
      publisher: source.publisher ?? source.id,
      publishedAt: parseDate(
        textBetween(block, "pubDate") ??
          textBetween(block, "published") ??
          textBetween(block, "updated"),
      ),
      retrievedAt,
      sourceType: "rss",
      primary: source.primary,
    };

    stories.push({
      id: stableId(url),
      title,
      url,
      summary:
        textBetween(block, "description") ??
        textBetween(block, "summary") ??
        textBetween(block, "content"),
      publishedAt: sourceRef.publishedAt,
      source: sourceRef,
      tags: [...(source.tags ?? [])],
      metadata: { sourceId: source.id },
    });
  }
  return stories;
}

export interface RssDiscoveryOptions {
  fetchImpl?: typeof fetch;
  maxFeedBytes?: number;
  timeoutMs?: number;
}

async function fetchTextBounded(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  maxBytes: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9" },
    });
    if (!response.ok) throw new Error(`Feed request failed (${response.status}): ${url}`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared && declared > maxBytes) throw new Error(`Feed exceeds maximum size: ${url}`);
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error(`Feed exceeds maximum size: ${url}`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export function createRssDiscoveryAdapter(options: RssDiscoveryOptions = {}): DiscoveryAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const maxFeedBytes = options.maxFeedBytes ?? 2_000_000;

  return {
    async discover(manifest: PublicationManifest): Promise<readonly StoryCandidate[]> {
      const sources = (manifest.sources ?? []).filter((source) => source.type === "rss" && source.enabled !== false);
      const results = await Promise.allSettled(
        sources.map(async (source) => {
          const xml = await fetchTextBounded(source.url, fetchImpl, timeoutMs, maxFeedBytes);
          return parseSyndicationFeed(xml, source);
        }),
      );

      const stories: StoryCandidate[] = [];
      for (const result of results) if (result.status === "fulfilled") stories.push(...result.value);
      return stories;
    },
  };
}

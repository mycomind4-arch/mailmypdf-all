import type { DiscoveryAdapter, ExtractionAdapter } from "./adapters.js";
import type { PublicationManifest } from "./manifest.js";
import type { SourceRef, StoryCandidate } from "./types.js";

async function postJson<T>(
  url: string,
  body: unknown,
  options: { token?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`SERVICE_REQUEST_FAILED:${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface HorizonServiceOptions {
  endpoint: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Adapter for an independently deployed Horizon worker.
 * The worker boundary keeps Horizon upgradeable without coupling Studio's core
 * package to Horizon's Python runtime.
 */
export function createHorizonDiscoveryAdapter(options: HorizonServiceOptions): DiscoveryAdapter {
  return {
    async discover(manifest: PublicationManifest) {
      const result = await postJson<{ stories?: StoryCandidate[] }>(
        options.endpoint,
        {
          operation: "discover",
          publication: {
            id: manifest.id,
            audience: manifest.audience,
            sources: manifest.sources ?? [],
            editorial: manifest.editorial,
          },
        },
        options,
      );
      if (!Array.isArray(result.stories)) throw new Error("HORIZON_INVALID_RESPONSE");
      return result.stories;
    },
  };
}

export interface Crawl4AiServiceOptions {
  endpoint: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Adapter for Crawl4AI's HTTP service. Deploy Crawl4AI separately and point
 * this adapter at a narrow Studio-owned proxy/endpoint that returns clean text.
 */
export function createCrawl4AiExtractionAdapter(options: Crawl4AiServiceOptions): ExtractionAdapter {
  return {
    async extract(url: string) {
      const result = await postJson<{ text?: string; title?: string; finalUrl?: string }>(
        options.endpoint,
        { url },
        options,
      );
      if (typeof result.text !== "string" || !result.text.trim()) {
        throw new Error("CRAWL4AI_INVALID_RESPONSE");
      }
      const finalUrl = result.finalUrl ?? url;
      const source: SourceRef = {
        id: `web:${encodeURIComponent(finalUrl)}`,
        url: finalUrl,
        title: result.title,
        retrievedAt: new Date().toISOString(),
        sourceType: "web",
      };
      return { text: result.text, source };
    },
  };
}

import type { DiscoveryAdapter, ExtractionAdapter, StoryEmbeddingAdapter } from "./adapters.js";
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


export interface EmbeddingServiceOptions {
  endpoint: string;
  token?: string;
  fetchImpl?: typeof fetch;
  dimensions?: number;
}

/**
 * Narrow HTTP boundary for a separately deployed FastEmbed-compatible service.
 * Expected response: { embeddings: number[][], model?: string }.
 */
export function createEmbeddingServiceAdapter(
  options: EmbeddingServiceOptions,
): StoryEmbeddingAdapter {
  const dimensions = options.dimensions ?? 384;

  return {
    async embed(stories, manifest) {
      if (!stories.length) return [];

      const result = await postJson<{ embeddings?: number[][]; model?: string }>(
        options.endpoint,
        {
          publicationId: manifest.id,
          texts: stories.map((story) =>
            [story.title, story.summary].filter(Boolean).join("\n\n").slice(0, 12_000),
          ),
          dimensions,
        },
        options,
      );

      if (!Array.isArray(result.embeddings) || result.embeddings.length !== stories.length) {
        throw new Error("EMBEDDING_SERVICE_INVALID_RESPONSE");
      }

      return stories.map((story, index) => {
        const embedding = result.embeddings![index];
        if (
          !Array.isArray(embedding) ||
          embedding.length !== dimensions ||
          embedding.some((value) => !Number.isFinite(value))
        ) {
          throw new Error(`EMBEDDING_SERVICE_INVALID_VECTOR:${story.id}`);
        }

        return {
          ...story,
          embedding,
          metadata: {
            ...story.metadata,
            embeddingModel: result.model ?? "external-fastembed",
            embeddingDimensions: dimensions,
          },
        };
      });
    },
  };
}

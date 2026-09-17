import type { PublishingAdapters } from "./adapters.js";
import {
  createClaudePlanningAdapter,
  createClaudeProvider,
  createClaudeResearchAdapter,
  createClaudeScoringAdapter,
  createClaudeVerificationAdapter,
  type ClaudePublishingOptions,
} from "./claude-adapters.js";
import {
  createListmonkPublisher,
  createResendPublisher,
  createUmamiAnalyticsAdapter,
  type ListmonkPublisherOptions,
  type ResendPublisherOptions,
  type UmamiAnalyticsOptions,
} from "./delivery.js";
import { createExtractingResearchAdapter } from "./enrichment.js";
import type { PublicationManifest } from "./manifest.js";
import { createNoopAnalyticsAdapter, createNoopPublisher, createRequiredDeliveryPublisher } from "./publishers.js";
import { createHtmlRenderAdapter } from "./render.js";
import { createRssDiscoveryAdapter, type RssDiscoveryOptions } from "./rss.js";
import { createCrawl4AiExtractionAdapter, createEmbeddingServiceAdapter, createHorizonDiscoveryAdapter } from "./service-adapters.js";

export interface ProductionPublishingRuntimeOptions extends ClaudePublishingOptions {
  rss?: RssDiscoveryOptions;
  horizon?: {
    endpoint: string;
    token?: string;
  };
  crawl4ai?: {
    endpoint: string;
    token?: string;
    maxArticleChars?: number;
  };
  embeddings?: {
    endpoint: string;
    token?: string;
    dimensions?: number;
  };
  listmonk?: ListmonkPublisherOptions;
  resend?: ResendPublisherOptions;
  umami?: UmamiAnalyticsOptions;
  /**
   * When true, publishing without a real delivery provider throws instead of
   * returning a preview provider id.
   */
  requireDelivery?: boolean;
  overrides?: Partial<PublishingAdapters>;
}

/**
 * Studio's production composition root.
 *
 * External services remain optional and independently deployable:
 * - Horizon replaces RSS discovery when configured.
 * - Crawl4AI decorates research with full-article extraction.
 * - Resend or listmonk replaces preview-only publishing.
 * - Umami replaces no-op analytics.
 *
 * Claude always uses the existing hardened @mailmypdf/ai provider boundary.
 */
export function createProductionPublishingAdapters(
  manifest: PublicationManifest,
  options: ProductionPublishingRuntimeOptions = {},
): PublishingAdapters {
  const provider = createClaudeProvider(manifest, options);

  const discovery =
    options.horizon && manifest.integrations.horizon === true
      ? createHorizonDiscoveryAdapter(options.horizon)
      : createRssDiscoveryAdapter(options.rss);

  const baseResearch = createClaudeResearchAdapter(provider);
  const research =
    options.crawl4ai && manifest.integrations.crawl4ai === true
      ? createExtractingResearchAdapter(
          createCrawl4AiExtractionAdapter(options.crawl4ai),
          baseResearch,
          { maxArticleChars: options.crawl4ai.maxArticleChars },
        )
      : baseResearch;

  const publisher =
    options.resend && manifest.integrations.resend === true
      ? createResendPublisher(options.resend)
      : options.listmonk && manifest.integrations.listmonk === true
        ? createListmonkPublisher(options.listmonk)
        : options.requireDelivery
          ? createRequiredDeliveryPublisher()
          : createNoopPublisher();

  const defaults: PublishingAdapters = {
    discovery,
    scoring: createClaudeScoringAdapter(provider),
    embeddings: options.embeddings
      ? createEmbeddingServiceAdapter(options.embeddings)
      : undefined,
    research,
    planning: createClaudePlanningAdapter(provider),
    verification: createClaudeVerificationAdapter(provider),
    rendering: createHtmlRenderAdapter(),
    publisher,
    analytics:
      options.umami && manifest.integrations.umami === true
        ? createUmamiAnalyticsAdapter(options.umami)
        : createNoopAnalyticsAdapter(),
  };

  return {
    ...defaults,
    ...options.overrides,
    analytics: options.overrides?.analytics ?? defaults.analytics,
  };
}

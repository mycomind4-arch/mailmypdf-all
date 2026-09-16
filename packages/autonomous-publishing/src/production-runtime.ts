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
import { createNoopAnalyticsAdapter, createNoopPublisher } from "./publishers.js";
import { createHtmlRenderAdapter } from "./render.js";
import { createRssDiscoveryAdapter, type RssDiscoveryOptions } from "./rss.js";
import { createCrawl4AiExtractionAdapter, createHorizonDiscoveryAdapter } from "./service-adapters.js";

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
  listmonk?: ListmonkPublisherOptions;
  resend?: ResendPublisherOptions;
  umami?: UmamiAnalyticsOptions;
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
    options.horizon && manifest.integrations.horizon !== false
      ? createHorizonDiscoveryAdapter(options.horizon)
      : createRssDiscoveryAdapter(options.rss);

  const baseResearch = createClaudeResearchAdapter(provider);
  const research =
    options.crawl4ai && manifest.integrations.crawl4ai !== false
      ? createExtractingResearchAdapter(
          createCrawl4AiExtractionAdapter(options.crawl4ai),
          baseResearch,
          { maxArticleChars: options.crawl4ai.maxArticleChars },
        )
      : baseResearch;

  const publisher =
    options.resend && manifest.integrations.resend !== false
      ? createResendPublisher(options.resend)
      : options.listmonk && manifest.integrations.listmonk !== false
        ? createListmonkPublisher(options.listmonk)
        : createNoopPublisher();

  const defaults: PublishingAdapters = {
    discovery,
    scoring: createClaudeScoringAdapter(provider),
    research,
    planning: createClaudePlanningAdapter(provider),
    verification: createClaudeVerificationAdapter(provider),
    rendering: createHtmlRenderAdapter(),
    publisher,
    analytics:
      options.umami && manifest.integrations.umami !== false
        ? createUmamiAnalyticsAdapter(options.umami)
        : createNoopAnalyticsAdapter(),
  };

  return {
    ...defaults,
    ...options.overrides,
    analytics: options.overrides?.analytics ?? defaults.analytics,
  };
}

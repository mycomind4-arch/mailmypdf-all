import type { PublishingAdapters } from "./adapters.js";
import {
  createClaudePlanningAdapter,
  createClaudeProvider,
  createClaudeResearchAdapter,
  createClaudeScoringAdapter,
  createClaudeVerificationAdapter,
  type ClaudePublishingOptions,
} from "./claude-adapters.js";
import { createHtmlRenderAdapter } from "./render.js";
import { createRssDiscoveryAdapter, type RssDiscoveryOptions } from "./rss.js";
import { createNoopAnalyticsAdapter, createNoopPublisher } from "./publishers.js";
import type { PublicationManifest } from "./manifest.js";

export interface DefaultPublishingRuntimeOptions extends ClaudePublishingOptions {
  rss?: RssDiscoveryOptions;
  overrides?: Partial<PublishingAdapters>;
}

export function createDefaultPublishingAdapters(
  manifest: PublicationManifest,
  options: DefaultPublishingRuntimeOptions = {},
): PublishingAdapters {
  const provider = createClaudeProvider(manifest, options);
  const defaults: PublishingAdapters = {
    discovery: createRssDiscoveryAdapter(options.rss),
    scoring: createClaudeScoringAdapter(provider),
    research: createClaudeResearchAdapter(provider),
    planning: createClaudePlanningAdapter(provider),
    verification: createClaudeVerificationAdapter(provider),
    rendering: createHtmlRenderAdapter(),
    publisher: createNoopPublisher(),
    analytics: createNoopAnalyticsAdapter(),
  };
  return {
    ...defaults,
    ...options.overrides,
    analytics: options.overrides?.analytics ?? defaults.analytics,
  };
}

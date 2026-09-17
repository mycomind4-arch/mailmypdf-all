import type {
  EditionDraft,
  EvidencePacket,
  RenderedEdition,
  SourceRef,
  StoryCandidate,
  VerifiedEdition,
} from "./types.js";
import type { PublicationManifest } from "./manifest.js";

export interface DiscoveryAdapter {
  discover(manifest: PublicationManifest): Promise<readonly StoryCandidate[]>;
}

export interface ExtractionAdapter {
  extract(url: string): Promise<{ text: string; source: SourceRef }>;
}

export interface ResearchAdapter {
  enrich(story: StoryCandidate, manifest: PublicationManifest): Promise<EvidencePacket>;
}

export interface ScoringAdapter {
  score(stories: readonly StoryCandidate[], manifest: PublicationManifest): Promise<readonly StoryCandidate[]>;
}

export interface StoryEmbeddingAdapter {
  embed(
    stories: readonly StoryCandidate[],
    manifest: PublicationManifest,
  ): Promise<readonly StoryCandidate[]>;
}

export interface PlanningAdapter {
  plan(
    stories: readonly StoryCandidate[],
    evidence: ReadonlyMap<string, EvidencePacket>,
    manifest: PublicationManifest,
  ): Promise<EditionDraft>;
}

export interface DraftVerificationAdapter {
  verify(draft: EditionDraft, evidence: ReadonlyMap<string, EvidencePacket>): Promise<VerifiedEdition>;
}

export interface RenderAdapter {
  render(edition: VerifiedEdition): Promise<RenderedEdition>;
}

export interface PublisherAdapter {
  publish(rendered: RenderedEdition, manifest: PublicationManifest): Promise<{ publicationUrl?: string; providerId?: string }>;
}

export interface AnalyticsAdapter {
  recordPublication(input: {
    publicationId: string;
    editionId: string;
    publicationUrl?: string;
    providerId?: string;
  }): Promise<void>;
}

/**
 * Service-boundary targets. Implementations may wrap Horizon, Crawl4AI,
 * RSSHub, listmonk, Umami, Postiz, or compatible replacements without
 * coupling their licenses or deployment model to this package.
 */
export interface PublishingAdapters {
  discovery: DiscoveryAdapter;
  scoring: ScoringAdapter;
  embeddings?: StoryEmbeddingAdapter;
  research: ResearchAdapter;
  planning: PlanningAdapter;
  verification: DraftVerificationAdapter;
  rendering: RenderAdapter;
  publisher: PublisherAdapter;
  analytics?: AnalyticsAdapter;
}

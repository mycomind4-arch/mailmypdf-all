import type { ExtractionAdapter, ResearchAdapter } from "./adapters.js";
import type { StoryCandidate } from "./types.js";

export interface ExtractingResearchOptions {
  maxArticleChars?: number;
  continueOnExtractionFailure?: boolean;
}

/**
 * Decorates the evidence/research stage with full-article extraction.
 * Feed summaries remain the fallback so a failed crawler does not destroy
 * an otherwise healthy publication run.
 */
export function createExtractingResearchAdapter(
  extraction: ExtractionAdapter,
  delegate: ResearchAdapter,
  options: ExtractingResearchOptions = {},
): ResearchAdapter {
  const maxArticleChars = options.maxArticleChars ?? 50_000;
  const continueOnFailure = options.continueOnExtractionFailure ?? true;

  return {
    async enrich(story, manifest) {
      let enriched: StoryCandidate = story;

      try {
        const extracted = await extraction.extract(story.url);
        const articleText = extracted.text.trim().slice(0, maxArticleChars);
        if (articleText) {
          enriched = {
            ...story,
            summary: articleText,
            source: {
              ...extracted.source,
              title: extracted.source.title ?? story.title,
              publisher: extracted.source.publisher ?? story.source.publisher,
              publishedAt: story.publishedAt,
              primary: story.source.primary,
            },
            metadata: {
              ...story.metadata,
              feedSource: story.source,
              extraction: {
                used: true,
                truncated: extracted.text.length > maxArticleChars,
              },
            },
          };
        }
      } catch (error) {
        if (!continueOnFailure) throw error;
        enriched = {
          ...story,
          metadata: {
            ...story.metadata,
            extraction: {
              used: false,
              error: error instanceof Error ? error.message : String(error),
            },
          },
        };
      }

      const packet = await delegate.enrich(enriched, manifest);
      if (enriched.source.id === story.source.id) return packet;

      return {
        ...packet,
        sources: [
          ...packet.sources,
          ...(packet.sources.some((source) => source.id === story.source.id) ? [] : [story.source]),
        ],
        notes: [
          ...(packet.notes ?? []),
          "Full article text was extracted before evidence analysis; original feed source retained for provenance.",
        ],
      };
    },
  };
}

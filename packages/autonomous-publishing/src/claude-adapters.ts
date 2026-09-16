import {
  createAnthropicProvider,
  readServerSecret,
  type AiProvider,
} from "@mailmypdf/ai";
import type {
  DraftVerificationAdapter,
  PlanningAdapter,
  ResearchAdapter,
  ScoringAdapter,
} from "./adapters.js";
import type { PublicationManifest } from "./manifest.js";
import type {
  EditionDraft,
  EvidencePacket,
  StoryCandidate,
  VerifiedEdition,
} from "./types.js";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function jsonTask<T>(
  provider: AiProvider,
  id: string,
  system: string,
  instruction: string,
): Promise<T> {
  const result = await provider.execute<{
    system: string;
    instruction: string;
    outputMode: "json";
    temperature: number;
  }, T>({
    id,
    outputSchema: "json",
    input: {
      system,
      instruction,
      outputMode: "json",
      temperature: 0,
    },
  });
  return result.output;
}

function compactStories(stories: readonly StoryCandidate[]) {
  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    url: story.url,
    summary: story.summary,
    publishedAt: story.publishedAt,
    publisher: story.source.publisher,
    tags: story.tags,
  }));
}

export interface ClaudePublishingOptions {
  env?: Record<string, string | undefined>;
  provider?: AiProvider;
}

export function createClaudeProvider(
  manifest: PublicationManifest,
  options: ClaudePublishingOptions = {},
): AiProvider {
  if (options.provider) return options.provider;
  const env = options.env ?? process.env;
  return createAnthropicProvider({
    apiKey: readServerSecret(env, manifest.ai.apiKeyEnv),
    model: manifest.ai.model,
  });
}

export function createClaudeScoringAdapter(
  provider: AiProvider,
): ScoringAdapter {
  return {
    async score(stories, manifest) {
      if (!stories.length) return [];
      const output = await jsonTask<unknown>(
        provider,
        `publication-score:${manifest.id}:${Date.now()}`,
        "You are an evidence-first newsletter editor. Rank candidate stories without inventing facts. Return JSON only.",
        JSON.stringify({
          task: "Score each story from 0 to 100 for this publication.",
          audience: manifest.audience.description,
          voice: manifest.editorial.voice,
          criteria: {
            relevance: 30,
            significance: 20,
            novelty: 15,
            sourceQuality: 15,
            recency: 10,
            readerInterest: 5,
            commercialRelevance: 5,
          },
          stories: compactStories(stories),
          output: { scores: [{ id: "story id", score: 0, rationale: "short reason" }] },
        }),
      );
      if (!isObject(output) || !Array.isArray(output.scores)) throw new Error("CLAUDE_SCORING_INVALID_OUTPUT");

      const scoreById = new Map<string, { score: number; rationale?: string }>();
      for (const row of output.scores) {
        if (!isObject(row) || typeof row.id !== "string" || typeof row.score !== "number") continue;
        scoreById.set(row.id, {
          score: Math.max(0, Math.min(100, row.score)),
          rationale: typeof row.rationale === "string" ? row.rationale : undefined,
        });
      }

      return stories.map((story) => {
        const scored = scoreById.get(story.id);
        return scored
          ? {
              ...story,
              score: scored.score,
              metadata: { ...story.metadata, scoringRationale: scored.rationale },
            }
          : { ...story, score: 0 };
      });
    },
  };
}

export function createClaudeResearchAdapter(
  provider: AiProvider,
): ResearchAdapter {
  return {
    async enrich(story, manifest) {
      const output = await jsonTask<unknown>(
        provider,
        `publication-research:${manifest.id}:${story.id}`,
        "You build conservative evidence packets from supplied source material. Never claim access to sources that were not supplied. Return JSON only.",
        JSON.stringify({
          task: "Extract factual claims supported by this source. If the source is only a headline/snippet, keep claims narrow and lower confidence.",
          publication: manifest.name,
          story: {
            id: story.id,
            title: story.title,
            url: story.url,
            summary: story.summary,
            publishedAt: story.publishedAt,
            source: story.source,
          },
          output: {
            claims: [
              {
                id: "claim-1",
                text: "factual claim",
                confidence: 0.0,
                disputed: false,
              },
            ],
            notes: ["limitations or context"],
          },
        }),
      );
      if (!isObject(output) || !Array.isArray(output.claims)) throw new Error("CLAUDE_RESEARCH_INVALID_OUTPUT");

      const claims = output.claims.flatMap((row, index) => {
        if (!isObject(row) || typeof row.text !== "string") return [];
        const confidence = typeof row.confidence === "number" ? Math.max(0, Math.min(1, row.confidence)) : 0.5;
        return [{
          id: typeof row.id === "string" ? row.id : `${story.id}:claim-${index + 1}`,
          text: row.text,
          sourceIds: [story.source.id],
          confidence,
          disputed: row.disputed === true,
        }];
      });

      return {
        storyId: story.id,
        sources: [story.source],
        claims,
        notes: Array.isArray(output.notes)
          ? output.notes.filter((note): note is string => typeof note === "string")
          : undefined,
      };
    },
  };
}

export function createClaudePlanningAdapter(
  provider: AiProvider,
  now: () => Date = () => new Date(),
): PlanningAdapter {
  return {
    async plan(stories, evidence, manifest) {
      const evidencePayload = stories.map((story) => ({
        story: compactStories([story])[0],
        evidence: evidence.get(story.id),
      }));
      const output = await jsonTask<unknown>(
        provider,
        `publication-plan:${manifest.id}:${Date.now()}`,
        "You are a newsletter editor. Write only from the supplied evidence packets. Never add unsupported facts. Return JSON only.",
        JSON.stringify({
          task: "Plan and draft one newsletter edition.",
          publication: {
            name: manifest.name,
            audience: manifest.audience.description,
            voice: manifest.editorial.voice,
            sections: manifest.editorial.sections,
          },
          stories: evidencePayload,
          output: {
            subject: "email subject",
            preheader: "short preheader",
            markdown: "complete newsletter in Markdown",
            placements: [{ storyId: "id", section: "section", angle: "angle" }],
          },
        }),
      );
      if (!isObject(output) || typeof output.subject !== "string" || typeof output.markdown !== "string") {
        throw new Error("CLAUDE_PLANNING_INVALID_OUTPUT");
      }

      const placements = Array.isArray(output.placements) ? output.placements : [];
      const byStory = new Map<string, { section?: string; angle?: string }>();
      for (const row of placements) {
        if (!isObject(row) || typeof row.storyId !== "string") continue;
        byStory.set(row.storyId, {
          section: typeof row.section === "string" ? row.section : undefined,
          angle: typeof row.angle === "string" ? row.angle : undefined,
        });
      }

      const editionId = `${manifest.id}-${now().toISOString().replace(/[:.]/g, "-")}`;
      return {
        publicationId: manifest.id,
        editionId,
        subject: output.subject,
        preheader: typeof output.preheader === "string" ? output.preheader : undefined,
        markdown: output.markdown,
        plannedStories: stories.map((story, index) => ({
          story,
          evidence: evidence.get(story.id)!,
          position: index + 1,
          section: byStory.get(story.id)?.section ?? manifest.editorial.sections[Math.min(index, manifest.editorial.sections.length - 1)]!,
          angle: byStory.get(story.id)?.angle,
        })),
        createdAt: now().toISOString(),
      };
    },
  };
}

export function createClaudeVerificationAdapter(
  provider: AiProvider,
  now: () => Date = () => new Date(),
): DraftVerificationAdapter {
  return {
    async verify(draft: EditionDraft, evidence): Promise<VerifiedEdition> {
      const output = await jsonTask<unknown>(
        provider,
        `publication-verify:${draft.editionId}`,
        "You are a strict fact checker. Compare the draft only against supplied evidence. Flag unsupported factual assertions. Return JSON only.",
        JSON.stringify({
          draft: draft.markdown,
          evidence: [...evidence.values()],
          output: {
            passed: true,
            issues: [{ severity: "warning", message: "description", storyId: "optional", claimId: "optional" }],
          },
        }),
      );
      if (!isObject(output) || typeof output.passed !== "boolean") throw new Error("CLAUDE_VERIFICATION_INVALID_OUTPUT");
      const issues = Array.isArray(output.issues)
        ? output.issues.flatMap((row) => {
            if (!isObject(row) || typeof row.message !== "string") return [];
            return [{
              severity: row.severity === "error" ? "error" as const : "warning" as const,
              message: row.message,
              storyId: typeof row.storyId === "string" ? row.storyId : undefined,
              claimId: typeof row.claimId === "string" ? row.claimId : undefined,
            }];
          })
        : [];

      return {
        ...draft,
        verification: {
          passed: output.passed && !issues.some((issue) => issue.severity === "error"),
          issues,
          verifiedAt: now().toISOString(),
        },
      };
    },
  };
}

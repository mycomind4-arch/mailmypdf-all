import { deduplicateCandidates, type StoryMemory } from "./memory.js";
import { verifyEvidencePacket } from "./evidence.js";
import { validatePublicationManifest, type PublicationManifest } from "./manifest.js";
import type { PublishingAdapters } from "./adapters.js";
import type { PublicationRunStore } from "./run-store.js";
import type { PublicationRun, RenderedEdition, StoryCandidate } from "./types.js";

export interface RunResult {
  run: PublicationRun;
  rendered: RenderedEdition;
  publication?: { publicationUrl?: string; providerId?: string };
}

export interface PipelineOptions {
  now?: () => Date;
  id?: () => string;
  semanticDuplicateThreshold?: number;
  runStore?: PublicationRunStore;
}

export function createPublishingPipeline(
  adapters: PublishingAdapters,
  memory?: StoryMemory,
  options: PipelineOptions = {},
) {
  const now = options.now ?? (() => new Date());
  const id = options.id ?? (() => crypto.randomUUID());
  const semanticThreshold = options.semanticDuplicateThreshold ?? 0.92;
  const runStore = options.runStore;

  async function persist(
    run: PublicationRun,
    rendered?: RenderedEdition,
    publication?: { publicationUrl?: string; providerId?: string },
  ): Promise<void> {
    if (!runStore) return;
    await runStore.save({ run: structuredClone(run), rendered, publication });
  }

  async function filterHistoricalDuplicates(
    candidates: readonly StoryCandidate[],
    manifest: PublicationManifest,
  ): Promise<StoryCandidate[]> {
    if (!memory) return [...candidates];
    const cutoff = now().getTime() - manifest.editorial.avoidRepeatDays * 86_400_000;
    const kept: StoryCandidate[] = [];

    for (const story of candidates) {
      const matches = await memory.findSimilar(story, 5);
      const repeated = matches.some((match) => {
        const published = match.publishedAt ? Date.parse(match.publishedAt) : Number.NaN;
        return match.similarity >= semanticThreshold && Number.isFinite(published) && published >= cutoff;
      });
      if (!repeated) kept.push(story);
    }
    return kept;
  }

  return {
    async run(inputManifest: PublicationManifest, approved = false): Promise<RunResult> {
      const manifest = validatePublicationManifest(inputManifest);
      const run: PublicationRun = {
        id: id(),
        publicationId: manifest.id,
        stage: "discover",
        status: "running",
        startedAt: now().toISOString(),
      };

      await persist(run);

      try {
        const discovered = await adapters.discovery.discover(manifest);
        run.stage = "deduplicate";
        const currentUnique = deduplicateCandidates(discovered);
        let embeddingReady = currentUnique;
        if (adapters.embeddings) {
          try {
            embeddingReady = [...await adapters.embeddings.embed(currentUnique, manifest)];
          } catch {
            embeddingReady = currentUnique;
          }
        }
        const unique = await filterHistoricalDuplicates(embeddingReady, manifest);

        run.stage = "score";
        const scored = await adapters.scoring.score(unique, manifest);
        const selected = scored
          .filter((story) => (story.score ?? 0) >= manifest.editorial.minimumStoryScore)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, manifest.editorial.storyCount);

        if (selected.length === 0) {
          throw new Error("NO_STORIES_SELECTED");
        }

        run.stage = "enrich";
        const evidence = new Map<string, Awaited<ReturnType<typeof adapters.research.enrich>>>();
        for (const story of selected) {
          const packet = await adapters.research.enrich(story, manifest);
          const evidenceIssues = verifyEvidencePacket(packet);
          if (evidenceIssues.some((issue) => issue.severity === "error")) {
            throw new Error(`EVIDENCE_VERIFICATION_FAILED:${story.id}`);
          }
          evidence.set(story.id, packet);
        }

        run.stage = "plan";
        const draft = await adapters.planning.plan(selected, evidence, manifest);

        run.stage = "verify";
        const verified = await adapters.verification.verify(draft, evidence);
        if (!verified.verification.passed) throw new Error("EDITION_VERIFICATION_FAILED");

        run.stage = "render";
        const rendered = await adapters.rendering.render(verified);

        if (manifest.autonomy.publish === "approval_required" && !approved) {
          run.stage = "approval";
          run.status = "awaiting_approval";
          await persist(run, rendered);
          return { run, rendered };
        }

        run.stage = "publish";
        await persist(run, rendered);
        const publication = await adapters.publisher.publish(rendered, manifest);
        await persist(run, rendered, publication);

        const publishedAt = now().toISOString();
        if (memory) {
          try {
            for (const story of selected) await memory.remember(story, publishedAt);
          } catch (error) {
            run.warnings = [
              ...(run.warnings ?? []),
              `STORY_MEMORY_FAILED:${error instanceof Error ? error.message : String(error)}`,
            ];
          }
        }

        if (adapters.analytics) {
          run.stage = "analytics";
          try {
            await adapters.analytics.recordPublication({
              publicationId: manifest.id,
              editionId: verified.editionId,
              ...publication,
            });
          } catch (error) {
            run.warnings = [
              ...(run.warnings ?? []),
              `ANALYTICS_FAILED:${error instanceof Error ? error.message : String(error)}`,
            ];
          }
        }

        run.status = "published";
        run.completedAt = publishedAt;
        await persist(run, rendered, publication);
        return { run, rendered, publication };
      } catch (error) {
        run.status = "failed";
        run.error = error instanceof Error ? error.message : String(error);
        run.completedAt = now().toISOString();
        await persist(run);
        throw Object.assign(error instanceof Error ? error : new Error(run.error), { run });
      }
    },
  };
}

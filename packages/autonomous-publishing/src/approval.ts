import type { PublishingAdapters } from "./adapters.js";
import { validatePublicationManifest, type PublicationManifest } from "./manifest.js";
import type { StoryMemory } from "./memory.js";
import type { PublicationRunStore, StoredPublicationRun } from "./run-store.js";

export interface ApprovalPublishOptions {
  now?: () => Date;
  memory?: StoryMemory;
  runStore?: PublicationRunStore;
}

export async function publishApprovedEdition(
  adapters: PublishingAdapters,
  inputManifest: PublicationManifest,
  stored: StoredPublicationRun,
  options: ApprovalPublishOptions = {},
) {
  const manifest = validatePublicationManifest(inputManifest);
  const now = options.now ?? (() => new Date());

  if (stored.run.publicationId !== manifest.id) {
    throw new Error("APPROVAL_PUBLICATION_MISMATCH");
  }
  if (stored.run.status !== "awaiting_approval" || stored.run.stage !== "approval") {
    throw new Error("RUN_NOT_AWAITING_APPROVAL");
  }
  if (!stored.rendered) throw new Error("APPROVAL_RENDERED_EDITION_MISSING");
  if (!stored.rendered.edition.verification.passed) {
    throw new Error("APPROVAL_EDITION_NOT_VERIFIED");
  }

  const run = structuredClone(stored.run);
  const rendered = structuredClone(stored.rendered);

  run.status = "running";
  run.stage = "publish";
  await options.runStore?.save({ run, rendered, publication: stored.publication });

  let publication = stored.publication;

  try {
    publication = await adapters.publisher.publish(rendered, manifest);
    await options.runStore?.save({ run, rendered, publication });
    const publishedAt = now().toISOString();

    if (options.memory) {
      try {
        for (const planned of rendered.edition.plannedStories) {
          await options.memory.remember(planned.story, publishedAt);
        }
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
          editionId: rendered.edition.editionId,
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
    await options.runStore?.save({ run, rendered, publication });

    return { run, rendered, publication };
  } catch (error) {
    run.status = "failed";
    run.error = error instanceof Error ? error.message : String(error);
    run.completedAt = now().toISOString();
    await options.runStore?.save({ run, rendered, publication });
    throw Object.assign(error instanceof Error ? error : new Error(run.error), { run });
  }
}

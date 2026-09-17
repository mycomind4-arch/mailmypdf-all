import type {
  PublicationManifest,
  PublicationRunStore,
  StoryMemory,
  StoryMemoryMatch,
  StoredPublicationRun,
} from "../../../../packages/autonomous-publishing/src/index";
import {
  createProductionPublishingAdapters,
  createPublishingPipeline,
  publishApprovedEdition,
} from "../../../../packages/autonomous-publishing/src/index";
import { publicationCatalog } from "../../../../Projects/Publications/catalog";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getPublicationEntry(publicationId: string) {
  const entry = publicationCatalog.find((candidate) => candidate.manifest.id === publicationId);
  if (!entry) throw new Error("Publication not found");
  return entry;
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function numberEnv(name: string): number | undefined {
  const value = envValue(name);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function assertDeliveryConfigured(manifest: PublicationManifest) {
  const resendReady =
    manifest.integrations.resend === true &&
    Boolean(envValue("RESEND_API_KEY")) &&
    Boolean(envValue("RESEND_SEGMENT_ID")) &&
    Boolean(envValue("RESEND_FROM") ?? envValue("RESEND_FROM_ADDRESS"));

  const listmonkReady =
    manifest.integrations.listmonk === true &&
    Boolean(envValue("LISTMONK_URL")) &&
    Boolean(envValue("LISTMONK_USERNAME")) &&
    Boolean(envValue("LISTMONK_API_TOKEN")) &&
    numberEnv("LISTMONK_LIST_ID") !== undefined;

  if (!resendReady && !listmonkReady) {
    throw new Error("Publication delivery is not configured. Configure an enabled Resend or listmonk provider before approval.");
  }
}

function productionOptions(manifest: PublicationManifest) {
  const horizonEndpoint = envValue("HORIZON_ENDPOINT");
  const crawlEndpoint = envValue("CRAWL4AI_ENDPOINT");
  const embeddingsEndpoint = envValue("PUBLICATION_EMBEDDINGS_ENDPOINT");
  const resendKey = envValue("RESEND_API_KEY");
  const resendSegment = envValue("RESEND_SEGMENT_ID");
  const resendFrom = envValue("RESEND_FROM") ?? envValue("RESEND_FROM_ADDRESS");
  const listmonkUrl = envValue("LISTMONK_URL");
  const listmonkUsername = envValue("LISTMONK_USERNAME");
  const listmonkToken = envValue("LISTMONK_API_TOKEN");
  const listmonkListId = numberEnv("LISTMONK_LIST_ID");
  const umamiUrl = envValue("UMAMI_URL");
  const umamiWebsite = envValue("UMAMI_WEBSITE_ID");
  const publicationHostname = envValue("PUBLICATION_HOSTNAME");

  return {
    env: process.env,
    horizon:
      manifest.integrations.horizon === true && horizonEndpoint
        ? { endpoint: horizonEndpoint, token: envValue("HORIZON_TOKEN") }
        : undefined,
    crawl4ai:
      manifest.integrations.crawl4ai === true && crawlEndpoint
        ? { endpoint: crawlEndpoint, token: envValue("CRAWL4AI_TOKEN") }
        : undefined,
    embeddings:
      manifest.integrations.embeddings === true && embeddingsEndpoint
        ? {
            endpoint: embeddingsEndpoint,
            token: envValue("PUBLICATION_EMBEDDINGS_TOKEN"),
            dimensions: 384,
          }
        : undefined,
    resend:
      manifest.integrations.resend === true && resendKey && resendSegment && resendFrom
        ? {
            apiKey: resendKey,
            segmentId: resendSegment,
            from: resendFrom,
            replyTo: envValue("RESEND_REPLY_TO"),
            sendImmediately: true,
          }
        : undefined,
    listmonk:
      manifest.integrations.listmonk === true &&
      listmonkUrl &&
      listmonkUsername &&
      listmonkToken &&
      listmonkListId
        ? {
            baseUrl: listmonkUrl,
            username: listmonkUsername,
            apiToken: listmonkToken,
            listIds: [listmonkListId],
            templateId: numberEnv("LISTMONK_TEMPLATE_ID"),
            fromEmail: envValue("LISTMONK_FROM_EMAIL"),
            startImmediately: true,
          }
        : undefined,
    umami:
      manifest.integrations.umami === true && umamiUrl && umamiWebsite && publicationHostname
        ? {
            baseUrl: umamiUrl,
            websiteId: umamiWebsite,
            hostname: publicationHostname,
          }
        : undefined,
  };
}

export function createSupabasePublicationRunStore(): PublicationRunStore {
  return {
    async save(value: StoredPublicationRun) {
      const edition = value.rendered?.edition;
      const { error } = await (supabaseAdmin as any)
        .from("publication_runs")
        .upsert(
          {
            run_id: value.run.id,
            publication_id: value.run.publicationId,
            edition_id: edition?.editionId ?? null,
            subject: edition?.subject ?? null,
            status: value.run.status,
            stage: value.run.stage,
            run_json: value.run,
            rendered_json: value.rendered ?? null,
            provider_id: value.publication?.providerId ?? null,
            publication_url: value.publication?.publicationUrl ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "run_id" },
        );
      if (error) throw new Error(error.message);
    },

    async get(runId: string) {
      const { data, error } = await (supabaseAdmin as any)
        .from("publication_runs")
        .select("run_json, rendered_json, provider_id, publication_url")
        .eq("run_id", runId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return undefined;
      return {
        run: data.run_json,
        rendered: data.rendered_json ?? undefined,
        publication:
          data.provider_id || data.publication_url
            ? {
                providerId: data.provider_id ?? undefined,
                publicationUrl: data.publication_url ?? undefined,
              }
            : undefined,
      } as StoredPublicationRun;
    },
  };
}

export function createSupabaseStoryMemory(publicationId: string): StoryMemory {
  return {
    async findSimilar(story, limit = 5): Promise<readonly StoryMemoryMatch[]> {
      const { data: urlRows, error: urlError } = await (supabaseAdmin as any)
        .from("publication_story_memory")
        .select("publication_story_id,published_at")
        .eq("publication_id", publicationId)
        .eq("url", story.url)
        .order("published_at", { ascending: false })
        .limit(limit);
      if (urlError) throw new Error(urlError.message);
      if (urlRows?.length) {
        return urlRows.map((row: any) => ({
          storyId: row.publication_story_id,
          similarity: 1,
          publishedAt: row.published_at,
        }));
      }

      const { data: titleRows, error: titleError } = await (supabaseAdmin as any)
        .from("publication_story_memory")
        .select("publication_story_id,published_at")
        .eq("publication_id", publicationId)
        .eq("title", story.title)
        .order("published_at", { ascending: false })
        .limit(limit);
      if (titleError) throw new Error(titleError.message);
      return (titleRows ?? []).map((row: any) => ({
        storyId: row.publication_story_id,
        similarity: 1,
        publishedAt: row.published_at,
      }));
    },

    async remember(story, publishedAt) {
      const { error } = await (supabaseAdmin as any)
        .from("publication_story_memory")
        .upsert(
          {
            publication_id: publicationId,
            publication_story_id: story.id,
            url: story.url,
            title: story.title,
            published_at: publishedAt,
            metadata: story.metadata ?? {},
          },
          { onConflict: "publication_id,publication_story_id" },
        );
      if (error) throw new Error(error.message);
    },
  };
}

export async function runPublicationPreview(publicationId: string) {
  const { manifest } = getPublicationEntry(publicationId);
  const adapters = createProductionPublishingAdapters(manifest, productionOptions(manifest));
  const runStore = createSupabasePublicationRunStore();
  const memory = createSupabaseStoryMemory(publicationId);
  const pipeline = createPublishingPipeline(adapters, memory, { runStore });
  return pipeline.run(manifest, false);
}

export async function publishStoredPublication(
  publicationId: string,
  runId: string,
  reviewerUserId: string,
  note?: string,
) {
  const { manifest } = getPublicationEntry(publicationId);
  assertDeliveryConfigured(manifest);
  const db = supabaseAdmin as any;

  const { data: claimed, error: claimError } = await db
    .from("publication_runs")
    .update({
      approved_by: reviewerUserId,
      approved_at: new Date().toISOString(),
      approval_note: note?.trim() || null,
    })
    .eq("run_id", runId)
    .eq("publication_id", publicationId)
    .eq("status", "awaiting_approval")
    .is("approved_by", null)
    .select("run_id");

  if (claimError) throw new Error(claimError.message);
  if (!claimed?.length) {
    throw new Error("This publication run was already reviewed or is no longer awaiting approval.");
  }

  const runStore = createSupabasePublicationRunStore();
  const stored = await runStore.get(runId);
  if (!stored) throw new Error("Publication run not found");

  const adapters = createProductionPublishingAdapters(manifest, {
    ...productionOptions(manifest),
    requireDelivery: true,
  });
  const memory = createSupabaseStoryMemory(publicationId);

  return publishApprovedEdition(adapters, manifest, stored, {
    runStore,
    memory,
  });
}

export async function listPublicationRuns(publicationId?: string) {
  let query = (supabaseAdmin as any)
    .from("publication_runs")
    .select("run_id,publication_id,edition_id,subject,status,stage,approved_by,approved_at,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (publicationId) query = query.eq("publication_id", publicationId);
  const { data, error } = await query;
  if (error) {
    if (String(error.message).includes("publication_runs")) {
      return { runs: [], persistenceReady: false };
    }
    throw new Error(error.message);
  }
  return { runs: data ?? [], persistenceReady: true };
}

export async function getPublicationRun(runId: string) {
  const { data, error } = await (supabaseAdmin as any)
    .from("publication_runs")
    .select("run_id,publication_id,edition_id,subject,status,stage,rendered_json,provider_id,publication_url,approved_by,approved_at,approval_note,created_at,updated_at")
    .eq("run_id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Publication run not found");
  return data;
}


export async function rejectStoredPublication(
  publicationId: string,
  runId: string,
  reviewerUserId: string,
  note?: string,
) {
  const db = supabaseAdmin as any;
  const now = new Date().toISOString();

  const { data: row, error: readError } = await db
    .from("publication_runs")
    .select("run_json")
    .eq("run_id", runId)
    .eq("publication_id", publicationId)
    .eq("status", "awaiting_approval")
    .is("approved_by", null)
    .is("rejected_by", null)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!row) throw new Error("This publication run was already reviewed or is no longer awaiting approval.");

  const run = {
    ...row.run_json,
    status: "rejected",
    stage: "approval",
    completedAt: now,
  };

  const { data: rejected, error } = await db
    .from("publication_runs")
    .update({
      status: "rejected",
      stage: "approval",
      run_json: run,
      rejected_by: reviewerUserId,
      rejected_at: now,
      approval_note: note?.trim() || null,
      updated_at: now,
    })
    .eq("run_id", runId)
    .eq("publication_id", publicationId)
    .eq("status", "awaiting_approval")
    .is("approved_by", null)
    .is("rejected_by", null)
    .select("run_id");

  if (error) throw new Error(error.message);
  if (!rejected?.length) {
    throw new Error("This publication run was already reviewed by another request.");
  }
  return { ok: true as const, status: "rejected" as const };
}

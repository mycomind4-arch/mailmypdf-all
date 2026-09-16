import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export const listPublicationsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { publicationCatalog } = await import("../../../../Projects/Publications/catalog");
    const { listPublicationRuns } = await import("@/lib/publication-runtime.server");
    const runData = await listPublicationRuns();

    return {
      persistenceReady: runData.persistenceReady,
      runs: runData.runs,
      publications: publicationCatalog.map(({ manifest, projectPath, status }) => ({
        id: manifest.id,
        name: manifest.name,
        status,
        projectPath,
        audience: manifest.audience.description,
        schedule: manifest.schedule,
        editorial: {
          voice: manifest.editorial.voice,
          storyCount: manifest.editorial.storyCount,
          minimumStoryScore: manifest.editorial.minimumStoryScore,
          sections: [...manifest.editorial.sections],
          avoidRepeatDays: manifest.editorial.avoidRepeatDays,
        },
        sources: (manifest.sources ?? []).map((source) => ({
          id: source.id,
          type: source.type,
          publisher: source.publisher ?? source.id,
          primary: source.primary === true,
          enabled: source.enabled !== false,
        })),
        ai: {
          provider: manifest.ai.provider,
          model: manifest.ai.model,
          configured: configured(manifest.ai.apiKeyEnv),
        },
        autonomy: manifest.autonomy,
        integrations: {
          horizon: {
            enabled: manifest.integrations.horizon === true,
            configured: configured("HORIZON_ENDPOINT"),
          },
          crawl4ai: {
            enabled: manifest.integrations.crawl4ai === true,
            configured: configured("CRAWL4AI_ENDPOINT"),
          },
          resend: {
            enabled: manifest.integrations.resend === true,
            configured:
              configured("RESEND_API_KEY") &&
              configured("RESEND_SEGMENT_ID") &&
              configured("RESEND_FROM"),
          },
          listmonk: {
            enabled: manifest.integrations.listmonk === true,
            configured:
              configured("LISTMONK_URL") &&
              configured("LISTMONK_USERNAME") &&
              configured("LISTMONK_API_TOKEN") &&
              configured("LISTMONK_LIST_ID"),
          },
          umami: {
            enabled: manifest.integrations.umami === true,
            configured:
              configured("UMAMI_URL") &&
              configured("UMAMI_WEBSITE_ID") &&
              configured("PUBLICATION_HOSTNAME"),
          },
        },
      })),
    };
  });

export const runPublicationPreviewForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z.object({ publicationId: z.string().min(1).max(100) }).parse(value),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { runPublicationPreview } = await import("@/lib/publication-runtime.server");
    const result = await runPublicationPreview(data.publicationId);
    return {
      runId: result.run.id,
      status: result.run.status,
      editionId: result.rendered.edition.editionId,
      subject: result.rendered.edition.subject,
    };
  });

export const getPublicationRunForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z.object({ runId: z.string().min(1).max(200) }).parse(value),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { getPublicationRun } = await import("@/lib/publication-runtime.server");
    return getPublicationRun(data.runId);
  });

export const approvePublicationRunForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z.object({
      publicationId: z.string().min(1).max(100),
      runId: z.string().min(1).max(200),
      note: z.string().max(1000).optional(),
    }).parse(value),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { publishStoredPublication } = await import("@/lib/publication-runtime.server");
    const result = await publishStoredPublication(
      data.publicationId,
      data.runId,
      context.userId,
      data.note,
    );
    return {
      ok: true as const,
      status: result.run.status,
      providerId: result.publication?.providerId,
      publicationUrl: result.publication?.publicationUrl,
    };
  });

/**
 * Server function: run a Private Office workflow and persist results.
 *
 * Creates a matter record, runs the Gold Standard workflow analysis,
 * and persists all evidence items to Supabase. Returns the full
 * workflow result plus the matter ID for subsequent operations.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";
import { runPrivateOfficeWorkflow } from "@/domain/private-office-workflow";
import type { EvidenceItem } from "@/domain/gold-standard";

const inputSchema = z.object({
  workflowId: z.string().min(1),
  documentId: z.string().default("uploaded-document"),
  text: z.string(),
  facts: z.record(z.string(), z.string().optional()).default({}),
  objective: z.string().default(""),
  evidenceStatuses: z
    .record(z.string(), z.enum([
      "missing", "requested", "provided", "verified", "rejected", "not_applicable",
    ]))
    .default({}),
});

export const runWorkflow = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // 1. Run the workflow analysis (pure domain logic)
    const result = runPrivateOfficeWorkflow({
      workflowId: data.workflowId as never,
      documentId: data.documentId,
      text: data.text,
      facts: data.facts,
      objective: data.objective,
      evidenceStatuses: data.evidenceStatuses,
    });

    // 2. Persist to Supabase (best-effort — workflow result still returns
    //    even if persistence fails, so the user sees their analysis)
    let matterId: string | null = null;
    try {
      const { supabaseMatterRepository } = await import("@/services/supabase-matter-repository");

      // Create the matter record
      const title = result.analysis.classification.type || data.workflowId;
      const matter = await supabaseMatterRepository.create({
        ownerId: userId,
        workflowId: data.workflowId as never,
        documentId: data.documentId,
        title,
      });
      matterId = matter.id;

      // 3. Persist evidence items
      if (result.analysis.evidence.length > 0) {
        const { supabaseEvidenceRepository } = await import("@/services/supabase-evidence-repository");
        for (const item of result.analysis.evidence) {
          await supabaseEvidenceRepository.upsert(
            userId,
            matter.id,
            item,
            data.documentId,
          );
        }
      }

      // 4. Record the analysis event
      const { supabaseEventRepository } = await import("@/services/supabase-event-repository");
      await supabaseEventRepository.record({
        matterId: matter.id,
        ownerId: userId,
        eventType: "analysis_started",
        metadata: {
          workflow_id: data.workflowId,
          document_id: data.documentId,
          evidence_count: result.analysis.evidence.length,
          findings_count: result.analysis.findings.length,
        },
      });
    } catch {
      // Persistence failed — return result without matterId
      // The user can still see their analysis; they just can't save it
    }

    return {
      matterId,
      ...result,
    };
  });

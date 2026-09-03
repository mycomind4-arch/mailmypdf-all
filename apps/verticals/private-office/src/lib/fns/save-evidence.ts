/**
 * Server function: upsert evidence items for a matter.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";

const evidenceItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(["pending", "verified", "rejected", "missing"]),
  supportsFindingIds: z.array(z.string()).default([]),
});

const inputSchema = z.object({
  matterId: z.string().min(1),
  items: z.array(evidenceItemSchema),
});

export const saveEvidence = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const { supabaseEvidenceRepository } = await import("@/services/supabase-evidence-repository");
    const saved = [];
    for (const item of data.items) {
      const result = await supabaseEvidenceRepository.upsert(
        context.user.id,
        data.matterId,
        item,
      );
      saved.push(result);
    }
    return { items: saved };
  });

/**
 * Complete an externally-attested capability for the authenticated user.
 * Workflow-backed capabilities are deliberately excluded: those can only be
 * granted by completing their authoritative matter through complete-matter.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";
import { capabilityGraph } from "@/domain/capability-graph";
import { CapabilityTransitionError } from "@/domain/capability-lifecycle";

const inputSchema = z.object({ capabilityId: z.string().min(1) });

export const completeCapability = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const capability = capabilityGraph.capabilities[data.capabilityId];
    if (!capability) {
      throw new CapabilityTransitionError(`Unknown capability: ${data.capabilityId}`);
    }
    if (capability.workflowId) {
      throw new CapabilityTransitionError(
        `Capability ${data.capabilityId} is workflow-backed and can only be completed by completing its authoritative matter.`,
      );
    }

    const { supabaseCapabilityStateRepository } = await import("@/services/supabase-capability-state");
    return supabaseCapabilityStateRepository.completeCapability(
      context.user.id,
      data.capabilityId,
    );
  });

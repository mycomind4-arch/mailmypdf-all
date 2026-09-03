/**
 * Server function: mark a capability as complete for the authenticated user.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";

const inputSchema = z.object({
  capabilityId: z.string().min(1),
});

export const completeCapability = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const { supabaseCapabilityStateRepository } = await import("@/services/supabase-capability-state");
    const result = await supabaseCapabilityStateRepository.completeCapability(
      context.user.id,
      data.capabilityId,
    );
    return result;
  });

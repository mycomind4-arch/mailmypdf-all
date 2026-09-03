/**
 * Server function: load the authenticated user's capability state.
 * Also syncs from completed matters before returning.
 */
import { createServerFn } from "@tanstack/react-start";
import { accountAuthMiddleware } from "@/lib/server-function-auth";

export const loadCapabilityState = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const { supabaseMatterRepository } = await import("@/services/supabase-matter-repository");
    const { supabaseCapabilityStateRepository } = await import("@/services/supabase-capability-state");

    // Load completed matters to sync capability state
    const matters = await supabaseMatterRepository.list(userId);
    const completedWorkflowIds = matters
      .filter((m) => m.status === "completed")
      .map((m) => m.workflowId);

    // Sync and return the updated state
    const state = await supabaseCapabilityStateRepository.syncFromMatters(
      userId,
      completedWorkflowIds,
    );

    return { state };
  });

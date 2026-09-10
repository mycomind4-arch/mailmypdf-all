/**
 * Load the authenticated user's capability state and reconcile it from
 * authoritative completed matters before returning it to the UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { accountAuthMiddleware } from "@/lib/server-function-auth";

export const loadCapabilityState = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const { supabaseMatterRepository } = await import("@/services/supabase-matter-repository");
    const { supabaseCapabilityStateRepository } = await import("@/services/supabase-capability-state");

    const matters = await supabaseMatterRepository.list(userId);
    const completedWorkflowIds = matters
      .filter((matter) => matter.status === "completed")
      .map((matter) => matter.workflowId);

    const state = await supabaseCapabilityStateRepository.syncFromMatters(
      userId,
      completedWorkflowIds,
    );

    return { state };
  });

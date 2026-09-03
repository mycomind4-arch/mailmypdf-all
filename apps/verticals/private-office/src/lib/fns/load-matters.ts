/**
 * Server function: load the authenticated user's matters.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";

const inputSchema = z.object({
  workflowId: z.string().optional(),
}).optional();

export const loadMatters = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const { supabaseMatterRepository } = await import("@/services/supabase-matter-repository");
    const matters = await supabaseMatterRepository.list(
      context.user.id,
      data?.workflowId,
    );
    return { matters };
  });

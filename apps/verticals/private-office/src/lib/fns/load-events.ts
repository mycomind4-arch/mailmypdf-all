/**
 * Server function: load audit events for a matter.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";

const inputSchema = z.object({
  matterId: z.string().min(1),
});

export const loadEvents = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const { supabaseEventRepository } = await import("@/services/supabase-event-repository");
    const events = await supabaseEventRepository.list(
      context.user.id,
      data.matterId,
    );
    return { events };
  });

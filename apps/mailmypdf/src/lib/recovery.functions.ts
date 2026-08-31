import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const input = z.object({ email: z.string().email().max(200) });

// Enumeration-safe: response is always success-shaped. If the email matches
// any orders, an email is sent with signed tracking links.
export const requestOrderRecoveryEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }): Promise<{ ok: true } | { error: string; retryAfter: number }> => {
    // Rate limit: 3 recovery emails per hour per email address
    const rl = rateLimit(data.email.toLowerCase(), "recovery-email", { maxRequests: 3, windowMs: 3_600_000 });
    if (!rl.allowed) {
      return { error: "Too many recovery requests. Please try again later.", retryAfter: Math.ceil(rl.resetMs / 1000) };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendOrderRecoveryEmail } = await import("@/lib/email.server");

    // Cap at 20 most recent — anti-abuse.
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, lookup_token, file_name, recipient_city, recipient_state, status, created_at")
      .ilike("email", data.email)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(20);

    if (orders && orders.length > 0) {
      await sendOrderRecoveryEmail(supabaseAdmin, data.email, orders as any);
    }
    return { ok: true };
  });

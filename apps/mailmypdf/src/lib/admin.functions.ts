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

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export const getAdminConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { flags } = await import("@/lib/feature-flags");
    return {
      lobConfigured: flags.isLobEnabled(),
      autoSubmitEnabled: flags.isAutoSubmitEnabled(),
      emailConfigured: flags.isEmailEnabled(),
      flags: flags.toObject(),
    };
  });

export const listFulfillmentQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, email, recipient_name, recipient_city, recipient_state, page_count, price_cents, status, paid_at")
      .in("status", ["paid_pending_manual_fulfillment", "manual_fulfillment_in_progress", "failed_fulfillment", "submitted_to_provider", "provider_processing", "failed_provider_submission"])
      .order("paid_at", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const getAdminOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    const { data: events } = await supabaseAdmin
      .from("order_events")
      .select("type,label,created_at,metadata")
      .eq("order_id", data.id)
      .order("created_at", { ascending: true });
    return { order, events: events ?? [] };
  });

export const getAdminPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("pdf_storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("order-pdfs")
      .createSignedUrl(order.pdf_storage_path, 300);
    if (error || !signed) throw new Error(error?.message ?? "Failed to sign URL");
    return { url: signed.signedUrl };
  });

const updateStatusInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["mark_in_progress", "mark_mailed", "mark_failed"]),
  note: z.string().max(500).optional(),
});

// Allowed current statuses for each action. Prevents accidentally marking
// a draft/unpaid or already-mailed order.
const ALLOWED_FROM = {
  mark_in_progress: ["paid_pending_manual_fulfillment", "failed_fulfillment"],
  mark_mailed: ["paid_pending_manual_fulfillment", "manual_fulfillment_in_progress"],
  mark_failed: ["paid_pending_manual_fulfillment", "manual_fulfillment_in_progress"],
} as const;

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "mark_failed" && (!data.note || !data.note.trim())) {
      throw new Error("A reason is required when marking an order as failed.");
    }

    const map = {
      mark_in_progress: {
        status: "manual_fulfillment_in_progress" as const,
        type: "manual_fulfillment.started",
        label: "Preparing letter for mailing",
        setMailed: false,
      },
      mark_mailed: {
        status: "mailed" as const,
        type: "manual_fulfillment.mailed",
        label: "Mailed",
        setMailed: true,
      },
      mark_failed: {
        status: "failed_fulfillment" as const,
        type: "manual_fulfillment.failed",
        label: "Fulfillment failed — needs review",
        setMailed: false,
      },
    }[data.action];

    const allowedFrom = ALLOWED_FROM[data.action] as unknown as ("paid_pending_manual_fulfillment" | "manual_fulfillment_in_progress" | "failed_fulfillment")[];
    const update = map.setMailed
      ? { status: map.status, mailed_at: new Date().toISOString() }
      : { status: map.status };

    // Conditional update guards against illegal transitions and duplicate
    // clicks — a second "Mark as Mailed" from the same status matches 0 rows.
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("orders")
      .update(update)
      .eq("id", data.id)
      .in("status", allowedFrom)
      .select("id");

    if (updateErr) throw new Error(updateErr.message);
    if (!updated || updated.length === 0) {
      throw new Error(
        `Cannot ${data.action.replace("mark_", "mark as ")} — order is not in an eligible state.`,
      );
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: data.id,
      type: map.type,
      label: map.label,
      metadata: data.note
        ? { note: data.note, admin_user_id: context.userId }
        : { admin_user_id: context.userId },
    });

    if (data.action === "mark_mailed") {
      const { sendMailedEmail } = await import("@/lib/email.server");
      await sendMailedEmail(supabaseAdmin, data.id);
    }

    return { ok: true };
  });

export const addAdminNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), notes: z.string().max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ admin_notes: data.notes })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Manually submit (or retry) an order to Lob from the admin UI.
export const submitOrderToLobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; lobLetterId?: string } | { ok: false; error: string }> => {
    await assertAdmin(context.userId);
    const { submitOrderToLob } = await import("@/lib/lob.server");
    const { flags } = await import("@/lib/feature-flags");
    if (!flags.isLobEnabled()) return { ok: false, error: "LOB_API_KEY is not configured on the server." };
    try {
      const r = await submitOrderToLob(data.id);
      return { ok: true, lobLetterId: "lobLetterId" in r ? r.lobLetterId : undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  });

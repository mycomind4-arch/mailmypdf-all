/**
 * User Dashboard Server Functions
 *
 * All functions require Supabase auth. Orders are scoped to the logged-in
 * user by matching auth.users.email = orders.email.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── Get User Profile ──────────────────────────────────────────────────────────

export const getUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await (supabaseAdmin as any)
      .from("user_profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Get email from auth user claims
    const email = context.claims?.email as string | undefined;

    return {
      id: context.userId,
      email: email ?? "unknown",
      fullName: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      company: profile?.company ?? "",
      marketingOptIn: profile?.marketing_opt_in ?? false,
      createdAt: profile?.created_at ?? null,
    };
  });

// ── Update User Profile ───────────────────────────────────────────────────────

const updateProfileInput = z.object({
  fullName: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  marketingOptIn: z.boolean().optional(),
});

export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateProfileInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.fullName !== undefined) update.full_name = data.fullName;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.company !== undefined) update.company = data.company;
    if (data.marketingOptIn !== undefined) update.marketing_opt_in = data.marketingOptIn;

    const { error } = await (supabaseAdmin as any)
      .from("user_profiles")
      .upsert({ id: context.userId, ...update })
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

// ── Get User Stats (Dashboard Overview) ────────────────────────────────────────

export const getUserStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get email from claims
    const email = context.claims?.email as string;
    if (!email) throw new Error("Unable to determine user email");

    // Fetch all non-draft orders for this email
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, status, price_cents, created_at, mail_class, recipient_city, recipient_state, file_name, letter_text")
      .ilike("email", email)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const totalOrders = orders?.length ?? 0;
    const totalSpentCents = orders?.reduce((sum, o) => sum + (o.price_cents || 0), 0) ?? 0;
    const recentOrders = (orders ?? []).slice(0, 5);

    // Status breakdown
    const byStatus: Record<string, number> = {};
    for (const o of orders ?? []) {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    }

    // This month's stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthOrders = (orders ?? []).filter(
      (o) => new Date(o.created_at) >= monthStart
    );
    const thisMonthCents = thisMonthOrders.reduce((sum, o) => sum + (o.price_cents || 0), 0);

    return {
      totalOrders,
      totalSpentCents,
      thisMonthOrders: thisMonthOrders.length,
      thisMonthCents,
      recentOrders,
      byStatus,
      avgOrderCents: totalOrders > 0 ? Math.round(totalSpentCents / totalOrders) : 0,
    };
  });

// ── Get User Orders (Paginated) ───────────────────────────────────────────────

const getOrdersInput = z.object({
  status: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

export const getUserOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => getOrdersInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = context.claims?.email as string;
    if (!email) throw new Error("Unable to determine user email");

    let query = supabaseAdmin
      .from("orders")
      .select("id, status, price_cents, created_at, mail_class, recipient_name, recipient_city, recipient_state, file_name, letter_text, color, scheduled_delivery_date, lookup_token, lob_letter_id, mailed_at, page_count, vertical_slug")
      .ilike("email", email)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .range((data.page - 1) * data.limit, data.page * data.limit - 1);

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status as never);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error(error.message);

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .ilike("email", email)
      .neq("status", "draft");

    if (data.status && data.status !== "all") {
      countQuery = countQuery.eq("status", data.status as never);
    }

    const { count } = await countQuery;

    return {
      orders: orders ?? [],
      total: count ?? 0,
      page: data.page,
      limit: data.limit,
      totalPages: Math.ceil((count ?? 0) / data.limit),
    };
  });

// ── Get Order Detail (by user) ─────────────────────────────────────────────────

const getOrderDetailInput = z.object({
  orderId: z.string().uuid(),
});

export const getUserOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => getOrderDetailInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = context.claims?.email as string;
    if (!email) throw new Error("Unable to determine user email");

    // Verify this order belongs to the user (email match)
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .ilike("email", email)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found or does not belong to your account");

    // Get events
    const { data: events } = await supabaseAdmin
      .from("order_events")
      .select("type,label,created_at,metadata")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true });

    return { order, events: events ?? [] };
  });

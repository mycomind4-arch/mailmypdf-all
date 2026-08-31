/**
 * Admin dashboard analytics server functions.
 *
 * Provides aggregated metrics for the expanded admin dashboard:
 * - Revenue (total, today, 7d, 30d)
 * - Order counts by status
 * - Failure/retry rates
 * - Webhook health
 * - Provider latency (from metrics registry)
 * - Customer metrics (total, new, returning)
 * - Average order value
 * - Search and filter support
 */

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

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function daysAgo(n: number): string {
  return startOfDay(new Date(Date.now() - n * 86400000)).toISOString();
}

// ── Dashboard Overview ────────────────────────────────────────────────────────

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const todayStart = startOfDay(new Date()).toISOString();
    const sevenDaysAgo = daysAgo(7);
    const thirtyDaysAgo = daysAgo(30);

    // Revenue metrics — sum of price_cents for paid/mailed orders
    const { data: revenueData } = await supabaseAdmin
      .from("orders")
      .select("price_cents, paid_at, status")
      .not("paid_at", "is", null)
      .in("status", ["paid_pending_manual_fulfillment", "manual_fulfillment_in_progress", "submitted_to_provider", "provider_processing", "mailed"]);

    const allPaidOrders = revenueData ?? [];
    const totalRevenue = allPaidOrders.reduce((s, o) => s + (o.price_cents ?? 0), 0);
    const todayRevenue = allPaidOrders
      .filter(o => o.paid_at && o.paid_at >= todayStart)
      .reduce((s, o) => s + (o.price_cents ?? 0), 0);
    const sevenDayRevenue = allPaidOrders
      .filter(o => o.paid_at && o.paid_at >= sevenDaysAgo)
      .reduce((s, o) => s + (o.price_cents ?? 0), 0);
    const thirtyDayRevenue = allPaidOrders
      .filter(o => o.paid_at && o.paid_at >= thirtyDaysAgo)
      .reduce((s, o) => s + (o.price_cents ?? 0), 0);

    // Order counts by status
    const { data: statusData } = await supabaseAdmin
      .from("orders")
      .select("status");
    const statusCounts: Record<string, number> = {};
    for (const o of statusData ?? []) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    }
    const totalOrders = statusData?.length ?? 0;

    // Failure tracking
    const failedFulfillment = statusCounts["failed_fulfillment"] ?? 0;
    const failedProvider = statusCounts["failed_provider_submission"] ?? 0;
    const totalFailures = failedFulfillment + failedProvider;

    // AOV
    const paidCount = allPaidOrders.length;
    const aov = paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0;

    // Customer metrics — unique emails
    const { data: customerData } = await supabaseAdmin
      .from("orders")
      .select("email, created_at");
    const emails = new Set<string>();
    const newCustomers = new Set<string>();
    const returningCustomers = new Set<string>();
    const seenEmails = new Set<string>();
    for (const o of customerData ?? []) {
      emails.add(o.email);
      if (seenEmails.has(o.email)) {
        returningCustomers.add(o.email);
      } else {
        newCustomers.add(o.email);
        seenEmails.add(o.email);
      }
    }
    const totalCustomers = emails.size;

    // Today's orders
    const { data: todayOrders } = await supabaseAdmin
      .from("orders")
      .select("id, price_cents, status, email, created_at")
      .gte("created_at", todayStart)
      .order("created_at", { ascending: false });

    return {
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        sevenDay: sevenDayRevenue,
        thirtyDay: thirtyDayRevenue,
      },
      orders: {
        total: totalOrders,
        today: todayOrders?.length ?? 0,
        byStatus: statusCounts,
        failures: {
          total: totalFailures,
          fulfillment: failedFulfillment,
          provider: failedProvider,
        },
      },
      customers: {
        total: totalCustomers,
        newToday: (todayOrders ?? []).filter(o => !returningCustomers.has(o.email)).length,
        returning: returningCustomers.size,
      },
      aov: aov,
      todayOrders: todayOrders ?? [],
    };
  });

// ── Provider Latency & Webhook Health (from metrics registry) ────────────────

export const getProviderHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { metrics } = await import("@/lib/metrics");
    const snapshot = metrics.getSnapshot();

    // Aggregate counters/histograms by name
    const counterTotals: Record<string, number> = {};
    for (const c of snapshot.counters) {
      counterTotals[c.name] = (counterTotals[c.name] ?? 0) + c.value;
    }

    const latencyMap: Record<string, { count: number; p50: number; p95: number }> = {};
    for (const h of snapshot.histograms) {
      if (!latencyMap[h.name]) {
        latencyMap[h.name] = { count: h.count, p50: h.p50, p95: h.p95 };
      } else {
        // Merge: keep the one with more data
        if (h.count > latencyMap[h.name].count) {
          latencyMap[h.name] = { count: h.count, p50: h.p50, p95: h.p95 };
        }
      }
    }

    return {
      providerLatency: latencyMap,
      webhookEvents: { total: counterTotals["webhook_events_total"] ?? 0 },
      retries: { total: counterTotals["retries_total"] ?? 0 },
      errors: { total: counterTotals["errors_total"] ?? 0 },
      warnings: { total: counterTotals["warnings_total"] ?? 0 },
      rateLimitHits: { total: counterTotals["rate_limit_hits_total"] ?? 0 },
    };
  });

// ── Revenue Time Series (last 30 days) ────────────────────────────────────────

export const getRevenueSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("orders")
      .select("price_cents, paid_at, status")
      .not("paid_at", "is", null)
      .gte("paid_at", daysAgo(30))
      .in("status", ["paid_pending_manual_fulfillment", "manual_fulfillment_in_progress", "submitted_to_provider", "provider_processing", "mailed"])
      .order("paid_at", { ascending: true });

    // Group by day
    const series: Array<{ date: string; revenue: number; orders: number }> = [];
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of data ?? []) {
      const day = (o.paid_at ?? "").slice(0, 10);
      if (!day) continue;
      const existing = dayMap.get(day) ?? { revenue: 0, orders: 0 };
      existing.revenue += o.price_cents ?? 0;
      existing.orders += 1;
      dayMap.set(day, existing);
    }
    // Fill in missing days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dayKey = d.toISOString().slice(0, 10);
      const val = dayMap.get(dayKey) ?? { revenue: 0, orders: 0 };
      series.push({ date: dayKey, revenue: val.revenue, orders: val.orders });
    }

    return { series };
  });

// ── Order Search & Filter ─────────────────────────────────────────────────────

const searchInput = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  page: z.number().int().min(1).max(100).default(1),
  limit: z.number().int().min(1).max(100).default(25),
});

export const searchOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => searchInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("orders")
      .select("id, created_at, email, recipient_name, recipient_city, recipient_state, page_count, price_cents, status, paid_at, mailed_at, lob_letter_id", { count: "exact" })
      .order("created_at", { ascending: false });

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status as never);
    }

    if (data.query && data.query.trim()) {
      const q = data.query.trim();
      // Use ilike for email and recipient_name search
      query = query.or(`email.ilike.%${q}%,recipient_name.ilike.%${q}%,id.eq.${q}`);
    }

    const offset = (data.page - 1) * data.limit;
    query = query.range(offset, offset + data.limit - 1);

    const { data: orders, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      orders: orders ?? [],
      total: count ?? 0,
      page: data.page,
      limit: data.limit,
      totalPages: Math.ceil((count ?? 0) / data.limit),
    };
  });

// ── Failure Detail ─────────────────────────────────────────────────────────────

export const getFailureDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // @ts-expect-error — TanStack server fn type inference with chained .in() calls
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: failedOrders } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, email, recipient_name, status, price_cents, paid_at, lob_letter_id, admin_notes")
      .in("status", ["failed_fulfillment", "failed_provider_submission"])
      .order("created_at", { ascending: false })
      .limit(50);

    // Get failure events for each order
    const orderIds = (failedOrders ?? []).map(o => o.id);
    let failureEvents: Array<{ order_id: string; type: string; label: string; created_at: string; metadata: unknown }> = [];
    if (orderIds.length > 0) {
      const { data: events } = await supabaseAdmin
        .from("order_events")
        .select("order_id, type, label, created_at, metadata")
        .in("order_id", orderIds)
        .in("type", ["lob.submit_failed", "manual_fulfillment.failed", "payment_failed", "lob.webhook_failed"])
        .order("created_at", { ascending: false });
      failureEvents = events ?? [];
    }

    return {
      orders: failedOrders ?? [],
      events: failureEvents,
    };
  });

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

const rangeSchema = z.object({ days: z.number().int().min(1).max(365).default(30) });

export const getAnalyticsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeSchema)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    const { data: events, error } = await supabaseAdmin
      .from("analytics_events")
      .select("event_name, occurred_at, visitor_id, session_id, page, referrer, attribution, technical, properties, user_id")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(50000);
    if (error) throw new Error(error.message);

    const rows = events ?? [];
    const visitors = new Set(rows.map(r => r.visitor_id));
    const sessions = new Set(rows.map(r => r.session_id));
    const authenticated = new Set(rows.filter(r => r.user_id).map(r => r.user_id));
    const eventCounts: Record<string, number> = {};
    const pages: Record<string, number> = {};
    const sources: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    const devices: Record<string, number> = {};
    const daily: Record<string, number> = {};

    for (const r of rows) {
      eventCounts[r.event_name] = (eventCounts[r.event_name] ?? 0) + 1;
      if (r.page) pages[r.page] = (pages[r.page] ?? 0) + 1;
      const source = (r.attribution as Record<string, unknown> | null)?.utm_source;
      if (typeof source === "string") sources[source] = (sources[source] ?? 0) + 1;
      const technical = (r.technical ?? {}) as Record<string, unknown>;
      if (typeof technical.browser === "string") browsers[technical.browser] = (browsers[technical.browser] ?? 0) + 1;
      const device = typeof technical.device_category === "string" ? technical.device_category : "unknown";
      devices[device] = (devices[device] ?? 0) + 1;
      const day = r.occurred_at.slice(0, 10);
      daily[day] = (daily[day] ?? 0) + 1;
    }

    const latestVisitors = Array.from(new Set(rows.map(r => r.visitor_id))).slice(0, 100).map(visitorId => {
      const visitorRows = rows.filter(r => r.visitor_id === visitorId).slice(0, 100);
      const last = visitorRows[0];
      return {
        visitorId: visitorId.slice(0, 12),
        lastSeen: last?.occurred_at,
        events: visitorRows.length,
        sessions: new Set(visitorRows.map(r => r.session_id)).size,
        lastPage: last?.page ?? "—",
        source: (last?.attribution as Record<string, unknown> | null)?.utm_source ?? "direct",
        authenticated: visitorRows.some(r => !!r.user_id),
      };
    });

    return {
      rangeDays: data.days,
      totals: {
        events: rows.length,
        visitors: visitors.size,
        sessions: sessions.size,
        authenticated: authenticated.size,
        pageViews: eventCounts.page_view ?? 0,
        interactions: eventCounts.interaction ?? 0,
      },
      eventCounts,
      pages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 15),
      sources: Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 15),
      browsers: Object.entries(browsers).sort((a, b) => b[1] - a[1]),
      devices: Object.entries(devices).sort((a, b) => b[1] - a[1]),
      daily: Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])),
      latestVisitors,
    };
  });

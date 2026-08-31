import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { isCurrentUserAdmin, listFulfillmentQueue, getAdminConfig } from "@/lib/admin.functions";
import {
  getDashboardOverview,
  getProviderHealth,
  getRevenueSeries,
  searchOrders,
  getFailureDetails,
} from "@/lib/admin-dashboard.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — MailMyPDF" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Tab = "overview" | "queue" | "orders" | "failures" | "health";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="postmark w-fit">Admin</div>
            <h1 className="mt-3 font-serif text-4xl">Dashboard</h1>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>

        <div className="mt-6 flex gap-1 border-b border-rule">
          {(["overview", "queue", "orders", "failures", "health"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                tab === t ? "border-b-2 border-ink text-ink" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "overview" ? "Overview" : t === "queue" ? "Mailing Queue" : t === "orders" ? "All Orders" : t === "failures" ? "Failures" : "System Health"}
            </button>
          ))}
        </div>

        <Suspense fallback={<div className="mt-8 text-sm text-muted-foreground">Loading…</div>}>
          <AdminContent tab={tab} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function AdminContent({ tab }: { tab: Tab }) {
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const { data: adminData } = useSuspenseQuery({
    queryKey: ["is-admin"], queryFn: () => checkAdmin(), retry: false,
  });
  if (!adminData.isAdmin) {
    return (
      <div className="mt-8 envelope-card p-8">
        <h2 className="font-serif text-2xl">Not authorized</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account isn't an admin. Ask an existing admin to grant you access.
        </p>
      </div>
    );
  }

  switch (tab) {
    case "overview": return <OverviewTab />;
    case "queue": return <QueueTab />;
    case "orders": return <OrdersTab />;
    case "failures": return <FailuresTab />;
    case "health": return <HealthTab />;
  }
}

// ── Overview Tab ───────────────────────────────────────────────────────────────

function OverviewTab() {
  const getOverview = useServerFn(getDashboardOverview);
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard-overview"], queryFn: () => getOverview(),
  });

  return (
    <div className="mt-8 space-y-6">
      {/* Revenue tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Revenue" value={`$${(data.revenue.total / 100).toFixed(2)}`} />
        <StatTile label="Today" value={`$${(data.revenue.today / 100).toFixed(2)}`} />
        <StatTile label="7-Day" value={`$${(data.revenue.sevenDay / 100).toFixed(2)}`} />
        <StatTile label="30-Day" value={`$${(data.revenue.thirtyDay / 100).toFixed(2)}`} />
      </div>

      {/* Order + customer tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Orders" value={data.orders.total.toString()} />
        <StatTile label="Today's Orders" value={data.orders.today.toString()} />
        <StatTile label="Avg Order Value" value={`$${(data.aov / 100).toFixed(2)}`} />
        <StatTile label="Customers" value={data.customers.total.toString()} sublabel={`${data.customers.returning} returning`} />
      </div>

      {/* Status breakdown */}
      <div className="envelope-card p-6">
        <h3 className="font-serif text-lg">Orders by Status</h3>
        <div className="mt-4 space-y-2">
          {Object.entries(data.orders.byStatus)
            .sort(([,a],[,b]) => b - a)
            .map(([status, count]) => (
              <div key={status} className="flex items-center justify-between border-b border-rule/40 pb-1 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Today's orders */}
      {data.todayOrders.length > 0 && (
        <div className="envelope-card p-6">
          <h3 className="font-serif text-lg">Today's Orders</h3>
          <div className="mt-4 space-y-2">
            {data.todayOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between border-b border-rule/40 pb-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{o.email}</span>
                <span className="font-semibold">${(o.price_cents / 100).toFixed(2)}</span>
                <StatusPill status={o.status} />
                <Link to="/admin/orders/$id" params={{ id: o.id }}
                  className="rounded-full border border-ink px-3 py-0.5 text-xs hover:bg-ink hover:text-paper">
                  Open
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Queue Tab (existing fulfillment queue) ─────────────────────────────────────

function QueueTab() {
  const listQueue = useServerFn(listFulfillmentQueue);
  const loadConfig = useServerFn(getAdminConfig);
  const { data: cfg } = useSuspenseQuery({ queryKey: ["admin-config"], queryFn: () => loadConfig() });
  const { data } = useSuspenseQuery({
    queryKey: ["admin-queue"], queryFn: () => listQueue(),
  });
  const orders = data.orders;

  return (
    <div className="mt-8 space-y-4">
      {!cfg.lobConfigured && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Lob is not configured.</strong> Paid orders will use manual fulfillment. Add <code>LOB_API_KEY</code> to enable automated print &amp; mail.
        </div>
      )}
      {cfg.lobConfigured && !cfg.autoSubmitEnabled && (
        <div className="rounded-md border border-rule bg-paper-deep px-4 py-3 text-xs text-muted-foreground">
          Lob is connected. Auto-submit is <strong>off</strong> — set <code>AUTO_SUBMIT_TO_LOB=true</code> to submit paid orders automatically, or use "Submit to Lob" on each order.
        </div>
      )}
      <div className="envelope-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-deep text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Placed</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Recipient</th>
              <th className="px-4 py-3 text-left">Where</th>
              <th className="px-4 py-3 text-right">Pages</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Nothing waiting. All caught up.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-rule/60">
                <td className="px-4 py-3 font-mono text-xs" suppressHydrationWarning>{new Date(o.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">{o.email}</td>
                <td className="px-4 py-3">{o.recipient_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{o.recipient_city}, {o.recipient_state}</td>
                <td className="px-4 py-3 text-right">{o.page_count}</td>
                <td className="px-4 py-3 text-right">${(o.price_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to="/admin/orders/$id" params={{ id: o.id }}
                    className="rounded-full border border-ink px-3 py-1 text-xs hover:bg-ink hover:text-paper">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── All Orders Tab (search + filter) ──────────────────────────────────────────

function OrdersTab() {
  const search = useServerFn(searchOrders);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data } = useSuspenseQuery({
    queryKey: ["search-orders", query, statusFilter, page],
    queryFn: () => search({ data: { query: query || undefined, status: statusFilter as never, page, limit: 25 } }),
  });
  const searchData = data as {
    orders: Array<{ id: string; created_at: string; email: string; recipient_name: string; price_cents: number; status: string }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  const statuses = useMemo(() => [
    "all", "draft", "paid_pending_manual_fulfillment", "manual_fulfillment_in_progress",
    "submitted_to_provider", "provider_processing", "mailed",
    "failed_fulfillment", "failed_provider_submission", "cancelled", "refunded",
  ], []);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by email, name, or order ID…"
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          className="flex-1 rounded-md border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        >
          {statuses.map(s => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>
      </div>

      <div className="text-xs text-muted-foreground">
        {searchData.total} order{searchData.total !== 1 ? "s" : ""} — page {data.page} of {searchData.totalPages || 1}
      </div>

      <div className="envelope-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-deep text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Recipient</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {searchData.orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No orders found.</td></tr>
            )}
            {searchData.orders.map((o) => (
              <tr key={o.id} className="border-t border-rule/60">
                <td className="px-4 py-3 font-mono text-xs" suppressHydrationWarning>{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs">{o.email}</td>
                <td className="px-4 py-3 text-xs">{o.recipient_name}</td>
                <td className="px-4 py-3 text-right">${(o.price_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to="/admin/orders/$id" params={{ id: o.id }}
                    className="rounded-full border border-ink px-3 py-1 text-xs hover:bg-ink hover:text-paper">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {searchData.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="rounded-full border border-ink px-4 py-1 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <button
            disabled={page >= searchData.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-full border border-ink px-4 py-1 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ── Failures Tab ──────────────────────────────────────────────────────────────

function FailuresTab() {
  const getFailures = useServerFn(getFailureDetails);
  const { data } = useSuspenseQuery({
    queryKey: ["failure-details"], queryFn: () => getFailures(),
  });
  const failureData = data as { orders: Array<{ id: string; created_at: string; email: string; status: string }>; events: Array<{ order_id: string; label: string }> };

  return (
    <div className="mt-8 space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile label="Failed Fulfillment" value={String(failureData.orders.filter(o => o.status === "failed_fulfillment").length)} />
        <StatTile label="Failed Provider" value={String(failureData.orders.filter(o => o.status === "failed_provider_submission").length)} />
        <StatTile label="Recent Events" value={String(failureData.events.length)} />
      </div>

      <div className="envelope-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-deep text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Last Event</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {failureData.orders.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No failures. All good!</td></tr>
            )}
            {failureData.orders.map(o => {
              const lastEvent = failureData.events.find(e => e.order_id === o.id);
              return (
                <tr key={o.id} className="border-t border-rule/60">
                  <td className="px-4 py-3 font-mono text-xs" suppressHydrationWarning>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs">{o.email}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{lastEvent?.label ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/admin/orders/$id" params={{ id: o.id }}
                      className="rounded-full border border-ink px-3 py-1 text-xs hover:bg-ink hover:text-paper">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── System Health Tab ─────────────────────────────────────────────────────────

function HealthTab() {
  const getHealth = useServerFn(getProviderHealth);
  const getRevenue = useServerFn(getRevenueSeries);
  const { data: health } = useSuspenseQuery({
    queryKey: ["provider-health"], queryFn: () => getHealth(),
  });
  const { data: rev } = useSuspenseQuery({
    queryKey: ["revenue-series"], queryFn: () => getRevenue(),
  });
  const healthData = health as {
    providerLatency: Record<string, { count: number; p50: number; p95: number }>;
    webhookEvents: { total: number };
    retries: { total: number };
    errors: { total: number };
    rateLimitHits: { total: number };
  };
  const revData = rev as { series: Array<{ date: string; revenue: number; orders: number }> };

  // Max revenue for sparkline scaling
  const maxRev = Math.max(...revData.series.map(d => d.revenue), 1);

  return (
    <div className="mt-8 space-y-6">
      {/* Revenue sparkline */}
      <div className="envelope-card p-6">
        <h3 className="font-serif text-lg">Revenue (30 days)</h3>
        <div className="mt-4 flex items-end gap-0.5 h-20">
          {revData.series.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-stamp/60 hover:bg-stamp"
              style={{ height: `${Math.max(2, (d.revenue / maxRev) * 100)}%` }}
              title={`${d.date}: $${(d.revenue / 100).toFixed(2)} (${d.orders} orders)`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>{revData.series[0]?.date}</span>
          <span>{revData.series[revData.series.length - 1]?.date}</span>
        </div>
      </div>

      {/* Provider latency */}
      <div className="envelope-card p-6">
        <h3 className="font-serif text-lg">Provider Latency (ms)</h3>
        <div className="mt-4 space-y-2">
          {Object.entries(healthData.providerLatency).length === 0 && (
            <p className="text-sm text-muted-foreground">No latency data yet — metrics are collected in real time.</p>
          )}
          {Object.entries(healthData.providerLatency).map(([name, hist]: [string, unknown]) => {
            const h = hist as { count?: number; p50?: number; p95?: number; p99?: number };
            return (
              <div key={name} className="flex items-center justify-between border-b border-rule/40 pb-2 text-sm">
                <span className="font-mono text-xs">{name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  p50: {h.p50 ?? 0}ms · p95: {h.p95 ?? 0}ms · n={h.count ?? 0}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Webhook Events" value={String(Object.values(healthData.webhookEvents).reduce((s: number, v: unknown) => s + (typeof v === "number" ? v : 0), 0))} />
        <StatTile label="Retries" value={String(Object.values(healthData.retries).reduce((s: number, v: unknown) => s + (typeof v === "number" ? v : 0), 0))} />
        <StatTile label="Errors" value={String(Object.values(healthData.errors).reduce((s: number, v: unknown) => s + (typeof v === "number" ? v : 0), 0))} />
        <StatTile label="Rate Limit Hits" value={String(Object.values(healthData.rateLimitHits).reduce((s: number, v: unknown) => s + (typeof v === "number" ? v : 0), 0))} />
      </div>
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────

function StatTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="envelope-card p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
      {sublabel && <p className="mt-1 text-[10px] text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status === "paid_pending_manual_fulfillment" ? "Needs mailing"
    : status === "manual_fulfillment_in_progress" ? "In progress"
    : status === "failed_fulfillment" ? "Needs review"
    : status === "submitted_to_provider" ? "Sent to Lob"
    : status === "provider_processing" ? "Lob processing"
    : status === "failed_provider_submission" ? "Lob failed"
    : status === "draft" ? "Draft"
    : status === "mailed" ? "Mailed"
    : status === "cancelled" ? "Cancelled"
    : status === "refunded" ? "Refunded"
    : status;
  return <span className="rounded-full border border-stamp/40 bg-stamp/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-stamp">{label}</span>;
}

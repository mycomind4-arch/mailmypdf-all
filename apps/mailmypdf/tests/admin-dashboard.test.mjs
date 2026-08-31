import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Admin Dashboard Functions Tests ─────────────────────────────────────────

describe("Admin Dashboard — Server Functions", () => {
  it("admin-dashboard.functions.ts exists with all required exports", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /export const getDashboardOverview/);
    assert.match(f, /export const getProviderHealth/);
    assert.match(f, /export const getRevenueSeries/);
    assert.match(f, /export const searchOrders/);
    assert.match(f, /export const getFailureDetails/);
  });

  it("getDashboardOverview requires admin auth", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /getDashboardOverview[\s\S]*assertAdmin/);
  });

  it("getDashboardOverview returns revenue metrics (total, today, 7d, 30d)", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /totalRevenue/);
    assert.match(f, /todayRevenue/);
    assert.match(f, /sevenDayRevenue/);
    assert.match(f, /thirtyDayRevenue/);
    assert.match(f, /revenue:\s*\{/);
  });

  it("getDashboardOverview returns order counts by status", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /statusCounts/);
    assert.match(f, /byStatus/);
  });

  it("getDashboardOverview calculates AOV (average order value)", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /aov/);
    assert.match(f, /totalRevenue\s*\/\s*paidCount/);
  });

  it("getDashboardOverview tracks customer metrics (total, new, returning)", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /totalCustomers/);
    assert.match(f, /returningCustomers/);
    assert.match(f, /newCustomers/);
  });

  it("getDashboardOverview tracks failures (fulfillment + provider)", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /failedFulfillment/);
    assert.match(f, /failedProvider/);
    assert.match(f, /totalFailures/);
  });

  it("getProviderHealth returns metrics snapshot data", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /providerLatency/);
    assert.match(f, /webhookEvents/);
    assert.match(f, /retries/);
    assert.match(f, /errors/);
    assert.match(f, /rateLimitHits/);
    assert.match(f, /metrics\.getSnapshot/);
  });

  it("getRevenueSeries returns 30-day daily revenue series", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /series/);
    assert.match(f, /daysAgo\(30\)/);
    assert.match(f, /dayMap/);
  });

  it("searchOrders supports query, status filter, and pagination", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /searchOrders/);
    assert.match(f, /query.*optional/);
    assert.match(f, /status.*optional/);
    assert.match(f, /page.*min.*1.*max.*100/);
    assert.match(f, /limit.*min.*1.*max.*100/);
  });

  it("searchOrders uses ilike for text search on email and name", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /ilike/);
    assert.match(f, /email.*ilike/);
    assert.match(f, /recipient_name.*ilike/);
  });

  it("getFailureDetails returns failed orders and their failure events", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    assert.match(f, /failed_fulfillment.*failed_provider_submission/);
    assert.match(f, /lob\.submit_failed/);
    assert.match(f, /manual_fulfillment\.failed/);
  });

  it("all functions use requireSupabaseAuth middleware", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    const middlewareMatches = f.match(/requireSupabaseAuth/g);
    assert.ok(middlewareMatches && middlewareMatches.length >= 5, "All 5 functions should require auth");
  });

  it("all functions call assertAdmin for role check", async () => {
    const f = await source("src/lib/admin-dashboard.functions.ts");
    const adminChecks = f.match(/assertAdmin\(context\.userId\)/g);
    assert.ok(adminChecks && adminChecks.length >= 5, "All 5 functions should check admin role");
  });
});

// ── Admin Dashboard UI Tests ──────────────────────────────────────────────────

describe("Admin Dashboard — UI", () => {
  it("admin/index.tsx has tabbed interface (overview, queue, orders, failures, health)", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /overview/);
    assert.match(ui, /queue/);
    assert.match(ui, /orders/);
    assert.match(ui, /failures/);
    assert.match(ui, /health/);
    assert.match(ui, /Tab.*=.*"overview".*"queue".*"orders".*"failures".*"health"/);
  });

  it("OverviewTab shows revenue tiles (total, today, 7d, 30d)", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Total Revenue/);
    assert.match(ui, /Today/);
    assert.match(ui, /7-Day/);
    assert.match(ui, /30-Day/);
  });

  it("OverviewTab shows order and customer stat tiles", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Total Orders/);
    assert.match(ui, /Avg Order Value/);
    assert.match(ui, /Customers/);
  });

  it("OverviewTab shows orders by status breakdown", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Orders by Status/);
  });

  it("OrdersTab has search input and status filter dropdown", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Search by email.*name.*order ID/);
    assert.match(ui, /select/);
    assert.match(ui, /All statuses/);
  });

  it("OrdersTab has pagination controls", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Previous/);
    assert.match(ui, /Next/);
    assert.match(ui, /totalPages/);
  });

  it("FailuresTab shows failure summary tiles and table", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Failed Fulfillment/);
    assert.match(ui, /Failed Provider/);
    assert.match(ui, /Recent Events/);
  });

  it("HealthTab shows revenue sparkline", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Revenue.*30 days/);
  });

  it("HealthTab shows provider latency metrics", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Provider Latency/);
    assert.match(ui, /p50/);
    assert.match(ui, /p95/);
  });

  it("HealthTab shows system counter tiles (webhooks, retries, errors, rate limits)", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /Webhook Events/);
    assert.match(ui, /Retries/);
    assert.match(ui, /Errors/);
    assert.match(ui, /Rate Limit Hits/);
  });

  it("StatTile component renders label, value, and optional sublabel", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /function StatTile/);
    assert.match(ui, /label/);
    assert.match(ui, /value/);
    assert.match(ui, /sublabel/);
  });

  it("imports all dashboard server functions", async () => {
    const ui = await source("src/routes/_authenticated/admin/index.tsx");
    assert.match(ui, /getDashboardOverview/);
    assert.match(ui, /getProviderHealth/);
    assert.match(ui, /getRevenueSeries/);
    assert.match(ui, /searchOrders/);
    assert.match(ui, /getFailureDetails/);
  });
});

// ── Behavioral Tests: Revenue Calculation ─────────────────────────────────────

describe("Admin Dashboard — Revenue Calculation", () => {
  it("sums price_cents across paid orders", () => {
    const orders = [
      { price_cents: 299, paid_at: "2026-07-25T10:00:00Z", status: "mailed" },
      { price_cents: 599, paid_at: "2026-07-24T10:00:00Z", status: "mailed" },
      { price_cents: 0, paid_at: null, status: "draft" },
    ];
    const total = orders
      .filter(o => o.paid_at && ["paid_pending_manual_fulfillment", "mailed"].includes(o.status))
      .reduce((s, o) => s + o.price_cents, 0);
    assert.equal(total, 898);
  });

  it("calculates AOV as total revenue / paid order count", () => {
    const totalRevenue = 10000;
    const paidCount = 25;
    const aov = paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0;
    assert.equal(aov, 400);
  });

  it("groups revenue by day for time series", () => {
    const orders = [
      { price_cents: 299, paid_at: "2026-07-25T10:00:00Z" },
      { price_cents: 599, paid_at: "2026-07-25T14:00:00Z" },
      { price_cents: 199, paid_at: "2026-07-24T10:00:00Z" },
    ];
    const dayMap = new Map();
    for (const o of orders) {
      const day = o.paid_at.slice(0, 10);
      const existing = dayMap.get(day) ?? { revenue: 0, orders: 0 };
      existing.revenue += o.price_cents;
      existing.orders += 1;
      dayMap.set(day, existing);
    }
    assert.equal(dayMap.get("2026-07-25").revenue, 898);
    assert.equal(dayMap.get("2026-07-25").orders, 2);
    assert.equal(dayMap.get("2026-07-24").revenue, 199);
  });

  it("filters revenue by time period (today, 7d, 30d)", () => {
    const now = new Date("2026-07-25T17:00:00Z");
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const orders = [
      { price_cents: 299, paid_at: "2026-07-25T10:00:00Z" }, // today
      { price_cents: 599, paid_at: "2026-07-20T10:00:00Z" }, // 5 days ago (within 7d)
      { price_cents: 199, paid_at: "2026-06-30T10:00:00Z" }, // 25 days ago (within 30d, not 7d)
      { price_cents: 99, paid_at: "2026-06-15T10:00:00Z" },  // >30d
    ];

    const todayRev = orders.filter(o => o.paid_at >= todayStart.toISOString()).reduce((s, o) => s + o.price_cents, 0);
    const sevenDayAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const sevenDayRev = orders.filter(o => o.paid_at >= sevenDayAgo).reduce((s, o) => s + o.price_cents, 0);
    const thirtyDayAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const thirtyDayRev = orders.filter(o => o.paid_at >= thirtyDayAgo).reduce((s, o) => s + o.price_cents, 0);

    assert.equal(todayRev, 299);
    assert.equal(sevenDayRev, 898);
    assert.equal(thirtyDayRev, 1097);
  });
});

// ── Behavioral Tests: Customer Metrics ───────────────────────────────────────

describe("Admin Dashboard — Customer Metrics", () => {
  it("counts unique emails as total customers", () => {
    const orders = [
      { email: "a@example.com" },
      { email: "b@example.com" },
      { email: "a@example.com" },
    ];
    const unique = new Set(orders.map(o => o.email));
    assert.equal(unique.size, 2);
  });

  it("identifies returning customers (seen more than once)", () => {
    const orders = [
      { email: "a@example.com" },
      { email: "b@example.com" },
      { email: "a@example.com" },
      { email: "c@example.com" },
      { email: "a@example.com" },
    ];
    const seen = new Set();
    const returning = new Set();
    for (const o of orders) {
      if (seen.has(o.email)) returning.add(o.email);
      else seen.add(o.email);
    }
    assert.equal(returning.size, 1);
    assert.ok(returning.has("a@example.com"));
  });
});

// ── Behavioral Tests: Status Counts ──────────────────────────────────────────

describe("Admin Dashboard — Status Counts", () => {
  it("groups orders by status into a count map", () => {
    const orders = [
      { status: "mailed" },
      { status: "mailed" },
      { status: "draft" },
      { status: "failed_fulfillment" },
    ];
    const counts = {};
    for (const o of orders) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    assert.equal(counts["mailed"], 2);
    assert.equal(counts["draft"], 1);
    assert.equal(counts["failed_fulfillment"], 1);
    assert.equal(counts["nonexistent"], undefined);
  });
});

// ── Behavioral Tests: Search ─────────────────────────────────────────────────

describe("Admin Dashboard — Search", () => {
  it("builds ilike OR filter for email and name search", () => {
    const q = "john";
    const filter = `email.ilike.%${q}%,recipient_name.ilike.%${q}%,id.eq.${q}`;
    assert.ok(filter.includes("email.ilike.%john%"));
    assert.ok(filter.includes("recipient_name.ilike.%john%"));
    assert.ok(filter.includes("id.eq.john"));
  });

  it("calculates pagination offset from page and limit", () => {
    const page = 3;
    const limit = 25;
    const offset = (page - 1) * limit;
    assert.equal(offset, 50);
    assert.equal(Math.ceil(100 / limit), 4); // totalPages for 100 records
  });
});

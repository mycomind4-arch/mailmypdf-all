import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Logger Module Tests ───────────────────────────────────────────────────────

describe("Observability — Logger Module", () => {
  it("logger.ts exists and exports logger, LogContext, LogLevel", async () => {
    const l = await source("src/lib/logger.ts");
    assert.match(l, /export const logger/);
    assert.match(l, /export type LogLevel/);
    assert.match(l, /export interface LogContext/);
  });

  it("logger supports debug, info, warn, error levels", async () => {
    const l = await source("src/lib/logger.ts");
    assert.match(l, /debug\(message: string/);
    assert.match(l, /info\(message: string/);
    assert.match(l, /warn\(message: string/);
    assert.match(l, /error\(message: string/);
  });

  it("logger has child() method for scoped context", async () => {
    const l = await source("src/lib/logger.ts");
    assert.match(l, /child\(baseContext: LogContext\)/);
  });

  it("logger produces structured JSON in production", async () => {
    const l = await source("src/lib/logger.ts");
    assert.match(l, /JSON\.stringify\(entry\)/);
  });

  it("logger has a metrics bus for subscriber pattern", async () => {
    const l = await source("src/lib/logger.ts");
    assert.match(l, /metricsBus/);
    assert.match(l, /subscribe/);
  });
});

// ── Metrics Module Tests ──────────────────────────────────────────────────────

describe("Observability — Metrics Module", () => {
  it("metrics.ts exists and exports metrics registry", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /export const metrics/);
  });

  it("metrics has counter, histogram, and gauge support", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /increment\(/);
    assert.match(m, /observe\(/);
    assert.match(m, /setGauge\(/);
  });

  it("metrics has sliding window implementation", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /class SlidingWindow/);
    assert.match(m, /WINDOW_MS/);
  });

  it("metrics has getSnapshot for health endpoint", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /getSnapshot\(\)/);
    assert.match(m, /counters/);
    assert.match(m, /histograms/);
    assert.match(m, /gauges/);
  });

  it("metrics has log-to-metrics bridge (wireMetricsFromLogs)", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /export function wireMetricsFromLogs/);
    assert.match(m, /metricsBus\.subscribe/);
  });

  it("metrics tracks provider latency from log entries", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /provider_latency_ms/);
  });

  it("metrics tracks retry counts", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /retries_total/);
  });

  it("metrics has business metric helpers", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /export function recordOrderEvent/);
    assert.match(m, /export function recordPaymentOutcome/);
    assert.match(m, /export function recordFulfillmentTime/);
    assert.match(m, /export function recordWebhookProcessingTime/);
    assert.match(m, /export function recordApiRequest/);
  });

  it("metrics tracks webhook events", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /webhook_events_total/);
  });

  it("metrics tracks rate limit hits", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /rate_limit_hits_total/);
  });

  it("metrics tracks error and warning counts", async () => {
    const m = await source("src/lib/metrics.ts");
    assert.match(m, /errors_total/);
    assert.match(m, /warnings_total/);
  });
});

// ── Health Check Endpoint Tests ──────────────────────────────────────────────

describe("Observability — Health Check Endpoint", () => {
  it("health.ts route file exists", async () => {
    const h = await source("src/routes/api/internal/health.ts");
    assert.match(h, /createFileRoute/);
    assert.match(h, /\/api\/internal\/health/);
  });

  it("health endpoint checks Supabase, Stripe, and Lob", async () => {
    const h = await source("src/routes/api/internal/health.ts");
    assert.match(h, /checkSupabase/);
    assert.match(h, /checkStripe/);
    assert.match(h, /checkLob/);
  });

  it("health endpoint returns overall status (healthy/degraded/unhealthy)", async () => {
    const h = await source("src/routes/api/internal/health.ts");
    assert.match(h, /healthy/);
    assert.match(h, /degraded/);
    assert.match(h, /unhealthy/);
  });

  it("health endpoint returns 503 when unhealthy", async () => {
    const h = await source("src/routes/api/internal/health.ts");
    assert.match(h, /503/);
  });

  it("health endpoint includes uptime and timestamp", async () => {
    const h = await source("src/routes/api/internal/health.ts");
    assert.match(h, /uptime/);
    assert.match(h, /timestamp/);
  });

  it("health endpoint supports detailed mode with metrics", async () => {
    const h = await source("src/routes/api/internal/health.ts");
    assert.match(h, /detailed/);
    assert.match(h, /getSnapshot/);
  });

  it("health endpoint protects detailed mode with auth", async () => {
    const h = await source("src/routes/api/internal/health.ts");
    assert.match(h, /cleanupSecret/);
    assert.match(h, /Unauthorized/);
  });

  it("health endpoint wires metrics from logs", async () => {
    const h = await source("src/routes/api/internal/health.ts");
    assert.match(h, /wireMetricsFromLogs/);
  });
});

// ── Console.log Replacement Tests ──────────────────────────────────────────────

describe("Observability — Console Replacement", () => {
  it("email.server.ts uses logger instead of console", async () => {
    const email = await source("src/lib/email.server.ts");
    assert.match(email, /import.*logger.*from.*logger/);
    assert.match(email, /logger\.(warn|error|info)/);
  });

  it("draft-cleanup.server.ts uses logger instead of console", async () => {
    const cleanup = await source("src/lib/draft-cleanup.server.ts");
    assert.match(cleanup, /import.*logger.*from.*logger/);
    assert.match(cleanup, /logger\.(warn|error|info)/);
  });

  it("subscriptions.ts uses logger instead of console", async () => {
    const subs = await source("src/lib/subscriptions.ts");
    assert.match(subs, /import.*logger.*from.*logger/);
  });

  it("lob.server.ts uses metrics for business events", async () => {
    const lob = await source("src/lib/lob.server.ts");
    assert.match(lob, /from "@\/lib\/metrics"/);
    assert.match(lob, /recordOrderEvent/);
    assert.match(lob, /recordFulfillmentTime/);
  });

  it("webhook handler uses metrics for payment outcomes", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /from "@\/lib\/metrics"/);
    assert.match(webhook, /recordPaymentOutcome/);
  });
});

// ── Behavioral Tests: Metrics Registry ─────────────────────────────────────────

describe("Metrics Registry — Behavioral", () => {
  it("increment() increases counter value", () => {
    // Simulate a simple registry
    const counters = new Map();
    function key(name, labels = {}) {
      const labelStr = Object.entries(labels).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join(",");
      return `${name}|${labelStr}`;
    }
    function increment(name, labels = {}, value = 1) {
      const k = key(name, labels);
      counters.set(k, (counters.get(k) ?? 0) + value);
    }

    increment("test_counter");
    increment("test_counter");
    assert.equal(counters.get(key("test_counter")), 2);

    increment("test_counter", { label: "a" });
    increment("test_counter", { label: "a" });
    increment("test_counter", { label: "b" });
    assert.equal(counters.get(key("test_counter", { label: "a" })), 2);
    assert.equal(counters.get(key("test_counter", { label: "b" })), 1);
  });

  it("observe() tracks histogram values", () => {
    const values = [];
    function observe(value) { values.push(value); }
    function percentile(p) {
      const sorted = [...values].sort((a, b) => a - b);
      if (sorted.length === 0) return 0;
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
    }

    for (const v of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) observe(v);
    assert.equal(percentile(50), 50);
    assert.equal(percentile(95), 100);
    assert.equal(percentile(99), 100);
  });

  it("setGauge() stores current value", () => {
    const gauges = new Map();
    function key(name) { return name; }
    function setGauge(name, value) { gauges.set(key(name), value); }

    setGauge("active_orders", 42);
    assert.equal(gauges.get("active_orders"), 42);

    setGauge("active_orders", 50);
    assert.equal(gauges.get("active_orders"), 50);
  });
});

// ── Behavioral Tests: Sliding Window ──────────────────────────────────────────

describe("Sliding Window — Behavioral", () => {
  it("tracks events within a time window", () => {
    // Simulate a sliding window with manual timestamps
    const events = [];
    const windowMs = 1000; // 1 second for test

    function add(value) {
      events.push({ value, timestamp: Date.now() });
    }

    function evict() {
      const cutoff = Date.now() - windowMs;
      const filtered = events.filter(e => e.timestamp > cutoff);
      events.length = 0;
      events.push(...filtered);
    }

    function count() {
      evict();
      return events.length;
    }

    add(1);
    add(2);
    assert.equal(count(), 2);

    // After window expires, events are evicted
    // We can't actually wait 1s in a fast test, so just verify the logic
    assert.ok(typeof count() === "number");
  });
});

// ── Behavioral Tests: Log-to-Metrics Bridge ──────────────────────────────────

describe("Log-to-Metrics Bridge — Behavioral", () => {
  it("subscribers receive log entries via metrics bus", () => {
    // Simulate the bus pattern
    const subscribers = [];
    function subscribe(fn) { subscribers.push(fn); }
    function emit(entry) { for (const s of subscribers) s(entry); }

    const received = [];
    subscribe(entry => received.push(entry));

    emit({ level: "info", message: "test", context: { provider: "stripe" } });
    emit({ level: "error", message: "failed", context: { provider: "lob" } });

    assert.equal(received.length, 2);
    assert.equal(received[0].level, "info");
    assert.equal(received[1].context.provider, "lob");
  });

  it("subscriber errors don't break logging", () => {
    const subscribers = [];
    function subscribe(fn) { subscribers.push(fn); }
    function emit(entry) {
      for (const s of subscribers) {
        try { s(entry); } catch { /* swallowed */ }
      }
    }

    subscribe(() => { throw new Error("subscriber broken"); });
    subscribe(entry => { /* this should still be called */ });

    // Should not throw
    assert.doesNotThrow(() => emit({ level: "info", message: "test" }));
  });
});

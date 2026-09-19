/**
 * Metrics collection for MailMyPDF.
 *
 * Tracks key operational metrics for SLI/SLO monitoring:
 * - Provider latency (Stripe, Lob, Resend, Supabase)
 * - Retry counts per provider
 * - Order fulfillment times (payment → lob submission)
 * - Payment metrics (success/failure rates)
 * - Webhook processing times
 * - Rate limit hits
 * - Error counts by category
 *
 * Metrics are stored in-memory with sliding windows and can be
 * scraped by the /api/internal/health endpoint.
 *
 * In production, these would be exported to a metrics backend
 * (Datadog, Cloudflare Analytics, etc.) via the metricsBus subscriber.
 */

import { metricsBus, type LogEntry } from "@/lib/logger";

// ── Metric Types ─────────────────────────────────────────────────────────────

export interface CounterMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
}

export interface HistogramMetric {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  labels: Record<string, string>;
}

export interface GaugeMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
}

// ── Sliding Window Counter ───────────────────────────────────────────────────

const WINDOW_MS = 5 * 60 * 1000; // 5-minute sliding window

interface TimedEvent {
  value: number;
  timestamp: number;
}

class SlidingWindow {
  private events: TimedEvent[] = [];
  private windowMs: number;

  constructor(windowMs = WINDOW_MS) {
    this.windowMs = windowMs;
  }

  add(value: number): void {
    const now = Date.now();
    this.events.push({ value, timestamp: now });
    this.evict(now);
  }

  private evict(now: number): void {
    const cutoff = now - this.windowMs;
    this.events = this.events.filter((e) => e.timestamp > cutoff);
  }

  get count(): number {
    this.evict(Date.now());
    return this.events.length;
  }

  get sum(): number {
    this.evict(Date.now());
    return this.events.reduce((s, e) => s + e.value, 0);
  }

  get values(): number[] {
    this.evict(Date.now());
    return this.events.map((e) => e.value);
  }

  percentile(p: number): number {
    const vals = this.values.sort((a, b) => a - b);
    if (vals.length === 0) return 0;
    const idx = Math.ceil((p / 100) * vals.length) - 1;
    return vals[Math.max(0, Math.min(idx, vals.length - 1))];
  }
}

// ── Metrics Registry ─────────────────────────────────────────────────────────

class MetricsRegistry {
  // Counters by name + labels
  private counters = new Map<string, number>();
  private counterWindows = new Map<string, SlidingWindow>();

  // Histograms by name + labels
  private histograms = new Map<string, SlidingWindow>();

  // Gauges (current value)
  private gauges = new Map<string, number>();

  // Total counters (all-time, not windowed)
  private totalEvents = new Map<string, number>();

  private key(name: string, labels: Record<string, string> = {}): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}|${labelStr}`;
  }

  increment(name: string, labels: Record<string, string> = {}, value = 1): void {
    const k = this.key(name, labels);
    this.counters.set(k, (this.counters.get(k) ?? 0) + value);

    // Total (all-time)
    this.totalEvents.set(k, (this.totalEvents.get(k) ?? 0) + value);

    // Sliding window
    if (!this.counterWindows.has(k)) {
      this.counterWindows.set(k, new SlidingWindow());
    }
    this.counterWindows.get(k)!.add(value);
  }

  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const k = this.key(name, labels);
    if (!this.histograms.has(k)) {
      this.histograms.set(k, new SlidingWindow());
    }
    this.histograms.get(k)!.add(value);
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.gauges.set(this.key(name, labels), value);
  }

  // ── Snapshot for health endpoint ────────────────────────────────────────────

  getSnapshot(): {
    counters: CounterMetric[];
    histograms: HistogramMetric[];
    gauges: GaugeMetric[];
    totals: { name: string; value: number; labels: Record<string, string> }[];
  } {
    const counters: CounterMetric[] = [];
    const now = new Date().toISOString();

    for (const [k, value] of this.totalEvents) {
      const [name, labelStr] = k.split("|");
      const labels: Record<string, string> = {};
      if (labelStr) {
        for (const pair of labelStr.split(",")) {
          const [lk, lv] = pair.split("=");
          if (lk) labels[lk] = lv;
        }
      }
      counters.push({ name, value, labels, timestamp: now });
    }

    const histograms: HistogramMetric[] = [];
    for (const [k, window] of this.histograms) {
      const [name, labelStr] = k.split("|");
      const labels: Record<string, string> = {};
      if (labelStr) {
        for (const pair of labelStr.split(",")) {
          const [lk, lv] = pair.split("=");
          if (lk) labels[lk] = lv;
        }
      }
      const vals = window.values;
      const sum = vals.reduce((s, v) => s + v, 0);
      histograms.push({
        name,
        count: window.count,
        sum,
        min: vals.length > 0 ? Math.min(...vals) : 0,
        max: vals.length > 0 ? Math.max(...vals) : 0,
        avg: vals.length > 0 ? sum / vals.length : 0,
        p50: window.percentile(50),
        p95: window.percentile(95),
        labels,
      });
    }

    const gauges: GaugeMetric[] = [];
    for (const [k, value] of this.gauges) {
      const [name, labelStr] = k.split("|");
      const labels: Record<string, string> = {};
      if (labelStr) {
        for (const pair of labelStr.split(",")) {
          const [lk, lv] = pair.split("=");
          if (lk) labels[lk] = lv;
        }
      }
      gauges.push({ name, value, labels, timestamp: now });
    }

    return {
      counters,
      histograms,
      gauges,
      totals: Array.from(this.totalEvents.entries()).map(([k, value]) => {
        const [name, labelStr] = k.split("|");
        const labels: Record<string, string> = {};
        if (labelStr) {
          for (const pair of labelStr.split(",")) {
            const [lk, lv] = pair.split("=");
            if (lk) labels[lk] = lv;
          }
        }
        return { name, value, labels };
      }),
    };
  }

  reset(): void {
    this.counters.clear();
    this.counterWindows.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.totalEvents.clear();
  }
}

export const metrics = new MetricsRegistry();

// ── Log-to-Metrics Bridge ─────────────────────────────────────────────────────

/**
 * Subscribe to the logger's metrics bus and extract metrics
 * from structured log entries.
 *
 * This is called once at startup — it wires the log stream into
 * the metrics registry automatically.
 */
export function wireMetricsFromLogs(): void {
  metricsBus.subscribe((entry: LogEntry) => {
    const { context, level, message } = entry;

    // Count errors by provider
    if (level === "error" && context.provider) {
      metrics.increment("errors_total", { provider: context.provider, operation: context.operation ?? "unknown" });
    }

    // Count warnings by provider
    if (level === "warn" && context.provider) {
      metrics.increment("warnings_total", { provider: context.provider, operation: context.operation ?? "unknown" });
    }

    // Track provider latency from log entries that include durationMs
    if (context.durationMs != null && context.provider) {
      metrics.observe("provider_latency_ms", context.durationMs as number, {
        provider: context.provider as string,
        operation: (context.operation as string) ?? "unknown",
      });
    }

    // Track retries
    if (context.attempt != null && context.attempt as number > 0) {
      metrics.increment("retries_total", {
        provider: (context.provider as string) ?? "unknown",
      });
    }

    // Track webhook events
    if (context.provider && typeof context.provider === "string") {
      if (message.includes("webhook") || (context.operation ?? "").startsWith("webhook:")) {
        metrics.increment("webhook_events_total", {
          provider: context.provider,
          event: (context.operation as string) ?? "unknown",
        });
      }
    }

    // Rate limit hits
    if (message.includes("Rate limit exceeded") || message.includes("rate_limited")) {
      metrics.increment("rate_limit_hits_total", {});
    }
  });
}

// ── Business Metrics ──────────────────────────────────────────────────────────

/**
 * Record an order lifecycle event for fulfillment time tracking.
 */
export function recordOrderEvent(event: string, orderId: string, metadata?: Record<string, unknown>): void {
  metrics.increment(`order_${event}_total`, {});
  if (event === "created" || event === "paid" || event === "submitted" || event === "fulfilled") {
    metrics.setGauge("order_last_event_timestamp", Date.now(), { event, orderId });
  }
}

/**
 * Record a payment outcome.
 */
export function recordPaymentOutcome(success: boolean, amountCents?: number): void {
  metrics.increment("payments_total", { outcome: success ? "success" : "failure" });
  if (success && amountCents != null) {
    metrics.increment("payments_revenue_cents", { outcome: "success" }, amountCents);
  }
}

/**
 * Record a fulfillment timing (from payment to lob submission).
 */
export function recordFulfillmentTime(minutes: number): void {
  metrics.observe("fulfillment_time_minutes", minutes, {});
}

/**
 * Record a webhook processing time.
 */
export function recordWebhookProcessingTime(provider: string, eventType: string, durationMs: number): void {
  metrics.observe("webhook_processing_ms", durationMs, { provider, event: eventType });
}

/**
 * Record an API request timing.
 */
export function recordApiRequest(provider: string, operation: string, durationMs: number, success: boolean): void {
  metrics.observe("api_request_ms", durationMs, { provider, operation });
  metrics.increment("api_requests_total", { provider, operation, outcome: success ? "success" : "failure" });
}

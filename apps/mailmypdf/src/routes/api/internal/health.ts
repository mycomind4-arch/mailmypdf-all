/**
 * Health check endpoint for MailMyPDF.
 *
 * GET /api/internal/health
 *
 * Returns service health status including:
 * - Overall status (healthy / degraded / unhealthy)
 * - Dependency checks (Supabase, Stripe, Lob)
 * - System metrics (uptime, memory)
 * - Operational metrics from the metrics registry
 *
 * Protected by MAILMYPDF_CLEANUP_SECRET for detailed metrics.
 * Basic health (status only) is available without auth.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getOrCreateRequestId, attachRequestId } from "@/lib/request-id";
import { getConfig } from "@/config";
import { metrics, wireMetricsFromLogs } from "@/lib/metrics";

// Wire metrics from logs once on module load
wireMetricsFromLogs();

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  message?: string;
}

async function checkSupabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").select("id").limit(1);
    const latencyMs = Date.now() - start;
    if (error) {
      return { name: "supabase", status: "degraded", latencyMs, message: error.message };
    }
    return { name: "supabase", status: "healthy", latencyMs };
  } catch (e) {
    return { name: "supabase", status: "unhealthy", message: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function checkStripe(): Promise<HealthCheck> {
  const config = getConfig();
  if (!config.stripe.secretKey) {
    return { name: "stripe", status: "degraded", message: "Stripe not configured" };
  }
  return { name: "stripe", status: "healthy", message: "Configured" };
}

async function checkLob(): Promise<HealthCheck> {
  const lobKey = process.env.LOB_SECRET_KEY ?? process.env.LOB_SANDBOX_SECRET_KEY;
  if (!lobKey) {
    return { name: "lob", status: "degraded", message: "Lob not configured" };
  }
  return { name: "lob", status: "healthy", message: "Configured" };
}

export const Route = createFileRoute("/api/internal/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestId = getOrCreateRequestId(request);
        const url = new URL(request.url);
        const detailed = url.searchParams.get("detailed") === "1";
        const config = getConfig();

        // Auth check for detailed metrics
        if (detailed) {
          const authHeader = request.headers.get("authorization");
          if (!config.jobs.cleanupSecret || authHeader !== `Bearer ${config.jobs.cleanupSecret}`) {
            const resp = Response.json({ error: "Unauthorized" }, { status: 401 });
            return attachRequestId(resp, requestId);
          }
        }

        // Run health checks in parallel
        const [supabaseCheck, stripeCheck, lobCheck] = await Promise.all([
          checkSupabase(),
          checkStripe(),
          checkLob(),
        ]);

        const checks: HealthCheck[] = [supabaseCheck, stripeCheck, lobCheck];

        // Determine overall status
        const unhealthy = checks.filter((c) => c.status === "unhealthy");
        const degraded = checks.filter((c) => c.status === "degraded");
        const overall = unhealthy.length > 0 ? "unhealthy" : degraded.length > 0 ? "degraded" : "healthy";

        const base: Record<string, unknown> = {
          status: overall,
          timestamp: new Date().toISOString(),
          service: "mailmypdf",
          env: config.stripe.env,
          uptime: process.uptime ? Math.round(process.uptime()) : 0,
          checks: checks.map((c) => ({
            name: c.name,
            status: c.status,
            latencyMs: c.latencyMs,
            message: c.message,
          })),
        };

        if (detailed) {
          const metricsSnapshot = metrics.getSnapshot();
          base.metrics = metricsSnapshot;
        }

        const status = overall === "unhealthy" ? 503 : 200;
        const resp = Response.json(base, { status });
        return attachRequestId(resp, requestId);
      },
    },
  },
});

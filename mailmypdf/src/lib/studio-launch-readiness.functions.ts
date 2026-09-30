import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getConfig } from "@/config";
import { MAILMYPDF_MCP_TOOLS } from "@/lib/mcp/tool-catalog";

export type LaunchCheckStatus = "pass" | "warning" | "fail" | "manual";

export type LaunchCheck = {
  id: string;
  category: "configuration" | "deployment" | "connector" | "secure-core" | "operations" | "manual";
  label: string;
  status: LaunchCheckStatus;
  detail: string;
};

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

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function secretReady(name: string, minimum = 32): boolean {
  return env(name).length >= minimum;
}

function check(
  id: string,
  category: LaunchCheck["category"],
  label: string,
  status: LaunchCheckStatus,
  detail: string,
): LaunchCheck {
  return { id, category, label, status, detail };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8_000) {
  try {
    const response = await fetch(url, {
      ...init,
      redirect: init.redirect ?? "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { response, error: null as string | null };
  } catch (cause) {
    return {
      response: null,
      error: cause instanceof Error ? cause.message : "request failed",
    };
  }
}

async function safeCount(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  try {
    const result = await query;
    return result.error ? null : result.count ?? 0;
  } catch {
    return null;
  }
}

export const getStudioLaunchReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const config = getConfig();
    const checks: LaunchCheck[] = [];

    // Configuration parity with scripts/production-readiness.mjs.
    const expectedRef = env("MAILMYPDF_EXPECTED_SUPABASE_PROJECT_REF");
    let configuredRef = "";
    try {
      const url = new URL(config.supabase.url);
      configuredRef = url.hostname.endsWith(".supabase.co")
        ? url.hostname.slice(0, -".supabase.co".length)
        : "";
    } catch {
      configuredRef = "";
    }
    checks.push(
      check(
        "supabase-project",
        "configuration",
        "Canonical Supabase project",
        expectedRef && configuredRef === expectedRef ? "pass" : "fail",
        !expectedRef
          ? "MAILMYPDF_EXPECTED_SUPABASE_PROJECT_REF is missing."
          : configuredRef === expectedRef
            ? "Configured Supabase URL matches the expected production project."
            : "Configured Supabase project does not match the expected production ref.",
      ),
    );

    const paymentEnv = config.stripe.env;
    const stripeSecret = config.stripe.secretKey;
    const stripePublishable = config.stripe.publishableKey;
    const stripeWebhook = config.stripe.webhookSecret;
    const stripeFormatsReady =
      Boolean(stripeSecret) &&
      Boolean(stripePublishable) &&
      Boolean(stripeWebhook) &&
      stripeWebhook.startsWith("whsec_") &&
      (paymentEnv === "live"
        ? stripeSecret.startsWith("sk_live_") && stripePublishable.startsWith("pk_live_")
        : stripeSecret.startsWith("sk_test_") && stripePublishable.startsWith("pk_test_"));

    checks.push(
      check(
        "stripe",
        "configuration",
        "Stripe payment configuration",
        !stripeFormatsReady ? "fail" : paymentEnv === "live" ? "pass" : "warning",
        !stripeFormatsReady
          ? "Selected Stripe environment is missing or has inconsistent server, browser, or webhook credentials."
          : paymentEnv === "live"
            ? "Live Stripe key, publishable key, and webhook secret are configured."
            : "Stripe is correctly configured in sandbox mode; switch to live only for the controlled live launch canary.",
      ),
    );

    checks.push(
      check(
        "lob",
        "configuration",
        "Lob fulfillment configuration",
        config.lob.apiKey && config.lob.webhookSecret ? "pass" : "fail",
        config.lob.apiKey && config.lob.webhookSecret
          ? "Lob API and webhook credentials are configured."
          : "LOB_API_KEY and LOB_WEBHOOK_SECRET are both required.",
      ),
    );

    checks.push(
      check(
        "email",
        "configuration",
        "Transactional email",
        config.email.resendApiKey && env("RESEND_FROM_ADDRESS") ? "pass" : "fail",
        config.email.resendApiKey && env("RESEND_FROM_ADDRESS")
          ? "Resend API key and explicit verified sender address are configured."
          : "RESEND_API_KEY and RESEND_FROM_ADDRESS are required for production confirmations.",
      ),
    );

    const jobSecrets = [
      ["MAILMYPDF_CLEANUP_SECRET", "Proof/cleanup job secret"],
      ["MAILMYPDF_SCANNER_JOB_SECRET", "Scanner job secret"],
      ["MAILMYPDF_RETENTION_JOB_SECRET", "Retention job secret"],
      ["MAILMYPDF_CONNECTOR_JOB_SECRET", "Connector reconciliation secret"],
    ] as const;
    for (const [name, label] of jobSecrets) {
      checks.push(
        check(
          name.toLowerCase(),
          "secure-core",
          label,
          secretReady(name) ? "pass" : "fail",
          secretReady(name) ? "Configured with production-strength length." : `${name} is missing or too short.`,
        ),
      );
    }

    const scannerUrl = env("MAILMYPDF_MALWARE_SCANNER_URL");
    const scannerKeyReady = secretReady("MAILMYPDF_MALWARE_SCANNER_KEY");
    checks.push(
      check(
        "scanner-config",
        "secure-core",
        "Malware scanner configuration",
        scannerUrl && scannerKeyReady ? "pass" : "fail",
        scannerUrl && scannerKeyReady
          ? "Scanner URL and authentication key are configured."
          : "MAILMYPDF_MALWARE_SCANNER_URL and a production-strength MAILMYPDF_MALWARE_SCANNER_KEY are required.",
      ),
    );

    const baseUrl = config.urls.appBaseUrl;
    let base: URL | null = null;
    try {
      base = new URL(baseUrl);
    } catch {
      base = null;
    }
    const httpsProductionOrigin =
      Boolean(base) &&
      base!.protocol === "https:" &&
      base!.hostname !== "localhost" &&
      base!.hostname !== "127.0.0.1";
    checks.push(
      check(
        "production-origin",
        "deployment",
        "Production HTTPS origin",
        httpsProductionOrigin ? (base!.hostname.endsWith(".workers.dev") ? "warning" : "pass") : "fail",
        !httpsProductionOrigin
          ? "MAILMYPDF_BASE_URL must be a non-local HTTPS origin."
          : base!.hostname.endsWith(".workers.dev")
            ? `${base!.origin} is reachable as a Worker origin; attach the intended production domain before public launch if this is temporary.`
            : `Production origin is ${base!.origin}.`,
      ),
    );

    // Direct database/storage probes mirror the live production preflight without exposing credentials.
    const schemaTables = [
      "orders",
      "workflow_cases",
      "case_approvals",
      "secure_documents",
      "case_documents",
      "case_analyses",
      "workflow_case_inputs",
      "saved_mailing_addresses",
      "connector_operations",
    ] as const;
    let schemaFailures = 0;
    for (const table of schemaTables) {
      try {
        const { error } = await db.from(table).select("id").limit(0);
        if (error) schemaFailures++;
      } catch {
        schemaFailures++;
      }
    }
    checks.push(
      check(
        "database-schema",
        "secure-core",
        "Production database schema",
        schemaFailures === 0 ? "pass" : "fail",
        schemaFailures === 0
          ? `All ${schemaTables.length} launch-critical tables responded to read-only schema probes.`
          : `${schemaFailures} of ${schemaTables.length} launch-critical table probes failed.`,
      ),
    );

    try {
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
      const names = new Set((buckets ?? []).map((bucket) => bucket.name));
      const missing = ["secure-documents", "order-pdfs"].filter((name) => !names.has(name));
      checks.push(
        check(
          "storage-buckets",
          "secure-core",
          "Required storage buckets",
          !error && missing.length === 0 ? "pass" : "fail",
          error
            ? "Supabase storage bucket listing failed."
            : missing.length
              ? `Missing: ${missing.join(", ")}.`
              : "secure-documents and order-pdfs buckets are present.",
        ),
      );
    } catch {
      checks.push(check("storage-buckets", "secure-core", "Required storage buckets", "fail", "Supabase storage probe failed."));
    }

    const staleBefore = new Date(Date.now() - 15 * 60_000).toISOString();
    const now = new Date().toISOString();
    const [
      quarantined,
      scanErrors,
      overdueRetention,
      staleConnectorOps,
      failedOrders,
      webhookRetries,
    ] = await Promise.all([
      safeCount(db.from("secure_documents").select("*", { count: "exact", head: true }).eq("security_status", "quarantined")),
      safeCount(db.from("secure_documents").select("*", { count: "exact", head: true }).not("last_scan_error", "is", null).is("deleted_at", null)),
      safeCount(db.from("secure_documents").select("*", { count: "exact", head: true }).lt("retention_until", now).is("deleted_at", null)),
      safeCount(db.from("connector_operations").select("*", { count: "exact", head: true }).eq("state", "running").lt("updated_at", staleBefore)),
      safeCount(db.from("orders").select("*", { count: "exact", head: true }).in("status", ["failed_fulfillment", "failed_provider_submission"])),
      safeCount(db.from("proof_webhook_deliveries").select("*", { count: "exact", head: true }).in("status", ["pending", "retrying", "failed"])),
    ]);

    const backlogChecks: Array<[string, string, number | null, number, string]> = [
      ["quarantine-backlog", "Quarantined document backlog", quarantined, 0, "document(s) are still waiting for a clean scan"],
      ["scan-errors", "Document scan errors", scanErrors, 0, "document(s) have a recorded scan error"],
      ["retention-backlog", "Overdue document retention", overdueRetention, 0, "document(s) are past retention and not deleted"],
      ["connector-stale", "Stale connector operations", staleConnectorOps, 0, "connector operation(s) have been running longer than 15 minutes"],
      ["fulfillment-failures", "Failed fulfillment queue", failedOrders, 0, "mail order(s) need fulfillment/provider review"],
      ["proof-webhook-retries", "Proof webhook retry queue", webhookRetries, 0, "proof webhook delivery item(s) are pending, retrying, or failed"],
    ];
    for (const [id, label, count, threshold, suffix] of backlogChecks) {
      checks.push(
        check(
          id,
          "operations",
          label,
          count === null ? "warning" : count <= threshold ? "pass" : "warning",
          count === null ? "Backlog count could not be read." : count === 0 ? "No current backlog." : `${count} ${suffix}.`,
        ),
      );
    }

    // Harmless live reachability probes against the configured deployed origin.
    if (base && httpsProductionOrigin) {
      const home = await fetchWithTimeout(new URL("/", base).toString(), { redirect: "follow" });
      checks.push(
        check(
          "deployed-home",
          "deployment",
          "Deployed website",
          home.response?.ok ? "pass" : "fail",
          home.response?.ok ? `Homepage returned HTTP ${home.response.status}.` : `Homepage probe failed: ${home.error ?? `HTTP ${home.response?.status ?? "unknown"}`}.`,
        ),
      );

      const health = await fetchWithTimeout(new URL("/api/internal/health", base).toString(), { redirect: "follow" });
      let healthPayload: any = null;
      try { healthPayload = health.response ? await health.response.clone().json() : null; } catch {}
      checks.push(
        check(
          "deployed-health",
          "deployment",
          "Deployed service health",
          health.response?.ok && healthPayload?.status === "healthy"
            ? "pass"
            : health.response?.ok && healthPayload?.status === "degraded"
              ? "warning"
              : "fail",
          health.response
            ? `HTTP ${health.response.status}; status=${healthPayload?.status ?? "unknown"}.`
            : `Health probe failed: ${health.error ?? "request failed"}.`,
        ),
      );

      const oauth = await fetchWithTimeout(new URL("/.well-known/oauth-protected-resource", base).toString());
      checks.push(
        check(
          "oauth-metadata",
          "connector",
          "MCP OAuth metadata",
          oauth.response?.ok ? "pass" : "fail",
          oauth.response?.ok
            ? "Protected-resource metadata is reachable over HTTPS."
            : `OAuth metadata probe failed: ${oauth.error ?? `HTTP ${oauth.response?.status ?? "unknown"}`}.`,
        ),
      );

      const mcpUrl = new URL("/api/mcp", base).toString();
      const discover = await fetchWithTimeout(mcpUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "mcp-protocol-version": "2026-07-28",
          "mcp-method": "server/discover",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "studio-readiness-discover",
          method: "server/discover",
          params: { _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } },
        }),
      });
      checks.push(
        check(
          "mcp-discovery",
          "connector",
          "MCP server discovery",
          discover.response?.ok ? "pass" : "fail",
          discover.response?.ok
            ? "Deployed MCP endpoint responds to server/discover."
            : `MCP discovery failed: ${discover.error ?? `HTTP ${discover.response?.status ?? "unknown"}`}.`,
        ),
      );

      const listed = await fetchWithTimeout(mcpUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "mcp-protocol-version": "2026-07-28",
          "mcp-method": "tools/list",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "studio-readiness-tools",
          method: "tools/list",
          params: { _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } },
        }),
      });
      let listedPayload: any = null;
      try { listedPayload = listed.response ? await listed.response.clone().json() : null; } catch {}
      const listedTools = Array.isArray(listedPayload?.result?.tools) ? listedPayload.result.tools : [];
      const expectedTools = MAILMYPDF_MCP_TOOLS.length;
      checks.push(
        check(
          "mcp-tools",
          "connector",
          "MCP tool catalog",
          listed.response?.ok && listedTools.length === expectedTools ? "pass" : "fail",
          listed.response?.ok
            ? `Deployed catalog exposes ${listedTools.length} tool(s); code expects ${expectedTools}.`
            : `MCP tool-list probe failed: ${listed.error ?? `HTTP ${listed.response?.status ?? "unknown"}`}.`,
        ),
      );

      const challengeToken = env("OPENAI_CHALLENGE_EXPECTED_TOKEN");
      const challenge = await fetchWithTimeout(new URL("/.well-known/openai-apps-challenge", base).toString());
      if (challengeToken) {
        const challengeBody = challenge.response ? await challenge.response.clone().text() : "";
        checks.push(
          check(
            "openai-challenge",
            "connector",
            "OpenAI Apps challenge",
            challenge.response?.ok && challengeBody === challengeToken ? "pass" : "fail",
            challenge.response?.ok && challengeBody === challengeToken
              ? "Deployed challenge route returns the expected token."
              : "Challenge route did not return the expected configured token.",
          ),
        );
      } else {
        checks.push(
          check(
            "openai-challenge",
            "connector",
            "OpenAI Apps challenge",
            challenge.response?.ok ? "warning" : "manual",
            challenge.response?.ok
              ? "Challenge route is active, but OPENAI_CHALLENGE_EXPECTED_TOKEN was not supplied for exact verification."
              : "Exact challenge verification is only required during connector submission.",
          ),
        );
      }
    }

    if (scannerUrl) {
      let scannerHealth = "";
      try {
        scannerHealth = new URL("/health", scannerUrl).toString();
      } catch {}
      const scanner = scannerHealth ? await fetchWithTimeout(scannerHealth) : { response: null, error: "invalid scanner URL" };
      checks.push(
        check(
          "scanner-health",
          "secure-core",
          "Malware scanner reachability",
          scanner.response?.ok ? "pass" : "fail",
          scanner.response?.ok
            ? `Scanner health returned HTTP ${scanner.response.status}.`
            : `Scanner health probe failed: ${scanner.error ?? `HTTP ${scanner.response?.status ?? "unknown"}`}.`,
        ),
      );
    }

    checks.push(
      check(
        "proof-cron-heartbeat",
        "secure-core",
        "Worker proof-processor cron freshness",
        "manual",
        "deploy.sh configures */5 * * * * correctly, but no persisted last-run heartbeat exists yet; verify in Cloudflare logs before launch.",
      ),
      check(
        "secure-core-heartbeat",
        "secure-core",
        "Scanner/retention/reconcile schedule freshness",
        "manual",
        "GitHub Actions schedules are configured, but Studio cannot yet prove their most recent successful run without persisted heartbeat telemetry.",
      ),
      check(
        "sandbox-canary",
        "manual",
        "End-to-end sandbox canary",
        "manual",
        "Run ChatGPT → review → approval → Stripe test payment → Lob test submission → webhook/tracking/evidence and verify idempotent replay.",
      ),
      check(
        "live-canary",
        "manual",
        "Controlled live mailing canary",
        "manual",
        "Before public launch, complete one inexpensive real mailing to an address you control and verify payment, Lob submission, tracking, email, and evidence.",
      ),
      check(
        "certified-canary",
        "manual",
        "Certified Mail canary",
        "manual",
        "If Certified Mail/return-receipt services will be sold at launch, complete a controlled canary for each promised service level.",
      ),
    );

    const totals = checks.reduce(
      (acc, item) => {
        acc[item.status]++;
        return acc;
      },
      { pass: 0, warning: 0, fail: 0, manual: 0 } as Record<LaunchCheckStatus, number>,
    );

    const automated = checks.filter((item) => item.status !== "manual");
    const automatedReady = automated.every((item) => item.status === "pass");
    const launchStatus: "blocked" | "needs-review" | "automated-ready" =
      totals.fail > 0 ? "blocked" : totals.warning > 0 ? "needs-review" : "automated-ready";

    return {
      generatedAt: new Date().toISOString(),
      launchStatus,
      automatedReady,
      totals,
      checks,
      baseUrl,
      paymentEnv,
      autoSubmitToLob: config.lob.autoSubmit,
    };
  });

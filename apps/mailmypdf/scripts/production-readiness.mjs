#!/usr/bin/env node

/**
 * MailMyPDF production-readiness preflight.
 *
 * Read-only. It never prints credential values, creates payments, or submits mail.
 *
 * Usage:
 *   pnpm --filter ./apps/mailmypdf verify:production-config
 *   pnpm --filter ./apps/mailmypdf verify:production-config -- --live
 *
 * --live adds harmless connectivity/schema probes against Supabase and the malware
 * scanner. Stripe/Lob credentials are format-checked only; no provider operation is
 * performed.
 */

const EXPECTED_SUPABASE_PROJECT_REF =
  process.env.MAILMYPDF_EXPECTED_SUPABASE_PROJECT_REF || "ntbnqkbhabjdbiqzoefk";
const live = process.argv.includes("--live");

const results = [];
function pass(name, detail = "") { results.push({ status: "PASS", name, detail }); }
function warn(name, detail = "") { results.push({ status: "WARN", name, detail }); }
function fail(name, detail = "") { results.push({ status: "FAIL", name, detail }); }

function value(name) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

function requireValue(name) {
  const v = value(name);
  if (v) pass(name, "configured");
  else fail(name, "missing");
  return v;
}

function requireSecret(name, minimum = 24) {
  const v = value(name);
  if (!v) {
    fail(name, "missing");
    return null;
  }
  if (v.length < minimum) {
    fail(name, `configured but shorter than ${minimum} characters`);
    return v;
  }
  pass(name, "configured");
  return v;
}

const supabaseUrl = requireValue("SUPABASE_URL");
const publishableKey =
  value("SUPABASE_PUBLISHABLE_KEY") || value("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  value("SUPABASE_ANON_KEY") || value("VITE_SUPABASE_ANON_KEY");
if (publishableKey) pass("Supabase publishable key", "configured");
else fail("Supabase publishable key", "set SUPABASE_PUBLISHABLE_KEY or compatible public-key alias");

const serverKey = value("SUPABASE_SECRET_KEY") || value("SUPABASE_SERVICE_ROLE_KEY");
if (serverKey) pass("Supabase server secret", "configured");
else fail("Supabase server secret", "set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

if (supabaseUrl) {
  try {
    const host = new URL(supabaseUrl).hostname;
    const ref = host.endsWith(".supabase.co") ? host.slice(0, -".supabase.co".length) : null;
    if (ref === EXPECTED_SUPABASE_PROJECT_REF) {
      pass("Canonical Supabase project", ref);
    } else {
      fail("Canonical Supabase project", `expected ${EXPECTED_SUPABASE_PROJECT_REF}; configured URL points to ${ref || host}`);
    }
  } catch {
    fail("SUPABASE_URL", "not a valid URL");
  }
}

const paymentsEnv = value("PAYMENTS_ENV");
if (paymentsEnv === "sandbox" || paymentsEnv === "live") pass("PAYMENTS_ENV", paymentsEnv);
else fail("PAYMENTS_ENV", 'must be "sandbox" or "live"');

const stripeKey = paymentsEnv === "live"
  ? value("STRIPE_LIVE_API_KEY")
  : value("STRIPE_SANDBOX_API_KEY");
const stripeWebhook = paymentsEnv === "live"
  ? value("PAYMENTS_LIVE_WEBHOOK_SECRET")
  : value("PAYMENTS_SANDBOX_WEBHOOK_SECRET");

if (!stripeKey) fail("Stripe server key", `missing key for PAYMENTS_ENV=${paymentsEnv || "unset"}`);
else if (paymentsEnv === "live" && !stripeKey.startsWith("sk_live_")) fail("Stripe server key", "live mode is not using an sk_live_ key");
else if (paymentsEnv === "sandbox" && !stripeKey.startsWith("sk_test_")) fail("Stripe server key", "sandbox mode is not using an sk_test_ key");
else pass("Stripe server key", "configured for selected environment");

if (!stripeWebhook) fail("Stripe webhook secret", "missing for selected payment environment");
else if (!stripeWebhook.startsWith("whsec_")) fail("Stripe webhook secret", "unexpected format");
else pass("Stripe webhook secret", "configured");

const lobKey = value("LOB_API_KEY");
if (!lobKey) fail("LOB_API_KEY", "missing");
else pass("LOB_API_KEY", "configured");

const lobWebhook = value("LOB_WEBHOOK_SECRET");
if (!lobWebhook) fail("LOB_WEBHOOK_SECRET", "missing");
else pass("LOB_WEBHOOK_SECRET", "configured");

const autoSubmit = String(value("AUTO_SUBMIT_TO_LOB") || "false").toLowerCase() === "true";
if (autoSubmit) warn("AUTO_SUBMIT_TO_LOB", "enabled — use only after controlled end-to-end verification");
else pass("AUTO_SUBMIT_TO_LOB", "disabled");

requireSecret("MAILMYPDF_SCANNER_JOB_SECRET", 32);
const scannerUrl = requireValue("MAILMYPDF_MALWARE_SCANNER_URL");
requireSecret("MAILMYPDF_MALWARE_SCANNER_KEY", 32);
requireSecret("MAILMYPDF_RETENTION_JOB_SECRET", 32);

const baseUrl = requireValue("MAILMYPDF_BASE_URL");
if (baseUrl) {
  try {
    const u = new URL(baseUrl);
    if (u.protocol !== "https:") fail("MAILMYPDF_BASE_URL", "production origin must use HTTPS");
    else pass("MailMyPDF HTTPS origin", u.origin);
  } catch {
    fail("MAILMYPDF_BASE_URL", "not a valid URL");
  }
}

if (live && supabaseUrl && serverKey) {
  const headers = {
    apikey: serverKey,
    Authorization: `Bearer ${serverKey}`,
  };

  const schemaProbes = [
    ["orders workflow bridge", "/rest/v1/orders?select=id,workflow_case_id,case_approval_id,approved_packet_sha256,approved_price_cents&limit=0"],
    ["workflow_cases", "/rest/v1/workflow_cases?select=id,status&limit=0"],
    ["case_approvals", "/rest/v1/case_approvals?select=id,packet_sha256&limit=0"],
    ["secure_documents", "/rest/v1/secure_documents?select=id,security_status&limit=0"],
    ["case_documents", "/rest/v1/case_documents?select=id,role,included&limit=0"],
    ["case_analyses", "/rest/v1/case_analyses?select=id,version&limit=0"],
    ["workflow case inputs", "/rest/v1/workflow_case_inputs?select=id,version&limit=0"],
  ];

  for (const [name, path] of schemaProbes) {
    try {
      const response = await fetch(`${supabaseUrl}${path}`, { headers });
      if (response.ok) pass(`Supabase schema: ${name}`, "reachable");
      else fail(`Supabase schema: ${name}`, `HTTP ${response.status}`);
    } catch (error) {
      fail(`Supabase schema: ${name}`, error instanceof Error ? error.message : "request failed");
    }
  }

  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, { headers });
    if (!response.ok) {
      fail("Supabase storage buckets", `HTTP ${response.status}`);
    } else {
      const buckets = await response.json();
      const names = new Set(Array.isArray(buckets) ? buckets.map((b) => b?.name || b?.id).filter(Boolean) : []);
      for (const required of ["secure-documents", "order-pdfs"]) {
        if (names.has(required)) pass(`Storage bucket: ${required}`, "present");
        else fail(`Storage bucket: ${required}`, "missing");
      }
    }
  } catch (error) {
    fail("Supabase storage buckets", error instanceof Error ? error.message : "request failed");
  }
}

if (live && scannerUrl) {
  try {
    const u = new URL(scannerUrl);
    const healthUrl = new URL("/health", u).toString();
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(10_000) });
    if (response.ok) pass("Malware scanner health", `HTTP ${response.status}`);
    else fail("Malware scanner health", `HTTP ${response.status}`);
  } catch (error) {
    fail("Malware scanner health", error instanceof Error ? error.message : "request failed");
  }
}

const widths = {
  status: Math.max(6, ...results.map((r) => r.status.length)),
  name: Math.max(4, ...results.map((r) => r.name.length)),
};
for (const r of results) {
  console.log(`${r.status.padEnd(widths.status)}  ${r.name.padEnd(widths.name)}  ${r.detail}`);
}

const failures = results.filter((r) => r.status === "FAIL").length;
const warnings = results.filter((r) => r.status === "WARN").length;
console.log(`\n${results.length} checks: ${failures} failed, ${warnings} warning(s).`);
if (!live) console.log("Run again with --live after installing secrets to probe Supabase schema/storage and scanner health.");
process.exitCode = failures ? 1 : 0;

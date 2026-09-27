#!/usr/bin/env node

/**
 * Read-only smoke test for the deployed production origin.
 *
 * Usage:
 *   pnpm --filter ./mailmypdf verify:deployment
 */

const baseValue = process.env.MAILMYPDF_BASE_URL?.trim();
if (!baseValue) {
  console.error("FAIL  MAILMYPDF_BASE_URL is required");
  process.exit(2);
}

let base;
try {
  base = new URL(baseValue);
} catch {
  console.error("FAIL  MAILMYPDF_BASE_URL is not a valid URL");
  process.exit(2);
}
if (base.protocol !== "https:") {
  console.error("FAIL  Production deployment smoke test requires HTTPS");
  process.exit(2);
}

const checks = [];
const pass = (name, detail = "") => checks.push({ status: "PASS", name, detail });
const warn = (name, detail = "") => checks.push({ status: "WARN", name, detail });
const fail = (name, detail = "") => checks.push({ status: "FAIL", name, detail });

async function get(path, init = {}) {
  const url = new URL(path, base);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      ...init,
    });
    return { response, elapsed: Date.now() - started, url: url.toString() };
  } catch (error) {
    return { response: null, elapsed: Date.now() - started, url: url.toString(), error };
  }
}

const publicRoutes = [
  ["/", "Homepage"],
  ["/send", "Send flow"],
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/contact", "Contact"],
  ["/robots.txt", "Robots"],
  ["/sitemap.xml", "Sitemap"],
];

for (const [path, name] of publicRoutes) {
  const result = await get(path);
  if (!result.response) {
    fail(name, result.error instanceof Error ? result.error.message : "request failed");
    continue;
  }
  if (result.response.ok) pass(name, `HTTP ${result.response.status} in ${result.elapsed}ms`);
  else fail(name, `HTTP ${result.response.status}`);
}

const home = await get("/");
if (home.response) {
  const expectedHeaders = [
    ["content-security-policy", "CSP"],
    ["strict-transport-security", "HSTS"],
    ["x-frame-options", "X-Frame-Options"],
    ["x-content-type-options", "X-Content-Type-Options"],
    ["referrer-policy", "Referrer-Policy"],
    ["permissions-policy", "Permissions-Policy"],
  ];
  for (const [header, label] of expectedHeaders) {
    const value = home.response.headers.get(header);
    if (value) pass(`Security header: ${label}`, value.slice(0, 100));
    else fail(`Security header: ${label}`, "missing");
  }
}

const health = await get("/api/internal/health");
if (!health.response) {
  fail("Basic health", health.error instanceof Error ? health.error.message : "request failed");
} else {
  let payload = null;
  try { payload = await health.response.json(); } catch {}
  if (health.response.ok && payload?.status === "healthy") {
    pass("Basic health", `healthy in ${health.elapsed}ms`);
  } else if (health.response.ok && payload?.status === "degraded") {
    fail("Basic health", `degraded: ${JSON.stringify(payload?.checks ?? []).slice(0, 300)}`);
  } else {
    fail("Basic health", `HTTP ${health.response.status}; status=${payload?.status ?? "unknown"}`);
  }
}

const cleanupSecret = process.env.MAILMYPDF_CLEANUP_SECRET?.trim();
if (cleanupSecret) {
  const detailed = await get("/api/internal/health?detailed=1", {
    headers: { Authorization: `Bearer ${cleanupSecret}` },
  });
  if (detailed.response?.ok) pass("Detailed health auth", `HTTP ${detailed.response.status}`);
  else fail("Detailed health auth", detailed.response ? `HTTP ${detailed.response.status}` : "request failed");
} else {
  warn("Detailed health auth", "MAILMYPDF_CLEANUP_SECRET not present in local environment; skipped authenticated probe");
}

const widths = {
  status: Math.max(6, ...checks.map((c) => c.status.length)),
  name: Math.max(4, ...checks.map((c) => c.name.length)),
};
for (const check of checks) {
  console.log(`${check.status.padEnd(widths.status)}  ${check.name.padEnd(widths.name)}  ${check.detail}`);
}
const failures = checks.filter((c) => c.status === "FAIL").length;
const warnings = checks.filter((c) => c.status === "WARN").length;
console.log(`\nDeployment smoke: ${failures} failure(s), ${warnings} warning(s).`);
process.exitCode = failures ? 1 : 0;

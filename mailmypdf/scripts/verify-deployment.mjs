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

let rpcId = 1;
async function mcp(method, params = {}, options = {}) {
  const url = new URL("/api/mcp", base);
  const headers = new Headers({
    "content-type": "application/json",
    "mcp-protocol-version": "2026-07-28",
    "mcp-method": method,
  });
  if (options.name) headers.set("mcp-name", options.name);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: rpcId++,
        method,
        params: {
          ...params,
          _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" },
        },
      }),
    });
    let payload = null;
    try { payload = await response.json(); } catch {}
    return { response, payload, elapsed: Date.now() - started };
  } catch (error) {
    return { response: null, payload: null, elapsed: Date.now() - started, error };
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


const oauth = await get("/.well-known/oauth-protected-resource", { redirect: "error" });
if (!oauth.response) {
  fail("MCP OAuth metadata", oauth.error instanceof Error ? oauth.error.message : "request failed");
} else {
  let payload = null;
  try { payload = await oauth.response.json(); } catch {}
  const expectedResource = new URL("/api/mcp", base).toString();
  const servers = Array.isArray(payload?.authorization_servers) ? payload.authorization_servers : [];
  const scopes = Array.isArray(payload?.scopes_supported) ? payload.scopes_supported : [];
  if (!oauth.response.ok) {
    fail("MCP OAuth metadata", `HTTP ${oauth.response.status}`);
  } else if (payload?.resource !== expectedResource) {
    fail("MCP OAuth metadata", `resource mismatch: ${payload?.resource ?? "missing"}`);
  } else if (servers.length < 1 || !servers.every((value) => typeof value === "string" && value.startsWith("https://"))) {
    fail("MCP OAuth metadata", "authorization server missing or not HTTPS");
  } else if (!["email", "profile"].every((scope) => scopes.includes(scope))) {
    fail("MCP OAuth metadata", "email/profile scopes are not both advertised");
  } else {
    pass("MCP OAuth metadata", `resource and ${servers.length} authorization server(s) are advertised`);
  }
}

const discover = await mcp("server/discover");
if (!discover.response) {
  fail("MCP server discovery", discover.error instanceof Error ? discover.error.message : "request failed");
} else if (!discover.response.ok) {
  fail("MCP server discovery", `HTTP ${discover.response.status}`);
} else {
  const versions = discover.payload?.result?.supportedVersions;
  const info = discover.payload?.result?._meta?.["io.modelcontextprotocol/serverInfo"];
  if (!Array.isArray(versions) || !versions.includes("2026-07-28")) {
    fail("MCP server discovery", "current protocol version is not advertised");
  } else if (info?.name !== "MailMyPDF") {
    fail("MCP server discovery", `unexpected server identity: ${info?.name ?? "missing"}`);
  } else {
    pass("MCP server discovery", `MailMyPDF 2026-07-28 in ${discover.elapsed}ms`);
  }
}

const listed = await mcp("tools/list");
if (!listed.response) {
  fail("MCP tool catalog", listed.error instanceof Error ? listed.error.message : "request failed");
} else if (!listed.response.ok) {
  fail("MCP tool catalog", `HTTP ${listed.response.status}`);
} else {
  const tools = Array.isArray(listed.payload?.result?.tools) ? listed.payload.result.tools : [];
  const names = new Set(tools.map((tool) => tool?.name).filter(Boolean));
  const required = [
    "prepare_conversational_letter",
    "get_mailing_context",
    "review_direct_pdf_mail",
    "approve_direct_pdf_mail",
    "prepare_direct_pdf_checkout",
    "get_order_status",
  ];
  const missing = required.filter((name) => !names.has(name));
  if (missing.length) {
    fail("MCP conversational mail tools", `missing: ${missing.join(", ")}`);
  } else {
    pass("MCP conversational mail tools", `${required.length} required tools exposed; catalog size ${tools.length}`);
  }
}

const expectedChallenge = process.env.OPENAI_CHALLENGE_EXPECTED_TOKEN?.trim();
const challenge = await get("/.well-known/openai-apps-challenge", { redirect: "error" });
if (expectedChallenge) {
  if (!challenge.response) {
    fail("OpenAI apps challenge", challenge.error instanceof Error ? challenge.error.message : "request failed");
  } else {
    const body = await challenge.response.text();
    if (challenge.response.status !== 200) {
      fail("OpenAI apps challenge", `HTTP ${challenge.response.status}`);
    } else if (body !== expectedChallenge) {
      fail("OpenAI apps challenge", "returned token does not match OPENAI_CHALLENGE_EXPECTED_TOKEN");
    } else {
      pass("OpenAI apps challenge", "exact portal challenge token is active");
    }
  }
} else if (challenge.response?.status === 200) {
  warn("OpenAI apps challenge", "route is active but OPENAI_CHALLENGE_EXPECTED_TOKEN was not supplied for exact verification");
} else {
  warn("OpenAI apps challenge", "exact-token verification skipped; set OPENAI_CHALLENGE_EXPECTED_TOKEN during connector submission");
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

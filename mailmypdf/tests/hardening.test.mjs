import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

async function source(relPath) {
  const full = path.join(process.cwd(), relPath);
  return readFileSync(full, "utf8");
}

// ── P0 #10: API Key bcrypt verification ──────────────────────────────────────

describe("API Key Security — bcrypt verification (P0 #10)", () => {
  it("proof-of-service auth.ts imports bcrypt", async () => {
    const auth = await source("src/lib/proof-of-service/auth.ts");
    assert.match(auth, /bcrypt|bcryptjs|@noble\/hashes.*bcrypt/i);
  });

  it("auth.ts has verifyApiKey function that uses bcrypt compare", async () => {
    const auth = await source("src/lib/proof-of-service/auth.ts");
    assert.match(auth, /validateApiKey|verifyApiKey|verifyTenantApiKey/i);
    assert.match(auth, /bcrypt.*compare|compare.*bcrypt/i);
  });

  it("auth.ts has SHA-256 lookup for API keys", async () => {
    const auth = await source("src/lib/proof-of-service/auth.ts");
    assert.match(auth, /sha256|SHA-256|createHash.*sha256/i);
  });

  it("migration for key_bcrypt_hash column exists", () => {
    const migrationPath = "supabase/migrations/20260815120000_add_key_bcrypt_hash.sql";
    assert.ok(existsSync(migrationPath), `Migration file not found: ${migrationPath}`);
  });

  it("migration adds key_bcrypt_hash column", () => {
    const migration = readFileSync(
      "supabase/migrations/20260815120000_add_key_bcrypt_hash.sql",
      "utf8",
    );
    assert.match(migration, /key_bcrypt_hash/i);
  });
});

// ── P0 #9: Tenant secret encryption at rest ──────────────────────────────────

describe("Tenant Secret Encryption — AES-256-GCM (P0 #9)", () => {
  it("encryption.ts module exists", () => {
    assert.ok(existsSync("src/lib/proof-of-service/encryption.ts"));
  });

  it("encryption.ts uses AES-256-GCM", async () => {
    const enc = await source("src/lib/proof-of-service/encryption.ts");
    assert.match(enc, /aes-256-gcm|AES-256-GCM/i);
  });

  it("encryption.ts exports encrypt and decrypt functions", async () => {
    const enc = await source("src/lib/proof-of-service/encryption.ts");
    assert.match(enc, /export.*function.*encrypt/i);
    assert.match(enc, /export.*function.*decrypt/i);
  });

  it("encryption.ts uses ENCRYPTION_MASTER_KEY from env", async () => {
    const enc = await source("src/lib/proof-of-service/encryption.ts");
    assert.match(enc, /ENCRYPTION_MASTER_KEY/i);
  });

  it("auth.ts imports encryption functions for tenant secrets", async () => {
    const auth = await source("src/lib/proof-of-service/auth.ts");
    assert.match(auth, /encrypt|decrypt/i);
  });

  it(".env.example documents ENCRYPTION_MASTER_KEY", async () => {
    const env = await source(".env.example");
    assert.match(env, /ENCRYPTION_MASTER_KEY/i);
  });
});

// ── P1 #16: Distributed rate limiting ────────────────────────────────────────

describe("Distributed Rate Limiting — Supabase-backed (P1 #16)", () => {
  it("distributed-rate-limit.ts module exists", () => {
    assert.ok(existsSync("src/lib/distributed-rate-limit.ts"));
  });

  it("distributed-rate-limit.ts exports distributedRateLimit function", async () => {
    const mod = await source("src/lib/distributed-rate-limit.ts");
    assert.match(
      mod,
      /export.*function.*distributedRateLimit|export.*async.*function.*distributedRateLimit/i,
    );
  });

  it("distributed-rate-limit.ts uses Supabase for distributed coordination", async () => {
    const mod = await source("src/lib/distributed-rate-limit.ts");
    assert.match(mod, /supabaseAdmin/i);
    assert.match(mod, /rate_limit_buckets/i);
  });

  it("distributed-rate-limit.ts falls back to in-memory when Supabase unavailable", async () => {
    const mod = await source("src/lib/distributed-rate-limit.ts");
    assert.match(mod, /inMemoryRateLimit|in-memory|fall\s*back/i);
  });

  it("migration for rate_limit_buckets table exists", () => {
    const migrationPath = "supabase/migrations/20260815120100_add_rate_limit_buckets.sql";
    assert.ok(existsSync(migrationPath), `Migration file not found: ${migrationPath}`);
  });

  it("migration creates rate_limit_buckets table", () => {
    const migration = readFileSync(
      "supabase/migrations/20260815120100_add_rate_limit_buckets.sql",
      "utf8",
    );
    assert.match(migration, /CREATE TABLE.*rate_limit_buckets/i);
  });
});

// ── P1 #17/#18: Per-IP rate limits on order creation ─────────────────────────

describe("Per-IP Rate Limits — Order Creation (P1 #17/#18)", () => {
  it("mail.service.ts imports distributedRateLimit", async () => {
    const svc = await source("src/services/mail.service.ts");
    assert.match(svc, /distributedRateLimit/i);
  });

  it("createOrderFromPdf applies per-IP rate limit", async () => {
    const svc = await source("src/services/mail.service.ts");
    const createSection = svc.slice(svc.indexOf("async createOrderFromPdf"));
    assert.match(createSection, /create-order-ip/i);
    assert.match(createSection, /distributedRateLimit/i);
  });

  it("createOrderFromLetter applies per-IP rate limit", async () => {
    const svc = await source("src/services/mail.service.ts");
    const letterSection = svc.slice(svc.indexOf("async createOrderFromLetter"));
    assert.match(letterSection, /create-letter-order-ip/i);
    assert.match(letterSection, /distributedRateLimit/i);
  });

  it("clientIpMiddleware exists in request-context.ts", async () => {
    const ctx = await source("src/lib/request-context.ts");
    assert.match(ctx, /clientIpMiddleware/i);
    assert.match(ctx, /getClientIp/i);
  });

  it("start.ts includes clientIpMiddleware in functionMiddleware", async () => {
    const start = await source("src/start.ts");
    assert.match(start, /clientIpMiddleware/i);
  });

  it("orders.functions.ts passes clientIp from context", async () => {
    const fn = await source("src/lib/orders.functions.ts");
    assert.match(fn, /context\.clientIp/i);
  });
});

// ── P2 #38/#39: Configurable email sender address ───────────────────────────

describe("Configurable Email Sender (P2 #38/#39)", () => {
  it("email.server.ts uses env var for sender address, not hardcoded", async () => {
    const email = await source("src/lib/email.server.ts");
    assert.match(email, /RESEND_FROM_ADDRESS|from.*env|from.*process\.env/i);
  });

  it("email.server.ts does not use hardcoded Resend sandbox domain", async () => {
    const email = await source("src/lib/email.server.ts");
    assert.doesNotMatch(email, /onboarding@resend\.dev|sandbox.*resend/i);
  });

  it(".env.example documents RESEND_FROM_ADDRESS", async () => {
    const env = await source(".env.example");
    assert.match(env, /RESEND_FROM_ADDRESS/i);
  });

  it(".env.example documents RESEND_SUPPORT_EMAIL", async () => {
    const env = await source(".env.example");
    assert.match(env, /RESEND_SUPPORT_EMAIL/i);
  });
});

// ── P3 #50: Dead code removal ───────────────────────────────────────────────

describe("Dead Code Removal (P3 #50)", () => {
  it("stripe.server.ts does NOT export hand-rolled verifyWebhook", async () => {
    const server = await source("src/lib/stripe.server.ts");
    assert.doesNotMatch(server, /export async function verifyWebhook/);
  });

  it("stripe.server.ts does NOT use crypto.subtle for signatures", async () => {
    const server = await source("src/lib/stripe.server.ts");
    assert.doesNotMatch(server, /crypto\.subtle\.sign/);
  });
});

// ── Cross-domain token relay removal ────────────────────────────────────────

describe("Single-origin Authentication Boundary", () => {
  it("does not expose an access-token SSO relay route", () => {
    assert.equal(existsSync("src/routes/auth/sso.tsx"), false);
  });

  it("does not expose a silent session-token relay route", () => {
    assert.equal(existsSync("src/routes/auth/sso-silent.tsx"), false);
  });

  it("does not retain the iframe token propagation helper", () => {
    assert.equal(existsSync("src/lib/sso-propagate.ts"), false);
  });

  it("does not expose the unauthenticated GovReply recovery-token workflow", () => {
    const retiredPaths = [
      "src/routes/govreply.new.tsx",
      "src/routes/govreply.cases.$id.tsx",
      "src/routes/govreply.cases.$id.review.tsx",
      "src/routes/govreply.cases.$id.response.tsx",
      "src/routes/govreply.cases.$id.mail.tsx",
      "src/lib/govreply.functions.ts",
      "src/services/govreply.service.ts",
      "src/services/govreply.response.service.ts",
    ];
    for (const path of retiredPaths) assert.equal(existsSync(path), false, `${path} must remain retired`);
  });
});

// ── Retention Policy (#24) ───────────────────────────────────────────────────

describe("Data Retention Policy (#24)", () => {
  it("RETENTION_POLICY.md exists", () => {
    assert.ok(existsSync("RETENTION_POLICY.md"));
  });

  it("retention policy route exists", () => {
    assert.ok(existsSync("src/routes/retention.tsx"));
  });

  it("retention policy route mentions 7-year retention", async () => {
    const route = await source("src/routes/retention.tsx");
    assert.match(route, /7 year/i);
  });

  it("retention policy route mentions user deletion rights", async () => {
    const route = await source("src/routes/retention.tsx");
    assert.match(route, /deletion|delete.*data/i);
  });

  it("footer links to /retention", async () => {
    const footer = await source("src/components/site-chrome.tsx");
    assert.match(footer, /\/retention/i);
  });

  it("draft cleanup has configurable retention via env", async () => {
    const cleanup = await source("src/lib/draft-cleanup.server.ts");
    assert.match(cleanup, /MAILMYPDF_DRAFT_RETENTION_HOURS/i);
  });
});

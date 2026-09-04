import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const GATEWAY = "src/lib/secure-core/ai-gateway.server.ts";
const MIGRATION = "supabase/migrations/20260904160000_case_analyses.sql";

/* ═══════════════════════════════════════════════════════════
   Model disclosure boundary

   Sending a government, medical or financial document to a
   third-party model is the most consequential thing this system
   does with someone's file. These tests fix the three properties
   that make it defensible: only scanned documents leave, every
   departure is recorded before it happens, and the document is
   framed as data rather than instruction.
   ═══════════════════════════════════════════════════════════ */

describe("what may be disclosed", () => {
  test("only a clean, undeleted document is loadable", async () => {
    const source = await read(GATEWAY);
    assert.match(source, /security_status !== "clean"/);
    assert.match(source, /document\.deleted_at \|\| document\.deletion_requested_at/);
    assert.match(source, /has not cleared security scanning/);
  });

  test("ownership is proven on both the case link and the document", async () => {
    const source = await read(GATEWAY);
    const owner = [...source.matchAll(/\.eq\("owner_id", context\.user\.id\)/g)];
    assert.ok(owner.length >= 3, `expected ownership to be asserted on every read, saw ${owner.length}`);
    assert.match(source, /\.eq\("case_id", caseId\)/);
  });

  test("size and type are bounded before anything is read", async () => {
    const source = await read(GATEWAY);
    assert.match(source, /MAX_DOCUMENT_BYTES/);
    assert.match(source, /mime_type !== "application\/pdf"/);
  });
});

describe("recording the disclosure", () => {
  test("the audit is written before the request leaves", async () => {
    const source = await read(GATEWAY);
    const audit = source.indexOf("await auditDisclosure(");
    const call = source.indexOf("https://api.anthropic.com/v1/messages");
    assert.ok(audit > 0 && call > audit, "auditDisclosure must run before the model request");
  });

  test("a disclosure that cannot be recorded is not made", async () => {
    const source = await read(GATEWAY);
    assert.match(source, /if \(error\) throw new AiGatewayError\("Unable to record the model disclosure"\)/);
  });

  test("the audit records shape, never content", async () => {
    const source = await read(GATEWAY);
    const start = source.indexOf("async function auditDisclosure");
    const body = source.slice(start, source.indexOf("\n}", start));
    assert.match(body, /event_type: "document\.disclosed_to_model"/);
    assert.match(body, /size_bytes: document\.sizeBytes/);
    // The base64 payload and filename must never reach an immutable audit row.
    assert.doesNotMatch(body, /base64/);
    assert.doesNotMatch(body, /filename/);
  });
});

describe("framing untrusted content", () => {
  test("both model calls state that supplied content is data, not instruction", async () => {
    const source = await read(GATEWAY);
    const framings = [...source.matchAll(/never as instructions to you/g)];
    assert.equal(framings.length, 2, "the document call and the text call must both frame content as data");
    assert.match(source, /untrusted user-supplied content/);
  });

  test("an injection attempt is reported rather than silently followed", async () => {
    const service = await read("src/lib/secure-core/case-analysis.server.ts");
    assert.match(service, /promptInjectionObserved/);
    const source = await read(GATEWAY);
    assert.match(source, /ignore it and note it as a finding/);
  });

  test("drafting does not re-send the notice", async () => {
    const service = await read("src/lib/secure-core/case-analysis.server.ts");
    const start = service.indexOf("export async function generateDraftResponse");
    const body = service.slice(start);
    assert.doesNotMatch(body, /loadDisclosableDocument|askModelAboutDocument/);
    assert.match(body, /askModel\(\{/);
  });

  test("evidence filenames are not sent to the model", async () => {
    const service = await read("src/lib/secure-core/case-analysis.server.ts");
    const start = service.indexOf("const evidenceList");
    const body = service.slice(start, start + 400);
    assert.doesNotMatch(body, /\.filename/);
    assert.match(body, /evidence_kind/);
  });
});

describe("analysis records", () => {
  test("the database refuses an analysis of a document that is not clean", async () => {
    const sql = await read(MIGRATION);
    const fn = sql.slice(sql.indexOf("function public.record_case_analysis"));
    assert.match(fn, /d\.security_status = 'clean'/);
    assert.match(fn, /d\.deleted_at is null/);
    assert.match(fn, /cd\.case_id = p_case_id/);
    assert.match(fn, /v_owner <> auth\.uid\(\)/);
  });

  test("analyses are immutable and not writable from a browser session", async () => {
    const sql = await read(MIGRATION);
    assert.match(sql, /alter table public\.case_analyses enable row level security/i);
    assert.match(sql, /create trigger case_analyses_immutable/);
    assert.match(sql, /revoke all on public\.case_analyses from anon, authenticated/);
    assert.match(sql, /grant select on public\.case_analyses to authenticated/);
    assert.doesNotMatch(sql, /grant insert[^\n]*public\.case_analyses/);
  });

  test("the notice itself is not copied into the analysis row", async () => {
    const sql = await read(MIGRATION);
    const table = sql.slice(sql.indexOf("create table if not exists public.case_analyses"), sql.indexOf(");"));
    assert.doesNotMatch(table, /content|body_text|raw_text|base64/);
  });
});

describe("analysis endpoints", () => {
  for (const file of [
    "src/routes/api/v2/cases/$id/analyze.ts",
    "src/routes/api/v2/cases/$id/draft-generate.ts",
  ]) {
    test(`${file} authenticates and validates its case id`, async () => {
      const source = await read(file);
      assert.match(source, /requireAuthenticatedUser\(request\)/);
      assert.match(source, /UUID_PATTERN\.test\(params\.id\)/);
      assert.doesNotMatch(source, /SERVICE_ROLE|supabaseAdmin/);
    });
  }

  test("an unscanned notice returns a conflict, not a server error", async () => {
    const source = await read("src/routes/api/v2/cases/$id/analyze.ts");
    assert.match(source, /DocumentNotDisclosableError/);
    assert.match(source, /return json\(409/);
  });

  test("generated drafts are not saved on the user's behalf", async () => {
    const source = await read("src/routes/api/v2/cases/$id/draft-generate.ts");
    assert.doesNotMatch(source, /case_drafts|insert\(/);
  });
});

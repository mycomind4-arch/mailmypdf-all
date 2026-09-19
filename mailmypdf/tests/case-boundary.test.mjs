import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const MIGRATION = "supabase/migrations/20260904140000_workflow_cases_and_evidence.sql";

/* ═══════════════════════════════════════════════════════════
   Case and evidence boundary

   The workflow could charge for supporting pages it never
   collected, count evidence records as pages, and mail a letter
   while claiming attachments went with it. The rules that stop
   that recurring live in the database, not in a route handler,
   so these tests assert on the migration itself.
   ═══════════════════════════════════════════════════════════ */

describe("case and evidence schema", () => {
  test("every case table enforces row-level security", async () => {
    const sql = await read(MIGRATION);
    for (const table of ["workflow_cases", "case_documents", "case_drafts", "case_approvals"]) {
      assert.match(
        sql,
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
        `${table} must have RLS enabled`,
      );
    }
  });

  test("attaching a document proves ownership of both the case and the file", async () => {
    const sql = await read(MIGRATION);
    const policy = sql.slice(sql.indexOf('create policy "owners attach their own documents'));
    assert.match(policy, /from public\.workflow_cases c[\s\S]*?c\.owner_id = auth\.uid\(\)/);
    assert.match(policy, /from public\.secure_documents d[\s\S]*?d\.owner_id = auth\.uid\(\)/);
  });

  test("a rejected or purging document cannot be attached at all", async () => {
    const sql = await read(MIGRATION);
    const policy = sql.slice(sql.indexOf('create policy "owners attach their own documents'));
    assert.match(policy, /d\.deleted_at is null/);
    assert.match(policy, /d\.deletion_requested_at is null/);
    assert.match(policy, /d\.security_status in \('quarantined', 'scanning', 'clean'\)/);
  });

  test("the packet gate refuses anything that has not cleared scanning", async () => {
    const sql = await read(MIGRATION);
    const fn = sql.slice(sql.indexOf("function public.case_packet_documents"));
    assert.match(fn, /d\.security_status <> 'clean'/);
    assert.match(fn, /raise exception 'packet contains/);
    // A caller must not be able to list packet documents for someone else's case.
    assert.match(fn, /v_owner <> auth\.uid\(\)/);
  });

  test("a case must be about a notice before it can produce a packet", async () => {
    const sql = await read(MIGRATION);
    const fn = sql.slice(sql.indexOf("function public.case_packet_documents"));
    assert.match(fn, /raise exception 'case has no subject notice'/);
    assert.match(sql, /case_documents_single_subject_notice_idx/);
  });

  test("approval recounts the enclosed pages instead of trusting the caller", async () => {
    const sql = await read(MIGRATION);
    const fn = sql.slice(sql.indexOf("function public.approve_case_packet"));
    // It re-runs the scanning gate...
    assert.match(fn, /perform 1 from public\.case_packet_documents\(p_case_id\)/);
    // ...sums the real page counts...
    assert.match(fn, /select coalesce\(sum\(cd\.page_count\), 0\) into v_actual_supporting/);
    // ...rejects a mismatch...
    assert.match(fn, /v_actual_supporting <> p_supporting_pages/);
    // ...and stores its own number, not the one it was handed.
    assert.match(fn, /supporting_pages, recipient, mail_class, quote\s*\)\s*values \([\s\S]*?v_actual_supporting/);
  });

  test("approvals and drafts cannot be rewritten after the fact", async () => {
    const sql = await read(MIGRATION);
    assert.match(sql, /create trigger case_approvals_immutable[\s\S]*?before update or delete on public\.case_approvals/);
    assert.match(sql, /create trigger case_drafts_immutable[\s\S]*?before update or delete on public\.case_drafts/);
    // A browser session may read approvals but never manufacture one.
    assert.match(sql, /revoke all on public\.case_approvals from anon, authenticated/);
    assert.match(sql, /grant select on public\.case_approvals to authenticated/);
    assert.doesNotMatch(sql, /grant insert[^\n]*public\.case_approvals/);
  });

  test("evidence must declare what kind of document it is", async () => {
    const sql = await read(MIGRATION);
    assert.match(sql, /constraint evidence_declares_its_kind check \(role <> 'evidence' or evidence_kind is not null\)/);
  });
});

describe("case endpoints", () => {
  const routeDir = new URL("src/routes/api/v2/cases/", root);

  async function routeFiles(dir = routeDir) {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
      if (entry.isDirectory()) out.push(...(await routeFiles(child)));
      else if (entry.name.endsWith(".ts")) out.push(child);
    }
    return out;
  }

  test("every case endpoint authenticates the user first", async () => {
    for (const file of await routeFiles()) {
      const source = await readFile(file, "utf8");
      assert.match(source, /requireAuthenticatedUser\(request\)/, `${file.pathname} must authenticate`);
    }
  });

  test("no case endpoint reaches for a privileged key", async () => {
    for (const file of await routeFiles()) {
      const source = await readFile(file, "utf8");
      assert.doesNotMatch(
        source,
        /SERVICE_ROLE|supabaseAdmin/,
        `${file.pathname} must go through the user-scoped client so RLS applies`,
      );
    }
  });

  test("case responses are never cached", async () => {
    const source = await read("src/lib/secure-core/http.server.ts");
    assert.match(source, /"Cache-Control": "no-store"/);
    assert.match(source, /Pragma: "no-cache"/);
  });

  test("identifiers are validated before they reach the database", async () => {
    for (const file of await routeFiles()) {
      const source = await readFile(file, "utf8");
      if (file.pathname.includes("$")) {
        assert.match(source, /UUID_PATTERN\.test/, `${file.pathname} must validate its path parameters`);
      }
    }
  });

  test("the client never supplies page counts or prices", async () => {
    const approve = await read("src/routes/api/v2/cases/$id/approve.ts");
    assert.doesNotMatch(approve, /body\.(response_pages|supporting_pages|price|total|quote)/);

    const approval = await read("src/lib/secure-core/case-approval.server.ts");
    // Pages come from the assembled packet; the price is derived from those pages.
    assert.match(approval, /actualPages: packet\.responsePages/);
    assert.match(approval, /supportingPages: packet\.supportingPages/);
    // Approval rebuilds rather than trusting the preview it was shown.
    assert.match(approval, /const preview = await previewPacket\(input\.caseId, input\.mailClass, context\)/);
  });
});

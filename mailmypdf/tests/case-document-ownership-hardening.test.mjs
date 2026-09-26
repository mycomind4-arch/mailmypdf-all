import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(
  new URL("../supabase/migrations/20260924110000_case_document_ownership_hardening.sql", import.meta.url),
  "utf8",
);

test("case attachments are owner-bound to both case and vault document", () => {
  assert.match(sql, /foreign key \(case_id, owner_id\)[\s\S]*references public\.workflow_cases\(id, owner_id\)/);
  assert.match(sql, /foreign key \(document_id, owner_id\)[\s\S]*references public\.secure_documents\(id, owner_id\)/);
  assert.match(sql, /case_analyses_document_owner_fk/);
});

test("authenticated users cannot rewrite case-document identity columns", () => {
  assert.match(sql, /revoke update on public\.case_documents from authenticated/);
  assert.match(sql, /grant update \(included, position, page_count\) on public\.case_documents to authenticated/);
  assert.doesNotMatch(sql, /grant update \([^)]*(?:case_id|document_id|owner_id|role|evidence_kind)/);
});

test("packet gate fails closed on owner mismatches", () => {
  assert.match(sql, /case document ownership mismatch/);
  assert.match(sql, /d\.owner_id = v_owner/);
  assert.match(sql, /cd\.owner_id = v_owner/);
});

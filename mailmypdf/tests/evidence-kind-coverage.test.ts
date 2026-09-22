import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { INSURANCE_APPEAL_EVIDENCE_KINDS, NOTICE_RESPONSE_WORKFLOW_PROFILES } from "@mailmypdf/workflows";
import {
  SSDI_EVIDENCE_KINDS,
  SSDI_REQUIRED_FORMS,
} from "@mailmypdf/appeal-mail/workflows/appeal-ssdi-denial/start/workflow";
import {
  SSI_EVIDENCE_KINDS,
  SSI_REQUIRED_FORMS,
} from "@mailmypdf/appeal-mail/workflows/appeal-ssi-denial/start/workflow";
import { IMMIGRATION_COVER_LETTER_DOCUMENT_KINDS } from "@mailmypdf/immigration-mail/workflows/immigration-filing-cover-letter/start/workflow";
import { RECORDS_REQUEST_CONTEXT_KINDS } from "@mailmypdf/records-request/shared/runtime";
import { EVIDENCE_KINDS } from "../src/lib/secure-core/case.server";

// Every evidence kind an executable workflow UI can send must be accepted by
// both the app allowlist and the latest database check constraint; otherwise
// attaching that document fails at runtime with "Unrecognized evidence kind".
const WORKFLOW_EVIDENCE_KINDS: Record<string, readonly string[]> = {
  insurance: INSURANCE_APPEAL_EVIDENCE_KINDS.map(([kind]) => kind),
  notice: NOTICE_RESPONSE_WORKFLOW_PROFILES.flatMap((profile) => profile.evidenceKinds.map((kind) => kind.value)),
  ssdi: [...SSDI_EVIDENCE_KINDS.map(([kind]) => kind), ...SSDI_REQUIRED_FORMS.map((form) => form.kind)],
  ssi: [...SSI_EVIDENCE_KINDS.map(([kind]) => kind), ...SSI_REQUIRED_FORMS.map((form) => form.kind)],
  immigration: IMMIGRATION_COVER_LETTER_DOCUMENT_KINDS.map(([kind]) => kind),
  records: RECORDS_REQUEST_CONTEXT_KINDS.map(([kind]) => kind),
};

function latestDatabaseEvidenceKinds(): Set<string> {
  const dir = join(import.meta.dirname, "../supabase/migrations");
  const latest = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .filter((name) => readFileSync(join(dir, name), "utf8").includes("case_documents_evidence_kind_check"))
    .at(-1);
  assert.ok(latest, "a migration defines case_documents_evidence_kind_check");
  const sql = readFileSync(join(dir, latest), "utf8");
  const clause = sql.slice(sql.lastIndexOf("add constraint case_documents_evidence_kind_check"));
  const list = clause.slice(clause.indexOf("evidence_kind in ("), clause.indexOf(")"));
  return new Set([...list.matchAll(/'([a-z0-9_]+)'/g)].map((match) => match[1]));
}

test("every executable workflow evidence kind is accepted by the app allowlist", () => {
  const allowed = new Set<string>(EVIDENCE_KINDS);
  for (const [family, kinds] of Object.entries(WORKFLOW_EVIDENCE_KINDS)) {
    const missing = kinds.filter((kind) => !allowed.has(kind));
    assert.deepEqual(missing, [], `${family} evidence kinds missing from EVIDENCE_KINDS`);
  }
});

test("every executable workflow evidence kind is accepted by the database constraint", () => {
  const allowed = latestDatabaseEvidenceKinds();
  for (const [family, kinds] of Object.entries(WORKFLOW_EVIDENCE_KINDS)) {
    const missing = kinds.filter((kind) => !allowed.has(kind));
    assert.deepEqual(missing, [], `${family} evidence kinds missing from the database constraint`);
  }
});

test("the app allowlist and the database constraint agree", () => {
  assert.deepEqual([...EVIDENCE_KINDS].sort(), [...latestDatabaseEvidenceKinds()].sort());
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  includedDocuments,
  packetBlockers,
  type CaseDocument,
} from "../src/lib/ssdi-workflow-model";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

function document(overrides: Partial<CaseDocument>): CaseDocument {
  return {
    id: "case-document",
    document_id: "vault-document",
    role: "evidence",
    evidence_kind: "medical_records",
    page_count: null,
    included: true,
    position: 1,
    filename: "records.pdf",
    mime_type: "application/pdf",
    size_bytes: 100,
    security_status: "quarantined",
    usable: false,
    ...overrides,
  };
}

describe("SSDI denial workflow UI", () => {
  test("replaces only the SSDI denial catalog placeholder", async () => {
    const route = await read("src/routes/benefits/$.tsx");
    assert.match(route, /_splat === "ssdi-denial"/);
    assert.match(route, /return <SsdiDenialWorkflow/);
    assert.match(route, /return \(\s*<WorkflowAuthorityPage/);
  });

  test("defines the complete twelve-window sequence", async () => {
    const source = await read("src/components/workflows/ssdi-denial-workflow.tsx");
    for (const label of [
      "Secure start",
      "Denial notice",
      "Supporting records",
      "Decision details",
      "Your limitations",
      "Evidence review",
      "Appeal direction",
      "Appeal draft",
      "Packet order",
      "Mailing and price",
      "Final approval",
      "Approval record",
    ])
      assert.match(source, new RegExp(`"${label}"`));
    assert.match(source, /Window \{step \+ 1\} of 12/);
  });

  test("supports multi-file drag-and-drop with a kind for each file", async () => {
    const source = await read("src/components/workflows/ssdi-denial-workflow.tsx");
    assert.match(source, /onDragOver=/);
    assert.match(source, /onDrop=/);
    assert.match(source, /multiple=\{multiple\}/);
    assert.match(source, /Evidence kind for/);
    assert.match(source, /EVIDENCE_KINDS\.map/);
  });

  test("sends bearer auth and explicit processing consent", async () => {
    const source = await read("src/lib/ssdi-workflow-client.ts");
    assert.match(source, /headers\.set\("Authorization", `Bearer \$\{token\}`\)/);
    assert.match(source, /form\.set\("consent", "true"\)/);
    assert.match(source, /workflow_id: SSDI_WORKFLOW_ID, vertical_id: SSDI_VERTICAL_ID/);
  });

  test("does not add a client pricing or PDF measurement engine", async () => {
    const source = await read("src/lib/ssdi-workflow-client.ts");
    const model = await read("src/lib/ssdi-workflow-model.ts");
    assert.doesNotMatch(source, /calculateQuote|PDFDocument|getPageCount/);
    assert.doesNotMatch(model, /calculateQuote|PDFDocument|getPageCount/);
    assert.match(model, /formatServerMoney\(quote/);
    assert.match(model, /quote\.totalCents/);
  });

  test("keeps sensitive intake and draft text out of browser storage", async () => {
    const source = await read("src/components/workflows/ssdi-denial-workflow.tsx");
    const stored = [...source.matchAll(/localStorage\.setItem\(([^,]+)/g)].map((match) => match[1]);
    assert.deepEqual(stored.sort(), ["CASE_KEY", "STEP_KEY"]);
    assert.doesNotMatch(source, /localStorage\.setItem\([^\n]*(draft|claimant|decision|strategy)/i);
  });
});

describe("SSDI packet progression", () => {
  test("orders only included documents by the server position", () => {
    const documents = [
      document({ document_id: "later", position: 9 }),
      document({ document_id: "excluded", included: false, position: 0 }),
      document({ document_id: "first", position: 2 }),
      document({
        document_id: "notice",
        role: "subject_notice",
        evidence_kind: null,
        position: 99,
      }),
    ];
    assert.deepEqual(
      includedDocuments(documents).map((item) => item.document_id),
      ["notice", "first", "later"],
    );
  });

  test("blocks a packet with no subject notice", () => {
    assert.deepEqual(packetBlockers([document({ usable: true, security_status: "clean" })]), [
      "Add the SSDI denial notice.",
    ]);
  });

  test("truthfully blocks every included quarantined document", () => {
    const documents = [
      document({ document_id: "notice", role: "subject_notice", evidence_kind: null, position: 0 }),
      document({ document_id: "records", position: 1 }),
      document({ document_id: "excluded", included: false, position: 2 }),
    ];
    assert.deepEqual(packetBlockers(documents), [
      "2 included documents are still awaiting a security scan.",
    ]);
  });

  test("allows preview only after the included set is usable", () => {
    const documents = [
      document({
        document_id: "notice",
        role: "subject_notice",
        evidence_kind: null,
        position: 0,
        security_status: "clean",
        usable: true,
      }),
      document({ document_id: "records", position: 1, security_status: "clean", usable: true }),
    ];
    assert.deepEqual(packetBlockers(documents), []);
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";

import { assemblePacket, type PacketDocumentRow } from "../src/lib/secure-core/packet.server";
import { renderResponseLetter } from "../src/lib/secure-core/case-approval.server";
import { calculateQuote } from "@mailmypdf/pricing";

const repoRoot = new URL("../../../", import.meta.url);

async function form(name: string): Promise<Uint8Array> {
  return new Uint8Array(
    await readFile(new URL(`appeal-mail/workflows/appeal-ssdi-denial/forms/generated/${name}`, repoRoot)),
  );
}

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

function row(
  id: string,
  filename: string,
  evidenceKind: "ssa_561" | "ssa_3441" | "ssa_827",
  bytes: Uint8Array,
  position: number,
): PacketDocumentRow {
  return {
    document_id: id,
    role: "evidence",
    evidence_kind: evidenceKind,
    page_count: null,
    position,
    sha256: sha256(bytes),
    storage_path: `synthetic/${filename}`,
    safe_filename: filename,
    mime_type: "application/pdf",
  };
}

test("medical SSDI reconsideration builds a final PDF from the real official SSA forms", async () => {
  const [ssa561, ssa3441, ssa827] = await Promise.all([
    form("ssa-561-u2.pdf"),
    form("ssa-3441.pdf"),
    form("ssa-827.pdf"),
  ]);

  for (const [name, bytes] of [
    ["SSA-561-U2", ssa561],
    ["SSA-3441", ssa3441],
    ["SSA-827", ssa827],
  ] as const) {
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() >= 1, `${name} must be a readable PDF`);
  }

  const response = await renderResponseLetter(
    "I request reconsideration of the SSDI denial. This synthetic fixture contains no medical assertions.",
  );
  const documents = [
    row("11111111-1111-4111-8111-111111111111", "ssa-561-u2.pdf", "ssa_561", ssa561, 1),
    row("22222222-2222-4222-8222-222222222222", "ssa-3441.pdf", "ssa_3441", ssa3441, 2),
    row("33333333-3333-4333-8333-333333333333", "ssa-827.pdf", "ssa_827", ssa827, 3),
  ];
  const bytesById = new Map([
    [documents[0]!.document_id, ssa561],
    [documents[1]!.document_id, ssa3441],
    [documents[2]!.document_id, ssa827],
  ]);

  const first = await assemblePacket(response, documents, async (document) => bytesById.get(document.document_id)!);
  const second = await assemblePacket(response, documents, async (document) => bytesById.get(document.document_id)!);

  const merged = await PDFDocument.load(first.bytes);
  assert.equal(
    merged.getPageCount(),
    first.responsePages + first.supportingPages,
    "the generated response and all official forms must be physically present in the final PDF",
  );
  assert.equal(first.manifest.length, 3);
  assert.deepEqual(first.manifest.map((item) => item.evidenceKind), ["ssa_561", "ssa_3441", "ssa_827"]);
  assert.match(first.sha256, /^[0-9a-f]{64}$/);
  assert.equal(first.sha256, second.sha256, "the exact reviewed SSDI packet must hash deterministically");

  const quote = calculateQuote({
    workflowId: "ssdi-denial",
    verticalId: "appeal-mail",
    actualPages: first.responsePages,
    supportingPages: first.supportingPages,
    mailClass: "certified",
  });
  assert.equal(quote.commercialStatus, "production");
  assert.ok(quote.totalCents > 0);
});

test("non-medical SSDI reconsideration can build a packet with SSA-561 without forcing medical forms", async () => {
  const ssa561 = await form("ssa-561-u2.pdf");
  const response = await renderResponseLetter(
    "I request reconsideration of the non-medical SSDI determination described in the source notice.",
  );
  const document = row(
    "44444444-4444-4444-8444-444444444444",
    "ssa-561-u2.pdf",
    "ssa_561",
    ssa561,
    1,
  );

  const packet = await assemblePacket(response, [document], async () => ssa561);
  assert.equal(packet.manifest.length, 1);
  assert.equal(packet.manifest[0]?.evidenceKind, "ssa_561");
  assert.ok(packet.supportingPages >= 1);
});

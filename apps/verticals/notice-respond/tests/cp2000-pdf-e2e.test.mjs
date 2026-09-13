import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { extractCP2000 } from "../src/domain/cp2000.ts";
import { analyzeCP2000Discrepancies } from "../src/domain/cp2000-discrepancy.ts";
import { buildCP2000EvidenceChecklist } from "../src/domain/cp2000-evidence.ts";
import { validateCP2000Draft } from "../src/domain/cp2000-validation.ts";
import { createCP2000Case, setCaseAnalysis, setCaseDraft, setCaseValidation } from "../src/domain/cp2000-case.ts";

import { computeSha256 } from "../../../../packages/documents/src/index.ts";
import { assemblePacket, generatePlainTextPdf, generateLetterPdf } from "../../../../packages/packet-builder/src/index.ts";

import { FIXTURE_VALID_SIMPLE } from "./cp2000-fixtures.mjs";

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

/** Parses "Name\nLine1\n[Line2\n]City, ST ZIP" (extraction.responseAddress's
 * shape) into the discrete fields generateLetterPdf's header needs. */
function parseAddressBlock(block) {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const cityStateZip = lines[lines.length - 1] ?? "";
  const match = cityStateZip.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  return {
    name: lines[0] ?? "",
    line1: lines[1] ?? "",
    line2: lines.length > 3 ? lines[2] : null,
    city: match?.[1] ?? cityStateZip,
    state: match?.[2] ?? "",
    postal: match?.[3] ?? "",
  };
}

/**
 * Returns the page-0-only bytes of a PDF, for trimming a multi-page IRS
 * publication (instructions + every copy of a form) down to the single page
 * a user would actually attach.
 */
async function firstPageOnly(bytes) {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(bytes);
  const trimmed = await PDFDocument.create();
  const [page] = await trimmed.copyPages(source, [0]);
  trimmed.addPage(page);
  return trimmed.save();
}

/**
 * Creates the evidence a real user would upload for one checklist item.
 * Real forms (blank Form 1040, blank Form W-2 — public-domain, downloaded
 * from irs.gov) stand in wherever the IRS actually publishes one; anything
 * else the checklist asks for (e.g. bank statements, which have no
 * government form) falls back to a labeled mock page.
 */
async function createEvidencePdf(item) {
  if (item.type === "tax_return") {
    // The real, unmodified 2-page Form 1040 (irs.gov/pub/irs-pdf/f1040.pdf).
    return readFileSync(path.join(FIXTURES_DIR, "blank-form-1040.pdf"));
  }
  if (item.type === "information_return") {
    // irs.gov/pub/irs-pdf/fw2.pdf is an 11-page publication (instructions +
    // every copy); trim it to the one form page a user would actually enclose.
    const full = readFileSync(path.join(FIXTURES_DIR, "blank-form-w2.pdf"));
    return firstPageOnly(full);
  }

  const body = [
    item.label,
    "",
    `Purpose: ${item.purpose}`,
    "",
    "This document was generated for end-to-end testing to stand in for",
    "the file a real user would upload for this checklist item.",
  ].join("\n");
  return generatePlainTextPdf(body);
}

/* ═══════════════════════════════════════════════════════════════
   CP2000 → FINAL MAILED PDF, END TO END.

   Runs the real pipeline (extraction → discrepancy → evidence
   checklist → draft → validation), then — for every required
   evidence item the checklist says is missing — creates that
   document on the spot, exactly the way a user would upload it
   (real blank IRS forms where the IRS publishes one), and merges
   it with a properly-addressed response letter into the single
   packet PDF that goes to the mailing provider (Lob). No network
   calls at test time (forms are pre-downloaded fixtures); this
   exercises the same @mailmypdf/packet-builder merge and
   letter-formatting code production uses.

   Output PDF is written to tests/output/cp2000-final-packet.pdf
   for visual inspection.
   ═══════════════════════════════════════════════════════════════ */

test("PDF E2E: CP2000 case produces one complete, mailable, properly-addressed packet PDF", async () => {
  // ── 1. Extraction + analysis (real pipeline) ──
  const extraction = extractCP2000(FIXTURE_VALID_SIMPLE);
  assert.ok(extraction.isCP2000);
  assert.ok(extraction.responseAddress, "Fixture should have a parsed IRS response address");

  const case_ = createCP2000Case(extraction);
  const discrepancyResult = analyzeCP2000Discrepancies({ extraction });
  const checklist = buildCP2000EvidenceChecklist({
    extraction,
    discrepancies: discrepancyResult.discrepancies,
    findings: discrepancyResult.findings,
  });
  assert.ok(checklist.items.length > 1, "Should require more than just the notice itself");

  // ── 2. A completed, unblocked draft body (mirrors cp2000-e2e.test.mjs).
  //        No sender/recipient/date lines here — generateLetterPdf's header
  //        supplies those, the way a real mailed letter is formatted. ──
  const sender = {
    name: "Jordan Smith",
    line1: "123 Main Street",
    line2: null,
    city: "Anytown",
    state: "CA",
    postal: "90210",
  };
  const recipient = parseAddressBlock(extraction.responseAddress);
  assert.ok(recipient.name && recipient.line1 && recipient.city && recipient.state && recipient.postal,
    `Recipient address should parse completely: ${JSON.stringify(recipient)}`);

  const completedDraftBody = `Re: CP2000 Notice ${extraction.noticeNumber}
Tax Year: ${extraction.taxYear}
Notice Date: ${extraction.noticeDate ?? ""}
Response Deadline: ${extraction.responseDeadline ?? ""}

Dear Sir or Madam,

I am writing in response to the CP2000 notice referenced above for tax year ${extraction.taxYear}.

I disagree with the proposed changes. My W-2 from my employer shows income of $45,000 for tax year ${extraction.taxYear}, which differs from the $52,000 reported to the IRS. The difference appears to be an error in the third-party reporting.

Requested correction: Please correct the income amount to $45,000 based on my enclosed W-2 and account transcript.

Enclosed supporting documentation:
  - W-2 form for tax year ${extraction.taxYear}
  - IRS account transcript
  - Copy of the original CP2000 notice

Sincerely,
${sender.name}`;

  // Validation runs against the plain draft body (no header/footer noise
  // added for layout), matching what the case actually stores.
  let caseWithAnalysis = setCaseAnalysis(case_, {
    discrepancies: discrepancyResult.discrepancies.map((d) => ({ ...d, status: "addressed" })),
    findings: discrepancyResult.findings,
    evidence: checklist.items,
  });
  caseWithAnalysis = setCaseDraft(caseWithAnalysis, {
    content: completedDraftBody,
    wordCount: completedDraftBody.split(/\s+/).length,
    unresolvedPlaceholders: [],
  });

  const validation = validateCP2000Draft(caseWithAnalysis);
  caseWithAnalysis = setCaseValidation(caseWithAnalysis, validation);
  assert.equal(validation.blocked, false, `Draft should not be blocked: ${validation.blocks}`);
  assert.equal(validation.passed, true, `Draft should pass validation: ${validation.errors}`);

  // ── 3. Create every missing required/recommended evidence item ON THE SPOT,
  //        the way a user would generate and upload it, and enclose the
  //        original notice too. ──
  const documentsToCreate = checklist.items.filter(
    (item) => item.type !== "cp2000_notice" && (item.requirement === "required" || item.requirement === "recommended"),
  );
  assert.ok(documentsToCreate.length > 0, "Fixture should require at least one supporting document");

  const evidenceBytes = await Promise.all(documentsToCreate.map(createEvidencePdf));
  const noticeBytes = await generatePlainTextPdf(FIXTURE_VALID_SIMPLE);

  const rows = [];
  const bytesByDocId = new Map();

  documentsToCreate.forEach((item, i) => {
    const bytes = evidenceBytes[i];
    const filename = item.type === "tax_return" ? "form-1040.pdf"
      : item.type === "information_return" ? "form-w2.pdf"
      : `${item.type}.pdf`;
    const row = {
      document_id: item.id,
      role: "evidence",
      evidence_kind: item.type,
      page_count: null,
      position: i + 1,
      sha256: computeSha256(bytes),
      storage_path: `test/${item.id}.pdf`,
      safe_filename: filename,
      mime_type: "application/pdf",
    };
    rows.push(row);
    bytesByDocId.set(row.document_id, bytes);
  });

  const noticeRow = {
    document_id: "cp2000-notice",
    role: "subject_notice",
    evidence_kind: "cp2000_notice",
    page_count: null,
    position: 0,
    sha256: computeSha256(noticeBytes),
    storage_path: "test/cp2000-notice.pdf",
    safe_filename: "cp2000_notice.pdf",
    mime_type: "application/pdf",
  };
  rows.unshift(noticeRow);
  bytesByDocId.set(noticeRow.document_id, noticeBytes);

  // ── 4. Render the response letter WITH a real sender/recipient/date header
  //        block (generateLetterPdf — the canonical, full letter formatter,
  //        not the bare word-wrap generatePlainTextPdf used previously),
  //        then merge everything into ONE packet using the exact production
  //        merge code (@mailmypdf/packet-builder). ──
  const letterPdf = await generateLetterPdf({
    letterText: completedDraftBody,
    senderName: sender.name,
    senderLine1: sender.line1,
    senderLine2: sender.line2,
    senderCity: sender.city,
    senderState: sender.state,
    senderPostal: sender.postal,
    recipientName: recipient.name,
    recipientLine1: recipient.line1,
    recipientLine2: recipient.line2,
    recipientCity: recipient.city,
    recipientState: recipient.state,
    recipientPostal: recipient.postal,
  });

  const packet = await assemblePacket(letterPdf, rows, async (row) => {
    const bytes = bytesByDocId.get(row.document_id);
    if (!bytes) throw new Error(`Missing bytes for ${row.document_id}`);
    return bytes;
  });

  // ── 5. Assert the merged packet is what actually goes to the mailing
  //        provider: the letter first, then every enclosed document, no
  //        integrity mismatches, one PDF total. ──
  assert.equal(packet.manifest.length, rows.length, "Every created document should be enclosed");
  assert.ok(packet.responsePages >= 1, "Letter should have at least one page");
  assert.ok(packet.supportingPages >= documentsToCreate.length, "Every evidence doc should contribute at least one page");
  assert.ok(/^[a-f0-9]{64}$/.test(packet.sha256), "Packet should have a stable sha256");
  assert.ok(packet.bytes.byteLength > 0, "Packet should have bytes");
  assert.equal(Buffer.from(packet.bytes.slice(0, 5)).toString(), "%PDF-", "Output should be a real PDF");

  // ── 6. Write it out for a human to actually look at the final PDF. ──
  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "cp2000-final-packet.pdf");
  writeFileSync(outPath, packet.bytes);

  console.log(`CP2000 final packet written to ${outPath}`);
  console.log(`  response pages: ${packet.responsePages}, supporting pages: ${packet.supportingPages}, sha256: ${packet.sha256}`);
});

test("PDF E2E: a page removed in the packet preview is actually gone from the mailed PDF", async () => {
  // The user's real workflow: preview the assembled packet, decide the
  // second page of the Form W-2 attachment isn't needed, remove it, and
  // confirm the final mailed PDF reflects that -- one page fewer, and the
  // integrity hash still checks out against the (unexcluded) stored bytes.
  const letterPdf = await generatePlainTextPdf("Re: test\n\nDear Sir or Madam,\n\nSee enclosed.\n\nSincerely,\nJordan Smith");
  const twoPageDoc = await (async () => {
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    for (const label of ["Page one of the attachment", "Page two of the attachment"]) {
      const page = doc.addPage([612, 792]);
      page.drawText(label, { x: 72, y: 700, size: 12, font });
    }
    return doc.save();
  })();

  const row = {
    document_id: "doc-1",
    role: "evidence",
    evidence_kind: "information_return",
    page_count: null,
    position: 1,
    sha256: computeSha256(twoPageDoc),
    storage_path: "test/doc-1.pdf",
    safe_filename: "two-page.pdf",
    mime_type: "application/pdf",
    excluded_pages: [1], // drop the second page (0-based)
  };

  const packet = await assemblePacket(letterPdf, [row], async () => twoPageDoc);

  assert.equal(packet.supportingPages, 1, "The excluded page should not be in the mailed PDF");
  assert.equal(packet.manifest[0].pageCount, 1, "Manifest should reflect the page actually enclosed");

  // Deleting every page of an attachment is refused, not silently mailed as nothing.
  await assert.rejects(
    () => assemblePacket(letterPdf, [{ ...row, excluded_pages: [0, 1] }], async () => twoPageDoc),
    /no pages left/,
  );
});

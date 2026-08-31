import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { createAuditLog, AuditLog, AUDIT_EVENT_LABELS } from "../src/domain/audit";

/* ═══════════════════════════════════════════════════════════
   PARITY: Audit Trail Tests
   Tests the audit log records and retrieves events correctly.
   ═══════════════════════════════════════════════════════════ */

describe("Audit Log — Basic Operations", () => {
  test("creates audit log with appeal ID", () => {
    const log = createAuditLog("appeal-123");
    assert.equal(log.count(), 0);
  });

  test("logs events with correct fields", () => {
    const log = createAuditLog("appeal-123");
    const event = log.log("document_uploaded", "User uploaded denial_letter.pdf", { fileSize: 12345 });

    assert.equal(event.appealId, "appeal-123");
    assert.equal(event.type, "document_uploaded");
    assert.equal(event.detail, "User uploaded denial_letter.pdf");
    assert.equal((event.metadata as any).fileSize, 12345);
    assert.ok(event.id);
    assert.ok(event.timestamp);
  });

  test("retrieves events in reverse chronological order", async () => {
    const log = createAuditLog("appeal-123");
    log.log("appeal_created", "Appeal created");
    await new Promise(r => setTimeout(r, 10));
    log.log("document_uploaded", "Doc uploaded");
    await new Promise(r => setTimeout(r, 10));
    log.log("extraction_completed", "Extraction done");

    const all = log.getAll();
    assert.equal(all.length, 3);
    assert.equal(all[0].type, "extraction_completed"); // most recent first
    assert.equal(all[2].type, "appeal_created"); // oldest last
  });

  test("retrieves events chronologically", async () => {
    const log = createAuditLog("appeal-123");
    log.log("appeal_created", "Appeal created");
    await new Promise(r => setTimeout(r, 10));
    log.log("document_uploaded", "Doc uploaded");

    const chronological = log.getChronological();
    assert.equal(chronological[0].type, "appeal_created");
    assert.equal(chronological[1].type, "document_uploaded");
  });

  test("filters by event type", () => {
    const log = createAuditLog("appeal-123");
    log.log("appeal_created", "Created");
    log.log("document_uploaded", "Doc 1");
    log.log("document_uploaded", "Doc 2");
    log.log("extraction_completed", "Done");

    const docs = log.getByType("document_uploaded");
    assert.equal(docs.length, 2);
  });

  test("checks if event exists", () => {
    const log = createAuditLog("appeal-123");
    log.log("draft_generated", "Draft created");

    assert.ok(log.hasEvent("draft_generated"));
    assert.ok(!log.hasEvent("mailing_submitted"));
  });

  test("clears all events", () => {
    const log = createAuditLog("appeal-123");
    log.log("appeal_created", "Created");
    log.log("document_uploaded", "Doc");

    log.clear();
    assert.equal(log.count(), 0);
  });
});

describe("Audit Log — Summary", () => {
  test("generates event type summary", () => {
    const log = createAuditLog("appeal-123");
    log.log("document_uploaded", "Doc 1");
    log.log("document_uploaded", "Doc 2");
    log.log("extraction_completed", "Done");

    const summary = log.getSummary();
    assert.equal(summary.length, 2); // two distinct types
    const docSummary = summary.find(s => s.type === "document_uploaded");
    assert.equal(docSummary?.count, 2);
    assert.equal(docSummary?.label, AUDIT_EVENT_LABELS.document_uploaded);
  });
});

describe("Audit Log — All Event Types Have Labels", () => {
  const expectedTypes = [
    "appeal_created", "document_uploaded", "document_classified",
    "extraction_completed", "xray_completed", "timeline_built",
    "ground_added", "ground_confirmed", "evidence_uploaded",
    "evidence_linked", "argument_constructed", "stress_test_completed",
    "strategy_generated", "draft_generated", "draft_validated",
    "readiness_reviewed", "packet_assembled", "recipient_set",
    "mailing_selected", "checkout_started", "checkout_completed",
    "mailing_submitted", "mailing_failed", "proof_generated",
    "appeal_archived",
  ];

  for (const type of expectedTypes) {
    test(`AUDIT_EVENT_LABELS has label for ${type}`, () => {
      assert.ok(AUDIT_EVENT_LABELS[type as keyof typeof AUDIT_EVENT_LABELS], `Missing label for ${type}`);
    });
  }
});

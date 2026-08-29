import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  detectMissingInfo,
  resolveMissingInfo,
  deferMissingInfo,
  dismissMissingInfo,
  missingInfoSummary,
} from "../src/domain/missing-info.ts";
import { createFact } from "../src/domain/fact.ts";

describe("Missing Information Engine", () => {
  it("detects missing deadline", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ certainty: "missing" }],
      evidence: [],
      agency: "IRS",
      referenceNumber: "REF-123",
      noticeDate: "2026-01-15",
    });
    const deadlineItems = items.filter((i) => i.category === "deadline");
    assert.ok(deadlineItems.length > 0);
    assert.equal(deadlineItems[0].impact, "blocking");
  });

  it("detects ambiguous deadline", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ date: "2026-09-15", certainty: "ambiguous" }],
      evidence: [],
      agency: "IRS",
      referenceNumber: "REF-123",
      noticeDate: "2026-01-15",
    });
    const deadlineItems = items.filter((i) => i.category === "deadline");
    assert.ok(deadlineItems.length > 0);
    assert.match(deadlineItems[0].label, /ambiguous/i);
  });

  it("detects missing agency", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      evidence: [],
      referenceNumber: "REF-123",
      noticeDate: "2026-01-15",
    });
    assert.ok(items.some((i) => i.field === "issuing_agency"));
  });

  it("detects missing reference number", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      evidence: [],
      agency: "IRS",
      noticeDate: "2026-01-15",
    });
    assert.ok(items.some((i) => i.field === "reference_number"));
  });

  it("detects missing notice date", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      evidence: [],
      agency: "IRS",
      referenceNumber: "REF-123",
    });
    assert.ok(items.some((i) => i.field === "notice_date"));
  });

  it("detects missing recipient address", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      evidence: [],
      agency: "IRS",
      referenceNumber: "REF-123",
      noticeDate: "2026-01-15",
      recipient: { name: "", address1: "", city: "", state: "", zip: "" },
    });
    assert.ok(items.some((i) => i.category === "recipient"));
  });

  it("detects unverified facts", () => {
    const fact = createFact("Amount Owed", "$1,234", "extracted", "medium");
    const items = detectMissingInfo({
      facts: [fact],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      evidence: [],
      agency: "IRS",
      referenceNumber: "REF-123",
      noticeDate: "2026-01-15",
    });
    assert.ok(items.some((i) => i.category === "evidence" && i.label.includes("Amount Owed")));
  });

  it("detects missing evidence", () => {
    const items = detectMissingInfo({
      facts: [createFact("Agency", "IRS", "extracted", "high", { userConfirmed: true })],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      evidence: [],
      agency: "IRS",
      referenceNumber: "REF-123",
      noticeDate: "2026-01-15",
    });
    assert.ok(items.some((i) => i.field === "supporting_evidence"));
  });

  it("returns no missing items for complete case", () => {
    const items = detectMissingInfo({
      facts: [createFact("Agency", "IRS", "extracted", "high", { userConfirmed: true })],
      deadlines: [{ date: "2026-09-15", certainty: "explicit" }],
      evidence: [{ id: "e1", label: "Tax Form" }],
      agency: "IRS",
      referenceNumber: "REF-123",
      noticeDate: "2026-01-15",
      recipient: { name: "IRS", address1: "123 Main", city: "DC", state: "DC", zip: "20001" },
    });
    assert.equal(items.length, 0);
  });

  it("resolves missing info items", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ certainty: "missing" }],
      evidence: [],
      agency: "IRS",
      referenceNumber: "REF",
      noticeDate: "2026-01-15",
    });
    const resolved = resolveMissingInfo(items[0], "2026-09-15");
    assert.equal(resolved.status, "provided");
    assert.equal(resolved.resolvedValue, "2026-09-15");
  });

  it("defers missing info items", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ certainty: "missing" }],
      evidence: [],
      agency: "IRS",
      referenceNumber: "REF",
      noticeDate: "2026-01-15",
    });
    const deferred = deferMissingInfo(items[0]);
    assert.equal(deferred.status, "deferred");
  });

  it("generates summary statistics", () => {
    const items = detectMissingInfo({
      facts: [],
      deadlines: [{ certainty: "missing" }],
      evidence: [],
    });
    const summary = missingInfoSummary(items);
    assert.ok(summary.total > 0);
    assert.ok(summary.missing > 0);
    assert.ok(summary.blocking > 0);
  });
});

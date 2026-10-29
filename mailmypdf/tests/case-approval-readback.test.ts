import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assertRecordedCaseApproval,
  assertRecipient,
  assertMailableDraftText,
  type Recipient,
  type PacketPreview,
} from "../src/lib/secure-core/case-approval.server";

// No database, payment processor, or mailing provider is called by these tests.
const recipient: Recipient = {
  name: "Internal Revenue Service",
  line1: "P.O. Box 1234",
  city: "Austin",
  state: "TX",
  postal: "78714",
};
const manifest: PacketPreview["manifest"] = [{
  documentId: "evidence-1",
  role: "evidence",
  evidenceKind: "tax_return",
  filename: "synthetic-evidence.pdf",
  sha256: "a".repeat(64),
  pageCount: 2,
}];

function fixture() {
  const expected = {
    approvalId: "approval-1",
    caseId: "case-1",
    ownerId: "owner-1",
    packetSha256: "b".repeat(64),
    manifest,
    responsePages: 1,
    supportingPages: 2,
    recipient,
    mailClass: "certified" as const,
    totalCents: 599,
  };
  const recorded = {
    id: expected.approvalId,
    case_id: expected.caseId,
    owner_id: expected.ownerId,
    packet_sha256: expected.packetSha256,
    manifest: [{
      // A JSONB read may reorder keys and use snake_case.
      page_count: 2,
      sha256: "a".repeat(64),
      safe_unused_field: "ignored",
      filename: "synthetic-evidence.pdf",
      evidence_kind: "tax_return",
      role: "evidence",
      document_id: "evidence-1",
    }],
    response_pages: 1,
    supporting_pages: 2,
    recipient: { postal: "78714", state: "TX", city: "Austin", line1: "P.O. Box 1234", name: "Internal Revenue Service" },
    mail_class: "certified",
    quote: { totalCents: 599 },
  };
  return { expected, recorded };
}

describe("owner-scoped exact-document approval readback", () => {
  test("accepts the matching durable record despite JSONB key order", () => {
    const { expected, recorded } = fixture();
    assert.doesNotThrow(() => assertRecordedCaseApproval(recorded, expected));
  });

  test("fails closed on missing records and mismatched owner, case, or approval ID", () => {
    const { expected, recorded } = fixture();
    assert.throws(() => assertRecordedCaseApproval(null, expected), /persistence/);
    for (const key of ["id", "case_id", "owner_id"] as const) {
      assert.throws(
        () => assertRecordedCaseApproval({ ...recorded, [key]: "other-owner-or-case" }, expected),
        /persistence/,
      );
    }
  });

  test("rejects changed PDF, page counts, mail class, and price", () => {
    const { expected, recorded } = fixture();
    const variants = [
      { ...recorded, packet_sha256: "c".repeat(64) },
      { ...recorded, response_pages: 2 },
      { ...recorded, supporting_pages: 1 },
      { ...recorded, mail_class: "standard" },
      { ...recorded, quote: { totalCents: 600 } },
      { ...recorded, quote: null },
    ];
    for (const row of variants) {
      assert.throws(() => assertRecordedCaseApproval(row, expected), /persistence/);
    }
  });

  test("rejects changed recipient or enclosure manifest", () => {
    const { expected, recorded } = fixture();
    assert.throws(() => assertRecordedCaseApproval({
      ...recorded,
      recipient: { ...recorded.recipient, postal: "78715" },
    }, expected), /persistence/);
    assert.throws(() => assertRecordedCaseApproval({
      ...recorded,
      manifest: [{ ...recorded.manifest[0], sha256: "d".repeat(64) }],
    }, expected), /persistence/);
    assert.throws(() => assertRecordedCaseApproval({
      ...recorded, manifest: [],
    }, expected), /persistence/);
  });
});


describe("direct v2 case packet and approval draft gate (no provider calls)", () => {
  test("permits complete correspondence and ordinary bracketed prose", () => {
    assert.doesNotThrow(() => assertMailableDraftText(
      "Dear IRS,\\nI dispute the amount on the notice. [see attached return]\\nSincerely, Example Taxpayer",
    ));
  });

  test("blocks all-caps and title-case template slots before PDF assembly", () => {
    for (const text of [
      "Dear IRS,\\n[YOUR NAME] requests reconsideration.",
      "Sincerely, [Your Name]",
      "Please respond by [DATE].",
      "Send the letter to [RECIPIENT ADDRESS].",
    ]) {
      assert.throws(() => assertMailableDraftText(text), /unfilled placeholders/);
    }
  });

  test("rejects empty, whitespace-only and malformed persisted draft bodies", () => {
    for (const value of ["", "   ", null, undefined, 123]) {
      assert.throws(() => assertMailableDraftText(value), /draft is empty/);
    }
  });
});

describe("direct v2 case recipient mailing boundary (no provider calls)", () => {
  test("preserves valid US, territory, and military postal destinations", () => {
    assert.deepEqual(assertRecipient({
      ...recipient, state: " tx ", postal: "78714-1234", line2: "Suite 5",
    }), { ...recipient, state: "TX", postal: "78714-1234", line2: "Suite 5" });
    for (const state of ["CA", "PR", "DC", "AE", "AP", "AA"]) {
      assert.equal(assertRecipient({ ...recipient, state }).state, state);
    }
  });

  test("rejects forged envelope lines and invisible formatting in every recipient field", () => {
    for (const field of ["name", "line1", "city", "state", "postal", "line2"] as const) {
      for (const injection of ["\nFORGED ADDRESS", "\rFORGED ADDRESS", "\u202eFORGED", "\u0085FORGED"]) {
        assert.throws(
          () => assertRecipient({ ...recipient, [field]: injection }),
          /unsafe or unfinished/,
          `${field}: ${JSON.stringify(injection)}`,
        );
      }
    }
  });

  test("rejects placeholders, invalid state codes and malformed optional suite lines", () => {
    for (const field of ["name", "line1", "city", "line2"] as const) {
      assert.throws(() => assertRecipient({ ...recipient, [field]: "[YOUR ADDRESS]" }), /unsafe or unfinished/);
    }
    for (const state of ["ZZ", "XX", "UK", "C1"]) {
      assert.throws(() => assertRecipient({ ...recipient, state }), /state is not a supported/);
    }
    for (const line2 of [123, { suite: "5" }, ["Suite 5"]]) {
      assert.throws(() => assertRecipient({ ...recipient, line2 }), /line2 must be text/);
    }
    assert.throws(() => assertRecipient({ ...recipient, line2: "A".repeat(201) }), /line2 contains unsafe/);
    assert.equal(assertRecipient({ ...recipient, line2: "" }).line2, null);
  });
});

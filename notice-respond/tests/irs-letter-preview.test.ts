import { describe, expect, it } from "vitest";
import irsGeneralDefinition from "../workflows/irs-notice-response/definition";

const valid = {
  mail: {
    noticeDocumentId: "notice-2026",
    analyzedNoticeDocumentId: "notice-2026",
    noticeSha256: "a".repeat(64),
    analyzedNoticeSha256: "a".repeat(64),
    noticeStatus: "active",
    responsePath: "mail",
    instructionsConfirmed: true,
    mailPermitted: true,
    requiresDifferentProcedure: false,
    recipientAddress: "Internal Revenue Service\nP.O. Box 1234\nAustin, TX 78714",
    recipientAddressSource: "controlling_notice",
    recipientAddressConfirmed: true,
    confirmedRecipientAddress: "Internal Revenue Service\nP.O. Box 1234\nAustin, TX 78714",
    confirmedRecipientNoticeSha256: "a".repeat(64),
    confirmedRecipientAddressSource: "controlling_notice",
    confirmedRecipientResponsePath: "mail",
  },
  taxpayerName: "Example Taxpayer",
  returnAddress: "100 Example St\nEureka, CA 95501",
  responseBody: "I am writing in response to the notice. Please review the attached records.",
  verifiedNoticeNumber: "CP-EXAMPLE",
  verifiedTaxPeriod: "2025",
} as const;

describe("general IRS notice draft-only letter preview", () => {
  it("generates deterministic notice-specific text without inventing a deadline or authorizing mail", () => {
    const result = irsGeneralDefinition.prepareLetterPreview(valid);
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected a draft preview");
    expect(result.preview.status).toBe("draft_preview_only");
    expect(result.preview.sourceNoticeSha256).toBe("a".repeat(64));
    expect(result.preview.recipientAddress).toBe(valid.mail.recipientAddress);
    expect(result.preview.letterText).toContain("Re: IRS notice CP-EXAMPLE");
    expect(result.preview.letterText).toContain("Tax period: 2025");
    expect(result.preview.letterText).toContain(valid.responseBody);
    expect(result.preview.letterText).not.toMatch(/response deadline|due by|payment authorized/i);
    expect(irsGeneralDefinition.prepareLetterPreview(valid)).toEqual(result);
  });

  it("refuses to draft for informational, nonmail, and unverified-response notices", () => {
    for (const responsePath of ["record_only", "nonmail", "unresolved"] as const) {
      const result = irsGeneralDefinition.prepareLetterPreview({
        ...valid, mail: { ...valid.mail, responsePath },
      });
      expect(result.ready).toBe(false);
      expect(result.preview).toBeNull();
      expect(result.blockers).toContain("mail_response_not_selected");
    }
    const requiredForm = irsGeneralDefinition.prepareLetterPreview({
      ...valid, mail: { ...valid.mail, requiresDifferentProcedure: true },
    });
    expect(requiredForm.ready).toBe(false);
    expect(requiredForm.blockers).toContain("different_procedure_required");
  });

  it("does not produce text when the notice or recipient confirmation is stale", () => {
    const stale = irsGeneralDefinition.prepareLetterPreview({
      ...valid, mail: { ...valid.mail, noticeSha256: "b".repeat(64) },
    });
    expect(stale.ready).toBe(false);
    expect(stale.preview).toBeNull();
    expect(stale.blockers).toContain("source_notice_digest_changed");
    expect(stale.blockers).toContain("recipient_confirmation_stale");
  });

  it("rejects missing facts, template placeholders, control characters, and ambiguous sender lines", () => {
    const invalid = [
      { taxpayerName: " " },
      { responseBody: "[insert response here]" },
      { responseBody: "Response\u202e to notice" },
      { responseBody: "A".repeat(6001) },
      { returnAddress: "100 Example St" },
      { returnAddress: "100 Example St\rEureka, CA 95501" },
      { returnAddress: "100 Example St\nEureka, CA" },
      { returnAddress: "Not a delivery address\nEureka, CA 95501" },
      { returnAddress: "100 Example St\nEureka, ZZ 95501" },
      { returnAddress: "100 Example St\nEureka, CA 95501\nInjected footer" },
      { responseBody: "I dispute {amount} for {tax_year}." },
      { verifiedNoticeNumber: "CP14\nForged second line" },
    ];
    for (const change of invalid) {
      const result = irsGeneralDefinition.prepareLetterPreview({ ...valid, ...change });
      expect(result.ready).toBe(false);
      expect(result.preview).toBeNull();
      expect(result.blockers.length).toBeGreaterThan(0);
    }
  });

  it("accepts a concrete PO Box return address while preserving draft-only status", () => {
    const result = irsGeneralDefinition.prepareLetterPreview({
      ...valid,
      returnAddress: "P.O. Box 120\nEureka, CA 95502",
    });
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected a draft preview");
    expect(result.preview.letterText).toContain("P.O. Box 120\nEureka, CA 95502");
    expect(result.preview.status).toBe("draft_preview_only");
  });

  it("omits optional references when not verified instead of fabricating them", () => {
    const result = irsGeneralDefinition.prepareLetterPreview({
      ...valid, verifiedNoticeNumber: null, verifiedTaxPeriod: null,
    });
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected a draft preview");
    expect(result.preview.letterText).not.toContain("Re: IRS notice");
    expect(result.preview.letterText).not.toContain("Tax period:");
  });
});

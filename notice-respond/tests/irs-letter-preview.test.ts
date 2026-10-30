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

  it("accepts USPS-standard comma-free city/state/ZIP lines for confirmed IRS and sender addresses", async () => {
    // USPS Publication 28 section 222 permits omission of punctuation.
    // A real notice-provided destination must not be blocked merely because
    // its final postal line is AUSTIN TX 78714 instead of Austin, TX 78714.
    const recipientAddress = "Internal Revenue Service\nP.O. Box 1234\nAustin TX 78714";
    const input = {
      ...valid,
      mail: { ...valid.mail, recipientAddress, confirmedRecipientAddress: recipientAddress },
      returnAddress: "100 Example St\nEureka CA 95501",
    };
    expect(irsGeneralDefinition.mailPacketReadiness(input.mail)).toEqual({
      canPreviewMailPacket: true, blockers: [],
    });
    const letter = irsGeneralDefinition.prepareLetterPreview(input);
    expect(letter.ready).toBe(true);
    if (!letter.ready) throw new Error("Expected comma-free postal lines to be valid");
    expect(letter.preview.recipientAddress).toBe(recipientAddress);
    expect(letter.preview.letterText).toContain("Eureka CA 95501");

    const pdf = await irsGeneralDefinition.preparePdfPreview(input);
    expect(pdf.ready).toBe(true);
    if (!pdf.ready) throw new Error("Expected a printable IRS PDF");
    expect(new TextDecoder().decode(pdf.preview.pdfBytes.subarray(0, 5))).toBe("%PDF-");

    const invalid = irsGeneralDefinition.mailPacketReadiness({
      ...input.mail,
      recipientAddress: "Internal Revenue Service\nAustin ZZ 78714",
      confirmedRecipientAddress: "Internal Revenue Service\nAustin ZZ 78714",
    });
    expect(invalid.canPreviewMailPacket).toBe(false);
    expect(invalid.blockers).toContain("recipient_address_incomplete");
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

  it("rejects C1 control characters in recipient and letter fields before drafting", () => {
    // C1 control bytes are not visible postal characters and can be rendered
    // inconsistently by PDF/envelope consumers despite matching confirmations.
    for (const control of ["\u0085", "\u009f"]) {
      const recipientAddress = `Internal Revenue Service${control}\nP.O. Box 1234\nAustin, TX 78714`;
      const mail = { ...valid.mail, recipientAddress, confirmedRecipientAddress: recipientAddress };
      expect(irsGeneralDefinition.mailPacketReadiness(mail).blockers).toContain("recipient_address_incomplete");
      expect(irsGeneralDefinition.prepareLetterPreview({ ...valid, mail }).ready).toBe(false);
      for (const change of [
        { taxpayerName: `Example${control} Taxpayer` },
        { returnAddress: `100 Example${control} St\nEureka, CA 95501` },
        { responseBody: `Please review${control} this notice.` },
        { verifiedNoticeNumber: `CP${control}14` },
      ]) {
        expect(irsGeneralDefinition.prepareLetterPreview({ ...valid, ...change }).ready).toBe(false);
      }
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

  it("accepts USPS rural-route and highway-contract return addresses for physical IRS replies", async () => {
    // USPS Publication 28 sections 241 and 251 recognize RR # BOX # and
    // HC # BOX # as delivery lines. Rejecting them blocks legitimate senders
    // from reviewing and mailing an otherwise valid IRS response.
    for (const deliveryLine of [
      "RR 2 BOX 152",
      "RR 9 BOX 23A",
      "RR 4 BOX 19-1A",
      "HC 68 BOX 23A",
    ]) {
      const returnAddress = `${deliveryLine}\nEureka CA 95501`;
      const letter = irsGeneralDefinition.prepareLetterPreview({ ...valid, returnAddress });
      expect(letter.ready, deliveryLine).toBe(true);
      if (!letter.ready) throw new Error(`Expected USPS delivery line: ${deliveryLine}`);
      expect(letter.preview.letterText).toContain(returnAddress);
    }

    const pdf = await irsGeneralDefinition.preparePdfPreview({
      ...valid, returnAddress: "RR 2 BOX 152\nEureka CA 95501",
    });
    expect(pdf.ready).toBe(true);
    if (!pdf.ready) throw new Error("Expected printable rural-route sender PDF");
    expect(new TextDecoder().decode(pdf.preview.pdfBytes.subarray(0, 5))).toBe("%PDF-");
    expect(pdf.preview.status).toBe("draft_pdf_preview_only");

    // Route/box numbers and a valid city/state/ZIP are still mandatory.
    for (const returnAddress of [
      "RR 2 BOX\nEureka CA 95501",
      "HC BOX 23A\nEureka CA 95501",
      "RR 2 BOX 152 BRYAN DAIRY RD\nEureka CA 95501",
    ]) {
      const invalid = irsGeneralDefinition.prepareLetterPreview({ ...valid, returnAddress });
      expect(invalid.ready, returnAddress).toBe(false);
      expect(invalid.blockers).toContain("return_address_missing_or_unsafe");
    }
  });

  it("rejects conflicting sender city/state/ZIP lines in letter and PDF previews", async () => {
    // The original parser accepted this because it only checked the final
    // destination line, despite two different return destinations.
    const returnAddress = "100 Example St\nEureka, CA 95501\nReno, NV 89501";
    const input = { ...valid, returnAddress };
    const letter = irsGeneralDefinition.prepareLetterPreview(input);
    expect(letter.ready).toBe(false);
    expect(letter.preview).toBeNull();
    expect(letter.blockers).toContain("return_address_missing_or_unsafe");

    const pdf = await irsGeneralDefinition.preparePdfPreview(input);
    expect(pdf.ready).toBe(false);
    expect(pdf.preview).toBeNull();
    expect(pdf.blockers).toContain("return_address_missing_or_unsafe");
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

describe("general IRS notice printable PDF preview", () => {
  it("renders a real PDF with a hash of its exact bytes, without approval or mailing", async () => {
    const result = await irsGeneralDefinition.preparePdfPreview(valid);
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected PDF preview");
    expect(result.preview.status).toBe("draft_pdf_preview_only");
    expect(result.preview.sourceNoticeSha256).toBe(valid.mail.noticeSha256);
    expect(result.preview.recipientAddress).toBe(valid.mail.recipientAddress);
    expect(new TextDecoder().decode(result.preview.pdfBytes.subarray(0, 5))).toBe("%PDF-");
    expect(result.preview.pdfBytes.length).toBeGreaterThan(500);
    expect(result.preview.pageCount).toBeGreaterThanOrEqual(1);
    const { createHash } = await import("node:crypto");
    expect(result.preview.pdfSha256).toBe(
      createHash("sha256").update(result.preview.pdfBytes).digest("hex"),
    );
    expect(Object.keys(result.preview).sort()).toEqual([
      "pageCount", "pdfBytes", "pdfSha256", "recipientAddress", "sourceNoticeSha256", "status",
    ]);
  });

  it("never renders when the notice, response channel, or recipient confirmation is stale", async () => {
    for (const mail of [
      { ...valid.mail, noticeSha256: "b".repeat(64) },
      { ...valid.mail, responsePath: "nonmail" as const },
      { ...valid.mail, recipientAddressConfirmed: false },
    ]) {
      const result = await irsGeneralDefinition.preparePdfPreview({ ...valid, mail });
      expect(result.ready).toBe(false);
      expect(result.preview).toBeNull();
      expect(result.blockers.length).toBeGreaterThan(0);
    }
  });

  it("refuses characters the production PDF font would silently replace", async () => {
    for (const responseBody of ["Please review the snowman ☃.", "A tab\tinside the response."]) {
      const result = await irsGeneralDefinition.preparePdfPreview({ ...valid, responseBody });
      expect(result.ready).toBe(false);
      expect(result.blockers).toContain("pdf_font_unsupported_characters");
    }
  });
});

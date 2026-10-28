import { describe, expect, it } from "vitest";

import workflowConfig from "../workflows/irs-notice-response/config";
import irsGeneralDomain from "../workflows/irs-notice-response/domain";
import irsGeneralDefinition from "../workflows/irs-notice-response/definition";
import irsGeneralExtractionSchema from "../workflows/irs-notice-response/extraction-schema";

describe("general IRS notice primary-source safeguards", () => {
  it("does not imply every IRS notice requires a reply or promise a confirmed deadline", () => {
    expect(workflowConfig.faqs.find(([question]) => question === "Should I respond to every notice?")?.[1]).toMatch(/not every IRS notice requires a reply/i);
    expect(workflowConfig.outputs.join(" ")).not.toMatch(/confirmed response deadline/i);
    expect(workflowConfig.outputs.join(" ")).toMatch(/not a calculated or guaranteed deadline/i);
  });

  it("keeps special relief distinct from notice-specific appeal and response rules", () => {
    expect(workflowConfig.disclaimer).toMatch(/does not automatically extend every notice response or appeal deadline/i);
    expect(workflowConfig.disclaimer).toMatch(/general letter does not replace a required IRS form or formal appeal/i);
    expect(workflowConfig.sources.map(({ href }) => href)).toEqual(expect.arrayContaining([
      "https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter",
      "https://www.irs.gov/newsroom/tax-relief-in-disaster-situations",
    ]));
  });

  it("does not recommend a generic letter for disputes that require a formal IRS process", () => {
    const disagreement = workflowConfig.faqs.find(([question]) => question === "What if I think the notice is an error?")?.[1] ?? "";
    expect(disagreement).toMatch(/notice-specific (?:disagreement|response|instructions)/i);
    expect(disagreement).toMatch(/required form|formal appeal/i);
    expect(disagreement).toMatch(/general (?:letter|response)/i);
  });

  it("does not assume every clarification request has a response deadline", () => {
    const clarification = workflowConfig.faqs.find(([question]) => question === "What if I don't understand the notice?")?.[1] ?? "";
    expect(clarification).toMatch(/if the notice specifies a (?:response )?deadline/i);
    expect(clarification).not.toMatch(/before the deadline\./i);
  });
  it("treats notice response dates as conditional in the FAQ and intake checklist", () => {
    const understanding = workflowConfig.faqs.find(([question]) => question === "How do I understand what the IRS notice is asking?")?.[1] ?? "";
    expect(understanding).toMatch(/whether a response deadline is stated/i);
    const noticeChecklist = workflowConfig.readyItems.find(([label]) => label === "IRS notice")?.[1] ?? "";
    expect(noticeChecklist).toMatch(/any printed deadline/i);
  });

  it("represents informational notices without inventing required action, dates, or recipients", () => {
    const fields = irsGeneralExtractionSchema.extractionFields;
    expect(fields.issueDescription.required).toBe(true);
    expect(fields.requiredAction.required).toBe(false);
    expect(fields.responseDeadline.required).toBe(false);
    expect(fields.submissionInstructions.required).toBe(false);
    expect(fields.mailingAddress.required).toBe(false);
    expect(irsGeneralExtractionSchema.instructions).toMatch(/never invent a response deadline, extension, or recipient/i);
  });

  it("does not require an outgoing packet for record-only informational notices", () => {
    const recordOnly = irsGeneralDomain.responseOptions.find(({ id }) => id === "no_mail_needed");
    expect(recordOnly?.description).toMatch(/without generating outgoing mail/i);
    const responsePacket = irsGeneralDomain.outputPackageContents.find(({ item }) => /response packet/i.test(item));
    expect(responsePacket?.required).toBe(false);
    expect(workflowConfig.outputs.join(" ")).toMatch(/when correspondence is appropriate/i);
    expect(workflowConfig.outputs.join(" ")).toMatch(/when a response is actually submitted/i);
  });

  it("keeps drafting and fulfillment steps conditional for record-only notices", () => {
    const draftStep = workflowConfig.workflowSteps.find(([label]) => /Prepare response/i.test(label));
    expect(draftStep?.[0]).toMatch(/if needed/i);
    expect(draftStep?.[1]).toMatch(/only when the notice-specific instructions support correspondence/i);
    const proofStep = workflowConfig.workflowSteps.find(([label]) => /Submit and retain proof/i.test(label));
    expect(proofStep?.[1]).toMatch(/any required response/i);
  });

  it("distinguishes mailed correspondence from required nonmail IRS actions", () => {
    const mailed = irsGeneralDomain.responseOptions.find(({ id }) => id === "general_response");
    const nonmail = irsGeneralDomain.responseOptions.find(({ id }) => id === "notice_directed_nonmail_action");
    const recordOnly = irsGeneralDomain.responseOptions.find(({ id }) => id === "no_mail_needed");
    expect(mailed?.description).toMatch(/mail.*notice.*recipient address is confirmed/i);
    expect(nonmail?.description).toMatch(/required form, secure upload, telephone, or formal petition/i);
    expect(nonmail?.description).toMatch(/without substituting a generic mailed letter/i);
    expect(recordOnly?.description).toMatch(/without generating outgoing mail/i);
    expect(workflowConfig.whatYouDo.join(" ")).toMatch(/if the notice permits a mailed reply/i);
    expect(workflowConfig.whatYouDo.join(" ")).toMatch(/otherwise follow its required nonmail process/i);
  });

  it("preserves notice identity, relative deadline wording, and permitted response channel", () => {
    const fields = irsGeneralExtractionSchema.extractionFields;
    expect(fields.noticeNumber.required).toBe(false);
    expect(fields.responseDeadlineText.required).toBe(false);
    expect(fields.responseDeadlineText.dataType).toBe("string");
    expect(fields.responseDeadline.dataType).toBe("date");
    expect(fields.requiredForm.required).toBe(false);
    expect(fields.responseChannel.required).toBe(false);
    expect(fields.mailingAddress.required).toBe(false);
    expect(irsGeneralExtractionSchema.instructions).toMatch(/never calculate a date from relative wording/i);
    expect(irsGeneralExtractionSchema.instructions).toMatch(/nonmail action must not be replaced by a generic mailed letter/i);
  });

  it("keeps catalog-only response planning conditional on notice-specific instructions", () => {
    expect(irsGeneralDomain.validationRules.some(({ rule }) => rule === "response_deadline_not_passed")).toBe(false);
    expect(irsGeneralDomain.validationRules[0].description).toMatch(/before mailing/i);
    expect(irsGeneralDomain.responseOptions.some(({ id }) => id === "no_mail_needed")).toBe(true);
    expect(irsGeneralDomain.readinessChecks.find(({ check }) => check === "response_type_determined")?.description).toMatch(/required form, response channel/i);
  });
});


const verifiedMailPacket = {
  noticeDocumentId: "notice-v2",
  analyzedNoticeDocumentId: "notice-v2",
  noticeSha256: "a".repeat(64),
  analyzedNoticeSha256: "a".repeat(64),
  noticeStatus: "active",
  responsePath: "mail",
  instructionsConfirmed: true,
  mailPermitted: true,
  requiresDifferentProcedure: false,
  recipientAddress: "Department of the Treasury\nInternal Revenue Service\nKansas City, MO 64999-0002",
  recipientAddressSource: "controlling_notice",
  recipientAddressConfirmed: true,
  confirmedRecipientAddress: "Department of the Treasury\nInternal Revenue Service\nKansas City, MO 64999-0002",
  confirmedRecipientNoticeSha256: "a".repeat(64),
  confirmedRecipientAddressSource: "controlling_notice",
  confirmedRecipientResponsePath: "mail",
} as const;

describe("general IRS letter packet preflight (no external actions)", () => {
  it("allows a preview only with the current notice and an explicitly verified mail path", () => {
    expect(irsGeneralDefinition.mailPacketReadiness(verifiedMailPacket)).toEqual({
      canPreviewMailPacket: true,
      blockers: [],
    });
  });

  it("does not turn informational, nonmail, or unresolved notices into mail", () => {
    for (const responsePath of ["record_only", "nonmail", "unresolved"] as const) {
      const result = irsGeneralDefinition.mailPacketReadiness({ ...verifiedMailPacket, responsePath });
      expect(result.canPreviewMailPacket).toBe(false);
      expect(result.blockers).toContain("mail_response_not_selected");
    }
  });

  it("rejects stale, absent, excluded, and quarantined source notices", () => {
    const changed = irsGeneralDefinition.mailPacketReadiness({ ...verifiedMailPacket, analyzedNoticeDocumentId: "notice-v1" });
    expect(changed.blockers).toContain("source_notice_changed");
    const absent = irsGeneralDefinition.mailPacketReadiness({ ...verifiedMailPacket, noticeDocumentId: null });
    expect(absent.blockers).toContain("source_notice_missing");
    for (const noticeStatus of ["excluded", "quarantined", "unknown"] as const) {
      expect(irsGeneralDefinition.mailPacketReadiness({ ...verifiedMailPacket, noticeStatus }).blockers).toContain("source_notice_unusable");
    }
  });

  it("rejects a replaced notice even when the upload retains the same document ID", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      analyzedNoticeSha256: "b".repeat(64),
    });
    expect(result.canPreviewMailPacket).toBe(false);
    expect(result.blockers).toContain("source_notice_digest_changed");
  });

  it("requires trusted, well-formed SHA-256 values from the notice and its analysis", () => {
    for (const value of [null, "", "not-a-sha256", undefined]) {
      const result = irsGeneralDefinition.mailPacketReadiness({
        ...verifiedMailPacket,
        noticeSha256: value,
      } as unknown as Parameters<typeof irsGeneralDefinition.mailPacketReadiness>[0]);
      expect(result.canPreviewMailPacket).toBe(false);
      expect(result.blockers).toContain("source_notice_digest_unverified");
    }
  });

  it("rejects address placeholders and incomplete US mailing destinations", () => {
    for (const recipientAddress of [
      "IRS address printed on the controlling notice",
      "Internal Revenue Service\nKansas City",
      "Internal Revenue Service\nKansas City, ZZ 64999",
      "Kansas City, MO 64999",
    ]) {
      const result = irsGeneralDefinition.mailPacketReadiness({ ...verifiedMailPacket, recipientAddress });
      expect(result.canPreviewMailPacket).toBe(false);
      expect(result.blockers).toContain("recipient_address_incomplete");
    }
  });

  it("accepts a properly formatted notice-provided PO box for preview preflight", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      recipientAddress: "Internal Revenue Service\nP.O. Box 1234\nAustin, TX 78714",
      confirmedRecipientAddress: "Internal Revenue Service\nP.O. Box 1234\nAustin, TX 78714",
    });
    expect(result.canPreviewMailPacket).toBe(true);
  });

  it("rejects an address edited after recipient confirmation even if it remains well formed", () => {
    const changed = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      recipientAddress: "Department of the Treasury\nInternal Revenue Service\nOgden, UT 84201-0002",
    });
    expect(changed.canPreviewMailPacket).toBe(false);
    expect(changed.blockers).toContain("recipient_confirmation_stale");
  });

  it("fails closed when a claimed recipient confirmation lacks its exact address snapshot", () => {
    for (const confirmedRecipientAddress of [null, "", undefined]) {
      const result = irsGeneralDefinition.mailPacketReadiness({
        ...verifiedMailPacket,
        confirmedRecipientAddress,
      } as unknown as Parameters<typeof irsGeneralDefinition.mailPacketReadiness>[0]);
      expect(result.canPreviewMailPacket).toBe(false);
      expect(result.blockers).toContain("recipient_confirmation_stale");
    }
  });

  it("does not accept an unconfirmed address even if a prior address snapshot exists", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      recipientAddressConfirmed: false,
    });
    expect(result.canPreviewMailPacket).toBe(false);
    expect(result.blockers).toContain("recipient_address_unconfirmed");
  });

  it("invalidates address confirmation when the controlling notice changes, even if the destination stays identical", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      noticeSha256: "b".repeat(64),
      analyzedNoticeSha256: "b".repeat(64),
    });
    expect(result.canPreviewMailPacket).toBe(false);
    expect(result.blockers).toContain("recipient_confirmation_stale");
    expect(result.blockers).not.toContain("source_notice_digest_changed");
  });

  it("invalidates address confirmation when the verified recipient source changes", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      recipientAddressSource: "current_irs_instructions",
    });
    expect(result.canPreviewMailPacket).toBe(false);
    expect(result.blockers).toContain("recipient_confirmation_stale");
    expect(result.blockers).not.toContain("recipient_source_unverified");
  });

  it("invalidates address confirmation when the selected response channel changes", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      responsePath: "nonmail",
    });
    expect(result.blockers).toContain("recipient_confirmation_stale");
    expect(result.blockers).toContain("mail_response_not_selected");
  });

  it("fails closed when server-side recipient confirmation context is missing", () => {
    for (const field of [
      "confirmedRecipientNoticeSha256",
      "confirmedRecipientAddressSource",
      "confirmedRecipientResponsePath",
    ] as const) {
      const result = irsGeneralDefinition.mailPacketReadiness({
        ...verifiedMailPacket,
        [field]: null,
      } as unknown as Parameters<typeof irsGeneralDefinition.mailPacketReadiness>[0]);
      expect(result.canPreviewMailPacket).toBe(false);
      expect(result.blockers).toContain("recipient_confirmation_stale");
    }
  });

  it("does not substitute a generic letter for a required form or petition", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({ ...verifiedMailPacket, requiresDifferentProcedure: true });
    expect(result.canPreviewMailPacket).toBe(false);
    expect(result.blockers).toContain("different_procedure_required");
  });

  it("requires explicit notice instructions, mailing permission, and confirmed recipient provenance", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      instructionsConfirmed: false,
      mailPermitted: false,
      recipientAddress: "  ",
      recipientAddressSource: "unverified",
      recipientAddressConfirmed: false,
    });
    expect(result.canPreviewMailPacket).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "notice_instructions_unverified", "mail_channel_unverified",
      "recipient_address_missing", "recipient_source_unverified", "recipient_address_unconfirmed",
    ]));
  });

  it("fails closed when untyped runtime data omits recipient provenance or formal-process classification", () => {
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      recipientAddressSource: undefined as unknown as typeof verifiedMailPacket.recipientAddressSource,
      requiresDifferentProcedure: undefined as unknown as false,
    });
    expect(result.canPreviewMailPacket).toBe(false);
    expect(result.blockers).toContain("recipient_source_unverified");
    expect(result.blockers).toContain("different_procedure_required");
  });

  it("rejects truthy string confirmations from untyped intake data", () => {
    for (const flag of ["instructionsConfirmed", "mailPermitted", "recipientAddressConfirmed"] as const) {
      const result = irsGeneralDefinition.mailPacketReadiness({
        ...verifiedMailPacket,
        [flag]: "false",
      } as unknown as Parameters<typeof irsGeneralDefinition.mailPacketReadiness>[0]);
      expect(result.canPreviewMailPacket).toBe(false);
    }
  });

  it("requires real postal line breaks instead of literal escaped separators", () => {
    const crlf = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      recipientAddress: "Internal Revenue Service\r\nKansas City, MO 64999-0002",
      confirmedRecipientAddress: "Internal Revenue Service\nKansas City, MO 64999-0002",
    });
    expect(crlf.canPreviewMailPacket).toBe(true);

    const escaped = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      recipientAddress: String.raw`Internal Revenue Service\nKansas City, MO 64999-0002`,
    });
    expect(escaped.canPreviewMailPacket).toBe(false);
    expect(escaped.blockers).toContain("recipient_address_incomplete");
  });

  it("rejects bare carriage returns inside a confirmed recipient address", () => {
    // A lone CR can be interpreted as a line break by an envelope renderer
    // even though the preflight only splits on LF/CRLF.
    const recipientAddress = "Internal Revenue Service\\rP.O. Box 9999\\nKansas City, MO 64999";
    const result = irsGeneralDefinition.mailPacketReadiness({
      ...verifiedMailPacket,
      recipientAddress,
      confirmedRecipientAddress: recipientAddress,
    });
    expect(result.canPreviewMailPacket).toBe(false);
    expect(result.blockers).toContain("recipient_address_incomplete");
  });

  it("rejects unresolved address placeholders despite a plausible ZIP", () => {
    for (const recipientAddress of [
      "Internal Revenue Service\n[IRS street address]\nKansas City, MO 64999",
      "Internal Revenue Service\nAddress on notice\nKansas City, MO 64999",
      "Internal Revenue Service\nTBD\nKansas City, MO 64999",
      "Internal Revenue Service\nSee attached notice\nKansas City, MO 64999",
      "Internal Revenue Service\nP.O. Box <number>\nKansas City, MO 64999",
      "Internal Revenue Service\nP.O. Box 1234\u0000\nKansas City, MO 64999",
    ]) {
      const result = irsGeneralDefinition.mailPacketReadiness({ ...verifiedMailPacket, recipientAddress });
      expect(result.canPreviewMailPacket).toBe(false);
      expect(result.blockers).toContain("recipient_address_incomplete");
    }
  });

  it("rejects invisible Unicode controls in the confirmed postal destination", () => {
    // A matching confirmation snapshot alone cannot make text with bidi or
    // zero-width controls safe to render on the outgoing envelope PDF.
    for (const hiddenControl of ["\u202e", "\u200b", "\u2066"] as const) {
      const recipientAddress = `Internal Revenue Service${hiddenControl}\nKansas City, MO 64999`;
      const result = irsGeneralDefinition.mailPacketReadiness({
        ...verifiedMailPacket,
        recipientAddress,
        confirmedRecipientAddress: recipientAddress,
      });
      expect(result.canPreviewMailPacket).toBe(false);
      expect(result.blockers).toContain("recipient_address_incomplete");
    }
  });

  it("does not require a fabricated response deadline to preview an otherwise verified packet", () => {
    expect(irsGeneralDefinition.mailPacketReadiness(verifiedMailPacket).canPreviewMailPacket).toBe(true);
    expect(irsGeneralExtractionSchema.extractionFields.responseDeadline.required).toBe(false);
  });
});

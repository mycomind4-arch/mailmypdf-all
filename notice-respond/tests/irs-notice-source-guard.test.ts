import { describe, expect, it } from "vitest";

import workflowConfig from "../workflows/irs-notice-response/config";
import irsGeneralDomain from "../workflows/irs-notice-response/domain";
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

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

  it("does not require a mailed packet when the notice needs no reply", () => {
    const noMail = irsGeneralDomain.responseOptions.find(({ id }) => id === "no_mail_needed");
    expect(noMail?.description).toMatch(/without generating outgoing mail/i);
    const packet = irsGeneralDomain.outputPackageContents.find(({ item }) => /response packet/i.test(item));
    expect(packet?.required).toBe(false);
  });

  it("keeps catalog-only response planning conditional on notice-specific instructions", () => {
    expect(irsGeneralDomain.validationRules.some(({ rule }) => rule === "response_deadline_not_passed")).toBe(false);
    expect(irsGeneralDomain.validationRules[0].description).toMatch(/before mailing/i);
    expect(irsGeneralDomain.responseOptions.some(({ id }) => id === "no_mail_needed")).toBe(true);
    expect(irsGeneralDomain.readinessChecks.find(({ check }) => check === "response_type_determined")?.description).toMatch(/required form, response channel/i);
  });
});

/**
 * CP2000 Document Generation
 * Generates response letters and supporting documents for IRS notices
 */

import type {
  GeneratedDocument,
  AgreementResponsePayload,
  DisagreementResponsePayload,
  PartialAgreementPayload,
  AppealRequestPayload,
  ExtensionRequestPayload,
  CP2000IntakeConfirmation,
} from "./types";

/**
 * Generate agreement response letter
 * Taxpayer agrees with all proposed adjustments
 */
export function generateAgreementLetter(
  payload: AgreementResponsePayload
): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plantextContent = `RESPONSE TO NOTICE OF PROPOSED ADJUSTMENT

Date: ${today}

TO: Internal Revenue Service
    ${extraction.irs_contact_info.address || "Department of Internal Revenue"}

RE: Notice Number ${extraction.notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    SSN: ${extraction.taxpayer_ssn_masked}
    Tax Year: ${extraction.tax_year}

Dear IRS Officer:

I am writing in response to the Notice of Proposed Adjustment dated ${extraction.notice_issue_date} regarding my income tax return for the tax year ended December 31, ${extraction.tax_year}.

I AGREE with the proposed adjustments outlined in the notice. I have reviewed the examination report and the adjustments are acceptable to me.

Total Additional Tax Due: $${(extraction.total_additional_tax || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
${extraction.proposed_penalty_amount ? `Proposed Penalty: $${extraction.proposed_penalty_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}

${
  payload.payment_plan_needed
    ? `I request that a payment plan be established. I am prepared to pay according to the following schedule: ${payload.payment_timeline || "As determined by IRS}"}`
    : "I will arrange payment of the amount due within 30 days of receiving this response."
}

Please send me Form 870 for signature and confirmation of this agreement.

Respectfully submitted,

_____________________________
Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: This letter should not be construed as legal advice. This is provided for informational purposes only. The taxpayer should consult with a qualified tax professional or attorney regarding this matter.`;

  const markdownContent = `# Response to Notice of Proposed Adjustment (CP2000)

**Date:** ${today}

**TO:** Internal Revenue Service
${extraction.irs_contact_info.address || "Department of Internal Revenue"}

**RE:** Notice Number: ${extraction.notice_number}
**Taxpayer:** ${extraction.taxpayer_name}
**SSN:** ${extraction.taxpayer_ssn_masked}
**Tax Year:** ${extraction.tax_year}

---

## Agreement to Proposed Adjustments

I am writing in response to the Notice of Proposed Adjustment dated ${extraction.notice_issue_date} regarding my income tax return for the tax year ended December 31, ${extraction.tax_year}.

**I AGREE with the proposed adjustments outlined in the notice.** I have reviewed the examination report and the adjustments are acceptable to me.

### Financial Summary

| Item | Amount |
|------|--------|
| Additional Tax Due | $${(extraction.total_additional_tax || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} |
${extraction.proposed_penalty_amount ? `| Proposed Penalty | $${extraction.proposed_penalty_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} |` : ""}
| **Total Amount Due** | **$${((extraction.total_additional_tax || 0) + (extraction.proposed_penalty_amount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}** |

### Payment

${
  payload.payment_plan_needed
    ? `I request that a payment plan be established. I am prepared to pay according to the following schedule:

${payload.payment_timeline || "The amount will be determined through payment plan discussions with the IRS."}`
    : "I will arrange payment of the amount due within 30 days of receiving this response."
}

### Next Steps

Please send me IRS Form 870 (Agreement to Proposed Assessment and Adjustment) for signature and confirmation of this agreement.

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

## Important Disclaimer

This letter is provided for informational purposes only and should not be construed as legal or tax advice. The taxpayer should consult with a qualified tax professional, CPA, or attorney regarding this matter and the implications of accepting the proposed adjustments.

**This is not a substitute for professional tax representation.**`;

  return {
    type: "agreement-letter",
    title: "Response to IRS Notice - Agreement to Proposed Adjustments",
    content: plantextContent,
    markdown_content: markdownContent,
    requires_signature: true,
    is_official_form: false,
    generated_at: today,
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

/**
 * Generate disagreement response letter
 * Taxpayer disputes adjustments
 */
export function generateDisagreementLetter(
  payload: DisagreementResponsePayload
): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plaintextContent = `STATEMENT OF DISAGREEMENT

Date: ${today}

TO: Internal Revenue Service
    ${extraction.irs_contact_info.address || "Department of Internal Revenue"}

RE: Notice Number ${extraction.notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    SSN: ${extraction.taxpayer_ssn_masked}
    Tax Year: ${extraction.tax_year}

Dear IRS Officer:

I am writing to respectfully disagree with the proposed adjustments contained in the Notice of Proposed Adjustment dated ${extraction.notice_issue_date}.

STATEMENT OF DISAGREEMENT:

${payload.taxpayer_explanation}

DISPUTED ITEMS:

${payload.disputed_items.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}

SUPPORTING EVIDENCE:

${payload.evidence_references.map((ref, idx) => `${idx + 1}. ${ref}`).join("\n")}

I respectfully request that the proposed adjustments be withdrawn or modified based on the above facts and authorities.

If the IRS maintains its position, I request consideration by the Office of Appeals.

Respectfully submitted,

_____________________________
Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: This letter should not be construed as legal advice. This is provided for informational purposes only. The taxpayer should consult with a qualified tax professional or attorney regarding this matter.`;

  const markdownContent = `# Statement of Disagreement to IRS Notice

**Date:** ${today}

**TO:** Internal Revenue Service
${extraction.irs_contact_info.address || "Department of Internal Revenue"}

**RE:** Notice Number: ${extraction.notice_number}
**Taxpayer:** ${extraction.taxpayer_name}
**SSN:** ${extraction.taxpayer_ssn_masked}
**Tax Year:** ${extraction.tax_year}

---

## Statement of Disagreement

I am writing to respectfully disagree with the proposed adjustments contained in the Notice of Proposed Adjustment dated ${extraction.notice_issue_date}.

### Explanation of Position

${payload.taxpayer_explanation}

### Items in Disagreement

${payload.disputed_items.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}

### Supporting Evidence and References

${payload.evidence_references.map((ref, idx) => `${idx + 1}. ${ref}`).join("\n")}

### Request for Reconsideration

I respectfully request that the proposed adjustments be withdrawn or modified based on the facts and authorities presented above.

If the Service maintains its position, I request consideration by the Office of Appeals for independent review.

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

## Important Disclaimer

This letter is provided for informational purposes only and should not be construed as legal or tax advice. The taxpayer should consult with a qualified tax professional, CPA, or attorney regarding this matter, particularly if substantial amounts are involved.

**This is not a substitute for professional tax representation.**`;

  return {
    type: "disagreement-letter",
    title: "Statement of Disagreement to IRS Notice",
    content: plaintextContent,
    markdown_content: markdownContent,
    requires_signature: true,
    is_official_form: false,
    generated_at: today,
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

/**
 * Generate partial agreement response
 * Taxpayer agrees with some items, disputes others
 */
export function generatePartialAgreementLetter(
  payload: PartialAgreementPayload
): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plaintextContent = `RESPONSE TO NOTICE OF PROPOSED ADJUSTMENT
PARTIAL AGREEMENT AND STATEMENT OF DISAGREEMENT

Date: ${today}

TO: Internal Revenue Service
    ${extraction.irs_contact_info.address || "Department of Internal Revenue"}

RE: Notice Number ${extraction.notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    SSN: ${extraction.taxpayer_ssn_masked}
    Tax Year: ${extraction.tax_year}

Dear IRS Officer:

I am writing in response to the Notice of Proposed Adjustment dated ${extraction.notice_issue_date}.

AGREEMENTS:

I AGREE with the following adjustments:

${payload.agreed_items.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}

DISAGREEMENTS:

However, I DISAGREE with the following adjustments:

${payload.disputed_items.map((item, idx) => `${idx + 1}. Line Item: ${item.adjustment_id}\n   Position: ${item.taxpayer_position}\n   Supporting Evidence: ${item.supporting_evidence.join("; ")}`).join("\n\n")}

I respectfully request that the disputed adjustments be withdrawn or modified based on the supporting evidence provided above.

Respectfully submitted,

_____________________________
Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: This letter should not be construed as legal advice. This is provided for informational purposes only. The taxpayer should consult with a qualified tax professional or attorney regarding this matter.`;

  const markdownContent = `# Response to IRS Notice - Partial Agreement

**Date:** ${today}

**TO:** Internal Revenue Service
${extraction.irs_contact_info.address || "Department of Internal Revenue"}

**RE:** Notice Number: ${extraction.notice_number}
**Taxpayer:** ${extraction.taxpayer_name}
**SSN:** ${extraction.taxpayer_ssn_masked}
**Tax Year:** ${extraction.tax_year}

---

## Response - Partial Agreement and Disagreement

I am writing in response to the Notice of Proposed Adjustment dated ${extraction.notice_issue_date}.

### Agreed Adjustments

I **AGREE** with the following adjustments:

${payload.agreed_items.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}

### Disagreed Adjustments

However, I **DISAGREE** with the following adjustments:

${payload.disputed_items
  .map(
    (item, idx) =>
      `#### Disputed Item ${idx + 1}: ${item.adjustment_id}

**Taxpayer's Position:** ${item.taxpayer_position}

**Supporting Evidence:**
${item.supporting_evidence.map((evidence) => `- ${evidence}`).join("\n")}`
  )
  .join("\n\n")}

### Request for Review

I respectfully request that the disputed adjustments be withdrawn or modified based on the supporting evidence provided.

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

## Important Disclaimer

This letter is provided for informational purposes only and should not be construed as legal or tax advice. The taxpayer should consult with a qualified tax professional or attorney regarding this matter.

**This is not a substitute for professional tax representation.**`;

  return {
    type: "partial-agreement-letter",
    title: "Response to IRS Notice - Partial Agreement and Disagreement",
    content: plaintextContent,
    markdown_content: markdownContent,
    requires_signature: true,
    is_official_form: false,
    generated_at: today,
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

/**
 * Generate appeal request
 * Request independent Office of Appeals review
 */
export function generateAppealRequest(payload: AppealRequestPayload): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plaintextContent = `REQUEST FOR INDEPENDENT OFFICE OF APPEALS CONSIDERATION

Date: ${today}

TO: Internal Revenue Service
    Office of Appeals
    ${extraction.irs_contact_info.address || "Department of Internal Revenue"}

RE: Notice Number ${extraction.notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    SSN: ${extraction.taxpayer_ssn_masked}
    Tax Year: ${extraction.tax_year}

Dear Appeals Officer:

I am writing to request consideration of my case by the Office of Appeals.

STATEMENT OF DISAGREEMENT:

${payload.appeal_reason}

REQUEST FOR INDEPENDENT REVIEW:

${payload.request_independent_review ? "I request independent review by the Office of Appeals." : "I am submitting this appeal for consideration by the IRS."}

I believe the proposed adjustments do not accurately reflect the applicable law and facts of my situation.

Respectfully submitted,

_____________________________
Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: This letter should not be construed as legal advice. This is provided for informational purposes only. Taxpayer should consult with a qualified tax professional or attorney regarding this matter.`;

  const markdownContent = `# Request for Office of Appeals Consideration

**Date:** ${today}

**TO:** Internal Revenue Service - Office of Appeals
${extraction.irs_contact_info.address || "Department of Internal Revenue"}

**RE:** Notice Number: ${extraction.notice_number}
**Taxpayer:** ${extraction.taxpayer_name}
**SSN:** ${extraction.taxpayer_ssn_masked}
**Tax Year:** ${extraction.tax_year}

---

## Request for Independent Review

I am writing to request consideration of my case by the Office of Appeals as provided under IRC § 7123 and the applicable Treasury Regulations.

### Statement of Disagreement

${payload.appeal_reason}

### Request for Independent Review

${
  payload.request_independent_review
    ? "I specifically request independent review by the Office of Appeals, separate from the examination division's position."
    : "I am submitting this appeal for consideration by the appropriate appeals authority."
}

I believe the proposed adjustments do not accurately reflect the applicable law and facts of my situation, and I respectfully request that the Appeals Office reconsider the Service's position.

### Administrative Appeal Right

Under Treasury Regulations and IRS procedures, I am entitled to an independent administrative review of the proposed adjustments by the Office of Appeals. This request is timely filed within the applicable deadlines.

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

## Important Information

- The Appeals process typically takes 6-18 months
- An independent Appeals Officer will review your case
- You have the right to representation by a tax attorney or CPA
- Settlement authority may exist to resolve disputed issues

**This is not legal advice. Consult with a tax professional for guidance on your specific situation.**`;

  return {
    type: "appeal-request",
    title: "Request for Office of Appeals Consideration",
    content: plaintextContent,
    markdown_content: markdownContent,
    requires_signature: true,
    is_official_form: false,
    generated_at: today,
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

/**
 * Generate extension request
 * Request additional time to respond
 */
export function generateExtensionRequest(payload: ExtensionRequestPayload): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const reasonDescriptions: Record<string, string> = {
    gather_evidence: "I need additional time to locate and gather the necessary business records",
    consult_professional: "I need time to consult with a tax professional or attorney",
    clarification:
      "I need additional time to clarify certain positions and prepare a detailed response",
  };

  const plantextContent = `REQUEST FOR EXTENSION OF TIME TO RESPOND

Date: ${today}

TO: Internal Revenue Service
    ${extraction.irs_contact_info.address || "Department of Internal Revenue"}

RE: Notice Number ${extraction.notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    SSN: ${extraction.taxpayer_ssn_masked}
    Tax Year: ${extraction.tax_year}

Dear IRS Officer:

I am writing to request an extension of time to respond to the Notice of Proposed Adjustment dated ${extraction.notice_issue_date}.

REASON FOR EXTENSION:

${reasonDescriptions[payload.reason] || "I need additional time to prepare my response."}

REQUESTED EXTENSION PERIOD:

I respectfully request an extension of ${payload.requested_days} days from the original deadline to provide my response.

I will file my response within the extended period. Please confirm receipt of this request and the new deadline.

Respectfully submitted,

_____________________________
Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: This letter should not be construed as legal advice. This is provided for informational purposes only. The taxpayer should consult with a qualified tax professional or attorney regarding this matter.`;

  const markdownContent = `# Request for Extension of Time to Respond

**Date:** ${today}

**TO:** Internal Revenue Service
${extraction.irs_contact_info.address || "Department of Internal Revenue"}

**RE:** Notice Number: ${extraction.notice_number}
**Taxpayer:** ${extraction.taxpayer_name}
**SSN:** ${extraction.taxpayer_ssn_masked}
**Tax Year:** ${extraction.tax_year}

---

## Request for Extension

I am writing to request an extension of time to respond to the Notice of Proposed Adjustment dated ${extraction.notice_issue_date}.

### Reason for Extension

${reasonDescriptions[payload.reason] || "I need additional time to prepare my response."}

### Requested Extension Period

**Original Deadline:** ${extraction.deadline_date}
**Requested Additional Time:** ${payload.requested_days} days
**Requested New Deadline:** Approximately ${new Date(new Date(extraction.deadline_date).getTime() + payload.requested_days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}

### Commitment

I commit to filing my response to the IRS within the extended period. Please confirm receipt of this extension request and provide notice of the new response deadline.

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

## Important Notes

- The IRS typically grants extension requests for reasonable cause
- Your response deadline will be extended upon approval
- You should receive written confirmation of the extension
- Continue gathering information and evidence during the extension period

**This is not legal advice. Consult with a tax professional for guidance on your specific situation.**`;

  return {
    type: "extension-request",
    title: "Request for Extension of Time to Respond",
    content: plantextContent,
    markdown_content: markdownContent,
    requires_signature: true,
    is_official_form: false,
    generated_at: today,
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

/**
 * Generate attorney referral document
 * For cases requiring professional legal representation
 */
export function generateAttorneyReferral(intake: CP2000IntakeConfirmation): GeneratedDocument {
  const extraction = intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plaintextContent = `ATTORNEY REFERRAL GUIDANCE

Date: ${today}

Taxpayer: ${extraction.taxpayer_name}
Tax Year: ${extraction.tax_year}
Notice Number: ${extraction.notice_number}

IMPORTANT: PROFESSIONAL REPRESENTATION REQUIRED

This situation requires consultation with a qualified tax attorney or CPA. Do not respond to the IRS notice without professional guidance.

REASONS FOR ATTORNEY CONSULTATION:

1. Fraud indicators present in notice
2. Complex adjustments requiring specialized analysis
3. Significant amount at issue: $${(extraction.total_additional_tax || 0).toLocaleString()}
4. Potential legal defenses or mitigation strategies
5. Administrative or litigation options to evaluate

NEXT STEPS:

1. Contact a tax attorney or CPA with tax controversy experience
2. Gather all relevant documentation
3. Prepare timeline of events
4. Do not respond to the IRS without counsel
5. Discuss representation options and fees

FINDING AN ATTORNEY:

- State Bar Association lawyer referral service
- Local tax attorneys specializing in IRS disputes
- Enrolled Agents (EAs) with CPA/attorney partnerships
- Large accounting firms with tax controversy divisions

TIME SENSITIVE: The response deadline is ${extraction.deadline_date}.

DISCLAIMER: This document is provided for informational purposes only and does not constitute legal advice.`;

  const markdownContent = `# Attorney Referral Guidance

**Date:** ${today}

**Taxpayer:** ${extraction.taxpayer_name}
**Tax Year:** ${extraction.tax_year}
**Notice Number:** ${extraction.notice_number}

---

## ⚠️ IMPORTANT: Professional Representation Required

Your situation requires immediate consultation with a qualified tax attorney or CPA specializing in IRS disputes. **Do not respond to the IRS notice without professional guidance.**

### Reasons for Professional Consultation

1. **Fraud Indicators** - Notice references fraud or suspicious activity
2. **Complex Issues** - Adjustments require specialized analysis
3. **Significant Amount** - Substantial tax liability: $${(extraction.total_additional_tax || 0).toLocaleString()}
4. **Legal Defenses** - Potential mitigation strategies exist
5. **Strategic Options** - Administrative and litigation paths to evaluate

### Next Steps

1. **Contact a Tax Professional Immediately**
   - Tax attorney with IRS dispute experience
   - CPA with tax controversy credentials
   - Enrolled Agent (EA) with legal partnerships

2. **Gather Documentation**
   - All correspondence with IRS
   - Original tax return and supporting documents
   - Any prior audit materials
   - Financial records related to disputed items

3. **Timeline Review**
   - Prepare chronology of events
   - Document when notice was received
   - Note original response deadline: **${extraction.deadline_date}**

4. **Do Not Respond Alone**
   - Wait for attorney guidance before responding
   - Do not contact IRS without counsel
   - Preserve all communications

### Finding Professional Representation

**Tax Attorneys:**
- State Bar Association lawyer referral service
- Local bar association tax section
- Large law firms with tax controversy practices
- Specialized tax litigation firms

**CPAs & Enrolled Agents:**
- American Institute of CPAs (AICPA) member directory
- National Association of Enrolled Agents (NAEA)
- Local CPA firms with tax controversy experience
- Big Four accounting firms (Deloitte, EY, KPMG, PwC)

**Legal Aid:**
- Low-Income Taxpayer Clinics (LITC)
- Community legal aid organizations
- Tax-focused nonprofit organizations

### Important Deadlines

**Action Required By:** ${extraction.deadline_date}

The time to respond to the IRS is limited. Contact an attorney immediately.

---

## Disclaimer

This document is provided for informational purposes only and does **not** constitute legal advice. Only a licensed tax attorney can provide legal representation and advice regarding your specific situation.

**Do not delay in seeking professional representation.**`;

  return {
    type: "attorney-referral",
    title: "Attorney Referral Guidance - Professional Representation Required",
    content: plaintextContent,
    markdown_content: markdownContent,
    requires_signature: false,
    is_official_form: false,
    generated_at: today,
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

/**
 * Notice of Deficiency Document Generation
 * Generates response letters, petitions, and supporting documents
 */

import type {
  GeneratedDocument,
  AgreementResponsePayload,
  DisagreementResponsePayload,
  TaxCourtPetitionPayload,
  PaymentPlanPayload,
  SettlementProposalPayload,
  InnocentSpousePayload,
  DeficiencyIntakeConfirmation,
} from "./types";

/**
 * Generate agreement response letter
 */
export function generateAgreementLetter(payload: AgreementResponsePayload): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plantextContent = `RESPONSE TO NOTICE OF DEFICIENCY

Date: ${today}

TO: Internal Revenue Service
    ${extraction.irs_contact_info.mailing_address || "Department of Internal Revenue"}

RE: Notice Number: ${extraction.deficiency_notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    SSN: ${extraction.taxpayer_ssn_masked}
    Tax Year: ${extraction.tax_year}

Dear IRS Officer:

I am writing in response to the Notice of Deficiency dated ${extraction.notice_date} regarding my ${extraction.is_joint_return ? "joint " : ""}income tax return for the tax year ended December 31, ${extraction.tax_year}.

I AGREE with the proposed deficiency and accept the adjustments as detailed in the notice.

DEFICIENCY CALCULATION:
Original Tax: [See notice]
Adjusted Tax: [See notice]
Deficiency Amount: $${extraction.deficiency_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
${extraction.interest_amount ? `Interest (estimated): $${extraction.interest_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}
${extraction.penalty_amount ? `Penalty (estimated): $${extraction.penalty_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}

PAYMENT:
${
  payload.payment_plan_needed
    ? `I request an installment agreement for the amount due. Payment plan details: ${payload.payment_timeline || "To be determined with IRS"}`
    : "Payment will be arranged within 30 days of final determination."
}

Please send me Form 870 for signature to establish formal agreement.

Respectfully submitted,

_____________________________
Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: This response is not legal advice. Consult a tax professional before submitting.`;

  const markdownContent = `# Response to Notice of Deficiency (90-Day Letter)

**Date:** ${today}

**TO:** Internal Revenue Service
${extraction.irs_contact_info.mailing_address || "Department of Internal Revenue"}

**RE:**
- **Notice Number:** ${extraction.deficiency_notice_number}
- **Taxpayer:** ${extraction.taxpayer_name}
- **SSN:** ${extraction.taxpayer_ssn_masked}
- **Tax Year:** ${extraction.tax_year}

---

## Agreement to Deficiency

I am writing in response to the Notice of Deficiency dated ${extraction.notice_date} regarding my ${extraction.is_joint_return ? "joint " : ""}income tax return for the tax year ended December 31, ${extraction.tax_year}.

**I AGREE with the proposed deficiency and accept all adjustments as detailed in the notice.**

### Deficiency Summary

| Item | Amount |
|------|--------|
| Deficiency | $${extraction.deficiency_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} |
${extraction.interest_amount ? `| Interest (estimated) | $${extraction.interest_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} |` : ""}
${extraction.penalty_amount ? `| Penalty (estimated) | $${extraction.penalty_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} |` : ""}
| **Total Due** | **$${(extraction.total_amount_due || extraction.deficiency_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}** |

### Payment Arrangements

${
  payload.payment_plan_needed
    ? `I request an installment agreement for payment of the deficiency over time.

**Payment Plan Request:**
${payload.payment_timeline || "Details to be arranged with IRS"}`
    : "Payment of the full deficiency will be arranged within 30 days."
}

### Next Steps

Please send me IRS Form 870 (Agreement to Proposed Assessment and Adjustment) for signature to formalize this agreement.

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

**DISCLAIMER:** This response is not legal or tax advice. Before submitting, consult with a qualified tax professional or CPA about the implications of this agreement.`;

  return {
    type: "agreement-response",
    title: "Response to Notice of Deficiency - Agreement",
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
 */
export function generateDisagreementLetter(
  payload: DisagreementResponsePayload
): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plantextContent = `STATEMENT OF DISAGREEMENT

Date: ${today}

TO: Internal Revenue Service
    ${extraction.irs_contact_info.mailing_address || "Department of Internal Revenue"}

RE: Notice Number: ${extraction.deficiency_notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    SSN: ${extraction.taxpayer_ssn_masked}
    Tax Year: ${extraction.tax_year}

Dear IRS Officer:

I respectfully disagree with the Notice of Deficiency dated ${extraction.notice_date} proposing adjustments totaling $${extraction.deficiency_amount.toLocaleString()}.

POSITION:

${payload.taxpayer_explanation}

DISPUTED ADJUSTMENTS:

${payload.disputed_lines.map((line, idx) => `${idx + 1}. ${line}`).join("\n")}

LEGAL AUTHORITY:

${payload.legal_authority_citations.map((citation, idx) => `${idx + 1}. ${citation}`).join("\n")}

SUPPORTING EVIDENCE:

${payload.evidence_references.map((ref, idx) => `${idx + 1}. ${ref}`).join("\n")}

I request Appeals consideration of this matter and respectfully ask that the proposed adjustments be withdrawn or modified based on the above.

Respectfully submitted,

_____________________________
Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: This response is not legal advice. Consult a tax professional before submitting.`;

  const markdownContent = `# Statement of Disagreement to Notice of Deficiency

**Date:** ${today}

**TO:** Internal Revenue Service
${extraction.irs_contact_info.mailing_address || "Department of Internal Revenue"}

**RE:**
- **Notice Number:** ${extraction.deficiency_notice_number}
- **Taxpayer:** ${extraction.taxpayer_name}
- **SSN:** ${extraction.taxpayer_ssn_masked}
- **Tax Year:** ${extraction.tax_year}

---

## Statement of Disagreement

I respectfully disagree with the Notice of Deficiency dated ${extraction.notice_date} proposing adjustments totaling **$${extraction.deficiency_amount.toLocaleString()}**.

### Taxpayer's Position

${payload.taxpayer_explanation}

### Disputed Items

${payload.disputed_lines.map((line, idx) => `${idx + 1}. ${line}`).join("\n")}

### Legal Authority

The following authorities support this position:

${payload.legal_authority_citations.map((citation, idx) => `${idx + 1}. ${citation}`).join("\n")}

### Supporting Evidence

${payload.evidence_references.map((ref, idx) => `${idx + 1}. ${ref}`).join("\n")}

### Request for Appeals

I respectfully request that this matter be referred to the Appeals office for independent consideration, and I ask that the proposed adjustments be withdrawn or modified based on the position and evidence presented.

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

**DISCLAIMER:** This response is not legal or tax advice. Consult with a qualified tax professional before submitting.`;

  return {
    type: "disagreement-response",
    title: "Statement of Disagreement to Notice of Deficiency",
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
 * Generate Tax Court petition
 */
export function generateTaxCourtPetition(payload: TaxCourtPetitionPayload): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plantextContent = `PETITION TO THE UNITED STATES TAX COURT

RE: Petition of ${extraction.taxpayer_name} v. Commissioner of Internal Revenue

Notice Number: ${extraction.deficiency_notice_number}
Tax Year: ${extraction.tax_year}
Deficiency: $${extraction.deficiency_amount.toLocaleString()}

PETITION:

The above-named taxpayer respectfully petitions the United States Tax Court for review of the Notice of Deficiency dated ${extraction.notice_date}.

JURISDICTION:

This Court has jurisdiction under IRC § 6213 as the taxpayer timely filed this petition within 90 days of the notice date.

STATEMENT OF FACTS:

${payload.petition_reason}

POSITION OF TAXPAYER:

The taxpayer respectfully contends that the proposed adjustments are erroneous and requests:

${payload.supporting_arguments.map((arg, idx) => `${idx + 1}. ${arg}`).join("\n")}

RELIEF REQUESTED:

${payload.requested_relief}

Respectfully submitted,

_____________________________
Taxpayer Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: Tax Court petitions have specific requirements. Consult a tax attorney before filing.`;

  const markdownContent = `# Petition to the United States Tax Court

**Petitioner:** ${extraction.taxpayer_name}
**v.**
**Commissioner of Internal Revenue**

---

## Case Information

- **Notice Number:** ${extraction.deficiency_notice_number}
- **Notice Date:** ${extraction.notice_date}
- **Tax Year:** ${extraction.tax_year}
- **Deficiency Amount:** $${extraction.deficiency_amount.toLocaleString()}

---

## I. JURISDICTION

The United States Tax Court has jurisdiction over this matter pursuant to Internal Revenue Code § 6213. The petitioner timely filed this petition within 90 days of receipt of the Notice of Deficiency.

## II. STATEMENT OF FACTS

${payload.petition_reason}

## III. POSITION OF PETITIONER

The petitioner respectfully contends that the proposed adjustments are erroneous for the following reasons:

${payload.supporting_arguments.map((arg, idx) => `${idx + 1}. ${arg}`).join("\n")}

## IV. RELIEF REQUESTED

${payload.requested_relief}

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

**IMPORTANT NOTICE:** Tax Court petitions are formal legal documents with specific filing requirements. Professional representation by a tax attorney or CPA is strongly recommended.`;

  return {
    type: "tax-court-petition",
    title: "Petition to the United States Tax Court",
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
 * Generate payment plan request
 */
export function generatePaymentPlanRequest(payload: PaymentPlanPayload): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plantextContent = `REQUEST FOR INSTALLMENT AGREEMENT

Date: ${today}

TO: Internal Revenue Service
    ${extraction.irs_contact_info.mailing_address || "Department of Internal Revenue"}

RE: Deficiency Notice Number: ${extraction.deficiency_notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    Tax Year: ${extraction.tax_year}

Dear IRS Officer:

I acknowledge the deficiency of $${extraction.deficiency_amount.toLocaleString()} and request to establish an installment agreement.

PAYMENT PLAN:
Monthly Payment: $${payload.monthly_payment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
Duration: ${payload.duration_months} months
First Payment Date: ${payload.first_payment_date}

${
  payload.hardship_basis
    ? `HARDSHIP BASIS:
${payload.hardship_basis}`
    : ""
}

I will make monthly payments as scheduled and understand that interest and penalties continue to accrue.

Respectfully submitted,

_____________________________
Signature

_____________________________
Printed Name

_____________________________
Date

DISCLAIMER: This request does not admit liability but establishes a payment arrangement.`;

  const markdownContent = `# Request for Installment Agreement

**Date:** ${today}

**TO:** Internal Revenue Service
${extraction.irs_contact_info.mailing_address || "Department of Internal Revenue"}

**RE:**
- **Deficiency Notice Number:** ${extraction.deficiency_notice_number}
- **Taxpayer:** ${extraction.taxpayer_name}
- **Tax Year:** ${extraction.tax_year}

---

## Request for Installment Agreement

I acknowledge the Notice of Deficiency dated ${extraction.notice_date} and the proposed deficiency of **$${extraction.deficiency_amount.toLocaleString()}**.

I request to establish an installment agreement to pay this deficiency over time.

### Payment Plan Details

| Item | Details |
|------|---------|
| Deficiency Amount | $${extraction.deficiency_amount.toLocaleString()} |
| Monthly Payment | $${payload.monthly_payment.toLocaleString("en-US", { minimumFractionDigits: 2 })} |
| Number of Months | ${payload.duration_months} |
| First Payment Date | ${payload.first_payment_date} |
| Total Payments | ${payload.duration_months} |

### Understanding

I understand and agree that:
- Monthly payments of $${payload.monthly_payment.toLocaleString("en-US", { minimumFractionDigits: 2 })} are due by the stated date each month
- Interest and penalties continue to accrue on the outstanding balance
- Failure to make timely payments may result in collection action
- The IRS may modify or terminate the agreement if circumstances change

${
  payload.hardship_basis
    ? `### Financial Hardship

${payload.hardship_basis}`
    : ""
}

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

**Note:** This request establishes payment terms and does not constitute agreement with the deficiency or waiver of appeal rights.`;

  return {
    type: "payment-plan-request",
    title: "Request for Installment Agreement",
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
 * Generate settlement proposal
 */
export function generateSettlementProposal(payload: SettlementProposalPayload): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plantextContent = `SETTLEMENT PROPOSAL

Date: ${today}

TO: Internal Revenue Service
    ${extraction.irs_contact_info.mailing_address || "Department of Internal Revenue"}

RE: Deficiency Notice Number: ${extraction.deficiency_notice_number}
    Taxpayer: ${extraction.taxpayer_name}
    Tax Year: ${extraction.tax_year}

Dear IRS Officer:

I propose settlement of the deficiency for $${payload.settlement_amount.toLocaleString()}, representing ${((payload.settlement_amount / extraction.deficiency_amount) * 100).toFixed(1)}% of the proposed deficiency of $${extraction.deficiency_amount.toLocaleString()}.

SETTLEMENT BASIS:

${payload.settlement_basis}

REASONING:

${payload.reasoning}

This settlement proposal represents a reasonable resolution and avoids protracted litigation.

Respectfully submitted,

_____________________________
Signature`;

  const markdownContent = `# Settlement Proposal for Notice of Deficiency

**Date:** ${today}

**TO:** Internal Revenue Service
${extraction.irs_contact_info.mailing_address || "Department of Internal Revenue"}

**RE:**
- **Deficiency Notice Number:** ${extraction.deficiency_notice_number}
- **Taxpayer:** ${extraction.taxpayer_name}
- **Tax Year:** ${extraction.tax_year}

---

## Settlement Proposal

I propose settlement of the Notice of Deficiency for a total of **$${payload.settlement_amount.toLocaleString()}**.

### Settlement Summary

| Item | Amount |
|------|--------|
| Original Deficiency | $${extraction.deficiency_amount.toLocaleString()} |
| Proposed Settlement | $${payload.settlement_amount.toLocaleString()} |
| Settlement Percentage | ${((payload.settlement_amount / extraction.deficiency_amount) * 100).toFixed(1)}% |

### Basis for Settlement

**${payload.settlement_basis}**

${payload.reasoning}

### Benefits to Both Parties

- Provides certainty and finality to this dispute
- Avoids costs of protracted Appeals or Tax Court proceedings
- Demonstrates good faith settlement efforts

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

**Note:** This proposal is made without admission of liability and is subject to IRS acceptance.`;

  return {
    type: "settlement-proposal",
    title: "Settlement Proposal for Notice of Deficiency",
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
 * Generate innocent spouse claim
 */
export function generateInnocentSpouseClaim(payload: InnocentSpousePayload): GeneratedDocument {
  const extraction = payload.intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plantextContent = `APPLICATION FOR INNOCENT SPOUSE RELIEF

Date: ${today}

I request Innocent Spouse Relief under IRC § 6015 for the tax year ${extraction.tax_year}.

REQUESTING SPOUSE: ${payload.requesting_spouse_name}
SOCIAL SECURITY NUMBER: ${payload.requesting_spouse_ssn}

OTHER SPOUSE: ${payload.other_spouse_name}

TAX YEAR IN QUESTION: ${extraction.tax_year}

DEFICIENCY AMOUNT: $${extraction.deficiency_amount.toLocaleString()}

ITEM CAUSING LIABILITY:
${payload.item_causing_liability}

I DID NOT KNOW (OR HAVE REASON TO KNOW):
${payload.did_not_know_reason}

FAILURE TO PAY - BASIS:
${payload.failure_to_pay_basis}

Under IRC § 6015, I qualify for Innocent Spouse Relief because:
1. I filed a joint return
2. I did not know or have reason to know of the understatement of tax
3. It would be inequitable to hold me liable

I request that the IRS determine I should not be liable for this deficiency.

Respectfully submitted,

_____________________________
Signature

_____________________________
Date`;

  const markdownContent = `# Application for Innocent Spouse Relief (IRC § 6015)

**Date:** ${today}

---

## Requesting Spouse Information

**Name:** ${payload.requesting_spouse_name}
**Social Security Number:** ${payload.requesting_spouse_ssn}

**Other Spouse:** ${payload.other_spouse_name}

**Tax Year:** ${extraction.tax_year}
**Deficiency Amount:** $${extraction.deficiency_amount.toLocaleString()}

---

## Statement of Facts

### Item Causing Liability

${payload.item_causing_liability}

### Knowledge of Understatement

I did not know or have reason to know of the understatement of tax because:

${payload.did_not_know_reason}

### Failure to Pay

Regarding the failure to pay the tax:

${payload.failure_to_pay_basis}

---

## Legal Basis for Relief

Under Internal Revenue Code § 6015, I qualify for Innocent Spouse Relief because:

1. **Joint Return Filed** - I filed a joint return for the tax year ${extraction.tax_year}
2. **Lack of Knowledge** - I did not know or have reason to know of the understatement of tax liability
3. **Inequitable Holding** - It would be inequitable to hold me liable for the deficiency

---

## Relief Requested

I request that the Internal Revenue Service:

1. Determine that I should not be liable for the deficiency under IRC § 6015
2. Grant full Innocent Spouse Relief
3. Notify me of the determination

---

**Respectfully submitted,**

**Signature:** ____________________________

**Printed Name:** ____________________________

**Date:** ____________________________

---

**IMPORTANT:** Innocent Spouse Relief has specific eligibility requirements and strict timelines. Consult with a tax attorney or CPA before submitting this claim.`;

  return {
    type: "innocent-spouse-claim",
    title: "Application for Innocent Spouse Relief",
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
 */
export function generateAttorneyReferral(intake: DeficiencyIntakeConfirmation): GeneratedDocument {
  const extraction = intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const plantextContent = `ATTORNEY REFERRAL GUIDANCE

Date: ${today}

NOTICE: Professional Tax Representation Required

This Notice of Deficiency situation requires consultation with a qualified tax attorney or CPA. Do not respond to the IRS without professional guidance.

CRITICAL INFORMATION:
- Notice Date: ${extraction.notice_date}
- Deficiency Amount: $${extraction.deficiency_amount.toLocaleString()}
- Response Deadline: ${extraction.statutory_notice_deadline} (${Math.floor((new Date(extraction.statutory_notice_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining)
- Tax Year: ${extraction.tax_year}

REASONS FOR PROFESSIONAL REPRESENTATION:
1. Substantial deficiency amount
2. Complex tax positions
3. Fraud allegations present
4. Multiple response options available
5. Tax Court petition considerations

ACTION ITEMS:
1. Contact a tax attorney immediately
2. Gather all relevant documentation
3. Do not respond without legal counsel
4. Preserve all communications
5. Understand statute of limitations implications`;

  const markdownContent = `# Attorney Referral Guidance

**Date:** ${today}

---

## ⚠️ PROFESSIONAL REPRESENTATION REQUIRED

Your Notice of Deficiency situation requires immediate consultation with a qualified tax attorney or CPA specializing in IRS disputes. **Do not respond without professional guidance.**

### Critical Deadlines

| Item | Date | Days Remaining |
|------|------|----------------|
| Notice Date | ${extraction.notice_date} | N/A |
| Response Deadline | ${extraction.statutory_notice_deadline} | ${Math.floor((new Date(extraction.statutory_notice_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} |

### Case Summary

- **Deficiency Amount:** $${extraction.deficiency_amount.toLocaleString()}
- **Tax Year:** ${extraction.tax_year}
- **Deficiency Notice:** ${extraction.deficiency_notice_number}
- **Joint Return:** ${extraction.is_joint_return ? "Yes" : "No"}

### Reasons for Professional Representation

1. **Substantial Amount** - $${extraction.deficiency_amount.toLocaleString()} is significant
2. **Complex Adjustments** - Multiple line items with technical issues
3. **Multiple Response Paths** - Agreement, disagreement, Tax Court, payment plans, settlement
4. **Legal Rights at Stake** - Tax Court petition rights, Appeals rights, collection alternatives
5. **Tax Court Litigation** - If filing a petition, attorney strongly recommended

### What You Should Do Now

1. **Contact a tax professional immediately** - Do not delay
2. **Gather all documentation:**
   - Original tax return and supporting records
   - Prior correspondence with IRS
   - Any examination files or workpapers
   - Financial records related to disputed items
3. **Do not respond to IRS without counsel** - Wait for attorney guidance
4. **Preserve all communications** - Keep copies of everything
5. **Understand your options:**
   - Agreement and payment
   - Disagreement and appeals
   - Tax Court petition
   - Settlement proposal
   - Innocent spouse relief (if applicable)

### Finding Professional Representation

**Tax Attorneys:**
- American Bar Association Lawyer Referral Service
- State Bar Association Tax Section
- Firms specializing in IRS disputes and Tax Court

**CPAs & Enrolled Agents:**
- American Institute of CPAs (AICPA)
- National Association of Enrolled Agents (NAEA)
- Firms with tax controversy experience

**Low-Income Taxpayers:**
- Low-Income Taxpayer Clinic (LITC) programs
- Community legal aid organizations

---

**This guidance is for informational purposes only and does not constitute legal advice. Only a licensed tax attorney can provide legal representation for your deficiency case.**`;

  return {
    type: "attorney-referral",
    title: "Attorney Referral Guidance - Professional Representation Required",
    content: plantextContent,
    markdown_content: markdownContent,
    requires_signature: false,
    is_official_form: false,
    generated_at: today,
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

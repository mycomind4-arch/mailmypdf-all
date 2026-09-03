/**
 * Eviction Notice Response Document Generation
 * Generates formal response letters, declarations, and proofs of service
 */

import type {
  PaymentProposalPayload,
  ContestDefensePayload,
  GeneratedDocument,
  EvictionIntakeConfirmation,
  DefenseType,
} from "./types";

// ─────────────────────────────────────────────────────────────
// PAYMENT PROPOSAL LETTER
// ─────────────────────────────────────────────────────────────

export function generatePaymentProposalLetter(payload: PaymentProposalPayload): GeneratedDocument {
  const intake = payload.intake;
  const extraction = intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  let proposalDetails = "";

  if (payload.payment_option === "full") {
    proposalDetails = `I can pay the full amount of $${extraction.notice_amount_owed?.toLocaleString()} by ${payload.payment_date || "the deadline stated in the notice"}.`;
  } else if (payload.payment_option === "partial") {
    proposalDetails = `I propose to pay $${payload.payment_amount?.toLocaleString() || "a partial amount"} immediately and the remaining balance of $${(
      (extraction.notice_amount_owed || 0) - (payload.payment_amount || 0)
    ).toLocaleString()} over ${payload.months_to_pay || 3} months at $${payload.monthly_payment?.toLocaleString()} per month, beginning ${payload.payment_date || "within 10 days"}.`;
  } else {
    proposalDetails = `I respectfully request a temporary extension of ${
      new Date(extraction.deadline_date).getTime() - new Date(today).getTime()
    } days to gather funds to pay the full amount by ${payload.payment_date || "30 days from this letter"}.`;
  }

  const markdown = `
[Tenant Name]
[Tenant Address]
[City, State ZIP]

${today}

${extraction.notice_issuer}
[Landlord Address]
[City, State ZIP]

**Re: Response to 3-Day Notice to Pay Rent or Quit – ${extraction.property_address}**
Notice Date: ${extraction.notice_issue_date}
Amount Claimed: $${extraction.notice_amount_owed?.toLocaleString() || "[Amount]"}

Dear ${extraction.notice_issuer}:

I received your 3-Day Notice to Pay Rent or Quit dated ${extraction.notice_issue_date} regarding unpaid rent at ${extraction.property_address}.

I take this matter seriously and am committed to resolving the arrearage. ${proposalDetails}

${payload.tenant_statement ? `\n${payload.tenant_statement}\n` : ""}

I value my residency at this property and intend to remain a responsible tenant. I am available to discuss this proposal at your earliest convenience.

Sincerely,

[Your Signature]
[Your Printed Name]
[Your Phone]
[Your Email]

---

**IMPORTANT NOTICE:** This is a good-faith communication between tenant and landlord. It does not constitute legal advice. The acceptance or rejection of this proposal is at the landlord's discretion. If the landlord files an unlawful detainer lawsuit, you will receive a summons and complaint, and you should consult an attorney immediately to file a response with the court.
`;

  return {
    type: "payment-letter",
    title: "Payment Proposal Letter to Landlord",
    content: formatMarkdownAsPlainText(markdown),
    markdown_content: markdown,
    requires_signature: false, // Tenant can sign for authenticity but not required
    requires_notary: false,
    generated_at: new Date().toISOString(),
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

// ─────────────────────────────────────────────────────────────
// CONTEST/DEFENSE LETTER
// ─────────────────────────────────────────────────────────────

export function generateContestLetter(payload: ContestDefensePayload): GeneratedDocument {
  const intake = payload.intake;
  const extraction = intake.extraction;
  const today = new Date().toISOString().split("T")[0];

  const defenseItems = buildDefenseItems(payload.defenses, payload.defense_details);

  const markdown = `
[Tenant Name]
[Tenant Address]
[City, State ZIP]

${today}

${extraction.notice_issuer}
[Landlord Address]
[City, State ZIP]

**Re: Contest to 3-Day Notice to Pay Rent or Quit – ${extraction.property_address}**
Notice Date: ${extraction.notice_issue_date}
Amount Claimed: $${extraction.notice_amount_owed?.toLocaleString() || "[Amount]"}

Dear ${extraction.notice_issuer}:

I received your 3-Day Notice to Pay Rent or Quit dated ${extraction.notice_issue_date}. I do not accept this notice and contest its validity for the following reasons:

${defenseItems.join("\n\n")}

${payload.tenant_statement ? `\n**My Statement:**\n${payload.tenant_statement}\n` : ""}

I remain committed to resolving any legitimate disputes and maintaining my lease obligations. However, I dispute the validity of this notice and will defend against any unlawful detainer filing.

${payload.evidence_list && payload.evidence_list.length > 0 ? `\n**Supporting Evidence (attached or available):**\n${payload.evidence_list.map((e) => `• ${e}`).join("\n")}\n` : ""}

Sincerely,

[Your Signature]
[Your Printed Name]
[Your Phone]
[Your Email]

---

**IMPORTANT NOTICE:** This letter is not legal advice. If the landlord files an unlawful detainer lawsuit, you will receive a summons and complaint. You must consult an attorney immediately to file a formal answer with the court. Do not delay in seeking legal representation if a lawsuit is filed.
`;

  return {
    type: "contest-letter",
    title: "Contest/Defense Response Letter",
    content: formatMarkdownAsPlainText(markdown),
    markdown_content: markdown,
    requires_signature: false,
    requires_notary: false,
    generated_at: new Date().toISOString(),
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

// ─────────────────────────────────────────────────────────────
// DECLARATION UNDER PENALTY OF PERJURY
// ─────────────────────────────────────────────────────────────

export function generateDeclaration(
  intake: EvictionIntakeConfirmation,
  statements: Record<string, string>
): GeneratedDocument {
  const extraction = intake.extraction;
  const today = new Date().toISOString().split("T")[0];
  const [year, month, day] = today.split("-");
  const dateObj = new Date(today);
  const monthName = dateObj.toLocaleString("en-US", { month: "long" });

  const markdown = `
# DECLARATION OF [TENANT NAME] UNDER PENALTY OF PERJURY

I, [TENANT NAME], declare:

1. I am a tenant at **${extraction.property_address}**, [CITY], California [ZIP], where I have resided since [DATE].

2. On **${extraction.notice_issue_date}**, I received a 3-Day Notice to Pay Rent or Quit claiming I owe **$${extraction.notice_amount_owed?.toLocaleString() || "[AMOUNT]"}** in unpaid rent.

3. I dispute this notice for the following reasons:

${statements.habitability ? `\n**a. HABITABILITY DEFECT (CA Civil Code § 1941)**\n\n${statements.habitability}\n` : ""}

${statements.procedural_defect ? `\n**b. PROCEDURAL DEFECT**\n\n${statements.procedural_defect}\n` : ""}

${statements.retaliation ? `\n**c. RETALIATION (CA Civil Code § 1942.5)**\n\n${statements.retaliation}\n` : ""}

${statements.payment_made ? `\n**d. PAYMENT MADE**\n\n${statements.payment_made}\n` : ""}

${statements.other_defense ? `\n**e. OTHER DEFENSE**\n\n${statements.other_defense}\n` : ""}

4. I have been a responsible tenant and understand the seriousness of an eviction proceeding.

5. I am prepared to resolve this matter and have not intentionally breached my lease obligations.

I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.

Executed on **${monthName} ${day}, ${year}** at [CITY], California.

___________________________
[TENANT SIGNATURE]

___________________________
[PRINTED TENANT NAME]

---

**IMPORTANT:** This declaration is not legal advice. Consult an attorney before filing this document with a court. A false declaration under penalty of perjury can result in prosecution for perjury.
`;

  return {
    type: "declaration",
    title: "Declaration Under Penalty of Perjury",
    content: formatMarkdownAsPlainText(markdown),
    markdown_content: markdown,
    requires_signature: true, // REQUIRED - tenant must sign under penalty of perjury
    requires_notary: false, // California allows unsworn declaration (no notary required)
    generated_at: new Date().toISOString(),
    model_used: "claude-3.5-sonnet",
    provider: "claude",
  };
}

// ─────────────────────────────────────────────────────────────
// PROOF OF SERVICE COVER SHEET
// ─────────────────────────────────────────────────────────────

export function generateProofOfService(
  intake: EvictionIntakeConfirmation,
  serviceMethod: "usps-certified" | "hand-delivery" | "email"
): GeneratedDocument {
  const extraction = intake.extraction;
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const markdown = `
# PROOF OF SERVICE COVER SHEET

**FROM (Tenant):**
[Your Name]
${extraction.property_address}
[City, State ZIP]

**TO (Landlord):**
${extraction.notice_issuer}
[Landlord Address]
[City, State ZIP]

**RE:** Response to 3-Day Notice to Pay Rent or Quit

**NOTICE DETAILS:**
- Notice Date: ${extraction.notice_issue_date}
- Response Deadline: ${extraction.deadline_date}
- Amount Claimed: $${extraction.notice_amount_owed?.toLocaleString() || "[Amount]"}
- Property: ${extraction.property_address}

---

## SERVICE METHOD: ${getMappedServiceMethod(serviceMethod)}

${
  serviceMethod === "usps-certified"
    ? `
### CERTIFIED MAIL - RETURN RECEIPT

**Mail Date:** ${dateStr}
**Certified Number:** [_______________]
**Tracking Number:** [_______________]

I sent this letter via USPS Certified Mail with Return Receipt (form PS Form 3811) so the landlord must sign for it. This provides proof that:
1. The letter was mailed on the date above
2. The recipient received and signed for it
3. There is official tracking and proof of delivery

**Keep this documentation:**
- Certified mail receipt (green card)
- Copy of letter sent
- Tracking confirmation from USPS website
`
    : serviceMethod === "hand-delivery"
      ? `
### HAND DELIVERY

**Date of Delivery:** ${dateStr}
**Time Delivered:** [_______________]
**Person Receiving:** [Name: _______________]
**Relationship:** [Manager/Agent/Tenant/Other: _______________]

Hand delivery provides immediate proof of service. Document:
1. Date and time of delivery
2. Name of person who received it
3. Their relationship to the landlord/property
4. Keep a copy for your records
`
      : `
### EMAIL DELIVERY

**Date Sent:** ${dateStr}
**Time Sent:** [_______________]
**Email Address:** ${extraction.notice_issuer}@[domain]
**Subject:** Response to 3-Day Notice to Pay Rent or Quit - ${extraction.property_address}

Email service provides:
1. Automatic timestamp when sent
2. Possibility of read receipt
3. Digital record in your email account

**Keep:**
- Email with read receipt (if enabled)
- Email header showing timestamp
- Copy of all attachments sent
`
}

---

## CHECKLIST BEFORE SENDING

- [ ] Letter is properly addressed to landlord/property manager
- [ ] All dates in letter are correct
- [ ] Your contact information is included
- [ ] You have made a copy for your records
- [ ] Service method matches what you're planning to use
- [ ] Your mailing address appears on the envelope/email

---

## AFTER YOU SEND

1. **Save proof:** Keep all receipts, tracking numbers, or delivery confirmations
2. **Create a binder:** Put letter + proof + any other correspondence in one place
3. **Track deadlines:** Note the deadline date and what happens next
4. **If lawsuit filed:** If landlord files unlawful detainer in court, you will receive a summons. Consult an attorney immediately.

**CRITICAL:** Do not assume the landlord accepts your proposal just because you sent a letter. The landlord may still file a lawsuit. Be prepared to respond to court papers if they arrive.
`;

  return {
    type: "proof-of-service",
    title: "Proof of Service Cover Sheet",
    content: formatMarkdownAsPlainText(markdown),
    markdown_content: markdown,
    requires_signature: serviceMethod === "hand-delivery",
    requires_notary: false,
    generated_at: new Date().toISOString(),
    model_used: "template",
    provider: "claude",
  };
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function buildDefenseItems(
  defenses: DefenseType[],
  details: Record<DefenseType, string>
): string[] {
  const items: string[] = [];

  if (defenses.includes("habitability") && details.habitability) {
    items.push(
      `**DEFENSE 1: UNINHABITABLE CONDITIONS (CA Civil Code § 1941)**\n\n${details.habitability}`
    );
  }

  if (defenses.includes("procedural-defect") && details["procedural-defect"]) {
    items.push(
      `**DEFENSE 2: PROCEDURAL DEFECT**\n\n${details["procedural-defect"]}`
    );
  }

  if (defenses.includes("retaliation") && details.retaliation) {
    items.push(
      `**DEFENSE 3: RETALIATION (CA Civil Code § 1942.5)**\n\n${details.retaliation}`
    );
  }

  if (defenses.includes("payment-made") && details["payment-made"]) {
    items.push(
      `**DEFENSE 4: PAYMENT ALREADY MADE**\n\n${details["payment-made"]}`
    );
  }

  if (defenses.includes("waiver") && details.waiver) {
    items.push(
      `**DEFENSE 5: WAIVER BY LANDLORD**\n\n${details.waiver}`
    );
  }

  if (defenses.includes("fraud-mistake") && details["fraud-mistake"]) {
    items.push(
      `**DEFENSE 6: FRAUD OR MISTAKE**\n\n${details["fraud-mistake"]}`
    );
  }

  if (defenses.includes("other") && details.other) {
    items.push(
      `**OTHER DEFENSE**\n\n${details.other}`
    );
  }

  return items;
}

function getMappedServiceMethod(
  method: "usps-certified" | "hand-delivery" | "email"
): string {
  const mapping = {
    "usps-certified": "USPS Certified Mail with Return Receipt",
    "hand-delivery": "Hand Delivery to Landlord/Agent",
    email: "Email to Landlord",
  };
  return mapping[method];
}

function formatMarkdownAsPlainText(markdown: string): string {
  return markdown
    .replace(/\*\*(.+?)\*\*/g, "$1") // Bold
    .replace(/\*(.+?)\*/g, "$1") // Italic
    .replace(/# (.+)/g, "$1") // Headings
    .replace(/^---$/gm, "") // Horizontal rules
    .trim();
}

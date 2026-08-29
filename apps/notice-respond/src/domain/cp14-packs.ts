/* ═══════════════════════════════════════════════════════════
   CP14 DOMAIN PACK SET — registers the CP14-specific
   configuration with the factory's domain pack system.

   This CONFIGURES the shared engine — it does not duplicate it.

   ═══════════════════════════════════════════════════════════ */

import { registerDomainPack, type DomainPackSet } from "./domain-packs";

// ── CP14 Document Pack ──────────────────────────────────────

const cp14DocumentPack = {
  name: "IRS CP14 Notice Pack",
  acceptedTypes: ["CP14", "IRS notice", "Balance Due notice"],
  classifierHints: ["CP14", "balance due", "unpaid balance", "amount you owe", "pay by", "installment"],
  extractionSchema: [
    "noticeNumber", "noticeDate", "responseDeadline", "paymentDeadline",
    "taxYear", "balanceDue", "penaltyAmount", "interestAmount",
    "totalDue", "responseAddress", "contactPhone", "requestedAction",
    "installmentOption",
  ],
  minConfidence: 0.7,
};

// ── CP14 Deadline Pack ──────────────────────────────────────

const cp14DeadlinePack = {
  name: "IRS CP14 Deadline Pack",
  triggeringEvents: ["explicit deadline in notice", "payment deadline from notice"],
  sourcePriority: ["uploaded notice (explicit deadline)", "IRS guidance", "user verification"],
  jurisdictionDependent: false,
  computationRules: [
    "Do NOT infer a deadline if the notice does not explicitly state one",
    "If the notice says 'pay by [date]', use that date with confirmed certainty",
    "If no deadline is found, mark as MISSING — never fabricate",
    "Payment deadline takes priority over response deadline for CP14",
  ],
};

// ── CP14 Evidence Pack ──────────────────────────────────────

const cp14EvidencePack = {
  name: "IRS CP14 Evidence Pack",
  evidenceTypes: [
    "CP14 notice", "tax return (Form 1040)", "payment records",
    "IRS account transcript", "Form 9465 (Installment Agreement Request)",
    "penalty abatement documentation", "prior IRS correspondence",
    "amended return (Form 1040-X)", "proof of payment",
  ],
  sufficiencyRules: [
    "If disputing the balance, payment records or account transcript are required",
    "If requesting installment, Form 9465 should be included",
    "If requesting penalty abatement, documentation supporting clean compliance history or reasonable cause is needed",
  ],
  contradictionRules: [
    "Compare balance due vs total due (balance + penalty + interest should equal total)",
    "Check for prior payments not reflected in the balance",
    "Verify tax year matches the assessment period",
  ],
  missingEvidenceBehavior: "Warn user and mark response as incomplete — do not mail without required evidence",
};

// ── CP14 Research Pack ──────────────────────────────────────

const cp14ResearchPack = {
  name: "IRS CP14 Research Pack",
  authoritativeSourceTypes: ["irs.gov", "IRS publications", "IRS form instructions"],
  jurisdictionalSourcesRequired: false,
  citationRequirements: [
    "Cite IRS publication number when referencing IRS rules",
    "Separate source facts from model interpretation",
    "Never present model interpretation as an IRS rule",
  ],
};

// ── CP14 Analysis Pack ──────────────────────────────────────

const cp14AnalysisPack = {
  name: "CP14 Balance Analysis Pack",
  capabilities: [
    "document-classification", "fact-extraction", "deadline-analysis",
    "requirements-analysis", "evidence-analysis", "contradiction-analysis",
  ],
  orderedChecks: [
    "classify notice as CP14",
    "extract structured fields",
    "identify payment/response deadline",
    "extract balance, penalty, interest, total due",
    "verify total = balance + penalty + interest",
    "detect documentation gaps",
    "detect wrong tax year",
    "generate structured findings",
    "build evidence checklist",
  ],
  riskFactors: [
    "deadline approaching or missing",
    "large balance due (> $10,000)",
    "missing required evidence",
    "low classification confidence",
    "high penalty rate (> 25% of balance)",
    "future tax year reference",
  ],
  outputSections: [
    "notice summary",
    "extracted facts",
    "balance analysis",
    "findings",
    "evidence checklist",
    "recommended actions",
  ],
};

// ── CP14 Draft Pack ─────────────────────────────────────────

const cp14DraftPack = {
  name: "IRS CP14 Response Draft Pack",
  draftType: "IRS response letter",
  requiredSections: ["Re:", "Dear", "Sincerely"],
  prohibitedUnsupportedClaims: [
    "tax conclusions without evidence",
    "legal authority citations without source",
    "balance amounts not traceable to extracted facts or user records",
    "guaranteed outcomes",
    "tax advice or recommendations",
  ],
  toneRules: [
    "factual — state what the records show",
    "respectful — address the IRS professionally",
    "specific — reference each amount and date",
    "honest — acknowledge what you don't know",
  ],
};

// ── CP14 Validation Pack ───────────────────────────────────

const cp14ValidationPack = {
  name: "CP14 Two-Pass Validation Pack",
  factualChecks: [
    "every amount in draft matches extraction or user facts",
    "notice number present and consistent",
    "tax year present and consistent",
    "deadline present and consistent",
    "no fabricated amounts",
    "no unresolved placeholders",
    "no forbidden claims (tax advice, legal conclusions, guaranteed outcomes)",
  ],
  requirementChecks: [
    "required letter sections present (Re:, salutation, closing)",
    "each identified discrepancy addressed",
    "enclosed/attached documentation referenced",
    "deadline or timeliness referenced",
    "requested action clearly stated",
    "unresolved issues noted",
  ],
  unsupportedAssertionChecks: [
    "no dollar amounts not traceable to facts",
    "no IRS statements not from the notice or official sources",
    "no taxpayer claims without supporting evidence",
  ],
  adversarialChecks: [
    "draft with no balance — should still be valid",
    "draft with wrong notice number — should flag",
    "draft with fabricated amount — should flag",
    "draft with placeholder — should flag",
    "empty draft — should fail",
  ],
};

// ── CP14 Submission Pack ────────────────────────────────────

const cp14SubmissionPack = {
  name: "MailMyPDF Submission Pack",
  methods: ["certified mail", "registered mail", "first-class mail with tracking"],
  recipientRules: [
    "Use the response address from the notice",
    "Verify the address matches the IRS campus shown on the notice",
    "Include the notice number on the envelope",
  ],
  supportsMailing: true,
  supportsTracking: true,
  proofRequirements: [
    "mailing record (postage receipt)",
    "tracking number",
    "delivery confirmation",
  ],
};

// ── Assemble and Register ────────────────────────────────────

const cp14PackSet: DomainPackSet = {
  engine: "document-action",
  document: cp14DocumentPack,
  deadline: cp14DeadlinePack,
  evidence: cp14EvidencePack,
  research: cp14ResearchPack,
  analysis: cp14AnalysisPack,
  draft: cp14DraftPack,
  validation: cp14ValidationPack,
  submission: cp14SubmissionPack,
};

registerDomainPack("cp14-response", cp14PackSet);

// Export for testing
export { cp14PackSet };

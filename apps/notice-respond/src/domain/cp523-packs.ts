/* ═══════════════════════════════════════════════════════════
   CP523 DOMAIN PACK SET — registers the CP523-specific
   configuration with the factory's domain pack system.

   This CONFIGURES the shared engine — it does not duplicate it.

   ═══════════════════════════════════════════════════════════ */

import { registerDomainPack, type DomainPackSet } from "./domain-packs";
import { getCP523ResearchPack } from "./cp523-research";

// ── CP523 Document Pack ──────────────────────────────────────

const cp523DocumentPack = {
  name: "IRS CP523 Notice Pack",
  acceptedTypes: ["CP523", "IRS notice", "Installment agreement default", "Intent to levy"],
  classifierHints: ["CP523", "installment agreement", "default", "intent to levy", "terminate", "seizure"],
  extractionSchema: [
    "noticeNumber", "noticeDate", "responseDeadline", "cdpHearingDeadline",
    "terminationDate", "installmentAgreementNumber", "defaultReason",
    "taxYearsCovered", "balanceDue", "penaltyAmount", "interestAmount",
    "totalDue", "levyType", "responseAddress", "contactPhone",
    "cdpRightsNotice", "passportCertification",
  ],
  minConfidence: 0.7,
};

// ── CP523 Deadline Pack ──────────────────────────────────────

const cp523DeadlinePack = {
  name: "IRS CP523 Deadline Pack",
  triggeringEvents: ["explicit deadline in notice", "30-day response window from notice date", "termination date"],
  sourcePriority: ["uploaded notice (explicit deadline)", "IRS guidance (30-day default)", "user verification"],
  jurisdictionDependent: false,
  computationRules: [
    "Do NOT infer a deadline if the notice does not explicitly state one",
    "If the notice says 'respond by [date]', use that date with confirmed certainty",
    "If the notice says '30 days from the date of this notice', compute from the notice date with derived certainty",
    "If no deadline is found, mark as MISSING — never fabricate",
    "The termination date is separate from the response deadline — both must be extracted if present",
  ],
};

// ── CP523 Evidence Pack ──────────────────────────────────────

const cp523EvidencePack = {
  name: "IRS CP523 Evidence Pack",
  evidenceTypes: [
    "CP523 notice", "installment agreement documentation", "payment records",
    "bank statements", "canceled checks", "IRS payment confirmations",
    "tax returns (Form 1040)", "Form 433-F (Collection Information Statement)",
    "Form 9465 (Installment Agreement Request)", "Form 12153 (CDP Hearing Request)",
    "prior IRS correspondence",
  ],
  sufficiencyRules: [
    "Each disputed amount must have supporting payment documentation",
    "Documentation must cover the same tax years as the installment agreement",
    "Payment records must show dates and amounts matching the installment schedule",
    "Form 433-F is recommended if requesting reinstatement or a new agreement",
  ],
  contradictionRules: [
    "Compare IRS balance due vs user's payment records",
    "Compare stated default reason vs user's payment history",
    "Check for payments made after the notice was generated",
  ],
  missingEvidenceBehavior: "Warn user and mark response as incomplete — do not mail without required evidence",
};

// ── CP523 Research Pack ──────────────────────────────────────

const cp523ResearchPack = {
  name: "IRS CP523 Research Pack",
  authoritativeSourceTypes: ["irs.gov", "IRS publications", "IRS form instructions"],
  jurisdictionalSourcesRequired: false,
  citationRequirements: [
    "Cite IRS publication number when referencing IRS rules",
    "Separate source facts from model interpretation",
    "Never present model interpretation as an IRS rule",
    "Reference Publication 1660 for CDP hearing rights",
    "Reference Form 9465 for installment agreement requests",
  ],
};

// ── CP523 Analysis Pack ──────────────────────────────────────

const cp523AnalysisPack = {
  name: "CP523 Discrepancy Analysis Pack",
  capabilities: [
    "document-classification", "fact-extraction", "deadline-analysis",
    "requirements-analysis", "evidence-analysis", "contradiction-analysis",
  ],
  orderedChecks: [
    "classify notice as CP523",
    "extract structured fields",
    "identify response deadline and CDP hearing deadline",
    "extract balance due and installment agreement info",
    "identify default reason",
    "detect balance disputes",
    "detect documentation gaps",
    "detect levy risk",
    "detect passport certification",
    "generate structured findings",
    "build evidence checklist",
  ],
  riskFactors: [
    "deadline approaching or missing",
    "levy action indicated",
    "passport certification detected",
    "termination date approaching",
    "missing required evidence",
    "low classification confidence",
    "missing installment agreement number",
    "missing default reason",
  ],
  outputSections: [
    "notice summary",
    "extracted facts",
    "deadline analysis",
    "discrepancy analysis",
    "evidence checklist",
    "findings",
    "recommended actions",
  ],
};

// ── CP523 Draft Pack ─────────────────────────────────────────

const cp523DraftPack = {
  name: "IRS CP523 Response Draft Pack",
  draftType: "IRS response letter",
  requiredSections: ["Re:", "Dear", "Sincerely"],
  prohibitedUnsupportedClaims: [
    "tax conclusions without evidence",
    "legal authority citations without source",
    "amounts not traceable to extracted facts or user records",
    "guaranteed outcomes",
    "tax advice or recommendations",
  ],
  toneRules: [
    "factual — state what the records show",
    "respectful — address the IRS professionally",
    "specific — reference the installment agreement and default reason",
    "honest — acknowledge what you don't know",
  ],
};

// ── CP523 Validation Pack ───────────────────────────────────

const cp523ValidationPack = {
  name: "CP523 Two-Pass Validation Pack",
  factualChecks: [
    "every amount in draft matches extraction or user facts",
    "notice number present and consistent",
    "tax years present and consistent",
    "deadline present and consistent",
    "installment agreement number present if extracted",
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
    "draft with no discrepancies — should still be valid",
    "draft with wrong notice number — should flag",
    "draft with fabricated amount — should flag",
    "draft with placeholder — should flag",
    "empty draft — should fail",
  ],
};

// ── CP523 Submission Pack ────────────────────────────────────

const cp523SubmissionPack = {
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

const cp523PackSet: DomainPackSet = {
  engine: "document-action",
  document: cp523DocumentPack,
  deadline: cp523DeadlinePack,
  evidence: cp523EvidencePack,
  research: cp523ResearchPack,
  analysis: cp523AnalysisPack,
  draft: cp523DraftPack,
  validation: cp523ValidationPack,
  submission: cp523SubmissionPack,
};

registerDomainPack("cp523-response", cp523PackSet);

// Export for testing
export { cp523PackSet };

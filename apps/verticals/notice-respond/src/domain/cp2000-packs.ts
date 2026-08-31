/* ═══════════════════════════════════════════════════════════
   CP2000 DOMAIN PACK SET — registers the CP2000-specific
   configuration with the factory's domain pack system.

   This CONFIGURES the shared engine — it does not duplicate it.

   ═══════════════════════════════════════════════════════════ */

import { registerDomainPack, type DomainPackSet } from "./domain-packs";
import { getCP2000ResearchPack } from "./cp2000-research";

// ── CP2000 Document Pack ──────────────────────────────────────

const cp2000DocumentPack = {
  name: "IRS CP2000 Notice Pack",
  acceptedTypes: ["CP2000", "IRS notice", "Underreporter notice"],
  classifierHints: ["CP2000", "underreport", "under-reported", "proposed changes", "third-party reporting"],
  extractionSchema: [
    "noticeNumber", "noticeDate", "responseDeadline", "taxYear",
    "proposedTaxIncrease", "proposedPenalty", "reportedIncome",
    "irsReportedIncome", "incomeSource", "payerName",
    "responseAddress", "contactPhone", "requestedAction",
  ],
  minConfidence: 0.7,
};

// ── CP2000 Deadline Pack ──────────────────────────────────────

const cp2000DeadlinePack = {
  name: "IRS CP2000 Deadline Pack",
  triggeringEvents: ["explicit deadline in notice", "30-day response window from notice date"],
  sourcePriority: ["uploaded notice (explicit deadline)", "IRS guidance (30-day default)", "user verification"],
  jurisdictionDependent: false,
  computationRules: [
    "Do NOT infer a deadline if the notice does not explicitly state one",
    "If the notice says 'respond by [date]', use that date with confirmed certainty",
    "If the notice says 'respond within 30 days', compute from the notice date with derived certainty",
    "If no deadline is found, mark as MISSING — never fabricate",
  ],
};

// ── CP2000 Evidence Pack ──────────────────────────────────────

const cp2000EvidencePack = {
  name: "IRS CP2000 Evidence Pack",
  evidenceTypes: [
    "CP2000 notice", "W-2", "1099-NEC", "1099-MISC", "1099-INT", "1099-DIV",
    "1099-B", "1099-R", "K-1", "tax return (Form 1040)", "bank statements",
    "payroll records", "prior IRS correspondence", "corrected information return",
  ],
  sufficiencyRules: [
    "Each disputed amount must have supporting documentation",
    "Documentation must be from the same tax year as the notice",
    "Payer name on evidence must match payer name on the notice",
  ],
  contradictionRules: [
    "Compare IRS-reported amount vs user-reported amount",
    "Compare payer name on notice vs payer name on user's documents",
    "Check for duplicate income reporting",
  ],
  missingEvidenceBehavior: "Warn user and mark response as incomplete — do not mail without required evidence",
};

// ── CP2000 Research Pack ──────────────────────────────────────

const cp2000ResearchPack = {
  name: "IRS CP2000 Research Pack",
  authoritativeSourceTypes: ["irs.gov", "IRS publications", "IRS form instructions"],
  jurisdictionalSourcesRequired: false,
  citationRequirements: [
    "Cite IRS publication number when referencing IRS rules",
    "Separate source facts from model interpretation",
    "Never present model interpretation as an IRS rule",
  ],
};

// ── CP2000 Analysis Pack ──────────────────────────────────────

const cp2000AnalysisPack = {
  name: "CP2000 Discrepancy Analysis Pack",
  capabilities: [
    "document-classification", "fact-extraction", "deadline-analysis",
    "requirements-analysis", "evidence-analysis", "contradiction-analysis",
  ],
  orderedChecks: [
    "classify notice as CP2000",
    "extract structured fields",
    "identify response deadline",
    "extract income amounts (reported vs IRS)",
    "detect amount mismatches",
    "detect documentation gaps",
    "detect wrong tax year",
    "generate structured findings",
    "build evidence checklist",
  ],
  riskFactors: [
    "deadline approaching or missing",
    "large income discrepancy (> $5,000)",
    "missing required evidence",
    "low classification confidence",
    "future tax year reference",
  ],
  outputSections: [
    "notice summary",
    "extracted facts",
    "discrepancy analysis",
    "evidence checklist",
    "findings",
    "recommended actions",
  ],
};

// ── CP2000 Draft Pack ─────────────────────────────────────────

const cp2000DraftPack = {
  name: "IRS CP2000 Response Draft Pack",
  draftType: "IRS response letter",
  requiredSections: ["Re:", "Dear", "Sincerely"],
  prohibitedUnsupportedClaims: [
    "tax conclusions without evidence",
    "legal authority citations without source",
    "income amounts not traceable to extracted facts or user records",
    "guaranteed outcomes",
    "tax advice or recommendations",
  ],
  toneRules: [
    "factual — state what the records show",
    "respectful — address the IRS professionally",
    "specific — reference each discrepancy by amount and source",
    "honest — acknowledge what you don't know",
  ],
};

// ── CP2000 Validation Pack ───────────────────────────────────

const cp2000ValidationPack = {
  name: "CP2000 Two-Pass Validation Pack",
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
    "draft with no discrepancies — should still be valid",
    "draft with wrong notice number — should flag",
    "draft with fabricated amount — should flag",
    "draft with placeholder — should flag",
    "empty draft — should fail",
  ],
};

// ── CP2000 Submission Pack ────────────────────────────────────

const cp2000SubmissionPack = {
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

const cp2000PackSet: DomainPackSet = {
  engine: "document-action",
  document: cp2000DocumentPack,
  deadline: cp2000DeadlinePack,
  evidence: cp2000EvidencePack,
  research: cp2000ResearchPack,
  analysis: cp2000AnalysisPack,
  draft: cp2000DraftPack,
  validation: cp2000ValidationPack,
  submission: cp2000SubmissionPack,
};

registerDomainPack("cp2000-response", cp2000PackSet);

// Export for testing
export { cp2000PackSet };

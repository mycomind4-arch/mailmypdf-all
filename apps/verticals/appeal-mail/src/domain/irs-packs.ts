/* ═══════════════════════════════════════════════════════════
   IRS NOTICE DOMAIN PACK SET — registers the IRS-specific
   configuration with the factory's domain pack system.

   This is the Wave 2 document-intelligence anchor. The four
   IRS notice workflows (CP2000, CP14, CP504, CP523) share one
   pack set because they all use the same engine, the same
   document parser, and the same response architecture.

   ═══════════════════════════════════════════════════════════ */

import {
  registerDomainPack,
  type DomainPackSet,
  type AnalysisPack,
  type CapabilityPack,
} from "./workflow-capabilities";

// ── IRS Document Pack ────────────────────────────────────────

const irsDocumentPack = {
  name: "IRS Notice Document Pack",
  acceptedTypes: [
    "IRS CP2000 notice",
    "IRS CP14 notice",
    "IRS CP504 notice",
    "IRS CP523 notice",
    "IRS notice",
    "tax notice",
    "balance due notice",
    "levy notice",
    "installment agreement default notice",
  ],
  classifierHints: [
    "CP2000", "CP14", "CP504", "CP523",
    "Internal Revenue Service", "IRS",
    "underreported income", "balance due",
    "intent to levy", "installment agreement default",
    "tax year", "amount you owe", "notice number",
  ],
  extractionSchema: [
    "noticeType", "taxpayerName", "taxpayerSSN", "taxYear",
    "noticeDate", "responseDeadline", "balanceDue", "noticeNumber",
    "discrepancies", "totalAdjustment",
    "amountOwed", "penaltyAmount", "interestAmount",
    "levyWarning", "levyDeadline",
    "installmentAgreementDefault", "defaultedAmount", "remainingBalance",
  ],
  minConfidence: 0.5, // IRS notices are highly structured — 50% field coverage is enough
};

// ── IRS Deadline Pack ────────────────────────────────────────

const irsDeadlinePack = {
  name: "IRS Response Deadline Pack",
  triggeringEvents: [
    "explicit deadline in the IRS notice",
    "statutory deadline (30 days for CP2000, CP504, CP523; 21 days for CP14)",
    "CDP hearing window (30 days from CP504)",
  ],
  sourcePriority: [
    "uploaded IRS notice (explicit deadline text)",
    "statutory deadline based on notice type",
    "IRS publication/IRM reference",
    "user verification",
  ],
  jurisdictionDependent: false, // IRS is federal — no state variation
  computationRules: [
    "CP2000: 30 days from notice date to respond",
    "CP14: pay immediately or within 21 days to avoid escalation",
    "CP504: 30 days from notice date to request CDP hearing — HARD DEADLINE",
    "CP523: 30 days from notice date to reinstate installment agreement",
    "If the notice explicitly states a different date, use the stated date",
    "If no date is found, mark as MISSING — never fabricate a deadline",
    "Weekends and holidays: IRS deadlines are calendar days, not business days",
  ],
};

// ── IRS Evidence Pack ───────────────────────────────────────

const irsEvidencePack = {
  name: "IRS Response Evidence Pack",
  evidenceTypes: [
    "IRS notice (the triggering document)",
    "tax return for the disputed year",
    "W-2s, 1099s, K-1s, and other income documents",
    "brokerage statements (cost basis for CP2000)",
    "IRS account transcript (Form 4506-T)",
    "payment records / cancelled checks",
    "Form 433-F (Collection Information Statement)",
    "prior installment agreement terms (for CP523)",
    "financial hardship documentation",
    "prior IRS correspondence",
  ],
  evidenceRules: [
    "Income discrepancies must be matched against specific tax documents — not estimates",
    "Payment claims must include cancelled checks or payment confirmations",
    "Financial hardship claims require Form 433-F with supporting documentation",
    "Disputed amounts must reference specific line items on the notice",
    "Do not submit original documents — always copies",
  ],
};

// ── IRS Analysis Pack ───────────────────────────────────────

const irsAnalysisPack: AnalysisPack = {
  name: "IRS Notice Analysis Pack",
  analysisSteps: [
    "Detect notice type (CP2000, CP14, CP504, CP523)",
    "Extract structured data from the notice",
    "Verify response deadline against statutory window",
    "Identify disputed vs. agreed items (CP2000)",
    "Compute total balance including penalties and interest (CP14, CP504)",
    "Assess levy risk and CDP hearing eligibility (CP504)",
    "Evaluate installment agreement default cause and reinstatement options (CP523)",
    "Generate response strategy based on notice type",
    "Identify evidence gaps and missing documents",
    "Produce structured issue-to-evidence map",
  ],
  contradictionChecks: [
    "reported income vs. IRS-reported income (CP2000)",
    "claimed balance vs. taxpayer records (CP14, CP504)",
    "payment plan terms vs. default notice (CP523)",
    "stated deadline vs. statutory deadline",
  ],
  gapDetection: [
    "missing income documents for disputed tax year",
    "missing payment records for claimed payments",
    "missing Form 433-F for payment plan requests",
    "missing CDP hearing request for CP504 within 30-day window",
  ],
  capabilities: [
    "document-classification",
    "fact-extraction",
    "deadline-analysis",
    "evidence-analysis",
    "contradiction-analysis",
    "response-strategy",
  ] as CapabilityPack[],
};

// ── IRS Draft Pack ──────────────────────────────────────────

const irsDraftPack = {
  name: "IRS Response Draft Pack",
  draftStructure: [
    "taxpayer identification (name, SSN, tax year)",
    "notice identification (notice number, date)",
    "statement of disagreement or agreement",
    "item-by-item response to discrepancies (CP2000)",
    "explanation of circumstances (CP523 default)",
    "supporting evidence references",
    "requested action (abatement, reinstatement, CDP hearing, etc.)",
    "signature block with penalty of perjury declaration",
  ],
  tone: "factual, precise, non-adversarial — IRS responses should be concise and document-backed",
  prohibitedContent: [
    "emotional language or accusations",
    "legal threats or references to litigation",
    "concession of facts not supported by evidence",
    "speculation about IRS motives",
    "offers to settle for arbitrary amounts",
  ],
  requiredElements: [
    "notice number and date",
    "tax year or period",
    "specific item-by-item response",
    "evidence references with document names",
    "requested outcome",
    "contact information",
  ],
};

// ── IRS Validation Pack ─────────────────────────────────────

const irsValidationPack = {
  name: "IRS Response Validation Pack",
  checks: [
    "notice number matches the uploaded document",
    "tax year is consistent throughout the response",
    "all disputed items have evidence references",
    "deadline has not passed (or is addressed)",
    "requested action is available for the notice type",
    "signature and penalty of perjury statement are present",
    "no unsupported claims or fabricated amounts",
    "no emotional or adversarial language",
  ],
  failConditions: [
    "notice number mismatch",
    "missing response to any discrepancy item (CP2000)",
    "no evidence reference for a disputed amount",
    "past-deadline without explanation",
    "empty draft",
    "requesting a CDP hearing for a non-CP504 notice",
  ],
};

// ── IRS Submission Pack ─────────────────────────────────────

const irsSubmissionPack = {
  name: "IRS Response Submission Pack",
  methods: ["certified mail", "registered mail", "first-class mail with tracking"],
  recipientRules: [
    "Use the IRS address shown on the notice — it varies by processing center",
    "Include the notice number on the envelope and response",
    "Include a copy of the IRS notice with the response",
    "Send to the address specified for responses, not payments",
    "Keep the certified mail receipt as proof of timely response",
  ],
  supportsMailing: true,
  supportsTracking: true,
  proofRequirements: [
    "mailing record (certified mail receipt)",
    "tracking number",
    "delivery confirmation from USPS",
    "copy of the response with date stamp",
  ],
};

// ── Assemble and Register ────────────────────────────────────

const irsPackSet: DomainPackSet = {
  engine: "appeal",
  document: irsDocumentPack,
  deadline: irsDeadlinePack,
  evidence: irsEvidencePack,
  analysis: irsAnalysisPack,
  draft: irsDraftPack,
  validation: irsValidationPack,
  submission: irsSubmissionPack,
};

// Register for all four IRS notice workflows
registerDomainPack("irs-cp2000-response", irsPackSet);
registerDomainPack("irs-cp14-response", irsPackSet);
registerDomainPack("irs-cp504-response", irsPackSet);
registerDomainPack("irs-cp523-response", irsPackSet);

// Export for testing
export { irsPackSet };

/* ═══════════════════════════════════════════════════════════
   CP523 CASE MODEL — the typed, versionable structure that
   connects all CP523 analysis components.

   CP523Case
   ├── notice
   ├── taxpayer
   ├── tax years covered
   ├── deadlines
   ├── installment agreement info
   ├── discrepancies
   ├── findings
   ├── evidence
   ├── research
   ├── responseStrategy
   ├── draft
   ├── validation
   └── submission

   ═══════════════════════════════════════════════════════════ */

import type { CP523Extraction } from "./cp523";
import type { NoticeFact } from "./fact";
import type { Finding } from "./cp523-findings";
import type { Discrepancy } from "./cp523-discrepancy";
import type { EvidenceChecklistItem } from "./cp523-evidence";
import type { SourceCitation, IRSSource } from "./cp523-research";
import type { ResponseDraft } from "./response";

// ── Case State ───────────────────────────────────────────────

export type CasePhase =
  | "intake"
  | "classification"
  | "extraction"
  | "analysis"
  | "evidence_review"
  | "strategy"
  | "drafting"
  | "validation"
  | "user_review"
  | "approved"
  | "mailing"
  | "submitted"
  | "complete";

export type CaseMaturity = "discovery" | "functional" | "authority";

// ── Response Strategy ────────────────────────────────────────

export type StrategyPosition =
  | "reinstate_agreement"
  | "request_cdp_hearing"
  | "dispute_default"
  | "dispute_balance"
  | "pay_in_full"
  | "new_installment"
  | "insufficient_info"
  | "needs_professional_review";

export interface CP523ResponseStrategy {
  position: StrategyPosition;
  issues: string[];
  evidenceToInclude: string[];
  explanations: string[];
  corrections: string[];
  unresolvedIssues: string[];
  requestedActions: string[];
  supportingSources: string[];
  riskFlags: string[];
  confidence: "high" | "medium" | "low";
}

// ── Validation Result ────────────────────────────────────────

export interface CP523ValidationFinding {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info" | "block";
  validator: "factual" | "requirement";
}

export interface CP523ValidationResult {
  factualFindings: CP523ValidationFinding[];
  requirementFindings: CP523ValidationFinding[];
  allFindings: CP523ValidationFinding[];
  passed: boolean;
  errors: number;
  warnings: number;
  blocks: number;
  blocked: boolean;
}

// ── CP523 Case ──────────────────────────────────────────────

export interface CP523Case {
  id: string;
  version: number;
  phase: CasePhase;
  maturity: CaseMaturity;

  // ── From extraction ──
  notice: {
    extraction: CP523Extraction;
    facts: NoticeFact[];
  };

  // ── Deadline ──
  deadline: {
    raw: string | null;
    parsed: string | null;
    certainty: "confirmed" | "derived" | "uncertain" | "missing";
    source: string;
  };

  // ── Installment agreement ──
  installmentAgreement: {
    number: string | null;
    defaultReason: string | null;
    terminationDate: string | null;
  };

  // ── Discrepancies ──
  discrepancies: Discrepancy[];

  // ── Findings ──
  findings: Finding[];

  // ── Evidence ──
  evidence: EvidenceChecklistItem[];

  // ── Research ──
  research: {
    sources: IRSSource[];
    knownFacts: SourceCitation[];
  };

  // ── Strategy ──
  strategy: CP523ResponseStrategy | null;

  // ── Draft ──
  draft: ResponseDraft | null;

  // ── Validation ──
  validation: CP523ValidationResult | null;

  // ── User facts ──
  userFacts: string | null;
  userObjective: string | null;

  // ── Submission ──
  submission: {
    status: "not_started" | "preparing" | "mailed" | "failed";
    method: string | null;
    trackingNumber: string | null;
    proofUrl: string | null;
  };

  // ── Metadata ──
  createdAt: string;
  updatedAt: string;
}

// ── Factory ──────────────────────────────────────────────────

export function createCP523Case(extraction: CP523Extraction): CP523Case {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    version: 1,
    phase: "extraction",
    maturity: "functional",
    notice: {
      extraction,
      facts: extraction.facts,
    },
    deadline: {
      raw: extraction.responseDeadline ?? extraction.cdpHearingDeadline,
      parsed: extraction.responseDeadline ?? extraction.cdpHearingDeadline,
      certainty: (extraction.responseDeadline || extraction.cdpHearingDeadline)
        ? "confirmed" : "missing",
      source: (extraction.responseDeadline || extraction.cdpHearingDeadline)
        ? "Extracted from notice text"
        : "Not found in notice",
    },
    installmentAgreement: {
      number: extraction.installmentAgreementNumber,
      defaultReason: extraction.defaultReason,
      terminationDate: extraction.terminationDate,
    },
    discrepancies: [],
    findings: [],
    evidence: [],
    research: {
      sources: [],
      knownFacts: [],
    },
    strategy: null,
    draft: null,
    validation: null,
    userFacts: null,
    userObjective: null,
    submission: {
      status: "not_started",
      method: null,
      trackingNumber: null,
      proofUrl: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

// ── Case Updates ─────────────────────────────────────────────

export function setCaseAnalysis(
  case_: CP523Case,
  analysis: {
    discrepancies: Discrepancy[];
    findings: Finding[];
    evidence: EvidenceChecklistItem[];
  },
): CP523Case {
  return {
    ...case_,
    phase: "analysis",
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: analysis.evidence,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseStrategy(
  case_: CP523Case,
  strategy: CP523ResponseStrategy,
): CP523Case {
  return {
    ...case_,
    phase: "strategy",
    strategy,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseDraft(
  case_: CP523Case,
  draft: ResponseDraft,
): CP523Case {
  return {
    ...case_,
    phase: "drafting",
    draft,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseValidation(
  case_: CP523Case,
  validation: CP523ValidationResult,
): CP523Case {
  return {
    ...case_,
    phase: "validation",
    validation,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseUserReview(
  case_: CP523Case,
  approved: boolean,
): CP523Case {
  return {
    ...case_,
    phase: approved ? "approved" : "validation",
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseSubmission(
  case_: CP523Case,
  submission: Partial<CP523Case["submission"]>,
): CP523Case {
  return {
    ...case_,
    phase: submission.status === "mailed" ? "submitted" : "mailing",
    submission: { ...case_.submission, ...submission },
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseResearch(
  case_: CP523Case,
  research: {
    sources: IRSSource[];
    knownFacts: SourceCitation[];
  },
): CP523Case {
  return {
    ...case_,
    phase: "analysis",
    research,
    updatedAt: new Date().toISOString(),
  };
}

export function setCaseUserInput(
  case_: CP523Case,
  userFacts: string | null,
  userObjective: string | null,
): CP523Case {
  return {
    ...case_,
    userFacts,
    userObjective,
    updatedAt: new Date().toISOString(),
  };
}

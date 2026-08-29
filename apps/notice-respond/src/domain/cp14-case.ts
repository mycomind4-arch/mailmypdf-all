/* ═══════════════════════════════════════════════════════════
   CP14 CASE MODEL — the typed, versionable structure that
   connects all CP14 analysis components.

   CP14Case
   ├── notice
   ├── deadline
   ├── discrepancies
   ├── findings
   ├── evidence
   ├── research
   ├── responseStrategy
   ├── draft
   ├── validation
   └── submission

   ═══════════════════════════════════════════════════════════ */

import type { CP14Extraction } from "./cp14";
import type { NoticeFact } from "./fact";
import type { Finding } from "./cp14-findings";
import type { CP14Discrepancy } from "./cp14-discrepancy";
import type { CP14EvidenceChecklistItem } from "./cp14-evidence";
import type { CP14ResponseStrategy } from "./cp14-strategy";
import type { SourceCitation, AuthoritativeSource } from "./source-provenance";
import type { ResponseDraft } from "./response";

// ── Case State ───────────────────────────────────────────────

export type CP14CasePhase =
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

export type CP14CaseMaturity = "discovery" | "functional" | "authority";

// ── Validation Result ────────────────────────────────────────

export interface CP14ValidationFinding {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info";
  validator: "factual" | "requirement";
}

export interface CP14ValidationResult {
  factualFindings: CP14ValidationFinding[];
  requirementFindings: CP14ValidationFinding[];
  allFindings: CP14ValidationFinding[];
  passed: boolean;
  errors: number;
  warnings: number;
  blocks: number;
  blocked: boolean;
}

// ── CP14 Case ────────────────────────────────────────────────

export interface CP14Case {
  id: string;
  version: number;
  phase: CP14CasePhase;
  maturity: CP14CaseMaturity;

  // ── From extraction ──
  notice: {
    extraction: CP14Extraction;
    facts: NoticeFact[];
  };

  // ── Deadline ──
  deadline: {
    raw: string | null;
    parsed: string | null;
    certainty: "confirmed" | "derived" | "uncertain" | "missing";
    source: string;
  };

  // ── Discrepancies ──
  discrepancies: CP14Discrepancy[];

  // ── Findings ──
  findings: Finding[];

  // ── Evidence ──
  evidence: CP14EvidenceChecklistItem[];

  // ── Research ──
  research: {
    sources: AuthoritativeSource[];
    knownFacts: SourceCitation[];
  };

  // ── Strategy ──
  strategy: CP14ResponseStrategy | null;

  // ── Draft ──
  draft: ResponseDraft | null;

  // ── Validation ──
  validation: CP14ValidationResult | null;

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

export function createCP14Case(extraction: CP14Extraction): CP14Case {
  const now = new Date().toISOString();
  const deadline = extraction.paymentDeadline ?? extraction.responseDeadline;

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
      raw: deadline,
      parsed: deadline,
      certainty: deadline ? "confirmed" : "missing",
      source: deadline ? "Extracted from notice text" : "Not found in notice",
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

export function setCP14CaseAnalysis(
  case_: CP14Case,
  analysis: {
    discrepancies: CP14Discrepancy[];
    findings: Finding[];
    evidence: CP14EvidenceChecklistItem[];
  },
): CP14Case {
  return {
    ...case_,
    phase: "analysis",
    discrepancies: analysis.discrepancies,
    findings: analysis.findings,
    evidence: analysis.evidence,
    updatedAt: new Date().toISOString(),
  };
}

export function setCP14CaseStrategy(
  case_: CP14Case,
  strategy: CP14ResponseStrategy,
): CP14Case {
  return {
    ...case_,
    phase: "strategy",
    strategy,
    updatedAt: new Date().toISOString(),
  };
}

export function setCP14CaseDraft(
  case_: CP14Case,
  draft: ResponseDraft,
): CP14Case {
  return {
    ...case_,
    phase: "drafting",
    draft,
    updatedAt: new Date().toISOString(),
  };
}

export function setCP14CaseValidation(
  case_: CP14Case,
  validation: CP14ValidationResult,
): CP14Case {
  return {
    ...case_,
    phase: "validation",
    validation,
    updatedAt: new Date().toISOString(),
  };
}

export function setCP14CaseUserReview(
  case_: CP14Case,
  approved: boolean,
): CP14Case {
  return {
    ...case_,
    phase: approved ? "approved" : "validation",
    updatedAt: new Date().toISOString(),
  };
}

export function setCP14CaseSubmission(
  case_: CP14Case,
  submission: Partial<CP14Case["submission"]>,
): CP14Case {
  return {
    ...case_,
    phase: submission.status === "mailed" ? "submitted" : "mailing",
    submission: { ...case_.submission, ...submission },
    updatedAt: new Date().toISOString(),
  };
}

export function setCP14CaseResearch(
  case_: CP14Case,
  research: {
    sources: AuthoritativeSource[];
    knownFacts: SourceCitation[];
  },
): CP14Case {
  return {
    ...case_,
    phase: "analysis",
    research,
    updatedAt: new Date().toISOString(),
  };
}

export function setCP14CaseUserInput(
  case_: CP14Case,
  userFacts: string | null,
  userObjective: string | null,
): CP14Case {
  return {
    ...case_,
    userFacts,
    userObjective,
    updatedAt: new Date().toISOString(),
  };
}

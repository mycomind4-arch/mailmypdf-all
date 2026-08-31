/**
 * G4 — Authority & Freshness Engine: Data Model
 *
 * Canonical authority system for determining:
 *   WHAT authority applies
 *   TO WHICH facts
 *   IN WHICH jurisdiction
 *   FOR WHICH agency
 *   AT WHICH date
 *   UNDER WHICH procedural posture.
 *
 * Design principles:
 * - Never treat a generic website as equivalent to authoritative material.
 * - Never allow an AI model to declare authority authoritative merely because it says so.
 * - Never reduce verification status to one boolean.
 * - If current applicability cannot be established: mark uncertainty and BLOCK when material.
 * - Preserve source provenance and verification timestamps.
 */

// ─── Authority Hierarchy ─────────────────────────────────────────────────────
// Higher level = more authoritative. Never allow lower to outrank higher.

export type AuthorityLevel =
  | 'statute'
  | 'regulation'
  | 'agency_manual'
  | 'form_instructions'
  | 'agency_guidance'
  | 'controlling_authority'
  | 'supporting_material'
  | 'unknown';

export const AUTHORITY_LEVEL_RANK: Record<AuthorityLevel, number> = {
  statute: 7,
  regulation: 6,
  agency_manual: 5,
  form_instructions: 4,
  agency_guidance: 3,
  controlling_authority: 2,
  supporting_material: 1,
  unknown: 0,
};

// ─── Verification Status ─────────────────────────────────────────────────────
// Never collapse these into a single boolean.

export type VerificationStatus =
  | 'verified_current'      // Source is current and applicable.
  | 'verified_conditional'  // Source is current but applicability depends on conditions.
  | 'stale'                 // Source exists but may be outdated.
  | 'superseded'            // Source has been replaced by a newer authority.
  | 'future_effective'      // Source exists but is not yet in effect.
  | 'unverified'            // Source has not been verified for current applicability.
  | 'conflicting'           // Multiple sources disagree.
  | 'unavailable';          // Source could not be retrieved or does not exist.

// ─── Freshness Policy ──────────────────────────────────────────────────────

export type FreshnessPolicy = 'static' | 'annual_review' | 'quarterly_review' | 'monthly_review' | 'event_driven' | 'unknown';

// ─── Authority Source ────────────────────────────────────────────────────────

export interface AuthoritySource {
  id: string;
  sourceType: AuthorityLevel;
  title: string;
  citation: string;
  url?: string;
  issuingAgency: string;
  jurisdiction: 'federal' | 'state' | 'international' | 'unknown';
  authorityLevel: AuthorityLevel;
  publicationDate?: string;   // ISO date
  effectiveDate?: string;      // ISO date
  lastVerified?: string;       // ISO date of last verification
  freshnessPolicy: FreshnessPolicy;
  applicabilityConditions: string[];
  supersedes?: string;         // ID of source this one replaces
  supersededBy?: string;       // ID of source that replaces this one
  verificationStatus: VerificationStatus;
  /** Provenance: how was this source discovered/verified? */
  provenance: AuthorityProvenance;
}

export interface AuthorityProvenance {
  discoveredBy: 'manual' | 'ai_assisted' | 'automated' | 'user_provided' | 'unknown';
  provider?: string;
  model?: string;
  modelVersion?: string;
  promptVersion?: string;
  retrievedAt: string;         // ISO timestamp
  retrievalMethod?: string;
}

// ─── Authority Reference (links authority to a finding) ────────────────────

export interface AuthorityReference {
  sourceId: string;
  citation: string;
  authorityLevel: AuthorityLevel;
  verificationStatus: VerificationStatus;
  applicability: 'direct' | 'analogous' | 'unclear' | 'inapplicable';
  /** Why this authority applies or does not apply. */
  rationale: string;
}

// ─── Authority Resolution Result ───────────────────────────────────────────
// The result of applying authority to a case reasoning output.

export type AuthorityEffect =
  | 'strengthened'    // Authority supports the finding.
  | 'weakened'        // Authority partially undermines the finding.
  | 'revised'         // Authority changes the finding.
  | 'uncertainty_added' // Authority adds uncertainty.
  | 'blocked'         // Authority blocks the finding.
  | 'unchanged';      // Authority does not affect the finding.

export interface AuthorityFinding {
  id: string;
  /** Which detected issue this authority relates to. */
  issueId: string;
  /** The authority references that apply. */
  authorities: AuthorityReference[];
  /** What effect the authority had. */
  effect: AuthorityEffect;
  /** Explanation of the resolution — user-facing, no jargon. */
  explanation: string;
  explanationEs?: string;
  /** Whether this finding is safe to act upon after authority resolution. */
  safeToActUpon: boolean;
  /** Whether the authority is material (blocking if unresolved). */
  material: boolean;
}

// ─── Reconciled Case Reasoning ──────────────────────────────────────────────
// CaseReasoning enriched with authority findings.

import type { CaseReasoning, DetectedIssue, DeadlineFinding, CandidateWorkflow, RejectedWorkflow } from './case-reasoning';

export interface ReconciledCaseReasoning {
  /** The original reasoning from G3. */
  original: CaseReasoning;
  /** Authority findings per issue. */
  authorityFindings: AuthorityFinding[];
  /** Updated issues after authority resolution. */
  reconciledIssues: DetectedIssue[];
  /** Updated deadlines after authority resolution. */
  reconciledDeadlines: DeadlineFinding[];
  /** Updated candidate workflows. */
  reconciledCandidates: CandidateWorkflow[];
  /** Updated rejected workflows. */
  reconciledRejections: RejectedWorkflow[];
  /** Overall safety after authority resolution. */
  safeToActUpon: boolean;
  /** User-facing summary after authority reconciliation. */
  userFacingSummary: string;
  userFacingSummaryEs?: string;
  /** Reasoning history for provenance. */
  history: ReasoningHistoryEntry[];
}

export interface ReasoningHistoryEntry {
  step: 'reasoner' | 'authority_resolution' | 'x_ray';
  timestamp: string;
  summary: string;
  changes: string[];
}

// ─── Provider-Neutral Authority Worker Interface ───────────────────────────

export interface AuthorityWorkerInput {
  caseId: string;
  query: string;
  jurisdiction: string;
  agency: string;
  issueType: string;
  facts: { key: string; value: string }[];
  /** Maximum number of sources to return. */
  maxSources?: number;
}

export interface AuthorityWorkerOutput {
  sources: AuthoritySource[];
  /** What the AI worker found — untrusted until validated. */
  analysis: string;
  /** Confidence of the AI analysis. */
  confidence: number;
  /** Provenance of this worker output. */
  provenance: {
    provider: string;
    model: string;
    modelVersion: string;
    promptVersion: string;
    timestamp: string;
  };
  /** Whether the worker encountered issues. */
  warnings: string[];
}

export interface AuthorityWorker {
  search(input: AuthorityWorkerInput): Promise<AuthorityWorkerOutput>;
  retrieve(sourceId: string): Promise<AuthoritySource | null>;
  verify(source: AuthoritySource): Promise<VerificationStatus>;
  classify(source: AuthoritySource): Promise<AuthorityLevel>;
  compare(sourceA: AuthoritySource, sourceB: AuthoritySource): Promise<'consistent' | 'conflicting' | 'unclear'>;
}

// ─── Helper: compare authority levels ──────────────────────────────────────

export function compareAuthorityLevel(a: AuthorityLevel, b: AuthorityLevel): number {
  return AUTHORITY_LEVEL_RANK[a] - AUTHORITY_LEVEL_RANK[b];
}

// ─── Helper: is this verification status safe to act upon? ──────────────────

export function isSafeStatus(status: VerificationStatus): boolean {
  return status === 'verified_current' || status === 'verified_conditional';
}

// ─── Helper: determine freshness from dates ────────────────────────────────

export function assessFreshness(
  source: AuthoritySource,
  now: string = new Date().toISOString(),
): VerificationStatus {
  // If explicitly superseded, return that
  if (source.supersededBy) return 'superseded';

  // If not yet effective
  if (source.effectiveDate) {
    const effective = new Date(source.effectiveDate).getTime();
    const nowTime = new Date(now).getTime();
    if (effective > nowTime) return 'future_effective';
  }

  // If no publication date and no last verified, it's unverified
  if (!source.publicationDate && !source.lastVerified) return 'unverified';

  // Check staleness based on freshness policy
  const lastCheck = source.lastVerified ?? source.publicationDate;
  if (lastCheck) {
    const ageMs = new Date(now).getTime() - new Date(lastCheck).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    const maxAgeDays: Record<FreshnessPolicy, number> = {
      static: Infinity,
      annual_review: 365,
      quarterly_review: 120,
      monthly_review: 31,
      event_driven: 365, // Conservative default
      unknown: 180,      // Conservative default for unknown policy
    };

    if (ageDays > maxAgeDays[source.freshnessPolicy]) {
      return 'stale';
    }
  }

  // If there are applicability conditions, it's conditional
  if (source.applicabilityConditions.length > 0) {
    return 'verified_conditional';
  }

  return 'verified_current';
}

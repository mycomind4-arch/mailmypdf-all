/**
 * G3 — Immigration Case Reasoner: Data Model
 *
 * This module defines the strongly-typed CaseReasoning structure and the
 * reasoner engine that transforms canonical Case/Intake data into a
 * conservative, evidence-based case analysis.
 *
 * Design principles:
 * - Complexity belongs in the engine, never in the user's face.
 * - Never collapse knowledge states (KNOWN / SUPPORTED / CONDITIONAL /
 *   UNKNOWN / CONTRADICTORY / REQUIRES_REVIEW).
 * - Never convert uncertainty into certainty.
 * - Never invent immigration requirements or legal authority.
 * - Never assume a workflow applies merely because keywords match.
 * - Preserve provenance for every meaningful conclusion.
 * - Fail closed for consequential actions.
 * - Never expose internal workflow IDs to the user.
 */

import type { SupportedLanguage, FactSource, CaseFact, ImmigrationDocument, Deadline } from './immigration-case';
import type { DocumentUnderstanding } from './document-understanding';
import type { LanguageContext } from './multilingual';

// ─── Knowledge States ───────────────────────────────────────────────────────
// These must NEVER be collapsed. Each state has distinct semantics.

export type KnowledgeState =
  | 'KNOWN'          // Fact is established with high confidence from a source.
  | 'SUPPORTED'      // Fact has supporting evidence but needs confirmation.
  | 'CONDITIONAL'    // Fact depends on another fact being true.
  | 'UNKNOWN'        // Fact is not established and not contradicted.
  | 'CONTRADICTORY'  // Multiple sources disagree on this fact.
  | 'REQUIRES_REVIEW'; // Fact needs human review before proceeding.

// ─── Materiality ────────────────────────────────────────────────────────────

export type Materiality = 'NON_MATERIAL' | 'HELPFUL' | 'MATERIAL' | 'BLOCKING';

// ─── Issue Types ─────────────────────────────────────────────────────────────

export type IssueType =
  | 'denial'
  | 'rfe'
  | 'noid'
  | 'rejection'
  | 'deadline'
  | 'evidence_gap'
  | 'status_problem'
  | 'procedural_posture'
  | 'document_discrepancy'
  | 'duplicate_submission'
  | 'missing_evidence'
  | 'contradiction'
  | 'language_barrier'
  | 'fee_issue'
  | 'address_problem'
  | 'appointment'
  | 'unknown';

// ─── Fact Reference ─────────────────────────────────────────────────────────

export interface FactReference {
  factKey: string;
  value: string;
  source: FactSource;
  knowledgeState: KnowledgeState;
}

// ─── Detected Issue ──────────────────────────────────────────────────────────

export interface DetectedIssue {
  id: string;
  issueType: IssueType;
  /** User-facing description — no internal jargon, no workflow IDs. */
  description: string;
  /** Spanish-language description if the user language is Spanish. */
  descriptionEs?: string;
  confidence: number;
  knowledgeState: KnowledgeState;
  supportingFacts: FactReference[];
  contradictingFacts: FactReference[];
  controllingFacts: FactReference[];
  authorityRequirements: string[];
}

// ─── Deadline Finding ────────────────────────────────────────────────────────

export interface DeadlineFinding {
  id: string;
  date: string | null;
  source: 'document' | 'user' | 'inferred' | 'unknown';
  sourceDocument?: string;
  consequence: string;
  confidence: number;
  type: string;
  calculationMethod: 'explicit' | 'calculated' | 'user_stated' | 'inferred' | 'unknown';
  assumptions: string[];
  requiresConfirmation: boolean;
}

// ─── Missing Fact ────────────────────────────────────────────────────────────

export interface MissingFact {
  id: string;
  fact: string;
  whyItMatters: string;
  materiality: Materiality;
  howToObtain: string;
  relatedIssue?: string;
}

// ─── Evidence Gap ────────────────────────────────────────────────────────────

export interface EvidenceGap {
  id: string;
  description: string;
  requiredFor: string;
  howToObtain: string;
}

// ─── Candidate / Rejected Workflows ─────────────────────────────────────────
// Never expose internal workflow IDs. Always present user-facing titles.

export interface CandidateWorkflow {
  userFacingTitle: string;
  fit: 'strong' | 'moderate' | 'weak';
  evidence: FactReference[];
  limitations: string[];
}

export interface RejectedWorkflow {
  userFacingTitle: string;
  reason: string;
}

// ─── Risk ────────────────────────────────────────────────────────────────────

export interface RiskFinding {
  id: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
}

// ─── Uncertainty ─────────────────────────────────────────────────────────────

export interface UncertaintyFinding {
  id: string;
  description: string;
  resolution: string;
  blocking: boolean;
}

// ─── Authority Finding ──────────────────────────────────────────────────────

export interface AuthorityFinding {
  id: string;
  citation: string;
  authorityType: 'statute' | 'regulation' | 'agency_manual' | 'form_instructions' | 'agency_guidance' | 'secondary' | 'unknown';
  applicability: 'direct' | 'analogous' | 'unclear';
  confidence: number;
  freshness: 'current' | 'stale' | 'unknown';
}

// ─── Recommended Next Step ──────────────────────────────────────────────────

export interface RecommendedNextStep {
  action: string;
  explanation: string;
  requiresInformation: string[];
}

// ─── Complete Case Reasoning Output ────────────────────────────────────────

export interface CaseReasoning {
  detectedIssues: DetectedIssue[];
  deadlines: DeadlineFinding[];
  missingFacts: MissingFact[];
  evidenceGaps: EvidenceGap[];
  candidateWorkflows: CandidateWorkflow[];
  incompatibleWorkflows: RejectedWorkflow[];
  risks: RiskFinding[];
  uncertainties: UncertaintyFinding[];
  authorityFindings: AuthorityFinding[];
  recommendedNextStep: RecommendedNextStep;
  language: LanguageContext;
  /** Short user-facing summary — no internal jargon. */
  userFacingSummary: string;
  /** Spanish version of the summary. */
  userFacingSummaryEs?: string;
  /** Whether the reasoning is safe to act upon (no BLOCKING missing facts, no BLOCK uncertainties). */
  safeToActUpon: boolean;
}

// ─── Reasoner Input ─────────────────────────────────────────────────────────
// The reasoner consumes canonical case data + document understandings + user narrative.

export interface ReasonerInput {
  /** The canonical immigration case (from IntakeSession → Case transition). */
  case: {
    id: string;
    facts: CaseFact[];
    deadlines: Deadline[];
    documents: ImmigrationDocument[];
  };
  /** Document understandings from the document-understanding module. */
  documentUnderstandings: DocumentUnderstanding[];
  /** The user's narrative text ("What happened?"). */
  narrative: string;
  /** Language context for multilingual reasoning. */
  language: LanguageContext;
  /** Whether the user explicitly said they're unsure / has no information. */
  userIsUnsure: boolean;
}

// ─── Helper: classify knowledge state from confidence and sources ───────────

export function classifyKnowledgeState(
  confidence: number,
  hasSource: boolean,
  hasContradiction: boolean,
  needsReview: boolean,
): KnowledgeState {
  if (needsReview) return 'REQUIRES_REVIEW';
  if (hasContradiction) return 'CONTRADICTORY';
  if (!hasSource) return 'UNKNOWN';
  if (confidence >= 0.85) return 'KNOWN';
  if (confidence >= 0.5) return 'SUPPORTED';
  return 'CONDITIONAL';
}

// ─── Helper: classify materiality of a missing fact ─────────────────────────

export function classifyMateriality(
  fact: string,
  isDeadlineDependent: boolean,
  isRequiredForWorkflow: boolean,
  isHelpful: boolean,
): Materiality {
  if (isDeadlineDependent) return 'BLOCKING';
  if (isRequiredForWorkflow) return 'MATERIAL';
  if (isHelpful) return 'HELPFUL';
  return 'NON_MATERIAL';
}

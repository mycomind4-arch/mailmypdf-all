import type {
  NameCandidate,
  NameResolutionContext,
  SourceAuthorityAssessment,
} from "../../authority/types";

export type NameResolutionStatus =
  | "resolved"
  | "provisional"
  | "conflicted"
  | "insufficient-evidence";

export interface NameRuleAssessment {
  candidate: NameCandidate;

  authority: SourceAuthorityAssessment;

  /**
   * Whether this candidate may participate in authoritative
   * resolution for the current purpose.
   */
  eligible: boolean;

  reasons: string[];
}

export interface NameResolutionRuleResult {
  status: NameResolutionStatus;

  /**
   * The exact source-preserved value selected by the rule pack,
   * when resolution succeeds.
   */
  authoritativeName?: string;

  selectedSourceId?: string;

  supportingSourceIds: string[];

  conflictingSourceIds: string[];

  confidence: number;

  reasons: string[];

  requiresHumanReview: boolean;
}

export interface NameRulePack {
  /**
   * Stable identifier for diagnostics, provenance, and testing.
   *
   * Example:
   * us-ca-ucc-name-rules-v1
   */
  id: string;

  /**
   * Higher values win when multiple rule packs apply.
   */
  priority: number;

  applies(
    context: NameResolutionContext,
  ): boolean;

  /**
   * Allows jurisdiction/purpose-specific authority assessment.
   *
   * A rule pack may override the generic authority engine where
   * applicable law requires different treatment.
   */
  assessSource?(
    candidate: NameCandidate,
    context: NameResolutionContext,
  ): SourceAuthorityAssessment;

  /**
   * Allows a rule pack to determine whether a particular candidate
   * may participate in authoritative resolution.
   */
  assessCandidate?(
    candidate: NameCandidate,
    context: NameResolutionContext,
  ): NameRuleAssessment;

  /**
   * Optional complete resolution override.
   *
   * Most rule packs should rely on the shared authoritative-name
   * resolver and override only source/candidate treatment.
   */
  resolve?(
    candidates: NameCandidate[],
    context: NameResolutionContext,
  ): NameResolutionRuleResult;

  /**
   * Some legal questions should require human review even when
   * the evidence appears internally consistent.
   */
  requiresHumanReviewWhenResolved?(
    context: NameResolutionContext,
  ): boolean;
}

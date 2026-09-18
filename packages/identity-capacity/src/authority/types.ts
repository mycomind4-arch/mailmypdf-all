export type NameResolutionPurpose =
  | "ucc-debtor-name"
  | "registered-organization-name"
  | "contract-party-name"
  | "property-owner-name"
  | "court-party-name"
  | "identity-reference";

export type ResolutionSubjectKind =
  | "individual"
  | "registered-organization"
  | "unregistered-organization"
  | "sole-proprietorship"
  | "partnership"
  | "trust"
  | "estate"
  | "unknown";

export type NameSourceType =
  | "public-organic-record"
  | "business-registry"
  | "drivers-license"
  | "passport"
  | "birth-record"
  | "court-order"
  | "trust-instrument"
  | "estate-record"
  | "letters-testamentary"
  | "letters-administration"
  | "contract"
  | "property-record"
  | "certificate-of-title"
  | "bank-record"
  | "tax-record"
  | "invoice"
  | "website"
  | "user-statement"
  | "other";

export interface NameCandidateSource {
  sourceId: string;

  sourceType: NameSourceType;

  jurisdiction?: string;

  issuingAuthority?: string;

  issuedAt?: string;

  expiresAt?: string;

  observedAt?: string;
}

export interface NameCandidate {
  /**
   * Name exactly as represented by the source.
   */
  value: string;

  source: NameCandidateSource;
}

export type AuthorityTier =
  | "controlling"
  | "strong"
  | "supporting"
  | "weak"
  | "irrelevant";

export interface SourceAuthorityAssessment {
  sourceId: string;

  /**
   * Authority is contextual.
   *
   * A source may be controlling for one question
   * and merely supporting for another.
   */
  tier: AuthorityTier;

  /**
   * Deterministic 0-100 ranking within the applicable
   * rule pack. This is not an AI confidence score.
   */
  score: number;

  reasonCode: string;

  explanation: string;
}

export interface NameResolutionContext {
  /**
   * The legal/factual question being answered.
   *
   * Source authority must never be ranked without knowing
   * the purpose for which the name is being resolved.
   */
  purpose: NameResolutionPurpose;

  /**
   * Canonical jurisdiction identifier.
   *
   * Example:
   * US-CA
   */
  jurisdiction: string;

  subjectKind: ResolutionSubjectKind;

  /**
   * Optional deterministic point in time.
   *
   * Useful where records expire, change, or are superseded.
   */
  asOf?: string;
}

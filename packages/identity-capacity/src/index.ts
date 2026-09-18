export type {
  NameKindHint,
  NameComparisonDisposition,
  NormalizedName,
  NameComparison,
} from "./name-normalization.js";
export {
  normalizeName,
  compareNormalizedNames,
} from "./name-normalization.js";

export type {
  SourceAuthorityTier,
  SourceType,
  AuthoritySource,
  SourceAuthorityContext,
  SourceAuthorityRule,
  SourceAuthorityEvaluation,
} from "./source-authority.js";
export {
  DEFAULT_SOURCE_AUTHORITY_RULES,
  evaluateSourceAuthority,
} from "./source-authority.js";

export type {
  AuthoritativeNameDisposition,
  AuthoritativeNameCandidate,
  EvaluatedNameCandidate,
  NameConflict,
  AuthoritativeNameResolution,
} from "./authoritative-name.js";
export {
  resolveAuthoritativeName,
  authoritativeNameResolutionToFinding,
} from "./authoritative-name.js";

export type {
  EntityClassification,
  EntityClassificationDisposition,
  EntityClassificationSignal,
  EvaluatedEntityClassificationSignal,
  EntityClassificationResult,
} from "./entity-classification.js";
export {
  ENTITY_CLASSIFICATION_RULES,
  resolveEntityClassification,
  entityClassificationToFinding,
} from "./entity-classification.js";

export type {
  Capacity,
  CapacityResolutionDisposition,
  CapacityClaim,
  EvaluatedCapacityClaim,
  ResolvedCapacity,
  CapacityResolutionResult,
} from "./capacity-resolution.js";
export {
  CAPACITY_RESOLUTION_RULES,
  resolveCapacity,
  capacityResolutionToFinding,
} from "./capacity-resolution.js";

export type {
  AuthorizationEffect,
  AuthorityToActDisposition,
  AuthorityAction,
  AuthorizationEvidence,
  EvaluatedAuthorizationEvidence,
  AuthorityToActResult,
} from "./authority-to-act.js";
export {
  AUTHORITY_TO_ACT_RULES,
  resolveAuthorityToAct,
  authorityToActToFinding,
} from "./authority-to-act.js";

export type {
  AssetInterestType,
  OwnershipClaimEffect,
  OwnershipRightsDisposition,
  AssetInterestClaim,
  EvaluatedAssetInterestClaim,
  ResolvedAssetInterest,
  OwnershipRightsResult,
} from "./ownership-rights.js";
export {
  OWNERSHIP_RIGHTS_RULES,
  resolveOwnershipRights,
  ownershipRightsToFinding,
} from "./ownership-rights.js";

export type {
  ObligationTermField,
  ObligationTermValue,
  ObligationTermEffect,
  ObligationResolutionDisposition,
  ObligationTermClaim,
  EvaluatedObligationTermClaim,
  ResolvedObligationTerm,
  ObligationResolutionResult,
} from "./obligation-resolution.js";
export {
  OBLIGATION_RESOLUTION_RULES,
  resolveObligation,
  obligationResolutionToFinding,
} from "./obligation-resolution.js";

export type {
  PartyRole,
  PartyRoleEffect,
  PartyRoleResolutionDisposition,
  PartyRoleClaim,
  EvaluatedPartyRoleClaim,
  ResolvedPartyRole,
  PartyRoleResolutionResult,
} from "./party-role-resolution.js";
export {
  PARTY_ROLE_RULES,
  resolvePartyRoles,
  partyRoleClaimsFromObligation,
  partyRoleClaimsFromOwnership,
  partyRoleClaimsFromCapacity,
  partyRoleResolutionToFinding,
} from "./party-role-resolution.js";

export type {
  JurisdictionBasis,
  JurisdictionClaimEffect,
  JurisdictionCardinality,
  JurisdictionResolutionDisposition,
  JurisdictionCandidate,
  JurisdictionResolutionPolicy,
  JurisdictionPolicyAuthorityValue,
  EvaluatedJurisdictionCandidate,
  ResolvedJurisdiction,
  JurisdictionResolutionResult,
} from "./jurisdiction-resolution.js";
export {
  JURISDICTION_SOURCE_RULES,
  validateJurisdictionPolicy,
  jurisdictionPolicyFromAuthorityRule,
  resolveJurisdiction,
  jurisdictionResolutionToFinding,
} from "./jurisdiction-resolution.js";

export type {
  NameCapacityCertificationStatus,
  CertificationSearchRequirement,
  CertificationSearchCoverage,
  NameCapacityCertificationPolicy,
  CertificationCheck,
  NameCapacityCertification,
} from "./name-capacity-certification.js";
export {
  validateNameCapacityCertificationPolicy,
  certifyNameAndCapacity,
  nameCapacityCertificationToFinding,
} from "./name-capacity-certification.js";

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

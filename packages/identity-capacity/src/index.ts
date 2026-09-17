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

/**
 * @mailmypdf/intelligence
 *
 * Unified intelligence relationship architecture for the MailMyPDF ecosystem.
 *
 * Public API:
 *   ProvenanceLevel, ProvenanceRecord, createProvenance, verifyProvenance
 *   Entity, createEntity, verifyEntity, validateEntity, addAlias, matchesName
 *   Fact, FactStatus, createFact, verifyFact, supersedeFact, disputeFact, retractFact, validateFact
 *   Relationship, IntelligenceType, createRelationship, verifyRelationship, retractRelationship
 *   validateRelationship, isDuplicate, deduplicateRelationships
 *   traverseBFS, relationshipsFrom, relationshipsTo, relationshipsOfType
 *
 *   EvidenceItem, EvidencePacket, EvidenceEvaluation, createEvidence, evaluateEvidence
 *   evidenceForClaim, isDuplicateEvidence, deduplicateEvidence
 *   Contradiction, detectContradictions, resolveContradiction, sortBySeverity
 *
 * Re-exports from @mailmypdf/core: PlatformId, Confidence, createId, confidence
 * Re-exports from @mailmypdf/documents: SourceRef, createSourceRef
 */

// ── Provenance (foundation) ───────────────────────────────────────────────────
export type {
  ProvenanceLevel,
  ProvenanceRecord,
  IntelligenceObject,
} from "./provenance.js";
export {
  ALL_PROVENANCE_LEVELS,
  PROVENANCE_STRENGTH,
  isAutoTrusted,
  canPresentWithoutDisclaimer,
  strongerProvenance,
  createProvenance,
  verifyProvenance,
} from "./provenance.js";

// ── Entity ────────────────────────────────────────────────────────────────────
export type { Entity, EntityStatus } from "./entity.js";
export {
  MAX_ENTITY_NAME_LENGTH,
  MAX_ENTITY_TYPE_LENGTH,
  MAX_ALIASES,
  createEntity,
  verifyEntity,
  mergeEntity,
  deprecateEntity,
  validateEntity,
  addAlias,
  matchesName,
  findByType,
} from "./entity.js";

// ── Fact ──────────────────────────────────────────────────────────────────────
export type { Fact, FactStatus } from "./fact.js";
export {
  MAX_SUBJECT_LENGTH,
  MAX_PREDICATE_LENGTH,
  MAX_VALUE_LENGTH,
  createFact,
  verifyFact,
  supersedeFact,
  disputeFact,
  retractFact,
  validateFact,
  isFactActive,
  isFactSuperseded,
  isFactDisputed,
  isFactRetracted,
  factsBySubject,
  factsByPredicate,
  findConflictingFacts,
} from "./fact.js";

// ── Relationship ──────────────────────────────────────────────────────────────
export type { Relationship, RelationshipStatus, IntelligenceType } from "./relationship.js";
export {
  MAX_RELATIONSHIP_TYPE_LENGTH,
  createRelationship,
  verifyRelationship,
  retractRelationship,
  validateRelationship,
  isDuplicate,
  deduplicateRelationships,
  relationshipsFrom,
  relationshipsTo,
  relationshipsOfType,
  traverseBFS,
} from "./relationship.js";


// ── Evidence ──────────────────────────────────────────────────────────────────
export type { EvidenceItem, EvidenceStatus, EvidencePacket, EvidenceEvaluation, EvidenceRelation } from "./evidence.js";
export {
  ALL_EVIDENCE_RELATIONS,
  RELATION_STRENGTH,
  MAX_EXPLANATION_LENGTH,
  MAX_EVIDENCE_ID_LENGTH,
  createEvidence,
  verifyEvidence,
  retractEvidence,
  supersedeEvidence,
  validateEvidence,
  createEvidencePacket,
  activeItems,
  supportingItems,
  contradictingItems,
  qualifyingItems,
  missingItems,
  evaluateEvidence,
  evidenceForClaim,
  hasContradictions,
  hasGaps,
  PROVENANCE_WEIGHT,
  MAX_EVIDENCE_ITEMS,
  isDuplicateEvidence,
  deduplicateEvidence,
} from "./evidence.js";


// ── Contradiction ─────────────────────────────────────────────────────────────
export type { Contradiction, ContradictionSeverity, ReviewStatus, Resolution, DetectionType } from "./contradiction.js";
export {
  ALL_SEVERITY_LEVELS,
  SEVERITY_WEIGHT,
  MAX_CONTRADICTION_EXPLANATION,
  MAX_CONFLICT_SUBJECT,
  MAX_CONFLICT_PREDICATE,
  MAX_FACTS_FOR_DETECTION,
  MAX_PAIRS_PER_GROUP,
  createContradiction,
  reviewContradiction,
  resolveContradiction,
  validateContradiction,
  isUnreviewed,
  isReviewed,
  isResolved,
  isCritical,
  isMajor,
  isMinor,
  isConfirmed,
  isPotential,
  contradictionsForFact,
  unresolvedContradictions,
  criticalContradictions,
  confirmedContradictions,
  potentialContradictions,
  classifyPredicate,
  detectContradictions,
  sortBySeverity,
  sortByReviewStatus,
} from "./contradiction.js";


// ── Finding ───────────────────────────────────────────────────────────────────
export type { Finding, FindingSeverity, FindingStatus } from "./finding.js";
export {
  ALL_FINDING_SEVERITIES,
  FINDING_SEVERITY_WEIGHT,
  MAX_FINDING_TYPE_LENGTH,
  MAX_FINDING_EXPLANATION_LENGTH,
  MAX_RECOMMENDED_ACTION_LENGTH,
  MAX_DERIVATION_REFS,
  createFinding,
  verifyFinding,
  supersedeFinding,
  retractFinding,
  validateFinding,
  isFindingActive,
  isFindingSuperseded,
  isFindingRetracted,
  isFindingCritical,
  isFindingMajor,
  isFindingMinor,
  isFindingInfo,
  findingsForEntity,
  findingsForFact,
  criticalFindings,
  unresolvedFindings,
  sortFindingsBySeverity,
  sortFindingsByConfidence,
} from "./finding.js";


// ── Timeline ──────────────────────────────────────────────────────────────────
export type { TimelineEvent, EventIntegrity, DatePrecision, Timeline, TimelineGap } from "./timeline.js";
export {
  ALL_EVENT_INTEGRITIES,
  ALL_DATE_PRECISIONS,
  INTEGRITY_STRENGTH,
  MAX_EVENT_TYPE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_CASE_ID_LENGTH,
  MAX_EVENTS_FOR_TIMELINE,
  MAX_DATE_LENGTH,
  createTimelineEvent,
  verifyTimelineEvent,
  retractTimelineEvent,
  validateTimelineEvent,
  eventIdentityHash,
  findDuplicateEvents,
  createTimeline,
  activeEvents,
  sortedByDate,
  eventsByType,
  eventsOfType,
  detectGaps,
  conflictingDates,
  sortByIntegrity,
  sortByPrecision,
} from "./timeline.js";


// ── Deadline ──────────────────────────────────────────────────────────────────
export type { CalendarType, HolidayCalendar, TemporalConstraint, DeadlineRule, DeadlineResult, DeadlineStatus } from "./deadline.js";
export {
  MAX_TRIGGER_EVENT_TYPE,
  MAX_DAYS,
  MAX_RULE_NAME,
  MAX_RULE_DESCRIPTION,
  MAX_AUTHORITY,
  MAX_VERSION,
  createTemporalConstraint,
  validateTemporalConstraint,
  createDeadlineRule,
  validateDeadlineRule,
  computeDeadline,
  computeAllDeadlines,
  getDeadlineStatus,
  deadlineResultToTimelineEvent,
} from "./deadline.js";


// ── Risk ──────────────────────────────────────────────────────────────────────
export type { RiskLevel, RiskFactor, RiskAssessment, RiskAssessmentInput } from "./risk.js";
export {
  ALL_RISK_LEVELS,
  RISK_LEVEL_WEIGHT,
  MAX_FACTOR_DESCRIPTION,
  MAX_FACTORS_PER_ASSESSMENT,
  MAX_SUMMARY_LENGTH,
  computeRiskAssessment,
  validateRiskAssessment,
  isCriticalRisk,
  isHighRisk,
  isLowRisk,
  isUnknownRisk,
  criticalFactors,
  highFactors,
  explainFactor,
  explainAssessment,
} from "./risk.js";

// ── Re-exports from dependencies ──────────────────────────────────────────────
export type { PlatformId, Confidence } from "@mailmypdf/core";
export { createId, confidence } from "@mailmypdf/core";
export type { SourceRef } from "@mailmypdf/documents";
export { createSourceRef } from "@mailmypdf/documents";

// ═══════════════════════════════════════════════════════════════════════════════
// CASE ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  CaseStatus,
  ActionPriority,
  ActionStatus,
  RecommendedAction,
  CreateRecommendedActionInput,
  ReadinessCheck,
  ReadinessResult,
  CaseAssessment,
  CaseAssessmentInput,
} from "./case-assessment.js";

export {
  ALL_CASE_STATUSES,
  ALL_ACTION_PRIORITIES,
  ACTION_PRIORITY_WEIGHT,
  MAX_ACTION_DESCRIPTION,
  MAX_EXPECTED_OUTCOME,
  MAX_ACTION_TYPE,
  MAX_CHECK_LABEL,
  MAX_CHECK_DESCRIPTION,
  READINESS_THRESHOLD,
  MAX_ASSESSMENT_SUMMARY,
  createRecommendedAction,
  completeAction,
  dismissAction,
  isActionPending,
  isActionCompleted,
  validateRecommendedAction,
  createReadinessCheck,
  computeCaseAssessment,
  validateCaseAssessment,
  pendingActions,
  criticalActions,
  highPriorityActions,
  failedChecks,
  warningChecks,
  isCaseReady,
  isActionRequired,
  explainAssessment as explainCaseAssessment,
} from "./case-assessment.js";

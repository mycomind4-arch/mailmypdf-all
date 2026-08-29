/**
 * @platform/intelligence — Reusable intelligence primitives.
 *
 * Adapted from mailmypdf-platform/packages/intelligence.
 * Provides evidence evaluation, contradiction detection, finding management,
 * and case assessment patterns that Benefits Appeal's stress test and review
 * engine build on top of.
 */

import {
  type Confidence,
  type Result,
  type PlatformId,
  createId,
  confidence as mkConfidence,
  ok,
  err,
  validateNonEmpty,
  validateMaxLength,
  ValidationError,
} from "./core";
import type { SourceRef } from "./documents";

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE
// ═══════════════════════════════════════════════════════════════════════════════

export type ProvenanceLevel =
  | "human_verified"
  | "document_extracted"
  | "external_source"
  | "rule_derived"
  | "user_provided"
  | "ai_inferred";

export const ALL_PROVENANCE_LEVELS: readonly ProvenanceLevel[] = [
  "human_verified",
  "document_extracted",
  "external_source",
  "rule_derived",
  "user_provided",
  "ai_inferred",
] as const;

export const PROVENANCE_STRENGTH: Readonly<Record<ProvenanceLevel, number>> = {
  human_verified: 1.0,
  document_extracted: 0.9,
  external_source: 0.7,
  rule_derived: 0.7,
  user_provided: 0.5,
  ai_inferred: 0.3,
} as const;

export interface ProvenanceRecord {
  readonly level: ProvenanceLevel;
  readonly sourceRefs: readonly SourceRef[];
  readonly verified: boolean;
  readonly verifiedBy?: string;
  readonly modelId?: string;
  readonly ruleId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function isAutoTrusted(level: ProvenanceLevel): boolean {
  return level === "human_verified" || level === "document_extracted";
}

export function canPresentWithoutDisclaimer(level: ProvenanceLevel): boolean {
  return level === "human_verified";
}

export function strongerProvenance(a: ProvenanceLevel, b: ProvenanceLevel): ProvenanceLevel {
  return PROVENANCE_STRENGTH[a] >= PROVENANCE_STRENGTH[b] ? a : b;
}

export interface IntelligenceObject {
  readonly id: PlatformId;
  readonly provenance: ProvenanceRecord;
  readonly confidence: Confidence;
  readonly verified: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createProvenance(input: {
  level: ProvenanceLevel;
  sourceRefs?: readonly SourceRef[];
  modelId?: string;
  verifiedBy?: string;
  ruleId?: string;
}): ProvenanceRecord {
  const now = new Date().toISOString();
  return {
    level: input.level,
    sourceRefs: input.sourceRefs ?? [],
    verified: !!input.verifiedBy,
    verifiedBy: input.verifiedBy,
    modelId: input.modelId,
    ruleId: input.ruleId,
    createdAt: now,
    updatedAt: now,
  };
}

export function verifyProvenance(provenance: ProvenanceRecord, verifiedBy: string): ProvenanceRecord {
  return { ...provenance, verified: true, verifiedBy, updatedAt: new Date().toISOString() };
}

export function verifyProvenanceLevel(level: ProvenanceLevel): boolean {
  return (ALL_PROVENANCE_LEVELS as readonly string[]).includes(level);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export type EvidenceRelation = "supports" | "contradicts" | "qualifies" | "missing";

export const ALL_EVIDENCE_RELATIONS: readonly EvidenceRelation[] = [
  "supports", "contradicts", "qualifies", "missing",
] as const;

export const RELATION_STRENGTH: Readonly<Record<EvidenceRelation, number>> = {
  supports: 1.0,
  contradicts: -1.0,
  qualifies: 0.5,
  missing: 0.0,
} as const;

export const PROVENANCE_WEIGHT: Readonly<Record<ProvenanceLevel, number>> = {
  human_verified: 1.0,
  document_extracted: 0.9,
  external_source: 0.7,
  rule_derived: 0.7,
  user_provided: 0.5,
  ai_inferred: 0.3,
} as const;

export const MAX_EVIDENCE_ITEMS = 500;

export interface EvidenceItem extends IntelligenceObject {
  readonly claimId: string;
  readonly relation: EvidenceRelation;
  readonly evidenceType: "document" | "fact" | "entity" | "external";
  readonly evidenceId: string;
  readonly explanation?: string;
  readonly status: "active" | "retracted" | "superseded";
  readonly supersededBy?: string;
}

export const MAX_EXPLANATION_LENGTH = 2000;
export const MAX_EVIDENCE_ID_LENGTH = 200;

export interface CreateEvidenceInput {
  id?: string;
  claimId: string;
  relation: EvidenceRelation;
  evidenceType: "document" | "fact" | "entity" | "external";
  evidenceId: string;
  explanation?: string;
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    verifiedBy?: string;
    ruleId?: string;
  };
  confidence?: number;
}

export function createEvidence(input: CreateEvidenceInput): EvidenceItem {
  const claimCheck = validateNonEmpty(input.claimId, "claimId");
  if (!claimCheck.ok) throw claimCheck.error;

  const evidenceIdCheck = validateNonEmpty(input.evidenceId, "evidenceId");
  if (!evidenceIdCheck.ok) throw evidenceIdCheck.error;

  if (input.explanation !== undefined) {
    const explLen = validateMaxLength(input.explanation, "explanation", MAX_EXPLANATION_LENGTH);
    if (!explLen.ok) throw explLen.error;
  }

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.5);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    claimId: input.claimId,
    relation: input.relation,
    evidenceType: input.evidenceType,
    evidenceId: input.evidenceId,
    explanation: input.explanation,
    status: "active",
    provenance: prov,
    confidence: conf,
    verified: prov.level === "human_verified",
    createdAt: now,
    updatedAt: now,
  };
}

export function validateEvidence(evidence: EvidenceItem): Result<void, ValidationError> {
  if (!evidence.claimId || evidence.claimId.trim().length === 0) {
    return err(new ValidationError("Evidence claimId must not be empty"));
  }
  if (!evidence.evidenceId || evidence.evidenceId.trim().length === 0) {
    return err(new ValidationError("Evidence evidenceId must not be empty"));
  }
  if (evidence.confidence < 0 || evidence.confidence > 1) {
    return err(new ValidationError("Evidence confidence must be between 0 and 1"));
  }
  return ok(undefined);
}

export interface EvidencePacket {
  readonly claimId: string;
  readonly items: readonly EvidenceItem[];
}

export function createEvidencePacket(claimId: string, items: readonly EvidenceItem[]): EvidencePacket {
  if (items.length > MAX_EVIDENCE_ITEMS) {
    throw new Error(`Evidence packet exceeds maximum of ${MAX_EVIDENCE_ITEMS} items`);
  }
  return { claimId, items };
}

export function activeItems(packet: EvidencePacket): readonly EvidenceItem[] {
  return packet.items.filter((e) => e.status === "active");
}

export function supportingItems(packet: EvidencePacket): readonly EvidenceItem[] {
  return activeItems(packet).filter((e) => e.relation === "supports");
}

export function contradictingItems(packet: EvidencePacket): readonly EvidenceItem[] {
  return activeItems(packet).filter((e) => e.relation === "contradicts");
}

export function missingItems(packet: EvidencePacket): readonly EvidenceItem[] {
  return activeItems(packet).filter((e) => e.relation === "missing");
}

export function hasContradictions(packet: EvidencePacket): boolean {
  return contradictingItems(packet).length > 0;
}

export function hasGaps(packet: EvidencePacket): boolean {
  return missingItems(packet).length > 0;
}

export interface EvidenceEvaluation {
  readonly claimId: string;
  readonly totalItems: number;
  readonly supportCount: number;
  readonly contradictCount: number;
  readonly qualifyCount: number;
  readonly missingCount: number;
  readonly weightedScore: number;
  readonly hasContradictions: boolean;
  readonly hasGaps: boolean;
  readonly strongestProvenance: ProvenanceLevel | null;
  readonly summary: string;
}

export function evaluateEvidence(packet: EvidencePacket): EvidenceEvaluation {
  const items = activeItems(packet);
  const supporting = items.filter((e) => e.relation === "supports");
  const contradicting = items.filter((e) => e.relation === "contradicts");
  const qualifying = items.filter((e) => e.relation === "qualifies");
  const missing = items.filter((e) => e.relation === "missing");

  let weightedScore = 0;
  for (const item of items) {
    const relationWeight = RELATION_STRENGTH[item.relation];
    const provWeight = PROVENANCE_WEIGHT[item.provenance.level] ?? 0.5;
    const conf = item.confidence;
    weightedScore += relationWeight * provWeight * conf;
  }

  let strongest: ProvenanceLevel | null = null;
  let strongestWeight = 0;
  for (const item of items) {
    const w = PROVENANCE_WEIGHT[item.provenance.level] ?? 0;
    if (w > strongestWeight) {
      strongestWeight = w;
      strongest = item.provenance.level;
    }
  }

  const hasContra = contradicting.length > 0;
  const hasGap = missing.length > 0;

  let summary: string;
  if (items.length === 0) {
    summary = "No evidence items for this claim.";
  } else if (hasContra && contradicting.length >= supporting.length) {
    summary = `Evidence is contradictory: ${contradicting.length} contradicting vs ${supporting.length} supporting items.`;
  } else if (hasGap && supporting.length === 0) {
    summary = `Evidence is missing: ${missing.length} expected items absent.`;
  } else if (supporting.length > 0 && !hasContra) {
    summary = `Evidence is supportive: ${supporting.length} supporting item(s), no contradictions.`;
  } else {
    summary = `Mixed evidence: ${supporting.length} supporting, ${contradicting.length} contradicting, ${qualifying.length} qualifying.`;
  }

  return {
    claimId: packet.claimId,
    totalItems: items.length,
    supportCount: supporting.length,
    contradictCount: contradicting.length,
    qualifyCount: qualifying.length,
    missingCount: missing.length,
    weightedScore,
    hasContradictions: hasContra,
    hasGaps: hasGap,
    strongestProvenance: strongest,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type ContradictionSeverity = "critical" | "major" | "minor";
export type DetectionType = "confirmed" | "potential";
export type ReviewStatus = "unreviewed" | "reviewed" | "resolved";
export type Resolution = "factA_accepted" | "factB_accepted" | "both_preserved" | "both_rejected";

export const ALL_SEVERITY_LEVELS: readonly ContradictionSeverity[] = ["critical", "major", "minor"] as const;

export const SEVERITY_WEIGHT: Readonly<Record<ContradictionSeverity, number>> = {
  critical: 3,
  major: 2,
  minor: 1,
} as const;

const SINGULAR_PREDICATES = new Set([
  "has_deadline", "deadline", "response_deadline", "filing_deadline",
  "has_amount", "amount", "debt_amount", "payment_amount", "balance",
  "has_date", "filing_date", "hearing_date", "decision_date", "birth_date",
  "case_number", "account_number", "filing_fee",
  "debt_owed", "eligibility", "status",
]);

const MULTI_VALUED_PREDICATES = new Set([
  "address", "previous_address", "phone", "email",
  "employer", "income", "salary", "occupation",
  "name", "alias", "spouse_name",
]);

export function classifyPredicate(predicate: string): DetectionType {
  const lower = predicate.toLowerCase();
  if (SINGULAR_PREDICATES.has(lower)) return "confirmed";
  if (MULTI_VALUED_PREDICATES.has(lower)) return "potential";
  return "potential";
}

export interface ContradictionRecord extends IntelligenceObject {
  readonly factAId: string;
  readonly factBId: string;
  readonly conflictSubject: string;
  readonly conflictPredicate: string;
  readonly factAValue: string;
  readonly factBValue: string;
  readonly severity: ContradictionSeverity;
  readonly detectionType: DetectionType;
  readonly reviewStatus: ReviewStatus;
  readonly resolution?: Resolution;
  readonly explanation?: string;
  readonly reviewedBy?: string;
}

export function createContradiction(input: {
  id?: string;
  factAId: string;
  factBId: string;
  conflictSubject: string;
  conflictPredicate: string;
  factAValue: string;
  factBValue: string;
  severity: ContradictionSeverity;
  detectionType?: DetectionType;
  explanation?: string;
  provenance: { level: ProvenanceLevel; sourceRefs?: readonly SourceRef[]; modelId?: string; verifiedBy?: string; ruleId?: string };
  confidence?: number;
}): ContradictionRecord {
  if (input.factAId === input.factBId) {
    throw new Error("Cannot create a contradiction between a fact and itself");
  }
  if (!ALL_SEVERITY_LEVELS.includes(input.severity)) {
    throw new Error(`Invalid contradiction severity: ${input.severity}`);
  }

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.7);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    factAId: input.factAId,
    factBId: input.factBId,
    conflictSubject: input.conflictSubject,
    conflictPredicate: input.conflictPredicate,
    factAValue: input.factAValue,
    factBValue: input.factBValue,
    severity: input.severity,
    detectionType: input.detectionType ?? "potential",
    reviewStatus: "unreviewed",
    provenance: prov,
    confidence: conf,
    verified: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function isCritical(c: ContradictionRecord): boolean { return c.severity === "critical"; }
export function isMajor(c: ContradictionRecord): boolean { return c.severity === "major"; }
export function isUnreviewed(c: ContradictionRecord): boolean { return c.reviewStatus === "unreviewed"; }
export function isResolved(c: ContradictionRecord): boolean { return c.reviewStatus === "resolved"; }

export function sortBySeverity(contradictions: readonly ContradictionRecord[]): ContradictionRecord[] {
  return [...contradictions].sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
}

export function unresolvedContradictions(contradictions: readonly ContradictionRecord[]): ContradictionRecord[] {
  return contradictions.filter((c) => c.reviewStatus !== "resolved");
}

export function criticalContradictions(contradictions: readonly ContradictionRecord[]): ContradictionRecord[] {
  return contradictions.filter(isCritical);
}

export interface FactInput {
  id: string;
  subject: string;
  predicate: string;
  value: string;
}

export function detectContradictions(facts: readonly FactInput[], provenanceLevel: ProvenanceLevel = "document_extracted"): ContradictionRecord[] {
  const contradictions: ContradictionRecord[] = [];
  const maxFacts = Math.min(facts.length, 1000);

  // Group by subject + predicate
  const groups = new Map<string, FactInput[]>();
  for (let i = 0; i < maxFacts; i++) {
    const fact = facts[i]!;
    const key = `${fact.subject}::${fact.predicate}`;
    const group = groups.get(key);
    if (group) group.push(fact);
    else groups.set(key, [fact]);
  }

  for (const [key, groupFacts] of groups) {
    if (groupFacts.length < 2) continue;
    const [subject, predicate] = key.split("::");
    const detectionType = classifyPredicate(predicate);

    for (let i = 0; i < groupFacts.length && i < 50; i++) {
      for (let j = i + 1; j < groupFacts.length && j < 50; j++) {
        const fA = groupFacts[i]!;
        const fB = groupFacts[j]!;
        if (fA.value === fB.value) continue;

        const severity: ContradictionSeverity =
          detectionType === "confirmed" && SINGULAR_PREDICATES.has(predicate.toLowerCase())
            ? "critical"
            : "major";

        contradictions.push(createContradiction({
          factAId: fA.id,
          factBId: fB.id,
          conflictSubject: subject,
          conflictPredicate: predicate,
          factAValue: fA.value,
          factBValue: fB.value,
          severity,
          detectionType,
          provenance: { level: provenanceLevel },
        }));
      }
    }
  }

  return contradictions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

export type CaseStatus = "draft" | "in_review" | "ready" | "action_required" | "submitted" | "archived";
export type ActionPriority = "critical" | "high" | "medium" | "low";
export type ActionStatus = "pending" | "completed" | "dismissed";
export type CheckStatus = "pass" | "warning" | "fail";

export const ALL_ACTION_PRIORITIES: readonly ActionPriority[] = ["critical", "high", "medium", "low"] as const;
export const ACTION_PRIORITY_WEIGHT: Readonly<Record<ActionPriority, number>> = {
  critical: 4, high: 3, medium: 2, low: 1,
} as const;

export const READINESS_THRESHOLD = 60;

export interface RecommendedAction {
  readonly id: string;
  readonly actionType: string;
  readonly priority: ActionPriority;
  readonly description: string;
  readonly expectedOutcome: string;
  readonly status: ActionStatus;
  readonly relatedFindingIds?: readonly string[];
  readonly relatedContradictionIds?: readonly string[];
  readonly relatedEvidenceIds?: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReadinessCheckInput {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly status: CheckStatus;
  readonly detail?: string;
  readonly fixAction?: string;
}

export interface ReadinessCheckResult {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly status: CheckStatus;
  readonly detail?: string;
  readonly fixAction?: string;
}

export interface ReadinessResult {
  readonly score: number;
  readonly checks: readonly ReadinessCheckResult[];
  readonly issuesRequiringAttention: number;
  readonly ready: boolean;
}

export interface CaseAssessment {
  readonly status: CaseStatus;
  readonly readiness: ReadinessResult;
  readonly recommendedActions: readonly RecommendedAction[];
  readonly summary: string;
  readonly assessedAt: string;
}

export function createReadinessCheck(input: ReadinessCheckInput): ReadinessCheckResult {
  return {
    id: input.id,
    label: input.label,
    description: input.description,
    status: input.status,
    detail: input.detail,
    fixAction: input.fixAction,
  };
}

export function computeReadiness(checks: readonly ReadinessCheckResult[]): ReadinessResult {
  const fails = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const score = Math.max(0, 100 - fails * 20 - warnings * 8);
  const issuesRequiringAttention = fails + warnings;
  const ready = score >= READINESS_THRESHOLD && fails === 0;

  return { score, checks, issuesRequiringAttention, ready };
}

export function pendingActions(actions: readonly RecommendedAction[]): RecommendedAction[] {
  return actions.filter((a) => a.status === "pending");
}

export function criticalActions(actions: readonly RecommendedAction[]): RecommendedAction[] {
  return actions.filter((a) => a.priority === "critical" && a.status === "pending");
}

export function highPriorityActions(actions: readonly RecommendedAction[]): RecommendedAction[] {
  return actions.filter((a) => a.priority === "high" && a.status === "pending");
}

export function failedChecks(checks: readonly ReadinessCheckResult[]): ReadinessCheckResult[] {
  return checks.filter((c) => c.status === "fail");
}

export function warningChecks(checks: readonly ReadinessCheckResult[]): ReadinessCheckResult[] {
  return checks.filter((c) => c.status === "warning");
}

export function isCaseReady(assessment: CaseAssessment): boolean {
  return assessment.status === "ready" && assessment.readiness.ready;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type AuditEventType =
  | "appeal.created"
  | "appeal.updated"
  | "appeal.deleted"
  | "appeal.loaded"
  | "mailing.created"
  | "mailing.updated"
  | "stress_test.run"
  | "xray.run"
  | "timeline.built"
  | "extraction.run"
  | "document.uploaded"
  | "auth.login"
  | "auth.logout"
  | "security.violation";

export interface AuditEvent {
  readonly id: string;
  readonly type: AuditEventType;
  readonly occurredAt: string;
  readonly actor: "user" | "system" | "ai" | "external";
  readonly subjectId: string;
  readonly ownerId: string;
  readonly metadata: Record<string, unknown>;
}

export function createAuditEvent(input: {
  id?: string;
  type: AuditEventType;
  actor?: "user" | "system" | "ai" | "external";
  subjectId: string;
  ownerId: string;
  metadata?: Record<string, unknown>;
}): AuditEvent {
  return {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    occurredAt: new Date().toISOString(),
    actor: input.actor ?? "system",
    subjectId: input.subjectId,
    ownerId: input.ownerId,
    metadata: input.metadata ?? {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
}

export const DEFAULT_RATE_LIMITS: Readonly<Record<string, RateLimitConfig>> = {
  anonymous: { windowMs: 60_000, maxRequests: 20 },
  upload: { windowMs: 60_000, maxRequests: 5 },
  ai_operation: { windowMs: 60_000, maxRequests: 10 },
  document_processing: { windowMs: 60_000, maxRequests: 10 },
  mailing: { windowMs: 300_000, maxRequests: 3 },
} as const;

export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();

  constructor(
    private readonly config: RateLimitConfig,
    private readonly clock: () => number = Date.now,
  ) {}

  check(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = this.clock();
    const entry = this.entries.get(key);

    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      this.entries.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.config.maxRequests - 1, resetMs: this.config.windowMs };
    }

    if (entry.count >= this.config.maxRequests) {
      const resetMs = this.config.windowMs - (now - entry.windowStart);
      return { allowed: false, remaining: 0, resetMs };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetMs: this.config.windowMs - (now - entry.windowStart),
    };
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

/**
 * @mailmypdf/intelligence — Timeline Engine.
 *
 * A TimelineEvent is a temporal projection of existing intelligence.
 * It adds the temporal dimension: when things happened, how precisely
 * we know the date, and whether sources conflict.
 *
 * Architecture:
 *   Source Document → SourceRef → Fact → TimelineEvent → Timeline
 *
 * TimelineEvent is NOT a copy of Fact. It links to the underlying fact
 * via factId and adds temporal metadata: date precision, ordering, and
 * integrity classification that Fact alone doesn't provide.
 *
 * Two orthogonal dimensions:
 *   datePrecision: how precisely do we know the DATE? (exact, approximate, range, unknown, inferred)
 *   integrity: how trustworthy is the SOURCE? (documented, user_reported, inferred, conflicting, unknown)
 *
 * These are intentionally separate:
 *   - A document can say "hearing was in early March" → approximate + documented
 *   - An AI can infer "hearing was likely on March 20" → exact + inferred
 *   - A user can report "hearing was March 20" → exact + user_reported
 *
 * The system NEVER forces uncertain dates into false precision.
 * Unknown dates stay unknown. Approximate dates stay approximate.
 */

import {
  type PlatformId,
  createId,
  confidence as mkConfidence,
  validateNonEmpty,
  validateMaxLength,
  ok,
  err,
  type Result,
  ValidationError,
} from "@mailmypdf/core";
import type { SourceRef } from "@mailmypdf/documents";
import type { ProvenanceLevel } from "./provenance.js";
import { createProvenance, verifyProvenance } from "./provenance.js";
import type { IntelligenceObject } from "./provenance.js";

// ═══════════════════════════════════════════════════════════════════════════════
// DATE PRECISION — how precisely do we know the date?
// ═══════════════════════════════════════════════════════════════════════════════

export type DatePrecision =
  | "exact"        // Precise date: "2026-03-20"
  | "approximate"  // Approximate: "early March 2026", "circa March 2026"
  | "range"        // Date range: date is the start, dateEnd is the end
  | "unknown"      // Date is unknown
  | "inferred";    // Date was inferred by AI or rule, not directly stated

export const ALL_DATE_PRECISIONS: readonly DatePrecision[] = [
  "exact",
  "approximate",
  "range",
  "unknown",
  "inferred",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT INTEGRITY — how trustworthy is the source?
// ═══════════════════════════════════════════════════════════════════════════════

export type EventIntegrity =
  | "documented"     // Directly extracted from a document
  | "user_reported"  // User entered the event
  | "inferred"       // AI or rule inferred the event (not from a document)
  | "conflicting"    // Multiple sources disagree — see linked contradiction
  | "unknown";       // Source cannot be determined

export const ALL_EVENT_INTEGRITIES: readonly EventIntegrity[] = [
  "documented",
  "user_reported",
  "inferred",
  "conflicting",
  "unknown",
] as const;

export const INTEGRITY_STRENGTH: Readonly<Record<EventIntegrity, number>> = {
  documented: 5,
  user_reported: 3,
  inferred: 2,
  conflicting: 1,
  unknown: 0,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE EVENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface TimelineEvent extends IntelligenceObject {
  /** The case or entity this event belongs to */
  readonly caseId: string;
  /** What happened (open-ended — verticals define their own) */
  readonly eventType: string;
  /** Primary date (ISO 8601, or empty if unknown) */
  readonly date: string;
  /** End date for ranges (only used when datePrecision = "range") */
  readonly dateEnd?: string | undefined;
  /** How precisely do we know the date? */
  readonly datePrecision: DatePrecision;
  /** How trustworthy is the source? */
  readonly integrity: EventIntegrity;
  /** Optional human-readable description */
  readonly description?: string | undefined;
  /** Reference to the Fact this event was derived from */
  readonly factId?: PlatformId | undefined;
  /** If conflicting, reference to the Contradiction that records the date conflict */
  readonly contradictionId?: PlatformId | undefined;
  readonly status: "active" | "retracted";
}

export const MAX_EVENT_TYPE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_CASE_ID_LENGTH = 200;
export const MAX_EVENTS_FOR_TIMELINE = 500;
export const MAX_DATE_LENGTH = 30; // ISO dates are ~10 chars, datetimes ~25, with room

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateTimelineEventInput {
  id?: string;
  caseId: string;
  eventType: string;
  date?: string;
  dateEnd?: string;
  datePrecision?: DatePrecision;
  integrity?: EventIntegrity;
  description?: string;
  factId?: string;
  contradictionId?: string;
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    verifiedBy?: string;
    ruleId?: string;
  };
  confidence?: number;
}

export function createTimelineEvent(input: CreateTimelineEventInput): TimelineEvent {
  const caseCheck = validateNonEmpty(input.caseId, "caseId");
  if (!caseCheck.ok) throw caseCheck.error;
  const caseLen = validateMaxLength(input.caseId, "caseId", MAX_CASE_ID_LENGTH);
  if (!caseLen.ok) throw caseLen.error;

  const typeCheck = validateNonEmpty(input.eventType, "eventType");
  if (!typeCheck.ok) throw typeCheck.error;
  const typeLen = validateMaxLength(input.eventType, "eventType", MAX_EVENT_TYPE_LENGTH);
  if (!typeLen.ok) throw typeLen.error;

  if (input.description !== undefined) {
    const descLen = validateMaxLength(input.description, "description", MAX_DESCRIPTION_LENGTH);
    if (!descLen.ok) throw descLen.error;
  }

  // Validate date lengths
  if (input.date !== undefined && input.date.length > MAX_DATE_LENGTH) {
    throw new Error(`Date exceeds ${MAX_DATE_LENGTH} chars`);
  }
  if (input.dateEnd !== undefined && input.dateEnd.length > MAX_DATE_LENGTH) {
    throw new Error(`dateEnd exceeds ${MAX_DATE_LENGTH} chars`);
  }

  // Validate dateEnd only for ranges
  let datePrecision = input.datePrecision;
  if (datePrecision === undefined) {
    datePrecision = inferDatePrecision(input.date, input.dateEnd, input.provenance.level);
  }
  if (!ALL_DATE_PRECISIONS.includes(datePrecision)) {
    throw new Error(`Invalid date precision: ${datePrecision}`);
  }
  if (datePrecision === "range" && (!input.date || !input.dateEnd)) {
    throw new Error("Range precision requires both date and dateEnd");
  }

  let integrity = input.integrity;
  if (integrity === undefined) {
    integrity = inferIntegrityFromProvenance(input.provenance.level, input.date);
  }
  if (!ALL_EVENT_INTEGRITIES.includes(integrity)) {
    throw new Error(`Invalid event integrity: ${integrity}`);
  }

  // Validate date ordering for ranges
  if (datePrecision === "range" && input.date && input.dateEnd) {
    if (input.date > input.dateEnd) {
      throw new Error("Range start date must be before end date");
    }
  }

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.6);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    caseId: input.caseId,
    eventType: input.eventType,
    date: input.date ?? "",
    dateEnd: datePrecision === "range" ? input.dateEnd : undefined,
    datePrecision,
    integrity,
    description: input.description,
    factId: input.factId ? createId(input.factId) : undefined,
    contradictionId: input.contradictionId ? createId(input.contradictionId) : undefined,
    status: "active",
    provenance: prov,
    confidence: conf,
    verified: prov.level === "human_verified",
    createdAt: now,
    updatedAt: now,
  };
}

function inferDatePrecision(date: string | undefined, dateEnd: string | undefined, level: ProvenanceLevel): DatePrecision {
  if (dateEnd && date) return "range";
  if (!date) return "unknown";
  if (level === "ai_inferred" || level === "rule_derived") return "inferred";
  return "exact";
}

function inferIntegrityFromProvenance(level: ProvenanceLevel, date?: string): EventIntegrity {
  if (!date) return "unknown";
  if (level === "document_extracted") return "documented";
  if (level === "user_provided") return "user_reported";
  if (level === "ai_inferred" || level === "rule_derived") return "inferred";
  if (level === "human_verified") return "documented";
  return "unknown";
}

// ── Verification ──────────────────────────────────────────────────────────────

export function verifyTimelineEvent(event: TimelineEvent, verifiedBy: string): TimelineEvent {
  return {
    ...event,
    provenance: verifyProvenance(event.provenance, verifiedBy),
    verified: true,
    updatedAt: new Date().toISOString(),
  };
}

// ── Retraction ────────────────────────────────────────────────────────────────

export function retractTimelineEvent(event: TimelineEvent): TimelineEvent {
  return { ...event, status: "retracted" as const, updatedAt: new Date().toISOString() };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateTimelineEvent(e: TimelineEvent): Result<void, ValidationError> {
  if (!e.caseId || e.caseId.trim().length === 0) {
    return err(new ValidationError("TimelineEvent caseId must not be empty"));
  }
  if (!e.eventType || e.eventType.trim().length === 0) {
    return err(new ValidationError("TimelineEvent eventType must not be empty"));
  }
  if (e.eventType.length > MAX_EVENT_TYPE_LENGTH) {
    return err(new ValidationError(`TimelineEvent eventType exceeds ${MAX_EVENT_TYPE_LENGTH} chars`));
  }
  if (!ALL_DATE_PRECISIONS.includes(e.datePrecision)) {
    return err(new ValidationError(`Invalid date precision: ${e.datePrecision}`));
  }
  if (!ALL_EVENT_INTEGRITIES.includes(e.integrity)) {
    return err(new ValidationError(`Invalid event integrity: ${e.integrity}`));
  }
  if (e.description !== undefined && e.description.length > MAX_DESCRIPTION_LENGTH) {
    return err(new ValidationError(`Description exceeds ${MAX_DESCRIPTION_LENGTH} chars`));
  }
  if (e.datePrecision === "range" && (!e.date || !e.dateEnd)) {
    return err(new ValidationError("Range precision requires both date and dateEnd"));
  }
  if (e.datePrecision === "range" && e.date && e.dateEnd && e.date > e.dateEnd) {
    return err(new ValidationError("Range start date must be before end date"));
  }
  return ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT IDENTITY / DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deterministic event identity hash.
 *
 * Two events are considered potential duplicates if they share the same
 * (caseId + eventType + date + dateEnd) tuple. Description is intentionally
 * excluded — the same event may be described differently across sources.
 *
 * This is a probabilistic identity: same hash does NOT guarantee they are
 * the same event (different events of the same type can happen on the same
 * day). Consumers must use human review for final deduplication decisions.
 *
 * Migration path: future versions may incorporate document/source identity
 * or entity references into the hash for stronger deduplication.
 */
export function eventIdentityHash(e: TimelineEvent): string {
  const parts = [e.caseId, e.eventType, e.date, e.dateEnd ?? ""];
  return parts.join("|");
}

/**
 * Find potential duplicate events (same identity hash).
 * Returns groups of events that MAY be duplicates.
 * Does NOT auto-merge — human review is required.
 */
export function findDuplicateEvents(events: readonly TimelineEvent[]): TimelineEvent[][] {
  const groups = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    if (e.status !== "active") continue;
    const hash = eventIdentityHash(e);
    const group = groups.get(hash) ?? [];
    group.push(e);
    groups.set(hash, group);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface Timeline {
  readonly caseId: string;
  readonly events: readonly TimelineEvent[];
}

export function createTimeline(caseId: string, events: readonly TimelineEvent[]): Timeline {
  const caseCheck = validateNonEmpty(caseId, "caseId");
  if (!caseCheck.ok) throw caseCheck.error;

  if (events.length > MAX_EVENTS_FOR_TIMELINE) {
    throw new Error(`Timeline exceeds ${MAX_EVENTS_FOR_TIMELINE} events (got ${events.length})`);
  }

  for (const e of events) {
    if (e.caseId !== caseId) {
      throw new Error(`Event ${e.id} is for case ${e.caseId}, not ${caseId}`);
    }
  }

  return { caseId, events };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function activeEvents(timeline: Timeline): TimelineEvent[] {
  return timeline.events.filter((e) => e.status === "active");
}

/**
 * Sort events chronologically. Ordering is deterministic and stable:
 *   1. Known dates sorted by ISO date string comparison
 *   2. Date ranges sorted by start date
 *   3. Unknown dates go last
 *   4. Same-date events sorted by eventType for stability
 *
 * Does NOT invent ordering when evidence can't establish it.
 * Events with unknown dates remain in their original relative order at the end.
 */
export function sortedByDate(timeline: Timeline): TimelineEvent[] {
  const active = activeEvents(timeline);
  const withDates = active.filter((e) => e.date);
  const withoutDates = active.filter((e) => !e.date);

  withDates.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.eventType.localeCompare(b.eventType);
  });

  return [...withDates, ...withoutDates];
}

export function eventsByType(timeline: Timeline, eventType: string): TimelineEvent[] {
  return activeEvents(timeline).filter((e) => e.eventType === eventType);
}

export function eventsOfType(timeline: Timeline, types: readonly string[]): TimelineEvent[] {
  const typeSet = new Set(types);
  return activeEvents(timeline).filter((e) => typeSet.has(e.eventType));
}

// ── Gap Detection ─────────────────────────────────────────────────────────────

export interface TimelineGap {
  readonly startDate: string;
  readonly endDate: string;
  readonly daysBetween: number;
}

export function detectGaps(timeline: Timeline, maxGapDays: number = 90): TimelineGap[] {
  const sorted = sortedByDate(timeline).filter(
    (e) => e.date && e.datePrecision !== "unknown" && e.datePrecision !== "inferred",
  );
  if (sorted.length < 2) return [];

  const gaps: TimelineGap[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    // For ranges, use the end date as the comparison point
    const prevDateStr = prev.datePrecision === "range" ? prev.dateEnd ?? prev.date : prev.date;
    const currDateStr = curr.date;
    const prevDate = new Date(prevDateStr);
    const currDate = new Date(currDateStr);
    const daysBetween = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysBetween > maxGapDays) {
      gaps.push({ startDate: prevDateStr, endDate: currDateStr, daysBetween });
    }
  }
  return gaps;
}

// ── Date Conflict Detection ──────────────────────────────────────────────────

/**
 * Detect events of the same type with different dates.
 * Returns groups of conflicting events. Both sides are preserved.
 *
 * Consumers should link these to the Contradiction model for formal tracking.
 */
export function conflictingDates(timeline: Timeline): TimelineEvent[][] {
  const active = activeEvents(timeline).filter((e) => e.date);
  const groups = new Map<string, TimelineEvent[]>();

  for (const e of active) {
    const key = `${e.caseId}|${e.eventType}`;
    const group = groups.get(key) ?? [];
    group.push(e);
    groups.set(key, group);
  }

  const conflicts: TimelineEvent[][] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const dates = new Set(group.map((e) => e.date));
    if (dates.size > 1) {
      conflicts.push(group);
    }
  }
  return conflicts;
}

// ── Sorting ───────────────────────────────────────────────────────────────────

export function sortByIntegrity(events: readonly TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => INTEGRITY_STRENGTH[b.integrity] - INTEGRITY_STRENGTH[a.integrity]);
}

export function sortByPrecision(events: readonly TimelineEvent[]): TimelineEvent[] {
  const weight: Record<DatePrecision, number> = { exact: 5, range: 4, inferred: 3, approximate: 2, unknown: 1 };
  return [...events].sort((a, b) => weight[b.datePrecision] - weight[a.datePrecision]);
}

/**
 * @mailmypdf/intelligence — Deadline Engine.
 *
 * Deadlines are NOT a separate subsystem. They are:
 *   Fact (has_deadline = 2026-09-15)
 *   + TimelineEvent (deadline_expires on 2026-09-15, inferred)
 *   + Rule (60-day appeal deadline from notice date)
 *   + TemporalConstraint (must respond by N days from event X)
 *   + Provenance (rule_derived, ruleId = "60-day-appeal-rule")
 *
 * Architecture boundary:
 *   Platform: Event + Date + Temporal Constraint + Rule Evaluation + Provenance
 *   Vertical: Jurisdiction + Statute/Policy + Rule Definition + Domain interpretation
 *
 * The platform provides the MACHINERY. Verticals provide the RULES.
 * No vertical-specific logic lives here.
 */

import {
  type PlatformId,
  createId,
  confidence as mkConfidence,
  validateNonEmpty,
  validateMaxLength,
  validateRange,
  ok,
  err,
  type Result,
  ValidationError,
} from "@mailmypdf/core";
import type { SourceRef } from "@mailmypdf/documents";
import type { ProvenanceLevel, ProvenanceRecord } from "./provenance.js";
import { createProvenance } from "./provenance.js";
import type { IntelligenceObject } from "./provenance.js";
import type { TimelineEvent } from "./timeline.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export type CalendarType = "calendar" | "business";

// ═══════════════════════════════════════════════════════════════════════════════
// HOLIDAY CALENDAR INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Holiday calendar interface. The platform defines this interface.
 * Verticals provide concrete implementations with jurisdiction-specific holidays.
 * The platform does NOT hardcode any holidays.
 */
export interface HolidayCalendar {
  readonly id: string;
  isHoliday(date: string): boolean;
  holidaysInRange(start: string, end: string): string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPORAL CONSTRAINT
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemporalConstraint {
  /** The event type that triggers the deadline */
  readonly triggerEventType: string;
  /** Number of days from the trigger event */
  readonly days: number;
  /** Calendar type: calendar days or business days */
  readonly calendarType: CalendarType;
  /** Optional holiday calendar ID (vertical-specific) */
  readonly holidayCalendarId?: string | undefined;
}

export const MAX_TRIGGER_EVENT_TYPE = 100;
export const MAX_DAYS = 3650; // 10 years max

export interface CreateTemporalConstraintInput {
  triggerEventType: string;
  days: number;
  calendarType: CalendarType;
  holidayCalendarId?: string;
}

export function createTemporalConstraint(input: CreateTemporalConstraintInput): TemporalConstraint {
  const triggerCheck = validateNonEmpty(input.triggerEventType, "triggerEventType");
  if (!triggerCheck.ok) throw triggerCheck.error;
  const triggerLen = validateMaxLength(input.triggerEventType, "triggerEventType", MAX_TRIGGER_EVENT_TYPE);
  if (!triggerLen.ok) throw triggerLen.error;

  if (input.calendarType !== "calendar" && input.calendarType !== "business") {
    throw new Error(`Invalid calendar type: ${input.calendarType}`);
  }

  const daysCheck = validateRange(input.days, "days", 1, MAX_DAYS);
  if (!daysCheck.ok) throw daysCheck.error;

  return {
    triggerEventType: input.triggerEventType,
    days: input.days,
    calendarType: input.calendarType,
    holidayCalendarId: input.holidayCalendarId,
  };
}

export function validateTemporalConstraint(c: TemporalConstraint): Result<void, ValidationError> {
  if (!c.triggerEventType || c.triggerEventType.trim().length === 0) {
    return err(new ValidationError("TemporalConstraint triggerEventType must not be empty"));
  }
  if (c.calendarType !== "calendar" && c.calendarType !== "business") {
    return err(new ValidationError(`Invalid calendar type: ${c.calendarType}`));
  }
  if (c.days < 1 || c.days > MAX_DAYS) {
    return err(new ValidationError(`TemporalConstraint days must be between 1 and ${MAX_DAYS}`));
  }
  return ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINE RULE
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeadlineRule extends IntelligenceObject {
  /** Rule name (e.g., "60-day-appeal-deadline") */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** The trigger event that starts the clock */
  readonly triggerEventType: string;
  /** Duration from trigger */
  readonly duration: TemporalConstraint;
  /** The resulting deadline event type */
  readonly deadlineEventType: string;
  /** Who defined this rule (vertical/jurisdiction) */
  readonly authority: string;
  /** Rule version */
  readonly version: string;
}

export const MAX_RULE_NAME = 100;
export const MAX_RULE_DESCRIPTION = 500;
export const MAX_AUTHORITY = 200;
export const MAX_VERSION = 20;

export interface CreateDeadlineRuleInput {
  id?: string;
  name: string;
  description: string;
  triggerEventType: string;
  duration: TemporalConstraint;
  deadlineEventType: string;
  authority: string;
  version: string;
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    verifiedBy?: string;
    ruleId?: string;
  };
  confidence?: number;
}

export function createDeadlineRule(input: CreateDeadlineRuleInput): DeadlineRule {
  const nameCheck = validateNonEmpty(input.name, "name");
  if (!nameCheck.ok) throw nameCheck.error;
  const nameLen = validateMaxLength(input.name, "name", MAX_RULE_NAME);
  if (!nameLen.ok) throw nameLen.error;

  const descCheck = validateNonEmpty(input.description, "description");
  if (!descCheck.ok) throw descCheck.error;
  const descLen = validateMaxLength(input.description, "description", MAX_RULE_DESCRIPTION);
  if (!descLen.ok) throw descLen.error;

  const authorityCheck = validateNonEmpty(input.authority, "authority");
  if (!authorityCheck.ok) throw authorityCheck.error;
  const authorityLen = validateMaxLength(input.authority, "authority", MAX_AUTHORITY);
  if (!authorityLen.ok) throw authorityLen.error;

  const versionCheck = validateNonEmpty(input.version, "version");
  if (!versionCheck.ok) throw versionCheck.error;
  const versionLen = validateMaxLength(input.version, "version", MAX_VERSION);
  if (!versionLen.ok) throw versionLen.error;

  // Ensure duration trigger matches the rule's trigger event
  if (input.duration.triggerEventType !== input.triggerEventType) {
    throw new Error("Duration triggerEventType must match rule triggerEventType");
  }

  const constraintCheck = validateTemporalConstraint(input.duration);
  if (!constraintCheck.ok) throw constraintCheck.error;

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.8);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    name: input.name,
    description: input.description,
    triggerEventType: input.triggerEventType,
    duration: input.duration,
    deadlineEventType: input.deadlineEventType,
    authority: input.authority,
    version: input.version,
    provenance: prov,
    confidence: conf,
    verified: prov.level === "human_verified",
    createdAt: now,
    updatedAt: now,
  };
}

export function validateDeadlineRule(r: DeadlineRule): Result<void, ValidationError> {
  if (!r.name || r.name.trim().length === 0) {
    return err(new ValidationError("DeadlineRule name must not be empty"));
  }
  if (!r.authority || r.authority.trim().length === 0) {
    return err(new ValidationError("DeadlineRule authority must not be empty"));
  }
  if (r.duration.triggerEventType !== r.triggerEventType) {
    return err(new ValidationError("Duration triggerEventType must match rule triggerEventType"));
  }
  const constraintCheck = validateTemporalConstraint(r.duration);
  if (!constraintCheck.ok) return constraintCheck;
  return ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeadlineResult {
  /** The computed deadline date (ISO 8601) */
  readonly date: string;
  /** The rule that produced this deadline */
  readonly ruleId: PlatformId;
  /** The rule name */
  readonly ruleName: string;
  /** The trigger event that started the clock */
  readonly triggerEventId: PlatformId;
  /** The trigger date */
  readonly triggerDate: string;
  /** Number of holidays excluded (if business-day calendar) */
  readonly holidaysExcluded: number;
  /** The temporal constraint applied */
  readonly constraint: TemporalConstraint;
  /** Provenance (rule_derived) */
  readonly provenance: ProvenanceRecord;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINE CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute a deadline from a trigger event + a deadline rule.
 *
 * For calendar days: simply adds N days to the trigger date.
 * For business days: adds N business days, skipping weekends and holidays.
 *
 * The holiday calendar is optional — if not provided, only weekends are skipped
 * for business-day calculations.
 */
export function computeDeadline(
  triggerEvent: TimelineEvent,
  rule: DeadlineRule,
  holidayCalendar?: HolidayCalendar,
): DeadlineResult {
  if (!triggerEvent.date) {
    throw new Error("Trigger event must have a date");
  }
  if (triggerEvent.eventType !== rule.triggerEventType) {
    throw new Error(
      `Trigger event type "${triggerEvent.eventType}" does not match rule trigger "${rule.triggerEventType}"`,
    );
  }

  const triggerDate = new Date(triggerEvent.date + "T00:00:00Z");
  let deadlineDate: Date;
  let holidaysExcluded = 0;

  if (rule.duration.calendarType === "calendar") {
    deadlineDate = new Date(triggerDate);
    deadlineDate.setUTCDate(deadlineDate.getUTCDate() + rule.duration.days);
  } else {
    // Business days: skip weekends and holidays
    deadlineDate = new Date(triggerDate);
    let daysAdded = 0;
    while (daysAdded < rule.duration.days) {
      deadlineDate.setUTCDate(deadlineDate.getUTCDate() + 1);
      const dayOfWeek = deadlineDate.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = deadlineDate.toISOString().slice(0, 10);
      const isHol = holidayCalendar ? holidayCalendar.isHoliday(dateStr) : false;

      if (isWeekend || isHol) {
        if (isHol) holidaysExcluded++;
        continue;
      }
      daysAdded++;
    }
  }

  const dateStr = deadlineDate.toISOString().slice(0, 10);

  return {
    date: dateStr,
    ruleId: rule.id,
    ruleName: rule.name,
    triggerEventId: triggerEvent.id,
    triggerDate: triggerEvent.date,
    holidaysExcluded,
    constraint: rule.duration,
    provenance: createProvenance({
      level: "rule_derived",
      ruleId: rule.id,
      sourceRefs: triggerEvent.provenance.sourceRefs,
    }),
  };
}

/**
 * Compute all applicable deadlines for a timeline.
 * For each event that matches a rule's trigger event type, compute the deadline.
 */
export function computeAllDeadlines(
  events: readonly TimelineEvent[],
  rules: readonly DeadlineRule[],
  holidayCalendar?: HolidayCalendar,
): DeadlineResult[] {
  const results: DeadlineResult[] = [];

  for (const event of events) {
    if (event.status !== "active" || !event.date) continue;
    for (const rule of rules) {
      if (event.eventType === rule.triggerEventType) {
        try {
          results.push(computeDeadline(event, rule, holidayCalendar));
        } catch {
          // Skip events that don't match
        }
      }
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINE STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export type DeadlineStatus = "pending" | "approaching" | "expired" | "missed";

export function getDeadlineStatus(deadline: DeadlineResult, currentDate: string, approachingDays: number = 7): DeadlineStatus {
  const deadlineDate = new Date(deadline.date + "T00:00:00Z");
  const now = new Date(currentDate + "T00:00:00Z");
  const daysRemaining = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return "missed";
  if (daysRemaining <= approachingDays) return "approaching";
  return "pending";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function deadlineResultToTimelineEvent(
  result: DeadlineResult,
  caseId: string,
): TimelineEvent {
  // This creates a TimelineEvent from a computed deadline, preserving the link back
  return {
    id: createId(crypto.randomUUID()),
    caseId,
    eventType: result.constraint.triggerEventType === result.constraint.triggerEventType
      ? "deadline_computed"
      : "deadline_computed",
    date: result.date,
    datePrecision: "inferred" as const,
    integrity: "inferred" as const,
    description: `Computed deadline: ${result.ruleName} (${result.constraint.days} ${result.constraint.calendarType} days from ${result.triggerDate})`,
    provenance: result.provenance,
    confidence: mkConfidence(0.8),
    verified: false,
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

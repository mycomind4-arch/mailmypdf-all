import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type TemporalConstraint,
  type DeadlineRule,
  type DeadlineResult,
  type DeadlineStatus,
  type HolidayCalendar,
  MAX_DAYS,
  MAX_RULE_NAME,
  createTemporalConstraint,
  validateTemporalConstraint,
  createDeadlineRule,
  validateDeadlineRule,
  computeDeadline,
  computeAllDeadlines,
  getDeadlineStatus,
  deadlineResultToTimelineEvent,
  createTimelineEvent,
  createTimeline,
  createSourceRef,
  createId,
  createFact,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPORAL CONSTRAINT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("TemporalConstraint", () => {
  test("createTemporalConstraint produces valid constraint", () => {
    const c = createTemporalConstraint({
      triggerEventType: "notice_issued",
      days: 60,
      calendarType: "calendar",
    });

    assert.equal(c.triggerEventType, "notice_issued");
    assert.equal(c.days, 60);
    assert.equal(c.calendarType, "calendar");
  });

  test("createTemporalConstraint with holiday calendar", () => {
    const c = createTemporalConstraint({
      triggerEventType: "rfe_issued",
      days: 87,
      calendarType: "business",
      holidayCalendarId: "us-federal",
    });

    assert.equal(c.calendarType, "business");
    assert.equal(c.holidayCalendarId, "us-federal");
  });

  test("rejects empty triggerEventType", () => {
    assert.throws(
      () => createTemporalConstraint({ triggerEventType: "", days: 30, calendarType: "calendar" }),
      /triggerEventType/,
    );
  });

  test("rejects zero or negative days", () => {
    assert.throws(
      () => createTemporalConstraint({ triggerEventType: "t", days: 0, calendarType: "calendar" }),
      /days/,
    );
  });

  test("rejects days exceeding MAX_DAYS", () => {
    assert.throws(
      () => createTemporalConstraint({ triggerEventType: "t", days: MAX_DAYS + 1, calendarType: "calendar" }),
      /days/,
    );
  });

  test("rejects invalid calendar type", () => {
    assert.throws(
      () => createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "invalid" as never }),
      /calendar type/,
    );
  });

  test("validateTemporalConstraint passes for valid constraint", () => {
    const c = createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" });
    assert.equal(validateTemporalConstraint(c).ok, true);
  });

  test("validateTemporalConstraint fails for invalid days", () => {
    const c = createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" });
    assert.equal(validateTemporalConstraint({ ...c, days: 0 }).ok, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINE RULE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("DeadlineRule", () => {
  test("createDeadlineRule produces valid rule", () => {
    const constraint = createTemporalConstraint({
      triggerEventType: "denial_issued",
      days: 60,
      calendarType: "calendar",
    });

    const rule = createDeadlineRule({
      name: "60-day-appeal-deadline",
      description: "60 calendar days to file an appeal from the denial date",
      triggerEventType: "denial_issued",
      duration: constraint,
      deadlineEventType: "appeal_deadline",
      authority: "SSA-ODAR",
      version: "2026.1",
      provenance: { level: "user_provided" },
    });

    assert.equal(rule.name, "60-day-appeal-deadline");
    assert.equal(rule.duration.days, 60);
    assert.equal(rule.authority, "SSA-ODAR");
    assert.equal(rule.version, "2026.1");
    assert.equal(rule.verified, false);
    assert.ok(rule.id);
  });

  test("rejects mismatched trigger event types", () => {
    const constraint = createTemporalConstraint({
      triggerEventType: "notice_issued",
      days: 30,
      calendarType: "calendar",
    });

    assert.throws(
      () => createDeadlineRule({
        name: "test",
        description: "test",
        triggerEventType: "denial_issued", // mismatch
        duration: constraint,
        deadlineEventType: "deadline",
        authority: "test",
        version: "1.0",
        provenance: { level: "user_provided" },
      }),
      /triggerEventType/,
    );
  });

  test("rejects empty name", () => {
    const constraint = createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" });
    assert.throws(
      () => createDeadlineRule({
        name: "", description: "d", triggerEventType: "t", duration: constraint,
        deadlineEventType: "d", authority: "a", version: "v",
        provenance: { level: "user_provided" },
      }),
      /name/,
    );
  });

  test("rejects oversized name", () => {
    const constraint = createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" });
    assert.throws(
      () => createDeadlineRule({
        name: "x".repeat(MAX_RULE_NAME + 1), description: "d", triggerEventType: "t", duration: constraint,
        deadlineEventType: "d", authority: "a", version: "v",
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("validateDeadlineRule passes for valid rule", () => {
    const constraint = createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" });
    const rule = createDeadlineRule({
      name: "test", description: "d", triggerEventType: "t", duration: constraint,
      deadlineEventType: "d", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });
    assert.equal(validateDeadlineRule(rule).ok, true);
  });

  test("validateDeadlineRule fails for mismatched trigger", () => {
    const constraint = createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" });
    const rule = createDeadlineRule({
      name: "test", description: "d", triggerEventType: "t", duration: constraint,
      deadlineEventType: "d", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });
    const bad = { ...rule, triggerEventType: "different" };
    assert.equal(validateDeadlineRule(bad).ok, false);
  });

  test("DeadlineRule survives JSON round-trip", () => {
    const constraint = createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" });
    const rule = createDeadlineRule({
      name: "test", description: "d", triggerEventType: "t", duration: constraint,
      deadlineEventType: "d", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });

    const restored = JSON.parse(JSON.stringify(rule)) as DeadlineRule;
    assert.equal(restored.name, rule.name);
    assert.equal(restored.duration.days, 30);
    assert.equal(restored.authority, rule.authority);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINE COMPUTATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Deadline Computation", () => {
  test("calendar days: 60 days from July 17 = September 15", () => {
    const event = createTimelineEvent({
      caseId: "c1", eventType: "denial_issued", date: "2026-07-17",
      provenance: { level: "document_extracted" },
    });

    const constraint = createTemporalConstraint({
      triggerEventType: "denial_issued", days: 60, calendarType: "calendar",
    });

    const rule = createDeadlineRule({
      name: "60-day-appeal", description: "60 calendar days",
      triggerEventType: "denial_issued", duration: constraint,
      deadlineEventType: "appeal_deadline", authority: "SSA", version: "2026.1",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);

    assert.equal(result.date, "2026-09-15");
    assert.equal(result.ruleName, "60-day-appeal");
    assert.equal(result.triggerDate, "2026-07-17");
    assert.equal(result.holidaysExcluded, 0); // calendar days don't exclude holidays
    assert.equal(result.provenance.level, "rule_derived");
  });

  test("calendar days: 30 days from August 1 = August 31", () => {
    const event = createTimelineEvent({
      caseId: "c1", eventType: "notice_received", date: "2026-08-01",
      provenance: { level: "document_extracted" },
    });

    const constraint = createTemporalConstraint({
      triggerEventType: "notice_received", days: 30, calendarType: "calendar",
    });

    const rule = createDeadlineRule({
      name: "30-day-response", description: "30 calendar days",
      triggerEventType: "notice_received", duration: constraint,
      deadlineEventType: "response_deadline", authority: "Agency", version: "1.0",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);
    assert.equal(result.date, "2026-08-31");
  });

  test("business days: skips weekends", () => {
    // Friday August 14, 2026 + 5 business days
    // Aug 15-16 = weekend, Aug 17-21 = 5 business days → Aug 21
    const event = createTimelineEvent({
      caseId: "c1", eventType: "notice_received", date: "2026-08-14",
      provenance: { level: "document_extracted" },
    });

    const constraint = createTemporalConstraint({
      triggerEventType: "notice_received", days: 5, calendarType: "business",
    });

    const rule = createDeadlineRule({
      name: "5-business-day-response", description: "5 business days",
      triggerEventType: "notice_received", duration: constraint,
      deadlineEventType: "response_deadline", authority: "Agency", version: "1.0",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);
    assert.equal(result.date, "2026-08-21"); // Fri Aug 14 + 5 business days = Thu Aug 21
  });

  test("business days: skips weekends and holidays", () => {
    // Create a holiday calendar with Sept 7 (Labor Day 2026) as holiday
    const holidayCalendar: HolidayCalendar = {
      id: "us-federal",
      isHoliday(date: string): boolean {
        return date === "2026-09-07"; // Labor Day
      },
      holidaysInRange(start: string, end: string): string[] {
        return start <= "2026-09-07" && "2026-09-07" <= end ? ["2026-09-07"] : [];
      },
    };

    // Friday Sept 4, 2026 + 3 business days
    // Sept 5-6 = weekend, Sept 7 = Labor Day (holiday), Sept 8-10 = 3 business days
    const event = createTimelineEvent({
      caseId: "c1", eventType: "notice_received", date: "2026-09-04",
      provenance: { level: "document_extracted" },
    });

    const constraint = createTemporalConstraint({
      triggerEventType: "notice_received", days: 3, calendarType: "business",
      holidayCalendarId: "us-federal",
    });

    const rule = createDeadlineRule({
      name: "3-business-day-response", description: "3 business days",
      triggerEventType: "notice_received", duration: constraint,
      deadlineEventType: "response_deadline", authority: "Agency", version: "1.0",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule, holidayCalendar);
    assert.equal(result.date, "2026-09-10");
    assert.equal(result.holidaysExcluded, 1); // Labor Day excluded
  });

  test("rejects trigger event without date", () => {
    const event = createTimelineEvent({
      caseId: "c1", eventType: "denial_issued",
      provenance: { level: "user_provided" },
    });

    const constraint = createTemporalConstraint({
      triggerEventType: "denial_issued", days: 60, calendarType: "calendar",
    });

    const rule = createDeadlineRule({
      name: "test", description: "d", triggerEventType: "denial_issued", duration: constraint,
      deadlineEventType: "deadline", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });

    assert.throws(() => computeDeadline(event, rule), /date/);
  });

  test("rejects mismatched event type", () => {
    const event = createTimelineEvent({
      caseId: "c1", eventType: "filing", date: "2026-01-01",
      provenance: { level: "user_provided" },
    });

    const constraint = createTemporalConstraint({
      triggerEventType: "denial_issued", days: 60, calendarType: "calendar",
    });

    const rule = createDeadlineRule({
      name: "test", description: "d", triggerEventType: "denial_issued", duration: constraint,
      deadlineEventType: "deadline", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });

    assert.throws(() => computeDeadline(event, rule), /denial_issued/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE ALL DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute All Deadlines", () => {
  test("computes multiple deadlines from multiple events", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "denial_issued", date: "2026-07-17", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "c1", eventType: "rfe_issued", date: "2026-03-01", provenance: { level: "document_extracted" } }),
    ];

    const rules = [
      createDeadlineRule({
        name: "60-day-appeal", description: "60 calendar days",
        triggerEventType: "denial_issued",
        duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 60, calendarType: "calendar" }),
        deadlineEventType: "appeal_deadline", authority: "SSA", version: "1.0",
        provenance: { level: "user_provided" },
      }),
      createDeadlineRule({
        name: "87-day-rfe", description: "87 calendar days for RFE response",
        triggerEventType: "rfe_issued",
        duration: createTemporalConstraint({ triggerEventType: "rfe_issued", days: 87, calendarType: "calendar" }),
        deadlineEventType: "rfe_response_deadline", authority: "USCIS", version: "1.0",
        provenance: { level: "user_provided" },
      }),
    ];

    const results = computeAllDeadlines(events, rules);

    assert.equal(results.length, 2);
    assert.equal(results[0]!.date, "2026-09-15"); // July 17 + 60 days
    assert.equal(results[1]!.date, "2026-05-27"); // March 1 + 87 days
  });

  test("skips events without dates", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "denial_issued", provenance: { level: "user_provided" } }), // no date
    ];

    const rules = [
      createDeadlineRule({
        name: "60-day-appeal", description: "d",
        triggerEventType: "denial_issued",
        duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 60, calendarType: "calendar" }),
        deadlineEventType: "appeal_deadline", authority: "SSA", version: "1.0",
        provenance: { level: "user_provided" },
      }),
    ];

    assert.equal(computeAllDeadlines(events, rules).length, 0);
  });

  test("skips retracted events", () => {
    const retracted = createTimelineEvent({ caseId: "c1", eventType: "denial_issued", date: "2026-07-17", provenance: { level: "user_provided" } });
    const events = [
      { ...retracted, status: "retracted" as const },
    ];

    const rules = [
      createDeadlineRule({
        name: "60-day-appeal", description: "d",
        triggerEventType: "denial_issued",
        duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 60, calendarType: "calendar" }),
        deadlineEventType: "appeal_deadline", authority: "SSA", version: "1.0",
        provenance: { level: "user_provided" },
      }),
    ];

    assert.equal(computeAllDeadlines(events, rules).length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINE STATUS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Deadline Status", () => {
  test("pending: more than 7 days remaining", () => {
    const result: DeadlineResult = {
      date: "2026-12-31",
      ruleId: createId("r"), ruleName: "test",
      triggerEventId: createId("e"), triggerDate: "2026-01-01",
      holidaysExcluded: 0,
      constraint: createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" }),
      provenance: { level: "rule_derived", weight: 0.7, verified: false, sourceRefs: [] } as never,
    };

    assert.equal(getDeadlineStatus(result, "2026-08-15"), "pending");
  });

  test("approaching: within 7 days", () => {
    const result: DeadlineResult = {
      date: "2026-08-20",
      ruleId: createId("r"), ruleName: "test",
      triggerEventId: createId("e"), triggerDate: "2026-08-01",
      holidaysExcluded: 0,
      constraint: createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" }),
      provenance: { level: "rule_derived", weight: 0.7, verified: false, sourceRefs: [] } as never,
    };

    assert.equal(getDeadlineStatus(result, "2026-08-15"), "approaching"); // 5 days
  });

  test("missed: past the deadline", () => {
    const result: DeadlineResult = {
      date: "2026-08-01",
      ruleId: createId("r"), ruleName: "test",
      triggerEventId: createId("e"), triggerDate: "2026-07-01",
      holidaysExcluded: 0,
      constraint: createTemporalConstraint({ triggerEventType: "t", days: 30, calendarType: "calendar" }),
      provenance: { level: "rule_derived", weight: 0.7, verified: false, sourceRefs: [] } as never,
    };

    assert.equal(getDeadlineStatus(result, "2026-08-15"), "missed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Deadline Serialization", () => {
  test("DeadlineResult survives JSON round-trip", () => {
    const event = createTimelineEvent({
      caseId: "c1", eventType: "denial_issued", date: "2026-07-17",
      provenance: { level: "document_extracted" },
    });

    const constraint = createTemporalConstraint({
      triggerEventType: "denial_issued", days: 60, calendarType: "calendar",
    });

    const rule = createDeadlineRule({
      name: "60-day-appeal", description: "60 calendar days",
      triggerEventType: "denial_issued", duration: constraint,
      deadlineEventType: "appeal_deadline", authority: "SSA", version: "2026.1",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);
    const restored = JSON.parse(JSON.stringify(result)) as DeadlineResult;

    assert.equal(restored.date, result.date);
    assert.equal(restored.ruleName, result.ruleName);
    assert.equal(restored.triggerDate, result.triggerDate);
    assert.equal(restored.holidaysExcluded, result.holidaysExcluded);
  });

  test("deadlineResultToTimelineEvent creates traceable event", () => {
    const event = createTimelineEvent({
      caseId: "c1", eventType: "denial_issued", date: "2026-07-17",
      provenance: { level: "document_extracted" },
    });

    const constraint = createTemporalConstraint({
      triggerEventType: "denial_issued", days: 60, calendarType: "calendar",
    });

    const rule = createDeadlineRule({
      name: "60-day-appeal", description: "60 calendar days",
      triggerEventType: "denial_issued", duration: constraint,
      deadlineEventType: "appeal_deadline", authority: "SSA", version: "2026.1",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);
    const timelineEvent = deadlineResultToTimelineEvent(result, "c1");

    assert.equal(timelineEvent.caseId, "c1");
    assert.equal(timelineEvent.date, "2026-09-15");
    assert.equal(timelineEvent.datePrecision, "inferred");
    assert.equal(timelineEvent.provenance.level, "rule_derived");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VERTICAL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Deadline Scenarios", () => {
  test("Appeal Mail: 60-day appeal deadline from denial", () => {
    const event = createTimelineEvent({
      caseId: "appeal-001", eventType: "denial_issued", date: "2026-07-17",
      provenance: { level: "document_extracted" },
    });

    const rule = createDeadlineRule({
      name: "60-day-appeal", description: "60 calendar days to file appeal",
      triggerEventType: "denial_issued",
      duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 60, calendarType: "calendar" }),
      deadlineEventType: "appeal_deadline", authority: "SSA-ODAR", version: "2026.1",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);
    assert.equal(result.date, "2026-09-15");
  });

  test("Immigration Mail: 87-day RFE response deadline", () => {
    const event = createTimelineEvent({
      caseId: "imm-001", eventType: "rfe_issued", date: "2026-03-01",
      provenance: { level: "document_extracted" },
    });

    const rule = createDeadlineRule({
      name: "87-day-rfe-response", description: "87 calendar days to respond to RFE",
      triggerEventType: "rfe_issued",
      duration: createTemporalConstraint({ triggerEventType: "rfe_issued", days: 87, calendarType: "calendar" }),
      deadlineEventType: "rfe_response_deadline", authority: "USCIS", version: "2026.1",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);
    assert.equal(result.date, "2026-05-27");
  });

  test("Notice Respond: 30-day response deadline", () => {
    const event = createTimelineEvent({
      caseId: "notice-001", eventType: "notice_received", date: "2026-08-01",
      provenance: { level: "document_extracted" },
    });

    const rule = createDeadlineRule({
      name: "30-day-response", description: "30 calendar days to respond",
      triggerEventType: "notice_received",
      duration: createTemporalConstraint({ triggerEventType: "notice_received", days: 30, calendarType: "calendar" }),
      deadlineEventType: "response_deadline", authority: "State-Agency", version: "1.0",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);
    assert.equal(result.date, "2026-08-31");
  });

  test("Small Business: 15-business-day payment deadline", () => {
    const event = createTimelineEvent({
      caseId: "biz-001", eventType: "invoice_received", date: "2026-08-03",
      provenance: { level: "document_extracted" },
    });

    const rule = createDeadlineRule({
      name: "15-business-day-payment", description: "15 business days to pay",
      triggerEventType: "invoice_received",
      duration: createTemporalConstraint({ triggerEventType: "invoice_received", days: 15, calendarType: "business" }),
      deadlineEventType: "payment_deadline", authority: "Contract-Terms", version: "1.0",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(event, rule);
    // Aug 3 is a Monday. 15 business days = Aug 24 (Mon)
    assert.ok(result.date >= "2026-08-21" && result.date <= "2026-08-28"); // roughly 3 weeks
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN GATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Design Gate: No Vertical-Specific Branches", () => {
  test("all verticals use the same computeDeadline function", () => {
    const appealEvent = createTimelineEvent({ caseId: "a", eventType: "denial_issued", date: "2026-07-17", provenance: { level: "user_provided" } });
    const immEvent = createTimelineEvent({ caseId: "i", eventType: "rfe_issued", date: "2026-03-01", provenance: { level: "user_provided" } });
    const noticeEvent = createTimelineEvent({ caseId: "n", eventType: "notice_received", date: "2026-08-01", provenance: { level: "user_provided" } });

    const appealRule = createDeadlineRule({
      name: "60-day", description: "d", triggerEventType: "denial_issued",
      duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 60, calendarType: "calendar" }),
      deadlineEventType: "appeal_deadline", authority: "SSA", version: "1.0",
      provenance: { level: "user_provided" },
    });
    const immRule = createDeadlineRule({
      name: "87-day", description: "d", triggerEventType: "rfe_issued",
      duration: createTemporalConstraint({ triggerEventType: "rfe_issued", days: 87, calendarType: "calendar" }),
      deadlineEventType: "rfe_deadline", authority: "USCIS", version: "1.0",
      provenance: { level: "user_provided" },
    });
    const noticeRule = createDeadlineRule({
      name: "30-day", description: "d", triggerEventType: "notice_received",
      duration: createTemporalConstraint({ triggerEventType: "notice_received", days: 30, calendarType: "calendar" }),
      deadlineEventType: "response_deadline", authority: "Agency", version: "1.0",
      provenance: { level: "user_provided" },
    });

    // Same function, different data
    const appealResult = computeDeadline(appealEvent, appealRule);
    const immResult = computeDeadline(immEvent, immRule);
    const noticeResult = computeDeadline(noticeEvent, noticeRule);

    assert.equal(appealResult.date, "2026-09-15");
    assert.equal(immResult.date, "2026-05-27");
    assert.equal(noticeResult.date, "2026-08-31");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PROVENANCE CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

describe("Full Provenance Chain with Deadlines", () => {
  test("consumer can trace a deadline back to its trigger event and rule", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "denial.pdf", page: 1 });

    const triggerEvent = createTimelineEvent({
      caseId: "appeal-001", eventType: "denial_issued", date: "2026-07-17",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
    });

    const rule = createDeadlineRule({
      name: "60-day-appeal", description: "60 calendar days from denial",
      triggerEventType: "denial_issued",
      duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 60, calendarType: "calendar" }),
      deadlineEventType: "appeal_deadline", authority: "SSA-ODAR", version: "2026.1",
      provenance: { level: "user_provided" },
    });

    const result = computeDeadline(triggerEvent, rule);

    // 1. Deadline has a date
    assert.equal(result.date, "2026-09-15");

    // 2. Deadline references the rule
    assert.equal(result.ruleId, rule.id);
    assert.equal(result.ruleName, "60-day-appeal");

    // 3. Deadline references the trigger event
    assert.equal(result.triggerEventId, triggerEvent.id);
    assert.equal(result.triggerDate, "2026-07-17");

    // 4. Trigger event traces to the source document
    assert.equal(triggerEvent.provenance.sourceRefs[0]!.documentName, "denial.pdf");

    // 5. Deadline has rule-derived provenance
    assert.equal(result.provenance.level, "rule_derived");
    assert.equal(result.provenance.ruleId, rule.id);

    // 6. Can convert to a timeline event for the timeline
    const deadlineEvent = deadlineResultToTimelineEvent(result, "appeal-001");
    assert.equal(deadlineEvent.date, "2026-09-15");
    assert.equal(deadlineEvent.datePrecision, "inferred");
  });
});

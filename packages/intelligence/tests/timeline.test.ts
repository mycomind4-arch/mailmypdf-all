import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type TimelineEvent,
  type Timeline,
  type EventIntegrity,
  type DatePrecision,
  ALL_EVENT_INTEGRITIES,
  ALL_DATE_PRECISIONS,
  INTEGRITY_STRENGTH,
  MAX_EVENT_TYPE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
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
  createFact,
  createSourceRef,
  createId,
  createContradiction,
  detectContradictions,
  createEvidence,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE EVENT — DATE PRECISION
// ═══════════════════════════════════════════════════════════════════════════════

describe("TimelineEvent Date Precision", () => {
  test("exact date — precise date from a document", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "notice.pdf", page: 1 });
    const ev = createTimelineEvent({
      caseId: "case-001",
      eventType: "decision_issued",
      date: "2026-07-17",
      datePrecision: "exact",
      integrity: "documented",
      description: "SSA issued a denial determination",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
    });

    assert.equal(ev.date, "2026-07-17");
    assert.equal(ev.datePrecision, "exact");
    assert.equal(ev.integrity, "documented");
  });

  test("approximate date — 'circa March 2026' from a document", () => {
    const ev = createTimelineEvent({
      caseId: "case-001",
      eventType: "hearing_held",
      date: "2026-03",
      datePrecision: "approximate",
      integrity: "documented",
      description: "Hearing held in approximately March 2026",
      provenance: { level: "document_extracted" },
    });

    assert.equal(ev.datePrecision, "approximate");
    assert.equal(ev.dateEnd, undefined);
  });

  test("range date — 'between March 15 and March 20'", () => {
    const ev = createTimelineEvent({
      caseId: "case-001",
      eventType: "correspondence_period",
      date: "2026-03-15",
      dateEnd: "2026-03-20",
      datePrecision: "range",
      integrity: "documented",
      provenance: { level: "document_extracted" },
    });

    assert.equal(ev.datePrecision, "range");
    assert.equal(ev.date, "2026-03-15");
    assert.equal(ev.dateEnd, "2026-03-20");
  });

  test("range precision requires both date and dateEnd", () => {
    assert.throws(
      () => createTimelineEvent({
        caseId: "c1", eventType: "test", date: "2026-03-15",
        datePrecision: "range",
        provenance: { level: "user_provided" },
      }),
      /Range.*requires/,
    );
  });

  test("range rejects dateEnd before date", () => {
    assert.throws(
      () => createTimelineEvent({
        caseId: "c1", eventType: "test",
        date: "2026-03-20", dateEnd: "2026-03-15",
        datePrecision: "range",
        provenance: { level: "user_provided" },
      }),
      /before/,
    );
  });

  test("unknown date — event with no date", () => {
    const ev = createTimelineEvent({
      caseId: "case-001",
      eventType: "initial_contact",
      datePrecision: "unknown",
      provenance: { level: "user_provided" },
    });

    assert.equal(ev.date, "");
    assert.equal(ev.datePrecision, "unknown");
    assert.equal(ev.integrity, "unknown");
  });

  test("inferred date — AI or rule inferred the date", () => {
    const ev = createTimelineEvent({
      caseId: "case-001",
      eventType: "deadline_expires",
      date: "2026-09-15",
      datePrecision: "inferred",
      integrity: "inferred",
      provenance: { level: "rule_derived", ruleId: "60-day-rule" },
    });

    assert.equal(ev.datePrecision, "inferred");
    assert.equal(ev.integrity, "inferred");
  });

  test("infers datePrecision from inputs when not explicit", () => {
    // date + dateEnd → range
    assert.equal(
      createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", dateEnd: "2026-01-05", provenance: { level: "user_provided" } }).datePrecision,
      "range",
    );
    // no date → unknown
    assert.equal(
      createTimelineEvent({ caseId: "c1", eventType: "t", provenance: { level: "user_provided" } }).datePrecision,
      "unknown",
    );
    // rule_derived → inferred
    assert.equal(
      createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "rule_derived", ruleId: "r" } }).datePrecision,
      "inferred",
    );
    // document_extracted → exact
    assert.equal(
      createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "document_extracted" } }).datePrecision,
      "exact",
    );
  });

  test("supports all date precision values", () => {
    for (const dp of ALL_DATE_PRECISIONS) {
      const input: Parameters<typeof createTimelineEvent>[0] = {
        caseId: "c1", eventType: "test", datePrecision: dp,
        provenance: { level: "user_provided" },
      };
      if (dp === "range") {
        input.date = "2026-01-01";
        input.dateEnd = "2026-01-05";
      } else if (dp !== "unknown") {
        input.date = "2026-01-01";
      }
      const ev = createTimelineEvent(input);
      assert.equal(ev.datePrecision, dp);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE EVENT — INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("TimelineEvent Integrity", () => {
  test("documented event has higher trust than inferred", () => {
    const doc = createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", integrity: "documented", provenance: { level: "document_extracted" } });
    const inferred = createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", integrity: "inferred", provenance: { level: "ai_inferred", modelId: "m" } });

    assert.ok(INTEGRITY_STRENGTH[doc.integrity] > INTEGRITY_STRENGTH[inferred.integrity]);
  });

  test("conflicting integrity — event links to contradiction", () => {
    const ev = createTimelineEvent({
      caseId: "c1", eventType: "hearing", date: "2026-03-20",
      integrity: "conflicting", datePrecision: "exact",
      contradictionId: "con-001",
      provenance: { level: "document_extracted" },
    });

    assert.equal(ev.integrity, "conflicting");
    assert.equal(ev.contradictionId, createId("con-001"));
  });

  test("infers integrity from provenance", () => {
    assert.equal(createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "document_extracted" } }).integrity, "documented");
    assert.equal(createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "user_provided" } }).integrity, "user_reported");
    assert.equal(createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "ai_inferred", modelId: "m" } }).integrity, "inferred");
    assert.equal(createTimelineEvent({ caseId: "c1", eventType: "t", provenance: { level: "user_provided" } }).integrity, "unknown");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT IDENTITY / DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Event Identity / Deduplication", () => {
  test("eventIdentityHash is deterministic for same case+type+date", () => {
    const ev1 = createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "document_extracted" } });
    const ev2 = createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } });

    assert.equal(eventIdentityHash(ev1), eventIdentityHash(ev2));
  });

  test("eventIdentityHash differs for different dates", () => {
    const ev1 = createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } });
    const ev2 = createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-20", provenance: { level: "user_provided" } });

    assert.notEqual(eventIdentityHash(ev1), eventIdentityHash(ev2));
  });

  test("eventIdentityHash differs for different event types", () => {
    const ev1 = createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } });
    const ev2 = createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-01-15", provenance: { level: "user_provided" } });

    assert.notEqual(eventIdentityHash(ev1), eventIdentityHash(ev2));
  });

  test("eventIdentityHash differs for different cases", () => {
    const ev1 = createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } });
    const ev2 = createTimelineEvent({ caseId: "c2", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } });

    assert.notEqual(eventIdentityHash(ev1), eventIdentityHash(ev2));
  });

  test("eventIdentityHash includes dateEnd for ranges", () => {
    const ev1 = createTimelineEvent({ caseId: "c1", eventType: "period", date: "2026-01-01", dateEnd: "2026-01-05", datePrecision: "range", provenance: { level: "user_provided" } });
    const ev2 = createTimelineEvent({ caseId: "c1", eventType: "period", date: "2026-01-01", dateEnd: "2026-01-10", datePrecision: "range", provenance: { level: "user_provided" } });

    assert.notEqual(eventIdentityHash(ev1), eventIdentityHash(ev2));
  });

  test("eventIdentityHash excludes description — same event described differently", () => {
    const ev1 = createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", description: "Initial filing", provenance: { level: "user_provided" } });
    const ev2 = createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", description: "Application submitted", provenance: { level: "user_provided" } });

    assert.equal(eventIdentityHash(ev1), eventIdentityHash(ev2));
  });

  test("findDuplicateEvents groups potential duplicates", () => {
    const ev1 = createTimelineEvent({ id: "e1", caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "document_extracted" } });
    const ev2 = createTimelineEvent({ id: "e2", caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } });
    const ev3 = createTimelineEvent({ id: "e3", caseId: "c1", eventType: "hearing", date: "2026-03-20", provenance: { level: "document_extracted" } });

    const dupes = findDuplicateEvents([ev1, ev2, ev3]);
    assert.equal(dupes.length, 1);
    assert.equal(dupes[0]!.length, 2);
  });

  test("findDuplicateEvents excludes retracted events", () => {
    const ev1 = createTimelineEvent({ id: "e1", caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } });
    const ev2 = retractTimelineEvent(createTimelineEvent({ id: "e2", caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } }));

    const dupes = findDuplicateEvents([ev1, ev2]);
    assert.equal(dupes.length, 0);
  });

  test("genuinely different events with same date are NOT duplicates", () => {
    const ev1 = createTimelineEvent({ id: "e1", caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } });
    const ev2 = createTimelineEvent({ id: "e2", caseId: "c1", eventType: "payment", date: "2026-01-15", provenance: { level: "user_provided" } });

    const dupes = findDuplicateEvents([ev1, ev2]);
    assert.equal(dupes.length, 0); // different event types, not duplicates
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE ORDERING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Ordering", () => {
  test("sortedByDate orders A < B < C", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "decision", date: "2026-04-10", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-03-20", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("c1", events);
    const sorted = sortedByDate(timeline);

    assert.equal(sorted[0]!.eventType, "filing");
    assert.equal(sorted[1]!.eventType, "hearing");
    assert.equal(sorted[2]!.eventType, "decision");
  });

  test("sortedByDate is stable across repeated executions", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "decision", date: "2026-04-10", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-03-20", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("c1", events);

    const run1 = sortedByDate(timeline);
    const run2 = sortedByDate(timeline);

    assert.deepEqual(run1.map((e) => e.eventType), run2.map((e) => e.eventType));
  });

  test("sortedByDate puts unknown dates last", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "unknown_event", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "known", date: "2026-06-01", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("c1", events);
    const sorted = sortedByDate(timeline);

    assert.equal(sorted[0]!.eventType, "known");
    assert.equal(sorted[1]!.eventType, "unknown_event");
  });

  test("sortedByDate ties broken by eventType for stability", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "zebra", date: "2026-01-15", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "alpha", date: "2026-01-15", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("c1", events);
    const sorted = sortedByDate(timeline);

    assert.equal(sorted[0]!.eventType, "alpha");
    assert.equal(sorted[1]!.eventType, "zebra");
  });

  test("does not invent ordering for unknown dates", () => {
    const ev1 = createTimelineEvent({ caseId: "c1", eventType: "zzz", provenance: { level: "user_provided" } });
    const ev2 = createTimelineEvent({ caseId: "c1", eventType: "aaa", provenance: { level: "user_provided" } });
    const timeline = createTimeline("c1", [ev1, ev2]);
    const sorted = sortedByDate(timeline);

    // Unknown dates stay in original order — not sorted by eventType
    assert.equal(sorted[0]!.eventType, "zzz");
    assert.equal(sorted[1]!.eventType, "aaa");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICTING DATES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Conflicting Dates", () => {
  test("conflictingDates preserves both sides", () => {
    const evA = createTimelineEvent({ id: "eA", caseId: "c1", eventType: "hearing", date: "2026-03-20", provenance: { level: "document_extracted" } });
    const evB = createTimelineEvent({ id: "eB", caseId: "c1", eventType: "hearing", date: "2026-03-25", provenance: { level: "user_provided" } });
    const timeline = createTimeline("c1", [evA, evB]);

    const conflicts = conflictingDates(timeline);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0]!.length, 2); // both sides preserved
  });

  test("conflictingDates returns empty when no conflicts", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-03-20", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("c1", events);
    assert.equal(conflictingDates(timeline).length, 0);
  });

  test("conflicting event can link to contradiction", () => {
    const factA = createFact({ id: "fA", subject: "c1", predicate: "hearing_date", value: "2026-03-20", provenance: { level: "document_extracted" } });
    const factB = createFact({ id: "fB", subject: "c1", predicate: "hearing_date", value: "2026-03-25", provenance: { level: "user_provided" } });
    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "date-conflict-detector" });
    const c = contradictions[0]!;

    const ev = createTimelineEvent({
      caseId: "c1", eventType: "hearing", date: "2026-03-20",
      integrity: "conflicting", contradictionId: c.id,
      provenance: { level: "document_extracted" },
    });

    assert.equal(ev.contradictionId, c.id);
    assert.equal(ev.integrity, "conflicting");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Queries", () => {
  test("activeEvents excludes retracted", () => {
    const active = createTimelineEvent({ caseId: "c1", eventType: "ev1", date: "2026-01-01", provenance: { level: "user_provided" } });
    const retracted = retractTimelineEvent(createTimelineEvent({ caseId: "c1", eventType: "ev2", date: "2026-02-01", provenance: { level: "user_provided" } }));
    const timeline = createTimeline("c1", [active, retracted]);

    assert.equal(activeEvents(timeline).length, 1);
  });

  test("eventsByType filters by event type", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-03-20", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-06-01", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("c1", events);

    assert.equal(eventsByType(timeline, "filing").length, 2);
    assert.equal(eventsByType(timeline, "hearing").length, 1);
  });

  test("eventsOfType filters by multiple types", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-03-20", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "decision", date: "2026-04-10", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("c1", events);

    assert.equal(eventsOfType(timeline, ["filing", "decision"]).length, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Gap Detection", () => {
  test("detectGaps finds gaps larger than threshold", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-06-01", provenance: { level: "document_extracted" } }),
    ];
    const timeline = createTimeline("c1", events);
    const gaps = detectGaps(timeline, 90);

    assert.equal(gaps.length, 1);
    assert.ok(gaps[0]!.daysBetween > 90);
  });

  test("detectGaps finds no gaps when events are close", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-02-10", provenance: { level: "document_extracted" } }),
    ];
    const timeline = createTimeline("c1", events);
    assert.equal(detectGaps(timeline, 90).length, 0);
  });

  test("detectGaps excludes unknown and inferred dates", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "c1", eventType: "inferred_event", date: "2026-06-01", datePrecision: "inferred", provenance: { level: "rule_derived", ruleId: "r" } }),
    ];
    const timeline = createTimeline("c1", events);
    // Inferred dates excluded, so only one known event → no gaps
    assert.equal(detectGaps(timeline, 90).length, 0);
  });

  test("detectGaps handles empty timeline", () => {
    assert.equal(detectGaps(createTimeline("c1", []), 90).length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Validation", () => {
  test("rejects empty caseId", () => {
    assert.throws(
      () => createTimelineEvent({ caseId: "", eventType: "t", provenance: { level: "user_provided" } }),
      /caseId/,
    );
  });

  test("rejects empty eventType", () => {
    assert.throws(
      () => createTimelineEvent({ caseId: "c1", eventType: "", provenance: { level: "user_provided" } }),
      /eventType/,
    );
  });

  test("rejects oversized eventType", () => {
    assert.throws(
      () => createTimelineEvent({ caseId: "c1", eventType: "x".repeat(MAX_EVENT_TYPE_LENGTH + 1), provenance: { level: "user_provided" } }),
    );
  });

  test("rejects oversized description", () => {
    assert.throws(
      () => createTimelineEvent({ caseId: "c1", eventType: "t", description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1), provenance: { level: "user_provided" } }),
    );
  });

  test("validateTimelineEvent passes for valid event", () => {
    const ev = createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "user_provided" } });
    assert.equal(validateTimelineEvent(ev).ok, true);
  });

  test("validateTimelineEvent fails for invalid datePrecision", () => {
    const ev = createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "user_provided" } });
    assert.equal(validateTimelineEvent({ ...ev, datePrecision: "invalid" as never }).ok, false);
  });

  test("validateTimelineEvent fails for range without dateEnd", () => {
    const ev = createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", datePrecision: "range", dateEnd: "2026-01-05", provenance: { level: "user_provided" } });
    const bad = { ...ev, dateEnd: undefined };
    assert.equal(validateTimelineEvent(bad).ok, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Lifecycle", () => {
  test("verifyTimelineEvent upgrades provenance", () => {
    const ev = createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "user_provided" } });
    const verified = verifyTimelineEvent(ev, "reviewer");
    assert.equal(verified.verified, true);
    assert.equal(verified.provenance.level, "human_verified");
  });

  test("retractTimelineEvent marks as retracted", () => {
    const ev = createTimelineEvent({ caseId: "c1", eventType: "t", date: "2026-01-01", provenance: { level: "user_provided" } });
    assert.equal(retractTimelineEvent(ev).status, "retracted");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Sorting", () => {
  test("sortByIntegrity orders by strength descending", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "a", date: "2026-01-01", integrity: "unknown", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "b", date: "2026-01-01", integrity: "documented", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "c1", eventType: "c", date: "2026-01-01", integrity: "inferred", provenance: { level: "ai_inferred", modelId: "m" } }),
    ];

    const sorted = sortByIntegrity(events);
    assert.equal(sorted[0]!.integrity, "documented");
    assert.equal(sorted[1]!.integrity, "inferred");
    assert.equal(sorted[2]!.integrity, "unknown");
  });

  test("sortByPrecision orders by precision descending", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "a", date: "2026-01-01", datePrecision: "unknown", provenance: { level: "user_provided" } }),
      createTimelineEvent({ caseId: "c1", eventType: "b", date: "2026-01-01", datePrecision: "exact", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "c1", eventType: "c", date: "2026-01-01", datePrecision: "approximate", provenance: { level: "user_provided" } }),
    ];

    const sorted = sortByPrecision(events);
    assert.equal(sorted[0]!.datePrecision, "exact");
    assert.equal(sorted[1]!.datePrecision, "approximate");
    assert.equal(sorted[2]!.datePrecision, "unknown");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Resource Safety", () => {
  test("large timeline is rejected at limit + 1", () => {
    const events: TimelineEvent[] = [];
    for (let i = 0; i < MAX_EVENTS_FOR_TIMELINE; i++) {
      events.push(createTimelineEvent({ caseId: "c1", eventType: `ev-${i}`, provenance: { level: "user_provided" } }));
    }
    const timeline = createTimeline("c1", events);
    assert.equal(timeline.events.length, MAX_EVENTS_FOR_TIMELINE);

    events.push(createTimelineEvent({ caseId: "c1", eventType: "overflow", provenance: { level: "user_provided" } }));
    assert.throws(() => createTimeline("c1", events), /exceeds/);
  });

  test("createTimeline rejects events for different cases", () => {
    const ev1 = createTimelineEvent({ caseId: "case-A", eventType: "t", provenance: { level: "user_provided" } });
    const ev2 = createTimelineEvent({ caseId: "case-B", eventType: "t", provenance: { level: "user_provided" } });
    assert.throws(() => createTimeline("case-A", [ev1, ev2]), /case-B/);
  });

  test("rejects oversized date string", () => {
    assert.throws(
      () => createTimelineEvent({ caseId: "c1", eventType: "t", date: "x".repeat(MAX_DATE_LENGTH + 1), provenance: { level: "user_provided" } }),
      /Date exceeds/,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Timeline Serialization", () => {
  test("TimelineEvent survives JSON round-trip with all fields", () => {
    const ev = createTimelineEvent({
      caseId: "case-001",
      eventType: "decision_issued",
      date: "2026-07-17",
      datePrecision: "exact",
      integrity: "documented",
      description: "SSA issued a denial",
      factId: "fact-001",
      contradictionId: "con-001",
      provenance: { level: "document_extracted" },
    });

    const restored = JSON.parse(JSON.stringify(ev)) as TimelineEvent;
    assert.equal(restored.caseId, ev.caseId);
    assert.equal(restored.eventType, ev.eventType);
    assert.equal(restored.date, ev.date);
    assert.equal(restored.datePrecision, ev.datePrecision);
    assert.equal(restored.integrity, ev.integrity);
    assert.equal(restored.description, ev.description);
    assert.equal(restored.factId, ev.factId);
    assert.equal(restored.contradictionId, ev.contradictionId);
    assert.equal(restored.id, ev.id);
  });

  test("range event survives JSON round-trip", () => {
    const ev = createTimelineEvent({
      caseId: "c1", eventType: "period",
      date: "2026-03-15", dateEnd: "2026-03-20",
      datePrecision: "range", integrity: "documented",
      provenance: { level: "document_extracted" },
    });

    const restored = JSON.parse(JSON.stringify(ev)) as TimelineEvent;
    assert.equal(restored.datePrecision, "range");
    assert.equal(restored.date, "2026-03-15");
    assert.equal(restored.dateEnd, "2026-03-20");
  });

  test("Timeline survives JSON round-trip", () => {
    const events = [
      createTimelineEvent({ caseId: "c1", eventType: "filing", date: "2026-01-15", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "c1", eventType: "hearing", date: "2026-03-20", provenance: { level: "document_extracted" } }),
    ];
    const timeline = createTimeline("c1", events);

    const restored = JSON.parse(JSON.stringify(timeline)) as Timeline;
    assert.equal(restored.caseId, timeline.caseId);
    assert.equal(restored.events.length, 2);
  });

  test("dates do not change precision on round-trip", () => {
    const ev = createTimelineEvent({
      caseId: "c1", eventType: "t",
      date: "2026-03", datePrecision: "approximate",
      provenance: { level: "document_extracted" },
    });

    const restored = JSON.parse(JSON.stringify(ev)) as TimelineEvent;
    assert.equal(restored.date, "2026-03");
    assert.equal(restored.datePrecision, "approximate");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VERTICAL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Timeline Scenarios", () => {
  test("Appeal Mail: case timeline with gap detection", () => {
    const events = [
      createTimelineEvent({ caseId: "appeal-001", eventType: "application_filed", date: "2026-01-10", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "appeal-001", eventType: "denial_issued", date: "2026-07-17", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "appeal-001", eventType: "appeal_deadline", date: "2026-09-15", datePrecision: "inferred", provenance: { level: "rule_derived", ruleId: "60-day-rule" } }),
    ];
    const timeline = createTimeline("appeal-001", events);
    const gaps = detectGaps(timeline, 90);

    assert.ok(gaps.length > 0, "should detect gap between application and denial");
  });

  test("Immigration Mail: RFE timeline with date conflict", () => {
    const events = [
      createTimelineEvent({ caseId: "imm-001", eventType: "petition_filed", date: "2026-02-01", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "imm-001", eventType: "rfe_issued", date: "2026-04-15", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "imm-001", eventType: "rfe_issued", date: "2026-04-20", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("imm-001", events);
    const conflicts = conflictingDates(timeline);

    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0]!.length, 2); // both RFE dates preserved
  });

  test("Dispute Mail: account history with range event", () => {
    const events = [
      createTimelineEvent({ caseId: "dispute-001", eventType: "account_opened", date: "2024-06-01", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "dispute-001", eventType: "billing_dispute_period", date: "2026-02-01", dateEnd: "2026-03-15", datePrecision: "range", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "dispute-001", eventType: "dispute_filed", date: "2026-04-01", provenance: { level: "user_provided" } }),
    ];
    const timeline = createTimeline("dispute-001", events);
    const sorted = sortedByDate(timeline);

    assert.equal(sorted[0]!.eventType, "account_opened");
    assert.equal(sorted[2]!.eventType, "dispute_filed");
  });

  test("Notice Respond: response timeline with inferred deadline", () => {
    const events = [
      createTimelineEvent({ caseId: "notice-001", eventType: "notice_received", date: "2026-08-01", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "notice-001", eventType: "response_deadline", date: "2026-08-31", datePrecision: "inferred", provenance: { level: "rule_derived", ruleId: "30-day-response" } }),
    ];
    const timeline = createTimeline("notice-001", events);
    const sorted = sortedByDate(timeline);

    assert.equal(sorted[1]!.eventType, "response_deadline");
    assert.equal(sorted[1]!.datePrecision, "inferred");
  });

  test("Small Business: contract timeline with approximate date", () => {
    const events = [
      createTimelineEvent({ caseId: "biz-001", eventType: "contract_signed", date: "2026-03", datePrecision: "approximate", provenance: { level: "document_extracted" } }),
      createTimelineEvent({ caseId: "biz-001", eventType: "payment_due", date: "2026-04-01", datePrecision: "exact", provenance: { level: "document_extracted" } }),
    ];
    const timeline = createTimeline("biz-001", events);

    assert.equal(timeline.events[0]!.datePrecision, "approximate");
    assert.equal(timeline.events[1]!.datePrecision, "exact");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN GATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Design Gate: No Vertical-Specific Branches", () => {
  test("all verticals use the same createTimelineEvent function", () => {
    const appeal = createTimelineEvent({ caseId: "appeal", eventType: "denial_issued", date: "2026-07-17", provenance: { level: "document_extracted" } });
    const imm = createTimelineEvent({ caseId: "imm", eventType: "rfe_issued", date: "2026-04-15", provenance: { level: "document_extracted" } });
    const dispute = createTimelineEvent({ caseId: "dispute", eventType: "dispute_filed", date: "2026-04-01", provenance: { level: "user_provided" } });
    const notice = createTimelineEvent({ caseId: "notice", eventType: "response_deadline", date: "2026-08-31", datePrecision: "inferred", provenance: { level: "rule_derived", ruleId: "r" } });
    const biz = createTimelineEvent({ caseId: "biz", eventType: "contract_signed", date: "2026-03", datePrecision: "approximate", provenance: { level: "document_extracted" } });

    for (const ev of [appeal, imm, dispute, notice, biz]) {
      assert.equal(typeof ev.caseId, "string");
      assert.equal(typeof ev.eventType, "string");
      assert.equal(typeof ev.datePrecision, "string");
      assert.equal(typeof ev.integrity, "string");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PROVENANCE CHAIN: Document → SourceRef → Fact → Evidence → TimelineEvent → Timeline
// ═══════════════════════════════════════════════════════════════════════════════

describe("Full Provenance Chain with Timeline", () => {
  test("consumer can trace a timeline event back to its source document", () => {
    const ref = createSourceRef({ documentId: createId("doc-A"), documentName: "denial-letter.pdf", page: 2 });

    const fact = createFact({
      id: "fact-decision-date",
      subject: "appeal-001",
      predicate: "decision_date",
      value: "2026-07-17",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
    });

    const evidence = createEvidence({
      claimId: fact.id, relation: "supports", evidenceType: "document", evidenceId: "doc-A",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
    });

    const event = createTimelineEvent({
      caseId: "appeal-001",
      eventType: "decision_issued",
      date: "2026-07-17",
      datePrecision: "exact",
      integrity: "documented",
      factId: fact.id,
      provenance: { level: "document_extracted", sourceRefs: [ref] },
    });

    const timeline = createTimeline("appeal-001", [event]);

    // 1. Timeline event references the fact
    assert.equal(event.factId, fact.id);

    // 2. Fact has source references to the document
    assert.equal(fact.provenance.sourceRefs[0]!.documentName, "denial-letter.pdf");
    assert.equal(fact.provenance.sourceRefs[0]!.page, 2);

    // 3. Evidence supports the fact
    assert.equal(evidence.claimId, fact.id);

    // 4. Timeline event has its own provenance linking to the document
    assert.equal(event.provenance.sourceRefs[0]!.documentName, "denial-letter.pdf");

    // 5. Event is documented (from a document), not inferred
    assert.equal(event.integrity, "documented");
    assert.equal(event.datePrecision, "exact");
  });

  test("conflicting temporal facts — both events survive", () => {
    const ref1 = createSourceRef({ documentId: createId("doc-A"), documentName: "hearing-notice.pdf", page: 1 });
    const ref2 = createSourceRef({ documentId: createId("doc-B"), documentName: "court-record.pdf", page: 5 });

    const factA = createFact({ id: "fA", subject: "case-001", predicate: "hearing_date", value: "2026-03-20", provenance: { level: "document_extracted", sourceRefs: [ref1] } });
    const factB = createFact({ id: "fB", subject: "case-001", predicate: "hearing_date", value: "2026-03-25", provenance: { level: "document_extracted", sourceRefs: [ref2] } });

    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "date-conflict" });
    const c = contradictions[0]!;

    const evA = createTimelineEvent({
      caseId: "case-001", eventType: "hearing", date: "2026-03-20",
      datePrecision: "exact", integrity: "conflicting",
      factId: factA.id, contradictionId: c.id,
      provenance: { level: "document_extracted", sourceRefs: [ref1] },
    });
    const evB = createTimelineEvent({
      caseId: "case-001", eventType: "hearing", date: "2026-03-25",
      datePrecision: "exact", integrity: "conflicting",
      factId: factB.id, contradictionId: c.id,
      provenance: { level: "document_extracted", sourceRefs: [ref2] },
    });

    const timeline = createTimeline("case-001", [evA, evB]);

    // Both events survive — neither is destroyed
    assert.equal(activeEvents(timeline).length, 2);

    // Both link to the contradiction
    assert.equal(evA.contradictionId, c.id);
    assert.equal(evB.contradictionId, c.id);

    // Both link to their respective facts
    assert.equal(evA.factId, factA.id);
    assert.equal(evB.factId, factB.id);

    // Both trace to different source documents
    assert.equal(evA.provenance.sourceRefs[0]!.documentName, "hearing-notice.pdf");
    assert.equal(evB.provenance.sourceRefs[0]!.documentName, "court-record.pdf");

    // conflictingDates detects the conflict
    const conflicts = conflictingDates(timeline);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0]!.length, 2);
  });
});

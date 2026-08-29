import { z } from "zod";
import type { Decision } from "./decision";
import type { Evidence } from "./evidence";
import type { AppealGround, GroundType } from "./ground";
import type { XRayFinding, SourceRef } from "./xray";

/* ═══════════════════════════════════════════════════════════
   APPEAL TIMELINE™ DOMAIN MODEL
   Reconstructs the entire case history from documents.
   Every event has evidence attached and an integrity status.
   This is the canonical event model — the data structure
   that deadline intelligence, contradiction detection, and
   proof packets build on top of.
   ═══════════════════════════════════════════════════════════ */

/* ── Event Integrity Status ── */
export type EventStatus =
  | "documented"    // 🟢 Directly supported by a source document
  | "user_reported" // 🔵 Entered by user, not independently supported
  | "inferred"      // 🟡 AI reconstructed from multiple documents
  | "conflicting"   // 🔴 Two sources appear to disagree
  | "unknown";      // ⚪ Important information is missing

export const EVENT_STATUS_META: Record<EventStatus, { label: string; icon: string; color: string; description: string }> = {
  documented:    { label: "Documented",    icon: "🟢", color: "emerald", description: "Directly supported by a source document" },
  user_reported: { label: "User reported",  icon: "🔵", color: "blue",    description: "Entered by you but not independently supported" },
  inferred:      { label: "Inferred",       icon: "🟡", color: "amber",   description: "Reconstructed from multiple documents" },
  conflicting:   { label: "Conflicting",    icon: "🔴", color: "red",     description: "Two sources appear to disagree" },
  unknown:       { label: "Unknown",        icon: "⚪", color: "gray",    description: "Important information is missing" },
};

/* ── Event Category ── */
export type EventCategory =
  | "application"     // Initial application or claim filed
  | "submission"      // Documents or evidence submitted
  | "correspondence"  // Letters, emails, communications
  | "hearing"         // Hearing or interview
  | "decision"        // Decision or ruling issued
  | "deadline"        // A deadline date
  | "agency_action"   // Agency took some action (review, request, etc.)
  | "user_action"     // User took some action
  | "other";

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  application: "Application",
  submission: "Submission",
  correspondence: "Correspondence",
  hearing: "Hearing",
  decision: "Decision",
  deadline: "Deadline",
  agency_action: "Agency Action",
  user_action: "Your Action",
  other: "Event",
};

/* ── Timeline Event ── The canonical unit of case history */
export interface TimelineEvent {
  id: string;
  date: string;                    // ISO date (YYYY-MM-DD)
  datePrecision: "day" | "month" | "year" | "unknown";
  description: string;
  category: EventCategory;
  status: EventStatus;
  /** Source documents that support this event */
  sources: SourceRef[];
  /** The specific quote/excerpt that establishes this event */
  evidence?: {
    quote: string;
    sourceRef: SourceRef;
  };
  /** If conflicting, what the conflicting sources say */
  conflictingClaims?: { source: SourceRef; text: string }[];
  /** Which X-Ray finding is related to this event */
  relatedFindingId?: string;
  /** Whether the user has confirmed this event */
  userConfirmed: boolean;
  /** Whether this event is a deadline */
  isDeadline: boolean;
  /** Days from this event to the next event (for gap detection) */
  daysToNext?: number;
  createdAt: string;
}

/* ── Timeline Conflict ── When two sources disagree ── */
export interface TimelineConflict {
  id: string;
  title: string;
  description: string;
  /** The two events that conflict */
  events: { eventAId: string; eventBId: string };
  /** What each source says */
  claimA: { source: SourceRef; text: string; date: string };
  claimB: { source: SourceRef; text: string; date: string };
  /** Why this matters for the appeal */
  whyItMatters: string;
  /** Suggested ground if user adds to appeal */
  suggestedGroundType: GroundType;
  suggestedClaim: string;
  /** Whether the user has resolved or added this */
  status: "open" | "resolved" | "added_to_appeal";
  /** Alternative explanations (from Stress Test integration) */
  alternativeExplanations: string[];
  createdAt: string;
}

/* ── Timeline Gap ── Periods with no documented events ── */
export interface TimelineGap {
  id: string;
  /** Start and end of the gap */
  fromDate: string;
  toDate: string;
  /** How many days with no documented events */
  daysUnaccounted: number;
  /** What happened just before the gap */
  precedingEventDescription: string;
  /** What happened just after the gap */
  followingEventDescription: string;
  /** Types of records that might explain the gap */
  potentiallyUsefulRecords: string[];
  /** How significant this gap might be */
  significance: "high" | "medium" | "low";
  status: "open" | "explained";
  createdAt: string;
}

/* ── Deadline Calculation ── */
export interface DeadlineCalculation {
  /** The calculated deadline date */
  deadlineDate: string | null;
  /** Where the deadline information came from */
  source: "extracted" | "user_provided" | "inferred";
  /** The document and page where the deadline was found */
  sourceRef?: SourceRef;
  /** If multiple sources give different deadlines */
  conflictingDeadlines?: {
    deadlineA: { date: string; source: SourceRef };
    deadlineB: { date: string; source: SourceRef };
  } | null;
  /** Days remaining from today */
  daysRemaining: number | null;
  /** Whether the deadline has passed */
  hasPassed: boolean;
  /** Whether the deadline is safe to rely on */
  isReliable: boolean;
  /** Warning message if the deadline is uncertain */
  warning?: string;
  /** The decision date used for calculation */
  decisionDate?: string;
  /** The stated appeal period (e.g., "30 days") */
  statedAppealPeriod?: string;
}

/* ── Timeline Result ── The complete timeline output ── */
export interface TimelineResult {
  id: string;
  events: TimelineEvent[];
  conflicts: TimelineConflict[];
  gaps: TimelineGap[];
  deadline: DeadlineCalculation | null;
  summary: {
    totalEvents: number;
    documented: number;
    userReported: number;
    inferred: number;
    conflicting: number;
    unknown: number;
    totalConflicts: number;
    totalGaps: number;
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
  };
  builtAt: string;
}

/* ═══════════════════════════════════════════════════════════
   EVENT EXTRACTION
   Extract events from document text using pattern matching.
   ═══════════════════════════════════════════════════════════ */

/* ── Analyzed document input ── */
export interface TimelineDocument {
  id: string;
  name: string;
  text: string;
  pageCount: number;
  isDecision: boolean;
  /** Role of this document */
  role: "decision" | "evidence" | "correspondence" | "supporting" | "unknown";
}

/* ── Date regex patterns ── */
const DATE_PATTERNS = [
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
];

/* ── Event-type keywords ── */
const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  application: ["application", "applied", "claim filed", "petition", "request submitted", "filed"],
  submission: ["submitted", "received", "uploaded", "provided", "documentation", "evidence", "documents", "attachment", "exhibit"],
  correspondence: ["email", "letter", "correspondence", "notified", "mailed", "sent", "response", "reply"],
  hearing: ["hearing", "interview", "conference", "meeting", "appearance"],
  decision: ["decision", "denial", "denied", "approved", "granted", "rejected", "ruling", "judgment", "order", "determination", "notice"],
  deadline: ["deadline", "due", "within", "appeal period", "must file", "no later than", "by date"],
  agency_action: ["agency", "reviewed", "examined", "evaluated", "assessed", "considered", "requested", "required", "notice"],
  user_action: ["you", "appellant", "claimant", "petitioner", "applicant"],
  other: [],
};

interface ExtractedEvent {
  date: string;
  raw: string;
  context: string;
  category: EventCategory;
  documentId: string;
  documentName: string;
  page: number;
  offset: number;
}

function parseDate(raw: string): string | null {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function classifyContext(context: string): EventCategory {
  const lower = context.toLowerCase();
  let bestCategory: EventCategory = "other";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [EventCategory, string[]][]) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  return bestCategory;
}

function extractEventsFromDoc(doc: TimelineDocument): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];

  for (const pattern of DATE_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(doc.text)) !== null) {
      const dateStr = parseDate(match[0]);
      if (!dateStr) continue;

      const offset = match.index;
      const start = Math.max(0, offset - 120);
      const end = Math.min(doc.text.length, offset + match[0].length + 120);
      const context = doc.text.slice(start, end).trim();

      // Estimate page number (rough: chars per page)
      const page = Math.ceil(offset / 3000) || 1;

      events.push({
        date: dateStr,
        raw: match[0],
        context,
        category: classifyContext(context),
        documentId: doc.id,
        documentName: doc.name,
        page,
        offset,
      });
    }
  }

  return events;
}

/* ═══════════════════════════════════════════════════════════
   EVENT DEDUPLICATION & MERGING
   ═══════════════════════════════════════════════════════════ */

function deduplicateEvents(events: ExtractedEvent[]): ExtractedEvent[] {
  const seen = new Map<string, ExtractedEvent>();

  for (const evt of events) {
    const key = `${evt.date}:${evt.category}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, evt);
    } else {
      // If two events have the same date+category from different docs,
      // keep the one from the decision doc (higher authority)
      // or the one with more context
      if (evt.context.length > existing.context.length) {
        seen.set(key, evt);
      }
    }
  }

  return Array.from(seen.values());
}

/* ═══════════════════════════════════════════════════════════
   STATUS ASSIGNMENT
   ═══════════════════════════════════════════════════════════ */

function assignStatus(
  evt: ExtractedEvent,
  allEvents: ExtractedEvent[],
  xrayFindings: XRayFinding[],
): { status: EventStatus; relatedFindingId?: string } {
  // Check if this event conflicts with another
  const sameDateDifferentDoc = allEvents.filter(
    (e) => e.date === evt.date && e.documentId !== evt.documentId && e.category === evt.category
  );

  if (sameDateDifferentDoc.length > 0) {
    // Check if X-Ray flagged a date_conflict for this
    const related = xrayFindings.find(
      (f) => f.type === "date_conflict" &&
        f.sources.some((s) => s.documentId === evt.documentId)
    );
    return { status: "conflicting", relatedFindingId: related?.id };
  }

  // Documented — has a source document
  return { status: "documented", relatedFindingId: undefined };
}

/* ═══════════════════════════════════════════════════════════
   CONFLICT DETECTION
   Find events where sources disagree.
   ═══════════════════════════════════════════════════════════ */

function detectTimelineConflicts(
  events: TimelineEvent[],
  xrayFindings: XRayFinding[],
): TimelineConflict[] {
  const conflicts: TimelineConflict[] = [];

  // Group events by category to find same-type events with different dates
  const byCategory = new Map<EventCategory, TimelineEvent[]>();
  for (const evt of events) {
    if (evt.category === "deadline" || evt.category === "decision") continue; // these are expected to differ
    const group = byCategory.get(evt.category) || [];
    group.push(evt);
    byCategory.set(evt.category, group);
  }

  for (const [category, group] of byCategory) {
    if (group.length < 2) continue;

    // Sort by date
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        if (a.date === b.date) continue; // same date, no conflict
        if (a.sources.length === 0 || b.sources.length === 0) continue;

        // Check if X-Ray already flagged this as a date_conflict
        const xrayFinding = xrayFindings.find(
          (f) => f.type === "date_conflict" &&
            f.sources.some((s) => s.documentId === a.sources[0]?.documentId) &&
            f.sources.some((s) => s.documentId === b.sources[0]?.documentId)
        );

        // Only flag as conflict if dates are close enough to be about the same event
        const daysDiff = Math.abs(
          (new Date(b.date).getTime() - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 90) continue; // too far apart, probably different events

        const categoryLabel = EVENT_CATEGORY_LABELS[category];
        const earlierEvent = a.date < b.date ? a : b;
        const laterEvent = a.date < b.date ? b : a;

        conflicts.push({
          id: crypto.randomUUID(),
          title: `Potential timeline conflict: ${categoryLabel.toLowerCase()}`,
          description: `The decision states something about ${categoryLabel.toLowerCase()} on ${formatDate(laterEvent.date)}, but a document in your record appears to show it on ${formatDate(earlierEvent.date)}.`,
          events: { eventAId: a.id, eventBId: b.id },
          claimA: {
            source: a.sources[0] || { documentId: "", documentName: "Unknown" },
            text: a.evidence?.quote || a.description,
            date: a.date,
          },
          claimB: {
            source: b.sources[0] || { documentId: "", documentName: "Unknown" },
            text: b.evidence?.quote || b.description,
            date: b.date,
          },
          whyItMatters: xrayFinding?.whyItMatters ||
            `The discrepancy may affect how the decision's timeline is understood. If the date is wrong, it could undermine the agency's reasoning.`,
          suggestedGroundType: "factual_error",
          suggestedClaim: xrayFinding?.suggestedClaim ||
            `The decision incorrectly states the ${categoryLabel.toLowerCase()} date as ${formatDate(laterEvent.date)}, when the actual date was ${formatDate(earlierEvent.date)} as shown in ${earlierEvent.sources[0]?.documentName || "your records"}.`,
          status: "open",
          alternativeExplanations: [],
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return conflicts;
}

/* ═══════════════════════════════════════════════════════════
   GAP DETECTION
   Find periods with no documented events.
   ═══════════════════════════════════════════════════════════ */

const GAP_RECORD_SUGGESTIONS: Record<EventCategory, string[]> = {
  application: [],
  submission: [],
  correspondence: ["correspondence", "email confirmation", "mailing receipt"],
  hearing: ["hearing notice", "hearing transcript", "conference record"],
  decision: [],
  deadline: [],
  agency_action: ["status update", "request for additional information", "internal review record", "agency memo"],
  user_action: ["submission receipt", "follow-up correspondence", "response letter"],
  other: ["correspondence", "status update", "record of communication"],
};

function detectGaps(events: TimelineEvent[]): TimelineGap[] {
  const gaps: TimelineGap[] = [];
  const sorted = [...events]
    .filter((e) => e.status === "documented" || e.status === "inferred")
    .sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const daysDiff = Math.round(
      (new Date(next.date).getTime() - new Date(current.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only flag gaps of 14+ days
    if (daysDiff < 14) continue;

    const significance: "high" | "medium" | "low" =
      daysDiff > 60 ? "high" : daysDiff > 30 ? "medium" : "low";

    const suggestions =
      GAP_RECORD_SUGGESTIONS[current.category] ||
      GAP_RECORD_SUGGESTIONS[next.category] ||
      GAP_RECORD_SUGGESTIONS.other;

    gaps.push({
      id: crypto.randomUUID(),
      fromDate: current.date,
      toDate: next.date,
      daysUnaccounted: daysDiff,
      precedingEventDescription: `${formatDate(current.date)}: ${current.description}`,
      followingEventDescription: `${formatDate(next.date)}: ${next.description}`,
      potentiallyUsefulRecords: suggestions.length > 0 ? suggestions : ["correspondence", "status updates", "agency records"],
      significance,
      status: "open",
      createdAt: new Date().toISOString(),
    });
  }

  return gaps;
}

/* ═══════════════════════════════════════════════════════════
   DEADLINE ENGINE
   Calculate appeal deadline from actual documents.
   ═══════════════════════════════════════════════════════════ */

const APPEAL_PERIOD_PATTERNS = [
  /(?:within|no later than|must be (?:filed|submitted|postmarked))\s+(\d{1,3})\s+(?:calendar\s+)?days?/gi,
  /(\d{1,3})\s+(?:calendar\s+)?days?\s+(?:from|after|of)\s+(?:the\s+)?(?:date\s+of\s+)?(?:decision|ruling|order|notice|denial)/gi,
  /appeal(?:s)?\s+(?:period|deadline)(?:\s+is)?\s+(\d{1,3})\s+days?/gi,
];

function extractAppealPeriod(text: string): string | null {
  for (const pattern of APPEAL_PERIOD_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      return `${match[1]} days`;
    }
  }
  return null;
}

function calculateDeadline(
  events: TimelineEvent[],
  decision: Decision,
  documents: TimelineDocument[],
): DeadlineCalculation | null {
  // Find the decision date
  const decisionEvent = events.find((e) => e.category === "decision");
  const decisionDate = decisionEvent?.date || decision.decisionDate;

  if (!decisionDate) return null;

  // Find stated appeal period in documents
  const allText = documents.map((d) => d.text).join("\n");
  const statedPeriod = extractAppealPeriod(allText) || undefined;

  // Find deadline events
  const deadlineEvents = events.filter((e) => e.category === "deadline" || e.isDeadline);
  const userDeadline = decision.deadline?.date;

  // Check for conflicting deadlines
  const allDeadlineDates = [
    ...deadlineEvents.map((e) => e.date),
    ...(userDeadline ? [userDeadline] : []),
  ].filter(Boolean);

  const uniqueDates = [...new Set(allDeadlineDates)];

  // Calculate deadline
  let deadlineDate: string | null = null;
  let source: "extracted" | "user_provided" | "inferred" = "inferred";

  if (uniqueDates.length === 1) {
    deadlineDate = uniqueDates[0];
    source = userDeadline ? "user_provided" : "extracted";
  } else if (uniqueDates.length === 0 && statedPeriod) {
    // Calculate from decision date + stated period
    const days = parseInt(statedPeriod);
    if (!isNaN(days)) {
      const calculated = new Date(decisionDate);
      calculated.setDate(calculated.getDate() + days);
      deadlineDate = calculated.toISOString().split("T")[0];
      source = "inferred";
    }
  } else if (uniqueDates.length >= 2) {
    // Conflicting deadlines — use the earliest (most conservative)
    deadlineDate = uniqueDates.sort()[0];
    source = "extracted";
  }

  if (!deadlineDate) {
    // Fall back to user-provided deadline
    if (userDeadline) {
      deadlineDate = userDeadline;
      source = "user_provided";
    } else {
      return null;
    }
  }

  // Calculate days remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadlineDate);
  due.setHours(0, 0, 0, 0);
  const daysRemaining = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Check for conflicts
  const conflictingDeadlines = uniqueDates.length >= 2
    ? {
        deadlineA: { date: uniqueDates[0], source: { documentId: "", documentName: "Source A" } as SourceRef },
        deadlineB: { date: uniqueDates[1], source: { documentId: "", documentName: "Source B" } as SourceRef },
      }
    : null;

  const hasPassed = daysRemaining < 0;
  const isReliable = uniqueDates.length <= 1 && source !== "inferred";

  let warning: string | undefined;
  if (conflictingDeadlines) {
    warning = "Two documents appear to identify different appeal deadlines. Do not rely on the calculated date until verified.";
  } else if (source === "inferred") {
    warning = "This deadline was calculated from the decision date and stated appeal period. Verify it against the actual document.";
  } else if (hasPassed) {
    warning = "This deadline has passed. Check whether an extension or different filing period applies.";
  }

  // Find source reference
  const deadlineEvent = deadlineEvents[0];
  const sourceRef = deadlineEvent?.sources?.[0] ||
    (userDeadline ? { documentId: "", documentName: "User-provided" } as SourceRef : undefined);

  return {
    deadlineDate,
    source,
    sourceRef,
    conflictingDeadlines,
    daysRemaining,
    hasPassed,
    isReliable,
    warning,
    decisionDate,
    statedAppealPeriod: statedPeriod,
  };
}

/* ═══════════════════════════════════════════════════════════
   BUILD TIMELINE
   The main orchestrator — reconstructs the entire case history.
   ═══════════════════════════════════════════════════════════ */

export interface BuildTimelineInput {
  documents: TimelineDocument[];
  decision: Decision;
  xrayFindings: XRayFinding[];
  /** User-reported events (from the existing appeal timeline) */
  userEvents?: { date: string; description: string }[];
  /** Today's date for deadline calculation */
  today?: string;
}

export function buildTimeline(input: BuildTimelineInput): TimelineResult {
  const { documents, decision, xrayFindings, userEvents = [] } = input;

  // 1. Extract events from all documents
  const allExtracted = documents.flatMap(extractEventsFromDoc);

  // 2. Deduplicate
  const deduped = deduplicateEvents(allExtracted);

  // 3. Convert to TimelineEvent objects with status
  const events: TimelineEvent[] = deduped.map((ext) => {
    const { status, relatedFindingId } = assignStatus(ext, allExtracted, xrayFindings);

    return {
      id: crypto.randomUUID(),
      date: ext.date,
      datePrecision: "day",
      description: cleanContext(ext.context),
      category: ext.category,
      status,
      sources: [{
        documentId: ext.documentId,
        documentName: ext.documentName,
        page: ext.page,
        excerpt: ext.context.slice(0, 200),
      }],
      evidence: {
        quote: extractQuote(ext.context, ext.raw),
        sourceRef: {
          documentId: ext.documentId,
          documentName: ext.documentName,
          page: ext.page,
          excerpt: ext.context.slice(0, 200),
        },
      },
      relatedFindingId,
      userConfirmed: false,
      isDeadline: ext.category === "deadline",
      createdAt: new Date().toISOString(),
    };
  });

  // 4. Add user-reported events
  for (const ue of userEvents) {
    events.push({
      id: crypto.randomUUID(),
      date: ue.date,
      datePrecision: "day",
      description: ue.description,
      category: classifyContext(ue.description) || "other",
      status: "user_reported",
      sources: [],
      userConfirmed: true,
      isDeadline: /deadline|due|appeal period/i.test(ue.description),
      createdAt: new Date().toISOString(),
    });
  }

  // 5. Add decision date if not already present
  if (decision.decisionDate && !events.some((e) => e.date === decision.decisionDate && e.category === "decision")) {
    events.push({
      id: crypto.randomUUID(),
      date: decision.decisionDate,
      datePrecision: "day",
      description: `Decision issued${decision.agency ? ` by ${decision.agency}` : ""}`,
      category: "decision",
      status: "documented",
      sources: decision.documentId ? [{
        documentId: decision.documentId,
        documentName: decision.documentFilename || "Decision document",
        excerpt: `Decision date: ${decision.decisionDate}`,
      }] : [],
      userConfirmed: false,
      isDeadline: false,
      createdAt: new Date().toISOString(),
    });
  }

  // 6. Add deadline if present
  if (decision.deadline?.date && !events.some((e) => e.date === decision.deadline!.date && e.category === "deadline")) {
    events.push({
      id: crypto.randomUUID(),
      date: decision.deadline.date,
      datePrecision: "day",
      description: "Appeal deadline",
      category: "deadline",
      status: decision.deadline.source === "user_provided" ? "user_reported" : "documented",
      sources: decision.documentId ? [{
        documentId: decision.documentId,
        documentName: decision.documentFilename || "Decision document",
        excerpt: decision.deadline.appealInstructions || "Appeal deadline",
      }] : [],
      userConfirmed: false,
      isDeadline: true,
      createdAt: new Date().toISOString(),
    });
  }

  // 7. Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  // 8. Calculate daysToNext for each event
  for (let i = 0; i < events.length - 1; i++) {
    const days = Math.round(
      (new Date(events[i + 1].date).getTime() - new Date(events[i].date).getTime()) / (1000 * 60 * 60 * 24)
    );
    events[i].daysToNext = days;
  }

  // 9. Detect conflicts
  const conflicts = detectTimelineConflicts(events, xrayFindings);

  // 10. Mark conflicting events
  for (const conflict of conflicts) {
    const evtA = events.find((e) => e.id === conflict.events.eventAId);
    const evtB = events.find((e) => e.id === conflict.events.eventBId);
    if (evtA) {
      evtA.status = "conflicting";
      evtA.conflictingClaims = [conflict.claimA, conflict.claimB || conflict.claimB];
    }
    if (evtB) {
      evtB.status = "conflicting";
      evtB.conflictingClaims = [conflict.claimA, conflict.claimB];
    }
  }

  // 11. Detect gaps
  const gaps = detectGaps(events);

  // 12. Calculate deadline
  const deadline = calculateDeadline(events, decision, documents);

  // 13. Build summary
  const summary = {
    totalEvents: events.length,
    documented: events.filter((e) => e.status === "documented").length,
    userReported: events.filter((e) => e.status === "user_reported").length,
    inferred: events.filter((e) => e.status === "inferred").length,
    conflicting: events.filter((e) => e.status === "conflicting").length,
    unknown: events.filter((e) => e.status === "unknown").length,
    totalConflicts: conflicts.length,
    totalGaps: gaps.length,
    dateRangeStart: events.length > 0 ? events[0].date : null,
    dateRangeEnd: events.length > 0 ? events[events.length - 1].date : null,
  };

  return {
    id: crypto.randomUUID(),
    events,
    conflicts,
    gaps,
    deadline,
    summary,
    builtAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════
   STRESS TEST INTEGRATION
   Generate alternative explanations for timeline conflicts.
   ═══════════════════════════════════════════════════════════ */

export function explainConflict(conflict: TimelineConflict): string[] {
  const explanations: string[] = [];

  explanations.push(
    `The receipt establishes that the document was uploaded on ${formatDate(conflict.claimA.date)}, but does not establish that the agency successfully received or processed it. The agency may argue the document was lost, misrouted, or not actually reviewed.`
  );

  explanations.push(
    `The date in the decision may refer to when the document was logged into the agency's internal system, not when it was originally submitted. These dates can differ if there was a processing delay.`
  );

  explanations.push(
    `The document may have been submitted to a different department or portal than the one that made the decision. The agency may argue it was not before the decision-maker.`
  );

  return explanations;
}

/* ═══════════════════════════════════════════════════════════
   GROUND GENERATION FROM CONFLICT
   ═══════════════════════════════════════════════════════════ */

export function conflictToGround(conflict: TimelineConflict): {
  type: GroundType;
  claim: string;
  source: string;
} {
  return {
    type: conflict.suggestedGroundType,
    claim: conflict.suggestedClaim,
    source: `${conflict.claimA.source.documentName} (${formatDate(conflict.claimA.date)}) vs. ${conflict.claimB.source.documentName} (${formatDate(conflict.claimB.date)})`,
  };
}

/* ═══════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════ */

function cleanContext(context: string): string {
  // Clean up the context into a readable event description
  const cleaned = context
    .replace(/\s+/g, " ")
    .replace(/[^\w\s,.\-/:]/g, "")
    .trim();

  // Try to find a sentence containing the date
  const sentences = cleaned.split(/[.!?]+/);
  const dateSentence = sentences.find((s) =>
    DATE_PATTERNS.some((p) => p.test(s))
  );

  return (dateSentence || cleaned).slice(0, 200).trim();
}

function extractQuote(context: string, raw: string): string {
  // Find the sentence containing the date
  const sentences = context.split(/[.!?]+/);
  const quote = sentences.find((s) => s.includes(raw));
  return (quote || context.slice(0, 150)).trim();
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Zod schema for the timeline result (for validation) ── */
export const timelineResultSchema = z.object({
  id: z.string(),
  events: z.array(z.object({
    id: z.string(),
    date: z.string(),
    datePrecision: z.enum(["day", "month", "year", "unknown"]),
    description: z.string(),
    category: z.string(),
    status: z.string(),
    sources: z.array(z.object({
      documentId: z.string(),
      documentName: z.string(),
      page: z.number().optional(),
      excerpt: z.string().optional(),
    })),
    userConfirmed: z.boolean(),
    isDeadline: z.boolean(),
    daysToNext: z.number().optional(),
    createdAt: z.string(),
  })),
  conflicts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: z.string(),
    createdAt: z.string(),
  })),
  gaps: z.array(z.object({
    id: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
    daysUnaccounted: z.number(),
    significance: z.string(),
    status: z.string(),
    createdAt: z.string(),
  })),
  deadline: z.object({
    deadlineDate: z.string().nullable(),
    source: z.string(),
    daysRemaining: z.number().nullable(),
    hasPassed: z.boolean(),
    isReliable: z.boolean(),
    warning: z.string().optional(),
  }).nullable(),
  summary: z.object({
    totalEvents: z.number(),
    documented: z.number(),
    userReported: z.number(),
    inferred: z.number(),
    conflicting: z.number(),
    unknown: z.number(),
    totalConflicts: z.number(),
    totalGaps: z.number(),
    dateRangeStart: z.string().nullable(),
    dateRangeEnd: z.string().nullable(),
  }),
  builtAt: z.string(),
});

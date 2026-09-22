import { createId } from "@mailmypdf/core";
import { createSourceRef, type SourceRef } from "@mailmypdf/documents";
import {
  createTimeline,
  createTimelineEvent,
  detectGaps,
  conflictingDates,
  sortedByDate,
  type TimelineEvent as CoreTimelineEvent,
} from "../timeline.js";
import {
  computeDeadline,
  createDeadlineRule,
  createTemporalConstraint,
  type DeadlineResult,
} from "../deadline.js";
import type { Decision } from "./decision.js";
import type { GroundType } from "./ground.js";
import type { XRayFinding } from "./xray.js";

/** Appeal-specific interpretation layered on the shared timeline engine. */
export type AppealEventCategory =
  | "application"
  | "submission"
  | "correspondence"
  | "hearing"
  | "decision"
  | "deadline"
  | "agency_action"
  | "user_action"
  | "other";

export const APPEAL_EVENT_CATEGORY_LABELS: Record<AppealEventCategory, string> = {
  application: "Application",
  submission: "Submission",
  correspondence: "Correspondence",
  hearing: "Hearing",
  decision: "Decision",
  deadline: "Deadline",
  agency_action: "Agency Action",
  user_action: "User Action",
  other: "Event",
};

export interface AppealTimelineDocument {
  id: string;
  name: string;
  text: string;
  pageCount: number;
  isDecision: boolean;
  role: "decision" | "evidence" | "correspondence" | "supporting" | "unknown";
}

export interface AppealTimelineEvent extends CoreTimelineEvent {
  readonly category: AppealEventCategory;
  readonly sources: readonly SourceRef[];
  readonly quote?: string;
  readonly relatedFindingId?: string;
  readonly userConfirmed: boolean;
  readonly isDeadline: boolean;
}

export interface AppealTimelineConflict {
  id: string;
  title: string;
  eventIds: string[];
  claims: Array<{ source: SourceRef; text: string; date: string }>;
  whyItMatters: string;
  suggestedGroundType: GroundType;
  suggestedClaim: string;
  status: "open" | "resolved" | "added_to_appeal";
  alternativeExplanations: string[];
  relatedFindingId?: string;
  createdAt: string;
}

export interface AppealTimelineGap {
  fromDate: string;
  toDate: string;
  daysUnaccounted: number;
  significance: "high" | "medium" | "low";
  potentiallyUsefulRecords: string[];
}

export interface AppealDeadlineAssessment {
  deadlineDate: string | null;
  source: "document_extracted" | "user_provided" | "rule_derived" | "unknown";
  daysRemaining: number | null;
  hasPassed: boolean;
  isReliable: boolean;
  warning?: string;
  statedAppealPeriod?: string;
  computed?: DeadlineResult;
  conflictingDates: string[];
}

export interface AppealTimelineResult {
  caseId: string;
  events: AppealTimelineEvent[];
  conflicts: AppealTimelineConflict[];
  gaps: AppealTimelineGap[];
  deadline: AppealDeadlineAssessment;
  summary: {
    totalEvents: number;
    documented: number;
    userReported: number;
    inferred: number;
    conflictingGroups: number;
    totalGaps: number;
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
  };
  builtAt: string;
}

export interface BuildAppealTimelineInput {
  caseId: string;
  documents: AppealTimelineDocument[];
  decision: Decision;
  xrayFindings?: XRayFinding[];
  userEvents?: Array<{ date?: string; description: string; category?: AppealEventCategory }>;
  today?: string;
}

const CATEGORY_KEYWORDS: Record<AppealEventCategory, readonly string[]> = {
  application: ["application", "applied", "claim filed", "petition", "request submitted", "filed"],
  submission: ["submitted", "received", "uploaded", "provided", "documentation", "evidence", "attachment", "exhibit"],
  correspondence: ["email", "letter", "correspondence", "notified", "mailed", "sent", "response", "reply"],
  hearing: ["hearing", "interview", "conference", "meeting", "appearance"],
  decision: ["decision", "denial", "denied", "approved", "granted", "rejected", "ruling", "judgment", "order", "determination"],
  deadline: ["deadline", "due", "appeal period", "must file by", "must submit by", "no later than", "postmarked by"],
  agency_action: ["agency", "reviewed", "examined", "evaluated", "assessed", "considered", "requested", "required"],
  user_action: ["appellant", "claimant", "petitioner", "applicant", "you submitted", "you filed"],
  other: [],
};

const DATE_PATTERNS = [
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
];

const APPEAL_PERIOD_PATTERNS = [
  /(?:within|no later than|must be (?:filed|submitted|postmarked))\s+(\d{1,3})\s+(?:calendar\s+)?days?/i,
  /(\d{1,3})\s+(?:calendar\s+)?days?\s+(?:from|after|of)\s+(?:the\s+)?(?:date\s+of\s+)?(?:decision|ruling|order|notice|denial)/i,
  /appeal(?:s)?\s+(?:period|deadline)(?:\s+is)?\s+(\d{1,3})\s+days?/i,
];

function classifyContext(context: string): AppealEventCategory {
  const lower = context.toLowerCase();
  let best: AppealEventCategory = "other";
  let score = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[AppealEventCategory, readonly string[]]>) {
    const next = keywords.filter((keyword) => lower.includes(keyword)).length;
    if (next > score) {
      best = category;
      score = next;
    }
  }
  return best;
}

/**
 * Classify the specific date mention before considering the broader paragraph.
 * Relative language such as "appeal within 30 days" must not turn a nearby
 * decision date into an explicit deadline date. Explicit deadline dates need
 * date-adjacent language such as "due", "no later than", or "file by".
 */
function classifyDateMention(localContext: string, broaderContext: string): AppealEventCategory {
  const local = localContext.toLowerCase();
  if (/\b(deadline|due(?:\s+date)?|no later than|must\s+(?:file|submit|appeal)\s+by|postmarked\s+by|file\s+by|submit\s+by)\b/.test(local)) {
    return "deadline";
  }
  if (/\b(decision|determination|denial|denied|ruling|judgment|order|issued|dated)\b/.test(local)) {
    return "decision";
  }
  const fromLocal = classifyContext(localContext);
  return fromLocal !== "other" ? fromLocal : classifyContext(broaderContext);
}

/** Text around a date mention, clipped to its own sentence so an adjacent sentence's cue words cannot reclassify it. */
function sentenceLocalContext(text: string, index: number, length: number, radius: number): string {
  const before = text.slice(Math.max(0, index - radius), index);
  const after = text.slice(index + length, Math.min(text.length, index + length + radius));
  const boundaryBefore = before.search(/[.!?;]\s[^.!?;]*$/);
  const boundaryAfter = after.search(/[.!?;](\s|$)/);
  return (boundaryBefore >= 0 ? before.slice(boundaryBefore + 2) : before)
    + text.slice(index, index + length)
    + (boundaryAfter >= 0 ? after.slice(0, boundaryAfter) : after);
}

function parseDate(raw: string): string | null {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function cleanContext(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

function sourceFor(doc: AppealTimelineDocument, page: number, excerpt: string, offset: number): SourceRef {
  return createSourceRef({
    documentId: createId(doc.id),
    documentName: doc.name,
    page: Math.max(1, page),
    excerpt: excerpt.slice(0, 500),
    offset,
  });
}

function extractDocumentEvents(caseId: string, doc: AppealTimelineDocument, findings: readonly XRayFinding[]): AppealTimelineEvent[] {
  const extracted: Array<{ date: string; context: string; raw: string; offset: number; category: AppealEventCategory }> = [];
  for (const basePattern of DATE_PATTERNS) {
    const pattern = new RegExp(basePattern.source, basePattern.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(doc.text)) !== null) {
      const date = parseDate(match[0]);
      if (!date) continue;
      const start = Math.max(0, match.index - 120);
      const end = Math.min(doc.text.length, match.index + match[0].length + 120);
      const context = cleanContext(doc.text.slice(start, end));
      const localContext = cleanContext(sentenceLocalContext(doc.text, match.index, match[0].length, 45));
      extracted.push({
        date,
        context,
        raw: match[0],
        offset: match.index,
        category: classifyDateMention(localContext, context),
      });
    }
  }

  const deduped = new Map<string, (typeof extracted)[number]>();
  for (const item of extracted) {
    const key = `${item.date}|${item.category}`;
    const existing = deduped.get(key);
    if (!existing || item.context.length > existing.context.length) deduped.set(key, item);
  }

  return [...deduped.values()].map((item) => {
    const page = Math.floor(item.offset / 3000) + 1;
    const source = sourceFor(doc, page, item.context, item.offset);
    const related = findings.find((finding) =>
      finding.type === "date_conflict" && finding.sources.some((candidate) => candidate.documentId === doc.id),
    );
    const core = createTimelineEvent({
      caseId,
      eventType: `appeal.${item.category}`,
      date: item.date,
      datePrecision: "exact",
      integrity: related ? "conflicting" : "documented",
      description: item.context,
      provenance: { level: "document_extracted", sourceRefs: [source] },
      confidence: related ? 0.65 : 0.85,
    });
    return {
      ...core,
      category: item.category,
      sources: [source],
      quote: item.context,
      ...(related ? { relatedFindingId: related.id } : {}),
      userConfirmed: false,
      isDeadline: item.category === "deadline",
    };
  });
}

function addDecisionEvents(caseId: string, decision: Decision): AppealTimelineEvent[] {
  const events: AppealTimelineEvent[] = [];
  const decisionSource = decision.documentId
    ? createSourceRef({
        documentId: createId(decision.documentId),
        documentName: decision.documentFilename ?? "Decision document",
        excerpt: decision.rawText?.slice(0, 500),
      })
    : undefined;

  if (decision.decisionDate) {
    const core = createTimelineEvent({
      caseId,
      eventType: "appeal.decision",
      date: decision.decisionDate,
      datePrecision: "exact",
      integrity: decisionSource ? "documented" : "unknown",
      description: `Decision issued${decision.agency ? ` by ${decision.agency}` : ""}`,
      provenance: decisionSource
        ? { level: "document_extracted", sourceRefs: [decisionSource] }
        : { level: "user_provided" },
      confidence: decisionSource ? 0.95 : 0.6,
    });
    events.push({ ...core, category: "decision", sources: decisionSource ? [decisionSource] : [], userConfirmed: false, isDeadline: false });
  }

  if (decision.deadline?.date) {
    const level = decision.deadline.source === "extracted"
      ? "document_extracted"
      : decision.deadline.source === "user_provided"
        ? "user_provided"
        : "ai_inferred";
    const core = createTimelineEvent({
      caseId,
      eventType: "appeal.deadline",
      date: decision.deadline.date,
      datePrecision: level === "ai_inferred" ? "inferred" : "exact",
      integrity: level === "document_extracted" ? "documented" : level === "user_provided" ? "user_reported" : "inferred",
      description: decision.deadline.appealInstructions ?? decision.appealInstructions ?? "Appeal deadline",
      provenance: level === "document_extracted" && decisionSource
        ? { level, sourceRefs: [decisionSource] }
        : level === "ai_inferred"
          ? { level, modelId: "appeal-decision-extraction" }
          : { level: "user_provided" },
      confidence: level === "document_extracted" ? 0.95 : 0.6,
    });
    events.push({ ...core, category: "deadline", sources: decisionSource ? [decisionSource] : [], userConfirmed: false, isDeadline: true });
  }

  return events;
}

function addUserEvents(caseId: string, userEvents: BuildAppealTimelineInput["userEvents"]): AppealTimelineEvent[] {
  return (userEvents ?? []).map((event) => {
    const category = event.category ?? classifyContext(event.description);
    const core = createTimelineEvent({
      caseId,
      eventType: `appeal.${category}`,
      ...(event.date ? { date: event.date, datePrecision: "exact" as const } : { datePrecision: "unknown" as const }),
      integrity: "user_reported",
      description: event.description,
      provenance: { level: "user_provided" },
      confidence: 0.6,
    });
    return { ...core, category, sources: [], userConfirmed: true, isDeadline: category === "deadline" };
  });
}

function chooseUniqueEvents(events: AppealTimelineEvent[]): AppealTimelineEvent[] {
  const byIdentity = new Map<string, AppealTimelineEvent>();
  for (const event of events) {
    const key = `${event.eventType}|${event.date}|${event.description ?? ""}`;
    const existing = byIdentity.get(key);
    if (!existing || event.provenance.level === "document_extracted") byIdentity.set(key, event);
  }
  return [...byIdentity.values()];
}

const DEFAULT_GAP_RECORDS = ["correspondence", "status updates", "submission receipts", "agency records"] as const;

const GAP_RECORD_SUGGESTIONS: Record<AppealEventCategory, readonly string[]> = {
  application: [],
  submission: [],
  correspondence: ["correspondence", "email confirmation", "mailing receipt"],
  hearing: ["hearing notice", "hearing transcript", "conference record"],
  decision: [],
  deadline: [],
  agency_action: ["status update", "request for additional information", "internal review record", "agency memo"],
  user_action: ["submission receipt", "follow-up correspondence", "response letter"],
  other: [],
};

// Decisions (initial vs. reconsideration) and deadlines legitimately differ;
// deadline disagreement is reported by assessDeadline instead.
const CONFLICT_EXEMPT_CATEGORIES: ReadonlySet<AppealEventCategory> = new Set(["decision", "deadline"]);
const CONFLICT_WINDOW_DAYS = 90;

function clusterWithinWindow(group: AppealTimelineEvent[]): AppealTimelineEvent[][] {
  const sorted = [...group].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const clusters: AppealTimelineEvent[][] = [];
  for (const event of sorted) {
    const current = clusters.at(-1);
    const anchor = current?.[0]?.date;
    const within = anchor && event.date
      && (Date.parse(event.date) - Date.parse(anchor)) / 86_400_000 <= CONFLICT_WINDOW_DAYS;
    if (current && within) current.push(event);
    else clusters.push([event]);
  }
  return clusters.filter((cluster) => new Set(cluster.map((event) => event.date)).size > 1);
}

function buildConflicts(caseId: string, events: AppealTimelineEvent[], findings: readonly XRayFinding[]): AppealTimelineConflict[] {
  const timeline = createTimeline(caseId, events);
  const groups = conflictingDates(timeline)
    .map((group) => group.map((event) => events.find((candidate) => candidate.id === event.id)!).filter(Boolean))
    .filter((group) => !CONFLICT_EXEMPT_CATEGORIES.has(group[0]?.category ?? "other"))
    .flatMap(clusterWithinWindow);
  return groups.map((appealEvents) => {
    const sourceIds = new Set(appealEvents.flatMap((event) => event.sources.map((source) => String(source.documentId))));
    const finding = findings.find((candidate) =>
      candidate.type === "date_conflict" && candidate.sources.filter((source) => sourceIds.has(source.documentId)).length >= 2,
    );
    const claims = appealEvents.flatMap((event) => event.sources.slice(0, 1).map((source) => ({
      source,
      text: event.quote ?? event.description ?? event.eventType,
      date: event.date,
    })));
    return {
      id: crypto.randomUUID(),
      title: `Potential ${APPEAL_EVENT_CATEGORY_LABELS[appealEvents[0]?.category ?? "other"].toLowerCase()} date conflict`,
      eventIds: appealEvents.map((event) => String(event.id)),
      claims,
      whyItMatters: finding?.whyItMatters ?? "Different sources appear to place the same kind of event on different dates. Review the underlying documents before relying on either date.",
      suggestedGroundType: finding?.suggestedGroundType ?? "factual_error",
      suggestedClaim: finding?.suggestedClaim ?? "The record contains a material date discrepancy that should be resolved before the appeal is finalized.",
      status: "open" as const,
      alternativeExplanations: [],
      ...(finding ? { relatedFindingId: finding.id } : {}),
      createdAt: new Date().toISOString(),
    };
  });
}

function extractAppealPeriod(documents: readonly AppealTimelineDocument[]): { days: number; source?: SourceRef } | null {
  for (const doc of documents) {
    for (const basePattern of APPEAL_PERIOD_PATTERNS) {
      const pattern = new RegExp(basePattern.source, basePattern.flags);
      const match = pattern.exec(doc.text);
      if (!match) continue;
      const days = Number.parseInt(match[1] ?? "", 10);
      if (!Number.isFinite(days) || days < 1) continue;
      const source = sourceFor(doc, Math.floor(match.index / 3000) + 1, doc.text.slice(Math.max(0, match.index - 100), match.index + match[0].length + 100), match.index);
      return { days, source };
    }
  }
  return null;
}

function assessDeadline(
  _caseId: string,
  events: AppealTimelineEvent[],
  documents: readonly AppealTimelineDocument[],
  decision: Decision,
  today?: string,
): AppealDeadlineAssessment {
  const explicit = events.filter((event) => event.isDeadline && event.date);
  const explicitDates = [...new Set(explicit.map((event) => event.date))].sort();
  let deadlineDate = explicitDates[0] ?? null;
  let source: AppealDeadlineAssessment["source"] = "unknown";
  let computed: DeadlineResult | undefined;
  const period = extractAppealPeriod(documents);

  const documented = explicit.find((event) => event.provenance.level === "document_extracted");
  const userProvided = explicit.find((event) => event.provenance.level === "user_provided");
  if (documented) source = "document_extracted";
  else if (userProvided) source = "user_provided";

  if (!deadlineDate && period) {
    const decisionEvent = events.find((event) => event.category === "decision" && event.date);
    if (decisionEvent) {
      const duration = createTemporalConstraint({ triggerEventType: decisionEvent.eventType, days: period.days, calendarType: "calendar" });
      const rule = createDeadlineRule({
        name: `${period.days}-day-appeal-period`,
        description: `Appeal period stated in the supplied decision materials: ${period.days} calendar days.`,
        triggerEventType: decisionEvent.eventType,
        duration,
        deadlineEventType: "appeal.deadline",
        authority: "document-stated appeal instructions",
        version: "1",
        provenance: period.source
          ? { level: "document_extracted", sourceRefs: [period.source] }
          : { level: "rule_derived", ruleId: `appeal-period-${period.days}` },
        confidence: 0.75,
      });
      computed = computeDeadline(decisionEvent, rule);
      deadlineDate = computed.date;
      source = "rule_derived";
    }
  }

  if (!deadlineDate && decision.deadline?.date) {
    deadlineDate = decision.deadline.date;
    source = decision.deadline.source === "extracted" ? "document_extracted" : decision.deadline.source === "user_provided" ? "user_provided" : "rule_derived";
  }

  const reference = today ? new Date(`${today}T00:00:00Z`) : new Date();
  reference.setUTCHours(0, 0, 0, 0);
  const due = deadlineDate ? new Date(`${deadlineDate}T00:00:00Z`) : null;
  const daysRemaining = due && !Number.isNaN(due.getTime()) ? Math.round((due.getTime() - reference.getTime()) / 86_400_000) : null;
  const conflict = explicitDates.length > 1;
  const isReliable = Boolean(deadlineDate) && !conflict && source === "document_extracted";
  let warning: string | undefined;
  if (conflict) warning = "Multiple supplied sources identify different appeal deadlines. Verify the controlling deadline before submission.";
  else if (source === "rule_derived") warning = "This deadline was calculated from a stated appeal period. Verify the calculated date against the controlling instructions.";
  else if (source === "user_provided") warning = "This deadline is user-provided and should be verified against the decision or controlling instructions.";
  else if (daysRemaining !== null && daysRemaining < 0) warning = "The identified deadline has passed. Check whether a late filing, extension, or other exception may apply.";

  return {
    deadlineDate,
    source,
    daysRemaining,
    hasPassed: daysRemaining !== null && daysRemaining < 0,
    isReliable,
    ...(warning ? { warning } : {}),
    ...(period ? { statedAppealPeriod: `${period.days} days` } : {}),
    ...(computed ? { computed } : {}),
    conflictingDates: explicitDates.length > 1 ? explicitDates : [],
  };
}

export function buildAppealTimeline(input: BuildAppealTimelineInput): AppealTimelineResult {
  const findings = input.xrayFindings ?? [];
  const events = chooseUniqueEvents([
    ...input.documents.flatMap((document) => extractDocumentEvents(input.caseId, document, findings)),
    ...addDecisionEvents(input.caseId, input.decision),
    ...addUserEvents(input.caseId, input.userEvents),
  ]);
  const timeline = createTimeline(input.caseId, events);
  const sorted = sortedByDate(timeline).map((core) => events.find((event) => event.id === core.id)!).filter(Boolean);
  const genericGaps = detectGaps(timeline, 14);
  const gaps = genericGaps.map((gap) => {
    const preceding = sorted.find((event) => event.date === gap.startDate);
    const specific = preceding ? GAP_RECORD_SUGGESTIONS[preceding.category] : [];
    return {
      fromDate: gap.startDate,
      toDate: gap.endDate,
      daysUnaccounted: gap.daysBetween,
      significance: gap.daysBetween > 60 ? "high" as const : gap.daysBetween > 30 ? "medium" as const : "low" as const,
      potentiallyUsefulRecords: specific.length ? [...specific] : [...DEFAULT_GAP_RECORDS],
    };
  });
  const conflicts = buildConflicts(input.caseId, events, findings);
  const deadline = assessDeadline(input.caseId, events, input.documents, input.decision, input.today);

  return {
    caseId: input.caseId,
    events: sorted,
    conflicts,
    gaps,
    deadline,
    summary: {
      totalEvents: sorted.length,
      documented: sorted.filter((event) => event.integrity === "documented").length,
      userReported: sorted.filter((event) => event.integrity === "user_reported").length,
      inferred: sorted.filter((event) => event.integrity === "inferred").length,
      conflictingGroups: conflicts.length,
      totalGaps: gaps.length,
      dateRangeStart: sorted.find((event) => event.date)?.date ?? null,
      dateRangeEnd: [...sorted].reverse().find((event) => event.date)?.date ?? null,
    },
    builtAt: new Date().toISOString(),
  };
}

export function explainAppealTimelineConflict(conflict: AppealTimelineConflict): string[] {
  if (conflict.alternativeExplanations.length) return conflict.alternativeExplanations;
  return [
    "The dates may refer to different stages of the same event, such as submission versus agency processing.",
    "A document may have been sent to one office before being logged by the office that made the decision.",
    "One source may contain a clerical or transcription error. The underlying source documents should be checked before using the discrepancy as an appeal ground.",
  ];
}

export function appealTimelineConflictToGround(conflict: AppealTimelineConflict): {
  type: GroundType;
  claim: string;
  source: string;
} {
  return {
    type: conflict.suggestedGroundType,
    claim: conflict.suggestedClaim,
    source: conflict.claims.map((claim) => `${claim.source.documentName} (${claim.date})`).join(" vs. "),
  };
}

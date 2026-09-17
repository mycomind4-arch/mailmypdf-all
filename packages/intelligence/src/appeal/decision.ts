/*
 * Appeal decision model, promoted from the legacy Appeal Mail domain layer.
 *
 * This version intentionally has no dependency on the legacy app or Zod so the
 * shared intelligence package remains self-contained. The exported `parse`
 * contract preserves the important runtime-defaulting behavior of the old
 * schema while using the new package architecture.
 */

export const DECISION_TYPES = [
  "government_benefit",
  "licensing",
  "agency_ruling",
  "claim_denial",
  "court_ruling",
  "reconsideration",
] as const;

export type DecisionType = (typeof DECISION_TYPES)[number];
export type DecisionFactSource = "extracted" | "user_provided" | "inferred";
export type DeadlineType = "appeal" | "reconsideration" | "filing";
export type DecisionIssueType =
  | "ambiguity"
  | "contradiction"
  | "missing_information"
  | "procedural_error"
  | "factual_dispute"
  | "uncited_authority";
export type DecisionIssueSeverity = "high" | "medium" | "low";

export interface DecisionFact {
  id: string;
  label: string;
  value: string;
  source: DecisionFactSource;
  confidence: number;
  sourceExcerpt?: string;
}

export interface DecisionReason {
  id: string;
  text: string;
  citedRule?: string;
  sourceExcerpt?: string;
  confidence: number;
}

export interface Deadline {
  date?: string;
  type: DeadlineType;
  daysRemaining?: number;
  source: DecisionFactSource;
  appealInstructions?: string;
}

export interface DecisionTimelineEvent {
  id: string;
  date: string;
  description: string;
  source: DecisionFactSource;
}

export interface DecisionIssue {
  id: string;
  description: string;
  type: DecisionIssueType;
  severity: DecisionIssueSeverity;
  sourceExcerpt?: string;
}

export interface Decision {
  id: string;
  type: DecisionType;
  documentId?: string;
  documentFilename?: string;
  agency?: string;
  referenceNumber?: string;
  decisionDate?: string;
  decisionTypeLabel?: string;
  deadline?: Deadline;
  facts: DecisionFact[];
  reasons: DecisionReason[];
  citedRules: string[];
  appealInstructions?: string;
  chronology: DecisionTimelineEvent[];
  issues: DecisionIssue[];
  extractedAt?: string;
  extractionConfidence: number;
  rawText?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampConfidence(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function assertDecisionType(value: unknown): DecisionType {
  if (typeof value === "string" && (DECISION_TYPES as readonly string[]).includes(value)) {
    return value as DecisionType;
  }
  throw new Error(`Invalid appeal decision type: ${String(value)}`);
}

function parseFact(value: unknown): DecisionFact {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.label !== "string" || typeof value.value !== "string") {
    throw new Error("Invalid appeal decision fact");
  }
  const source = value.source;
  if (source !== "extracted" && source !== "user_provided" && source !== "inferred") {
    throw new Error("Invalid appeal decision fact source");
  }
  return {
    id: value.id,
    label: value.label,
    value: value.value,
    source,
    confidence: clampConfidence(value.confidence),
    ...(typeof value.sourceExcerpt === "string" ? { sourceExcerpt: value.sourceExcerpt } : {}),
  };
}

function parseReason(value: unknown): DecisionReason {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.text !== "string") {
    throw new Error("Invalid appeal decision reason");
  }
  return {
    id: value.id,
    text: value.text,
    confidence: clampConfidence(value.confidence),
    ...(typeof value.citedRule === "string" ? { citedRule: value.citedRule } : {}),
    ...(typeof value.sourceExcerpt === "string" ? { sourceExcerpt: value.sourceExcerpt } : {}),
  };
}

function parseDeadline(value: unknown): Deadline | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("Invalid appeal deadline");
  const type = value.type;
  const source = value.source;
  if (type !== "appeal" && type !== "reconsideration" && type !== "filing") throw new Error("Invalid appeal deadline type");
  if (source !== "extracted" && source !== "user_provided" && source !== "inferred") throw new Error("Invalid appeal deadline source");
  return {
    type,
    source,
    ...(typeof value.date === "string" ? { date: value.date } : {}),
    ...(typeof value.daysRemaining === "number" ? { daysRemaining: value.daysRemaining } : {}),
    ...(typeof value.appealInstructions === "string" ? { appealInstructions: value.appealInstructions } : {}),
  };
}

function parseChronology(value: unknown): DecisionTimelineEvent[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Invalid appeal decision chronology");
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.date !== "string" || typeof entry.description !== "string") {
      throw new Error("Invalid appeal decision timeline event");
    }
    const source = entry.source;
    if (source !== "extracted" && source !== "user_provided" && source !== "inferred") throw new Error("Invalid appeal timeline source");
    return { id: entry.id, date: entry.date, description: entry.description, source };
  });
}

function parseIssues(value: unknown): DecisionIssue[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Invalid appeal decision issues");
  const types: readonly DecisionIssueType[] = ["ambiguity", "contradiction", "missing_information", "procedural_error", "factual_dispute", "uncited_authority"];
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.description !== "string") throw new Error("Invalid appeal decision issue");
    if (typeof entry.type !== "string" || !(types as readonly string[]).includes(entry.type)) throw new Error("Invalid appeal decision issue type");
    if (entry.severity !== "high" && entry.severity !== "medium" && entry.severity !== "low") throw new Error("Invalid appeal decision issue severity");
    return {
      id: entry.id,
      description: entry.description,
      type: entry.type as DecisionIssueType,
      severity: entry.severity,
      ...(typeof entry.sourceExcerpt === "string" ? { sourceExcerpt: entry.sourceExcerpt } : {}),
    };
  });
}

export const decisionSchema = {
  parse(input: unknown): Decision {
    if (!isRecord(input) || typeof input.id !== "string") throw new Error("Invalid appeal decision");
    const facts = input.facts === undefined ? [] : Array.isArray(input.facts) ? input.facts.map(parseFact) : (() => { throw new Error("Invalid appeal decision facts"); })();
    const reasons = input.reasons === undefined ? [] : Array.isArray(input.reasons) ? input.reasons.map(parseReason) : (() => { throw new Error("Invalid appeal decision reasons"); })();
    const citedRules = input.citedRules === undefined ? [] : Array.isArray(input.citedRules) && input.citedRules.every((v) => typeof v === "string") ? input.citedRules as string[] : (() => { throw new Error("Invalid cited rules"); })();
    return {
      id: input.id,
      type: assertDecisionType(input.type),
      facts,
      reasons,
      citedRules,
      chronology: parseChronology(input.chronology),
      issues: parseIssues(input.issues),
      extractionConfidence: clampConfidence(input.extractionConfidence),
      ...(typeof input.documentId === "string" ? { documentId: input.documentId } : {}),
      ...(typeof input.documentFilename === "string" ? { documentFilename: input.documentFilename } : {}),
      ...(typeof input.agency === "string" ? { agency: input.agency } : {}),
      ...(typeof input.referenceNumber === "string" ? { referenceNumber: input.referenceNumber } : {}),
      ...(typeof input.decisionDate === "string" ? { decisionDate: input.decisionDate } : {}),
      ...(typeof input.decisionTypeLabel === "string" ? { decisionTypeLabel: input.decisionTypeLabel } : {}),
      ...(parseDeadline(input.deadline) ? { deadline: parseDeadline(input.deadline) } : {}),
      ...(typeof input.appealInstructions === "string" ? { appealInstructions: input.appealInstructions } : {}),
      ...(typeof input.extractedAt === "string" ? { extractedAt: input.extractedAt } : {}),
      ...(typeof input.rawText === "string" ? { rawText: input.rawText } : {}),
    };
  },
};

export function createDecision(type: DecisionType, partial: Partial<Decision> = {}): Decision {
  return decisionSchema.parse({
    id: crypto.randomUUID(),
    type,
    facts: [],
    reasons: [],
    citedRules: [],
    chronology: [],
    issues: [],
    extractionConfidence: 0,
    ...partial,
  });
}

export function daysUntilDeadline(deadline?: Deadline): number | null {
  if (!deadline?.date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(deadline.date);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function deadlineStatus(deadline?: Deadline): "unknown" | "urgent" | "soon" | "ok" | "expired" {
  const days = daysUntilDeadline(deadline);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 7) return "urgent";
  if (days <= 30) return "soon";
  return "ok";
}

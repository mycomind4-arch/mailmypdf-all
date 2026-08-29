import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   CANONICAL CASE MODEL — the primary aggregate root.
   
   A Case is the top-level entity that ties together:
   - Notice / source document
   - Extracted facts
   - Evidence
   - Deadlines
   - Findings
   - Contradictions
   - Missing information
   - Case health
   - Action queue
   - Strategies
   - Response versions
   - Final response
   - Mailing order + tracking
   - Audit history
   
   All UI projections derive from this canonical structure.
   
   CANONICAL DATA → DOMAIN SERVICES → DERIVED INTELLIGENCE → UI
   ═══════════════════════════════════════════════════════════ */

import type { NoticeType } from "./notice-type";
import type { NoticeFact } from "./fact";
import type { Evidence } from "./evidence";
import type { Deadline } from "./deadline";
import type { Strategy } from "./strategy";
import type { Contradiction } from "./contradiction";
import type { MissingInfoItem } from "./missing-info";
import type { NextAction } from "./next-action";
import type { VersionedResponse } from "./versioning";
import type { MailingStatus } from "./mailing";

export const caseStatusSchema = z.enum([
  "intake",        // notice submitted, analysis not yet run
  "analyzed",      // analysis complete
  "in_progress",   // user is working on the case
  "ready",         // ready for mailing
  "mailed",        // response mailed
  "delivered",     // delivery confirmed
  "closed",        // case complete
  "archived",      // no longer active
]);
export type CaseStatus = z.infer<typeof caseStatusSchema>;

export const caseSchema = z.object({
  /* ── Identity ── */
  id: z.string(),
  workflowId: z.string().default("analyze"),
  ownerId: z.string().default(""),  // user ID — empty until persistence

  /* ── Status ── */
  status: caseStatusSchema.default("intake"),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),

  /* ── Notice / Source Document ── */
  noticeType: z.string().default("other"),
  typeConfidence: z.number().default(0),
  category: z.string().default("other"),
  agency: z.string().optional(),
  referenceNumber: z.string().optional(),
  noticeDate: z.string().optional(),
  noticeText: z.string().default(""),

  /* ── Extracted Facts ── */
  facts: z.array(z.any()).default([]),  // NoticeFact[]

  /* ── Evidence ── */
  evidence: z.array(z.any()).default([]),  // Evidence[]

  /* ── Deadlines ── */
  deadlines: z.array(z.any()).default([]),  // Deadline[]

  /* ── Intelligence (derived) ── */
  strategies: z.array(z.any()).default([]),  // Strategy[]
  contradictions: z.array(z.any()).default([]),  // Contradiction[]
  missingInfo: z.array(z.any()).default([]),  // MissingInfoItem[]
  actionQueue: z.array(z.any()).default([]),  // NextAction[]
  readinessScore: z.number().default(0),
  readinessState: z.string().default("draft"),
  healthScore: z.number().default(0),
  healthStatus: z.string().default("incomplete"),
  healthSummary: z.string().default(""),

  /* ── Response ── */
  responseVersioning: z.any().optional(),  // VersionedResponse
  finalResponse: z.string().optional(),

  /* ── Mailing ── */
  mailingStatus: z.any().optional(),  // MailingStatus
  mailingRecipient: z.any().optional(),  // MailingRecipient
  mailingMethod: z.string().optional(),
  providerOrderId: z.string().optional(),

  /* ── User inputs ── */
  userObjective: z.string().default(""),
  userFacts: z.string().default(""),

  /* ── Workflow runtime state (persisted) ── */
  workflowState: z.any().optional(),  // Serialized WorkflowState

  /* ── Draft provenance (persisted) ── */
  draftProvenance: z.any().optional(),  // DraftProvenance
});
export type NoticeCase = z.infer<typeof caseSchema>;

/* ── Factory ── */

export function createCase(workflowId: string = "analyze"): NoticeCase {
  const now = new Date().toISOString();
  return caseSchema.parse({
    id: crypto.randomUUID(),
    workflowId,
    ownerId: "",
    status: "intake",
    createdAt: now,
    updatedAt: now,
    noticeType: "other",
    typeConfidence: 0,
    category: "other",
    noticeText: "",
    facts: [],
    evidence: [],
    deadlines: [],
    strategies: [],
    contradictions: [],
    missingInfo: [],
    actionQueue: [],
    readinessScore: 0,
    readinessState: "draft",
    healthScore: 0,
    healthStatus: "incomplete",
    healthSummary: "",
    userObjective: "",
    userFacts: "",
  });
}

/* ── Update ── */

export function updateCase(
  caseObj: NoticeCase,
  updates: Partial<NoticeCase>,
): NoticeCase {
  return caseSchema.parse({
    ...caseObj,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/* ── Status transitions ── */

export function transitionStatus(
  caseObj: NoticeCase,
  newStatus: CaseStatus,
): NoticeCase {
  const validTransitions: Record<CaseStatus, CaseStatus[]> = {
    intake: ["analyzed", "in_progress", "archived"],
    analyzed: ["in_progress", "archived"],
    in_progress: ["ready", "analyzed", "archived"],
    ready: ["mailed", "in_progress", "archived"],
    mailed: ["delivered", "ready", "closed", "archived"],
    delivered: ["closed", "archived"],
    closed: ["archived"],
    archived: [],
  };

  const allowed = validTransitions[caseObj.status];
  if (!allowed || !allowed.includes(newStatus)) {
    return caseObj; // Invalid transition — silently ignore (up to caller to validate)
  }

  return updateCase(caseObj, { status: newStatus });
}

/* ── Serialization (for persistence) ── */

export function serializeCase(caseObj: NoticeCase): Record<string, unknown> {
  return caseSchema.parse(caseObj);
}

export function deserializeCase(data: Record<string, unknown>): NoticeCase {
  return caseSchema.parse({
    ...data,
    facts: Array.isArray(data.facts) ? data.facts : [],
    evidence: Array.isArray(data.evidence) ? data.evidence : [],
    deadlines: Array.isArray(data.deadlines) ? data.deadlines : [],
    strategies: Array.isArray(data.strategies) ? data.strategies : [],
    contradictions: Array.isArray(data.contradictions) ? data.contradictions : [],
    missingInfo: Array.isArray(data.missingInfo) ? data.missingInfo : [],
    actionQueue: Array.isArray(data.actionQueue) ? data.actionQueue : [],
  });
}

/* ── Case summary for lists ── */

export interface CaseSummary {
  id: string;
  workflowId: string;
  status: CaseStatus;
  noticeType: string;
  agency?: string;
  referenceNumber?: string;
  noticeDate?: string;
  readinessScore: number;
  healthStatus: string;
  deadlineDate?: string;
  hasDraft: boolean;
  hasMailing: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toCaseSummary(c: NoticeCase): CaseSummary {
  return {
    id: c.id,
    workflowId: c.workflowId,
    status: c.status,
    noticeType: c.noticeType,
    agency: c.agency,
    referenceNumber: c.referenceNumber,
    noticeDate: c.noticeDate,
    readinessScore: c.readinessScore,
    healthStatus: c.healthStatus,
    deadlineDate: c.deadlines?.[0]?.date,
    hasDraft: !!c.finalResponse || !!c.responseVersioning,
    hasMailing: !!c.providerOrderId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

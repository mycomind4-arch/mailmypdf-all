import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   READINESS REVIEW — assesses whether a case is ready for
   response generation. Deterministic, heuristic-based.
   ═══════════════════════════════════════════════════════════ */

import type { NoticeFact } from "./fact";
import type { Evidence } from "./evidence";
import type { Deadline } from "./deadline";
import type { NoticeType } from "./notice-type";

export const readinessStateSchema = z.enum([
  "ready",
  "needs_review",
  "incomplete",
  "blocked",
  "draft",
]);
export type ReadinessState = z.infer<typeof readinessStateSchema>;

export interface ReadinessInput {
  noticeType: NoticeType;
  noticeDate?: string;
  agency?: string;
  referenceNumber?: string;
  deadline: Deadline;
  facts: NoticeFact[];
  evidence: Evidence[];
  findings: { severity: string; userReviewed: boolean; userDismissed: boolean }[];
  draft: string;
  recipient?: { name: string; address1: string; city: string; state: string; zip: string };
  hasSignature: boolean;
}

export interface ReadinessResult {
  score: number;
  state: ReadinessState;
  issuesRequiringAttention: number;
  blockingIssues: number;
  checks: { label: string; passed: boolean; detail: string; blocking: boolean }[];
}

export function runReadinessReview(input: ReadinessInput): ReadinessResult {
  const checks: ReadinessResult["checks"] = [];
  let blockingIssues = 0;
  let issuesRequiringAttention = 0;

  /* ── Agency identified ── */
  const hasAgency = !!input.agency;
  checks.push({
    label: "Issuing agency identified",
    passed: hasAgency,
    detail: hasAgency ? `Agency: ${input.agency}` : "No agency identified",
    blocking: !hasAgency,
  });
  if (!hasAgency) { blockingIssues++; issuesRequiringAttention++; }

  /* ── Reference number ── */
  const hasRef = !!input.referenceNumber;
  checks.push({
    label: "Reference number identified",
    passed: hasRef,
    detail: hasRef ? `Reference: ${input.referenceNumber}` : "No reference number found",
    blocking: false,
  });
  if (!hasRef) issuesRequiringAttention++;

  /* ── Deadline identified ── */
  const hasDeadline = !!input.deadline.date && input.deadline.certainty !== "missing";
  checks.push({
    label: "Response deadline identified",
    passed: hasDeadline,
    detail: hasDeadline
      ? `Deadline: ${input.deadline.date} (${input.deadline.certainty})`
      : "No deadline identified",
    blocking: !hasDeadline,
  });
  if (!hasDeadline) { blockingIssues++; issuesRequiringAttention++; }

  /* ── Facts extracted ── */
  const factCount = input.facts.length;
  const minFacts = 2;
  checks.push({
    label: "Facts extracted from notice",
    passed: factCount >= minFacts,
    detail: `${factCount} fact(s) extracted`,
    blocking: false,
  });
  if (factCount < minFacts) issuesRequiringAttention++;

  /* ── Confirmed facts ── */
  const confirmedCount = input.facts.filter((f) => f.userConfirmed || f.confidence === "high").length;
  checks.push({
    label: "Facts confirmed or high-confidence",
    passed: confirmedCount >= Math.ceil(factCount * 0.5),
    detail: `${confirmedCount}/${factCount} confirmed or high-confidence`,
    blocking: false,
  });
  if (confirmedCount < Math.ceil(factCount * 0.5)) issuesRequiringAttention++;

  /* ── Draft generated ── */
  const hasDraft = input.draft.length > 50;
  checks.push({
    label: "Response draft generated",
    passed: hasDraft,
    detail: hasDraft ? `Draft: ${input.draft.length} chars` : "No draft generated",
    blocking: false,
  });
  if (!hasDraft) issuesRequiringAttention++;

  /* ── Signature ── */
  checks.push({
    label: "Signature present",
    passed: input.hasSignature,
    detail: input.hasSignature ? "Signed" : "Missing signature",
    blocking: false,
  });
  if (!input.hasSignature) issuesRequiringAttention++;

  /* ── Calculate score ── */
  const passedChecks = checks.filter((c) => c.passed).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  /* ── Determine state ── */
  let state: ReadinessState;
  if (blockingIssues > 0) {
    state = "blocked";
  } else if (score >= 85 && issuesRequiringAttention <= 1) {
    state = "ready";
  } else if (score >= 60) {
    state = "needs_review";
  } else if (score >= 30) {
    state = "incomplete";
  } else {
    state = "draft";
  }

  return { score, state, issuesRequiringAttention, blockingIssues, checks };
}

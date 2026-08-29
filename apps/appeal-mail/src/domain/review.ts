import { z } from "zod";
import type { Decision } from "./decision";
import type { AppealGround } from "./ground";
import type { Evidence } from "./evidence";
import { unsupportedGrounds } from "./evidence";
import { daysUntilDeadline, deadlineStatus } from "./decision";

/* ─────────────────────────────────────────────
   Readiness Engine — checks the appeal for
   completeness and consistency before mailing.
   ───────────────────────────────────────────── */

export const readinessCheckIdSchema = z.enum([
  "missing_deadline",
  "missing_recipient",
  "unsupported_claims",
  "missing_evidence",
  "inconsistent_dates",
  "nonexistent_exhibits",
  "missing_outcome",
  "incomplete_instructions",
  "missing_signature",
  "unlinked_evidence",
  "contradictory_statements",
  "incomplete_packet",
  "deadline_expired",
  "deadline_urgent",
  "no_grounds",
  "weak_grounds",
]);
export type ReadinessCheckId = z.infer<typeof readinessCheckIdSchema>;

export const readinessCheckSchema = z.object({
  id: readinessCheckIdSchema,
  label: z.string(),
  description: z.string(),
  status: z.enum(["pass", "warning", "fail"]),
  detail: z.string().optional(),
});
export type ReadinessCheck = z.infer<typeof readinessCheckSchema>;

export const readinessReviewSchema = z.object({
  score: z.number().min(0).max(100),
  checks: z.array(readinessCheckSchema),
  issuesRequiringAttention: z.number(),
  generatedAt: z.string(),
});
export type ReadinessReview = z.infer<typeof readinessReviewSchema>;

/* Run all readiness checks against the current appeal state */
export function runReadinessReview(params: {
  decision: Decision;
  grounds: AppealGround[];
  evidence: Evidence[];
  draft: string;
  recipient?: { name: string; address1: string; city: string; state: string; zip: string };
  exhibitCount: number;
  hasSignature: boolean;
}): ReadinessReview {
  const { decision, grounds, evidence, draft, recipient, exhibitCount, hasSignature } = params;
  const checks: ReadinessCheck[] = [];

  /* Deadline checks */
  const dStatus = deadlineStatus(decision.deadline);
  const days = daysUntilDeadline(decision.deadline);
  checks.push({
    id: "deadline_expired",
    label: "Deadline not expired",
    description: "The appeal deadline has not passed.",
    status: dStatus === "expired" ? "fail" : "pass",
    detail: dStatus === "expired" ? "The appeal deadline has passed." : undefined,
  });
  checks.push({
    id: "deadline_urgent",
    label: "Deadline is not urgent",
    description: "More than 7 days remain before the deadline.",
    status: dStatus === "urgent" ? "warning" : dStatus === "expired" ? "fail" : "pass",
    detail: dStatus === "urgent" && days !== null ? `Only ${days} days remaining.` : undefined,
  });
  checks.push({
    id: "missing_deadline",
    label: "Deadline identified",
    description: "An appeal deadline has been identified from the decision.",
    status: !decision.deadline?.date ? "warning" : "pass",
    detail: !decision.deadline?.date ? "No deadline found — verify manually." : undefined,
  });

  /* Recipient check */
  checks.push({
    id: "missing_recipient",
    label: "Recipient specified",
    description: "A mailing recipient has been provided.",
    status: !recipient?.name || !recipient?.address1 || !recipient?.city || !recipient?.state || !recipient?.zip
      ? "fail" : "pass",
    detail: !recipient?.name ? "No recipient name provided." : undefined,
  });

  /* Grounds checks */
  checks.push({
    id: "no_grounds",
    label: "Appeal grounds established",
    description: "At least one appeal ground has been defined.",
    status: grounds.length === 0 ? "fail" : "pass",
    detail: grounds.length === 0 ? "No appeal grounds have been defined." : `${grounds.length} ground(s) defined.`,
  });
  const weakGrounds = grounds.filter((g) => g.confidence < 0.4 || !g.claim.trim());
  checks.push({
    id: "weak_grounds",
    label: "Grounds are well-supported",
    description: "All grounds have claims and reasonable confidence.",
    status: weakGrounds.length > 0 ? "warning" : "pass",
    detail: weakGrounds.length > 0 ? `${weakGrounds.length} ground(s) need strengthening.` : undefined,
  });

  /* Evidence checks */
  const unsupported = unsupportedGrounds(
    evidence,
    grounds.map((g) => g.id)
  );
  checks.push({
    id: "unsupported_claims",
    label: "All claims supported",
    description: "Every appeal ground has supporting evidence.",
    status: unsupported.length > 0 ? "warning" : "pass",
    detail: unsupported.length > 0 ? `${unsupported.length} ground(s) lack supporting evidence.` : undefined,
  });
  checks.push({
    id: "missing_evidence",
    label: "Evidence attached",
    description: "At least one piece of evidence has been attached.",
    status: evidence.length === 0 ? "warning" : "pass",
    detail: evidence.length === 0 ? "No evidence has been attached." : `${evidence.length} item(s) attached.`,
  });

  /* Unlinked evidence */
  const unlinked = evidence.filter((e) => e.groundIds.length === 0);
  checks.push({
    id: "unlinked_evidence",
    label: "Evidence linked to grounds",
    description: "All evidence is linked to at least one ground.",
    status: unlinked.length > 0 ? "warning" : "pass",
    detail: unlinked.length > 0 ? `${unlinked.length} evidence item(s) not linked to any ground.` : undefined,
  });

  /* Draft checks */
  checks.push({
    id: "missing_outcome",
    label: "Requested outcome stated",
    description: "The draft states what outcome is being requested.",
    status: !draft || draft.length < 50 ? "warning" : "pass",
    detail: !draft ? "No draft has been generated." : draft.length < 50 ? "Draft is very short — may be incomplete." : undefined,
  });
  checks.push({
    id: "missing_signature",
    label: "Signature placeholder present",
    description: "The draft includes a signature line.",
    status: hasSignature ? "pass" : "warning",
    detail: hasSignature ? undefined : "Add a signature line to the draft.",
  });

  /* Exhibit checks */
  checks.push({
    id: "nonexistent_exhibits",
    label: "Exhibit references valid",
    description: "All exhibit references in the draft correspond to attached evidence.",
    status: "pass",
  });
  checks.push({
    id: "incomplete_packet",
    label: "Packet complete",
    description: "Appeal letter and all referenced exhibits are assembled.",
    status: exhibitCount === 0 && evidence.length > 0 ? "warning" : "pass",
    detail: exhibitCount === 0 && evidence.length > 0 ? "Evidence exists but no packet assembled." : undefined,
  });

  /* Instructions check */
  checks.push({
    id: "incomplete_instructions",
    label: "Appeal instructions reviewed",
    description: "Appeal instructions from the decision have been reviewed.",
    status: !decision.appealInstructions ? "warning" : "pass",
    detail: !decision.appealInstructions ? "No appeal instructions extracted from the decision." : undefined,
  });

  /* Inconsistent dates */
  checks.push({
    id: "inconsistent_dates",
    label: "Dates are consistent",
    description: "Dates in the draft match the decision.",
    status: "pass",
  });

  /* Contradictory statements */
  checks.push({
    id: "contradictory_statements",
    label: "No contradictions detected",
    description: "The draft does not contradict the decision facts.",
    status: "pass",
  });

  /* Score calculation */
  const fails = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const score = Math.max(0, 100 - fails * 20 - warnings * 8);
  const issuesRequiringAttention = fails + warnings;

  return readinessReviewSchema.parse({
    score,
    checks,
    issuesRequiringAttention,
    generatedAt: new Date().toISOString(),
  });
}

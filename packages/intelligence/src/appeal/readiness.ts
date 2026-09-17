import type { Decision } from "./decision.js";
import { daysUntilDeadline, deadlineStatus } from "./decision.js";
import type { AppealGround } from "./ground.js";
import type { Evidence } from "./evidence.js";
import { unsupportedGrounds } from "./evidence.js";
import type { StressTestResult } from "./stress-test.js";
import type { XRayResult } from "./xray.js";

export type ReadinessCheckId =
  | "missing_deadline"
  | "missing_recipient"
  | "unsupported_claims"
  | "missing_evidence"
  | "inconsistent_dates"
  | "nonexistent_exhibits"
  | "missing_outcome"
  | "incomplete_instructions"
  | "missing_signature"
  | "unlinked_evidence"
  | "contradictory_statements"
  | "incomplete_packet"
  | "deadline_expired"
  | "deadline_urgent"
  | "no_grounds"
  | "weak_grounds";

export interface ReadinessCheck {
  id: ReadinessCheckId;
  label: string;
  description: string;
  status: "pass" | "warning" | "fail";
  detail?: string;
}

export interface ReadinessReview {
  score: number;
  checks: ReadinessCheck[];
  issuesRequiringAttention: number;
  blockers: ReadinessCheckId[];
  generatedAt: string;
}

export interface AppealRecipient {
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
}

export interface ReadinessReviewInput {
  decision: Decision;
  grounds: AppealGround[];
  evidence: Evidence[];
  draft: string;
  recipient?: AppealRecipient;
  exhibitCount: number;
  hasSignature: boolean;
  xrayResult?: XRayResult | null;
  stressTest?: StressTestResult | null;
}

function check(
  id: ReadinessCheckId,
  label: string,
  description: string,
  status: ReadinessCheck["status"],
  detail?: string,
): ReadinessCheck {
  return { id, label, description, status, ...(detail ? { detail } : {}) };
}

export function runReadinessReview(input: ReadinessReviewInput): ReadinessReview {
  const { decision, grounds, evidence, draft, recipient, exhibitCount, hasSignature, xrayResult, stressTest } = input;
  const checks: ReadinessCheck[] = [];
  const dStatus = deadlineStatus(decision.deadline);
  const days = daysUntilDeadline(decision.deadline);

  checks.push(check(
    "deadline_expired",
    "Deadline not expired",
    "The extracted appeal deadline has not passed.",
    dStatus === "expired" ? "fail" : "pass",
    dStatus === "expired" ? `The extracted deadline ${decision.deadline?.date ?? ""} has passed.` : undefined,
  ));
  checks.push(check(
    "deadline_urgent",
    "Deadline is not urgent",
    "More than seven days remain before the extracted deadline.",
    dStatus === "expired" ? "fail" : dStatus === "urgent" ? "warning" : "pass",
    dStatus === "urgent" && days !== null ? `Only ${days} day${days === 1 ? "" : "s"} remain.` : undefined,
  ));
  checks.push(check(
    "missing_deadline",
    "Deadline identified",
    "A controlling appeal deadline has been identified or manually verified.",
    decision.deadline?.date ? "pass" : "warning",
    decision.deadline?.date ? undefined : "No deadline is recorded; verify the controlling instructions manually.",
  ));

  const recipientComplete = Boolean(recipient?.name && recipient.address1 && recipient.city && recipient.state && recipient.zip);
  checks.push(check(
    "missing_recipient",
    "Recipient specified",
    "The submission recipient and mailing address are complete.",
    recipientComplete ? "pass" : "fail",
    recipientComplete ? undefined : "A complete recipient name and mailing address are required before submission.",
  ));

  checks.push(check(
    "no_grounds",
    "Appeal grounds established",
    "At least one specific appeal ground has been defined.",
    grounds.length > 0 ? "pass" : "fail",
    grounds.length > 0 ? `${grounds.length} ground(s) defined.` : "No appeal grounds have been defined.",
  ));

  const weakGrounds = grounds.filter((ground) => ground.confidence < 0.4 || ground.claim.trim().length < 20);
  checks.push(check(
    "weak_grounds",
    "Grounds are sufficiently developed",
    "Each ground states a specific claim with reasonable confidence.",
    weakGrounds.length > 0 ? "warning" : "pass",
    weakGrounds.length > 0 ? `${weakGrounds.length} ground(s) should be clarified or strengthened.` : undefined,
  ));

  const unsupported = unsupportedGrounds(evidence, grounds.map((ground) => ground.id));
  checks.push(check(
    "unsupported_claims",
    "Grounds have supporting evidence",
    "Each appeal ground is linked to supporting evidence.",
    unsupported.length > 0 ? "warning" : "pass",
    unsupported.length > 0 ? `${unsupported.length} ground(s) have no linked evidence.` : undefined,
  ));
  checks.push(check(
    "missing_evidence",
    "Evidence attached",
    "The record contains supporting evidence for review and inclusion.",
    evidence.length > 0 ? "pass" : "warning",
    evidence.length > 0 ? `${evidence.length} evidence item(s) are present.` : "No supporting evidence has been attached.",
  ));

  const unlinked = evidence.filter((item) => item.groundIds.length === 0);
  checks.push(check(
    "unlinked_evidence",
    "Evidence linked to grounds",
    "Evidence intended for the appeal is connected to a specific ground.",
    unlinked.length > 0 ? "warning" : "pass",
    unlinked.length > 0 ? `${unlinked.length} evidence item(s) are not linked to any ground.` : undefined,
  ));

  const hasRequestedOutcome = /\b(request|reconsider|reverse|approve|remand|vacate|modify|grant|restore|overturn)\b/i.test(draft);
  checks.push(check(
    "missing_outcome",
    "Requested outcome stated",
    "The draft states what action the recipient is being asked to take.",
    draft.length < 50 ? "fail" : hasRequestedOutcome ? "pass" : "warning",
    draft.length < 50 ? "No substantive appeal draft is present." : hasRequestedOutcome ? undefined : "The requested action is not clearly stated.",
  ));

  checks.push(check(
    "missing_signature",
    "Signature ready",
    "The final document includes a signature or signature placeholder as required.",
    hasSignature ? "pass" : "warning",
    hasSignature ? undefined : "Add or verify the required signature before submission.",
  ));

  const exhibitRefs = [...draft.matchAll(/\bExhibit\s+([A-Z]|\d+)\b/gi)].map((match) => match[1].toUpperCase());
  const uniqueExhibitRefs = new Set(exhibitRefs);
  const exhibitMismatch = uniqueExhibitRefs.size > exhibitCount;
  checks.push(check(
    "nonexistent_exhibits",
    "Exhibit references valid",
    "Referenced exhibits correspond to assembled packet exhibits.",
    exhibitMismatch ? "fail" : "pass",
    exhibitMismatch ? `${uniqueExhibitRefs.size} distinct exhibit reference(s) appear in the draft, but only ${exhibitCount} exhibit(s) are assembled.` : undefined,
  ));

  const incompletePacket = evidence.length > 0 && exhibitCount === 0;
  checks.push(check(
    "incomplete_packet",
    "Packet complete",
    "Evidence selected for submission has been assembled into the outgoing packet.",
    incompletePacket ? "warning" : "pass",
    incompletePacket ? "Evidence exists, but no exhibits are assembled in the packet." : undefined,
  ));

  checks.push(check(
    "incomplete_instructions",
    "Appeal instructions reviewed",
    "Submission instructions from the decision have been extracted or independently verified.",
    decision.appealInstructions || decision.deadline?.appealInstructions ? "pass" : "warning",
    decision.appealInstructions || decision.deadline?.appealInstructions ? undefined : "No appeal instructions are recorded; verify method, destination, deadline, and required attachments.",
  ));

  const dateConflicts = xrayResult?.findings.filter((finding) => finding.type === "date_conflict" && finding.status !== "dismissed") ?? [];
  checks.push(check(
    "inconsistent_dates",
    "Dates are consistent",
    "Material dates in the record have no unresolved conflicts.",
    dateConflicts.length > 0 ? "warning" : "pass",
    dateConflicts.length > 0 ? `${dateConflicts.length} unresolved date conflict(s) were identified by X-Ray.` : undefined,
  ));

  const contradictionFindings = xrayResult?.findings.filter((finding) => finding.type === "contradiction" && finding.status !== "dismissed") ?? [];
  const draftContradictions = stressTest?.draftVulnerabilities.filter((item) => item.type === "contradiction" || item.type === "factual_error") ?? [];
  const contradictionCount = contradictionFindings.length + draftContradictions.length;
  checks.push(check(
    "contradictory_statements",
    "No unresolved contradictions",
    "The factual record and draft have no unresolved material contradictions.",
    contradictionCount > 0 ? "warning" : "pass",
    contradictionCount > 0 ? `${contradictionCount} potential contradiction or factual conflict(s) require review.` : undefined,
  ));

  const fails = checks.filter((item) => item.status === "fail").length;
  const warnings = checks.filter((item) => item.status === "warning").length;
  const score = Math.max(0, 100 - fails * 20 - warnings * 8);
  return {
    score,
    checks,
    issuesRequiringAttention: fails + warnings,
    blockers: checks.filter((item) => item.status === "fail").map((item) => item.id),
    generatedAt: new Date().toISOString(),
  };
}

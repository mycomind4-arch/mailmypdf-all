import { nextOccurrence, type ScheduledMail } from "./scheduleEngine";
import { canExecuteMail, type ApprovalStatus } from "./approvalEngine";

export type CorrespondenceState = "draft" | "scheduled" | "awaiting_approval" | "ready" | "executing" | "sent" | "delivered" | "failed" | "cancelled";

export function deriveCorrespondenceState(input: {
  scheduled: boolean;
  requiresApproval: boolean;
  approvalStatus?: ApprovalStatus;
  executing?: boolean;
  sent?: boolean;
  delivered?: boolean;
  failed?: boolean;
  cancelled?: boolean;
}): CorrespondenceState {
  if (input.cancelled) return "cancelled";
  if (input.failed) return "failed";
  if (input.delivered) return "delivered";
  if (input.sent) return "sent";
  if (input.executing) return "executing";
  if (input.requiresApproval && input.approvalStatus !== "approved") return "awaiting_approval";
  if (input.scheduled) return "scheduled";
  return "draft";
}

export function isReadyToExecute(mail: ScheduledMail, approvalStatus: ApprovalStatus = "pending", now = new Date()): boolean {
  const occurrence = nextOccurrence(mail, new Date(now.getTime() - 1));
  const due = occurrence !== null && occurrence <= now;
  return due && canExecuteMail(approvalStatus, mail.requiresApproval);
}

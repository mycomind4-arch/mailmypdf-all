import { idempotencyKey, type ScheduledMail } from "./scheduleEngine";
import { canExecuteMail, type ApprovalStatus } from "./approvalEngine";
import type { ExecutionStore } from "./executionStore";
import { MailMyPDFClient } from "./mailmypdfClient";
import type { EventLog } from "./eventLog";

const ACCEPTED_STATUSES = new Set(["accepted", "queued", "submitted"]);

export async function executeScheduledMail(input: {
  schedule: ScheduledMail;
  occurrence: Date;
  approvalStatus: ApprovalStatus;
  executions: ExecutionStore;
  mail: MailMyPDFClient;
  events: EventLog;
}): Promise<{ status: "skipped" | "executed"; executionId?: string }> {
  if (!canExecuteMail(input.approvalStatus, input.schedule.requiresApproval)) return { status: "skipped" };

  const key = idempotencyKey(input.schedule.mailJobId, input.occurrence);
  const execution = await input.executions.acquire(input.schedule.mailJobId, key);
  if (!execution) return { status: "skipped" };
  if (execution.status === "succeeded" || execution.status === "running") return { status: "skipped", executionId: execution.id };

  await input.executions.start(execution.id);
  await input.events.append({ businessId: input.schedule.businessId, type: "mailing.executing", entityId: input.schedule.mailJobId, metadata: { executionId: execution.id, idempotencyKey: key } });

  try {
    const result = await input.mail.executeMailJob({
      mailJobId: input.schedule.mailJobId,
      businessId: input.schedule.businessId,
      recipientId: input.schedule.recipientId,
      documentId: input.schedule.documentId,
      mailClass: input.schedule.mailClass,
      idempotencyKey: key,
    });

    if (!ACCEPTED_STATUSES.has(result.status.toLowerCase())) {
      throw new Error(`MailMyPDF returned a non-accepted execution status: ${result.status}`);
    }

    await input.executions.succeed(execution.id, result as unknown as Record<string, unknown>);
    await input.events.append({
      businessId: input.schedule.businessId,
      type: "mailing.accepted",
      entityId: input.schedule.mailJobId,
      metadata: { executionId: execution.id, result },
    });

    if (!result.trackingNumber || !result.proofId) {
      await input.events.append({
        businessId: input.schedule.businessId,
        type: "mailing.proof_pending",
        entityId: input.schedule.mailJobId,
        metadata: {
          executionId: execution.id,
          trackingNumber: result.trackingNumber ?? null,
          proofId: result.proofId ?? null,
          reason: "provider accepted execution but tracking/proof is not yet complete",
        },
      });
    } else {
      await input.events.append({
        businessId: input.schedule.businessId,
        type: "mailing.sent",
        entityId: input.schedule.mailJobId,
        metadata: { executionId: execution.id, result },
      });
    }

    return { status: "executed", executionId: execution.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await input.executions.fail(execution.id, message);
    throw error;
  }
}

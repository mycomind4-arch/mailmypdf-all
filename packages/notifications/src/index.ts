export type NotificationChannel = "email" | "in_app";

export type NotificationKind =
  | "payment_received"
  | "workflow_ready"
  | "mail_submitted"
  | "mailed"
  | "in_transit"
  | "delivered"
  | "returned"
  | "action_required"
  | "deadline_reminder"
  | "failure";

export type NotificationStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

export interface NotificationMessage {
  idempotencyKey: string;
  kind: NotificationKind;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  html?: string;
  text?: string;
  matterId?: string;
  workflowId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface NotificationReceipt {
  idempotencyKey: string;
  status: NotificationStatus;
  provider?: string;
  providerMessageId?: string;
  error?: string;
  attempts: number;
  sentAt?: string;
}

export interface NotificationProvider {
  readonly name: string;
  send(message: NotificationMessage): Promise<{ messageId?: string }>;
}

export interface NotificationDeliveryStore {
  load(idempotencyKey: string): Promise<NotificationReceipt | null>;
  claim(idempotencyKey: string, now: string): Promise<boolean>;
  markSent(
    idempotencyKey: string,
    update: { provider: string; providerMessageId?: string; attempts: number; sentAt: string },
  ): Promise<void>;
  markFailed(
    idempotencyKey: string,
    update: { error: string; attempts: number; failedAt: string },
  ): Promise<void>;
}

export interface NotificationRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryable?: (error: unknown) => boolean;
}

export const DEFAULT_NOTIFICATION_RETRY_POLICY: NotificationRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

function delayFor(attempt: number, policy: NotificationRetryPolicy): number {
  return Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateMessage(message: NotificationMessage): void {
  if (!message.idempotencyKey.trim()) throw new Error("Notification idempotencyKey is required");
  if (!message.recipient.trim()) throw new Error("Notification recipient is required");
  if (!message.subject.trim()) throw new Error("Notification subject is required");
  if (!message.html?.trim() && !message.text?.trim()) throw new Error("Notification content is required");
  if (
    message.channel === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.recipient)
  ) {
    throw new Error("Notification email recipient is invalid");
  }
}

/**
 * Canonical idempotent notification runner.
 * Once a successful receipt is stored, replays never contact the provider again.
 */
export async function sendNotificationOnce(input: {
  message: NotificationMessage;
  provider: NotificationProvider;
  store: NotificationDeliveryStore;
  policy?: NotificationRetryPolicy;
  now?: () => string;
  sleep?: (ms: number) => Promise<void>;
}): Promise<{ receipt: NotificationReceipt; replayed: boolean }> {
  validateMessage(input.message);

  const existing = await input.store.load(input.message.idempotencyKey);
  if (existing?.status === "sent") return { receipt: existing, replayed: true };

  const now = input.now ?? (() => new Date().toISOString());
  if (!(await input.store.claim(input.message.idempotencyKey, now()))) {
    const claimed = await input.store.load(input.message.idempotencyKey);
    if (claimed?.status === "sent") return { receipt: claimed, replayed: true };
    throw new Error("Notification delivery is already in progress");
  }

  const policy = input.policy ?? DEFAULT_NOTIFICATION_RETRY_POLICY;
  if (
    !Number.isInteger(policy.maxAttempts) ||
    policy.maxAttempts < 1 ||
    policy.maxAttempts > 10
  ) {
    throw new Error("Notification maxAttempts must be between 1 and 10");
  }

  const wait = input.sleep ?? sleep;
  let lastError: unknown;
  let attempts = 0;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      const sent = await input.provider.send(input.message);
      const sentAt = now();

      await input.store.markSent(input.message.idempotencyKey, {
        provider: input.provider.name,
        providerMessageId: sent.messageId,
        attempts: attempt,
        sentAt,
      });

      return {
        replayed: false,
        receipt: {
          idempotencyKey: input.message.idempotencyKey,
          status: "sent",
          provider: input.provider.name,
          providerMessageId: sent.messageId,
          attempts: attempt,
          sentAt,
        },
      };
    } catch (error) {
      lastError = error;
      const retryable = policy.retryable ? policy.retryable(error) : true;
      if (!retryable || attempt === policy.maxAttempts) break;
      await wait(delayFor(attempt, policy));
    }
  }

  const error = lastError instanceof Error ? lastError.message : String(lastError);
  await input.store.markFailed(input.message.idempotencyKey, {
    error,
    attempts,
    failedAt: now(),
  });

  throw lastError instanceof Error ? lastError : new Error(error);
}

export interface DeadlineReminder {
  id: string;
  matterId: string;
  workflowId: string;
  deadlineAt: string;
  notifyAt: string;
  offsetDays: number;
  kind: "deadline_reminder";
}

/**
 * Deterministically materializes reminder jobs.
 * The host platform owns scheduling; workflows only declare deadlines and offsets.
 */
export function createDeadlineReminders(input: {
  matterId: string;
  workflowId: string;
  deadlineAt: string;
  offsetsDays?: readonly number[];
  now?: string;
}): DeadlineReminder[] {
  const deadline = Date.parse(input.deadlineAt);
  if (!Number.isFinite(deadline)) throw new Error("deadlineAt must be a valid ISO date");

  const now = Date.parse(input.now ?? new Date().toISOString());
  const offsets = [...new Set(input.offsetsDays ?? [30, 14, 7, 3, 1, 0])]
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 365)
    .sort((a, b) => b - a);

  return offsets
    .map((offsetDays) => {
      const notifyAtMs = deadline - offsetDays * 86_400_000;
      return {
        id: `${input.workflowId}:${input.matterId}:deadline:${offsetDays}`,
        matterId: input.matterId,
        workflowId: input.workflowId,
        deadlineAt: new Date(deadline).toISOString(),
        notifyAt: new Date(notifyAtMs).toISOString(),
        offsetDays,
        kind: "deadline_reminder" as const,
      };
    })
    .filter((reminder) => Date.parse(reminder.notifyAt) >= now);
}

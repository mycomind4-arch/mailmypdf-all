export type NotificationKind =
  | "payment_received"
  | "workflow_complete"
  | "mail_submitted"
  | "mailed"
  | "in_transit"
  | "delivered"
  | "returned"
  | "action_required"
  | "deadline_reminder"
  | "failure";

export type NotificationChannel = "email" | "in_app";

export interface NotificationMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationProviderResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(message: NotificationMessage): Promise<NotificationProviderResult>;
}

export interface NotificationCommand {
  idempotencyKey: string;
  kind: NotificationKind;
  channel: NotificationChannel;
  message: NotificationMessage;
  matterId?: string;
  workflowId?: string;
  metadata?: Record<string, string>;
}

export interface NotificationDeliveryStore {
  wasDelivered(idempotencyKey: string): Promise<boolean>;
  record(input: {
    idempotencyKey: string;
    kind: NotificationKind;
    channel: NotificationChannel;
    provider: string;
    status: "delivered" | "failed" | "skipped";
    providerMessageId?: string;
    error?: string;
    occurredAt: string;
  }): Promise<void>;
}

export type NotificationDispatchResult =
  | { status: "delivered"; messageId?: string }
  | { status: "duplicate" }
  | { status: "skipped"; reason: "provider_not_configured" }
  | { status: "failed"; error: string };

export async function dispatchNotification(
  command: NotificationCommand,
  provider: NotificationProvider,
  store: NotificationDeliveryStore,
  now = new Date().toISOString(),
): Promise<NotificationDispatchResult> {
  if (!command.idempotencyKey.trim()) throw new Error("Notification idempotency key is required");
  if (!command.message.to.trim()) throw new Error("Notification recipient is required");
  if (!command.message.subject.trim()) throw new Error("Notification subject is required");

  if (await store.wasDelivered(command.idempotencyKey)) return { status: "duplicate" };

  if (!provider.isConfigured()) {
    await store.record({
      idempotencyKey: command.idempotencyKey,
      kind: command.kind,
      channel: command.channel,
      provider: provider.name,
      status: "skipped",
      error: "provider_not_configured",
      occurredAt: now,
    });
    return { status: "skipped", reason: "provider_not_configured" };
  }

  const result = await provider.send(command.message).catch((error) => ({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }));

  if (!result.ok) {
    const error = result.error || "Notification provider failed";
    await store.record({
      idempotencyKey: command.idempotencyKey,
      kind: command.kind,
      channel: command.channel,
      provider: provider.name,
      status: "failed",
      error,
      occurredAt: now,
    });
    return { status: "failed", error };
  }

  await store.record({
    idempotencyKey: command.idempotencyKey,
    kind: command.kind,
    channel: command.channel,
    provider: provider.name,
    status: "delivered",
    providerMessageId: result.messageId,
    occurredAt: now,
  });
  return { status: "delivered", messageId: result.messageId };
}

export interface ScheduledNotification {
  id: string;
  dueAt: string;
  command: NotificationCommand;
  status: "scheduled" | "delivered" | "cancelled";
}

export function isNotificationDue(schedule: ScheduledNotification, now = Date.now()): boolean {
  const due = Date.parse(schedule.dueAt);
  return schedule.status === "scheduled" && Number.isFinite(due) && due <= now;
}

export function scheduleDeadlineReminder(input: {
  id: string;
  deadlineAt: string;
  leadTimeMs: number;
  command: NotificationCommand;
}): ScheduledNotification {
  const deadline = Date.parse(input.deadlineAt);
  if (!Number.isFinite(deadline)) throw new Error("Deadline reminder requires a valid deadline");
  if (!Number.isFinite(input.leadTimeMs) || input.leadTimeMs < 0) throw new Error("Reminder lead time must be non-negative");
  return {
    id: input.id,
    dueAt: new Date(deadline - input.leadTimeMs).toISOString(),
    command: input.command,
    status: "scheduled",
  };
}


export interface ScheduledNotificationStore {
  listDue(now: string, limit: number): Promise<readonly ScheduledNotification[]>;
  markDelivered(id: string, deliveredAt: string): Promise<void>;
  markFailed(id: string, error: string, failedAt: string): Promise<void>;
}

export interface NotificationProviderResolver {
  resolve(channel: NotificationChannel): NotificationProvider;
}

/**
 * Dispatches due reminders from durable storage. Each command remains
 * independently idempotent through NotificationDeliveryStore.
 */
export async function dispatchDueNotifications(input: {
  schedules: ScheduledNotificationStore;
  deliveries: NotificationDeliveryStore;
  providers: NotificationProviderResolver;
  now?: string;
  limit?: number;
}): Promise<{ processed: number; delivered: number; failed: number; skipped: number; duplicates: number }> {
  const now = input.now ?? new Date().toISOString();
  const limit = Math.max(1, Math.min(500, Math.floor(input.limit ?? 100)));
  const due = await input.schedules.listDue(now, limit);
  const result = { processed: 0, delivered: 0, failed: 0, skipped: 0, duplicates: 0 };

  for (const schedule of due) {
    if (!isNotificationDue(schedule, Date.parse(now))) continue;
    result.processed += 1;
    try {
      const provider = input.providers.resolve(schedule.command.channel);
      const dispatched = await dispatchNotification(schedule.command, provider, input.deliveries, now);
      if (dispatched.status === "delivered") {
        result.delivered += 1;
        await input.schedules.markDelivered(schedule.id, now);
      } else if (dispatched.status === "duplicate") {
        result.duplicates += 1;
        await input.schedules.markDelivered(schedule.id, now);
      } else if (dispatched.status === "skipped") {
        result.skipped += 1;
        await input.schedules.markFailed(schedule.id, dispatched.reason, now);
      } else {
        result.failed += 1;
        await input.schedules.markFailed(schedule.id, dispatched.error, now);
      }
    } catch (error) {
      result.failed += 1;
      await input.schedules.markFailed(
        schedule.id,
        error instanceof Error ? error.message : String(error),
        now,
      );
    }
  }
  return result;
}

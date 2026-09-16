import type {
  NotificationDeliveryStore,
  NotificationReceipt,
} from "@mailmypdf/notifications";

function receipt(row: any): NotificationReceipt {
  return {
    idempotencyKey: row.idempotency_key,
    status: row.status,
    provider: row.provider ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    error: row.last_error ?? undefined,
    attempts: Number(row.attempts ?? 0),
    sentAt: row.sent_at ?? undefined,
  };
}

export function createNotificationDeliveryStore(
  admin: any,
): NotificationDeliveryStore {
  return {
    async load(idempotencyKey) {
      const { data, error } = await admin
        .from("notification_deliveries")
        .select(
          "idempotency_key, status, provider, provider_message_id, attempts, last_error, sent_at",
        )
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (error) throw new Error("Unable to read notification delivery state");
      return data ? receipt(data) : null;
    },

    async claim(idempotencyKey, now) {
      const { data, error } = await admin.rpc("claim_notification_delivery", {
        p_idempotency_key: idempotencyKey,
        p_now: now,
      });
      if (error) throw new Error("Unable to claim notification delivery");
      return data === true;
    },

    async markSent(idempotencyKey, update) {
      const { error } = await admin
        .from("notification_deliveries")
        .update({
          status: "sent",
          provider: update.provider,
          provider_message_id: update.providerMessageId ?? null,
          attempts: update.attempts,
          sent_at: update.sentAt,
          last_error: null,
          failed_at: null,
          updated_at: update.sentAt,
        })
        .eq("idempotency_key", idempotencyKey)
        .eq("status", "sending");

      if (error) throw new Error("Unable to record notification delivery");
    },

    async markFailed(idempotencyKey, update) {
      const { error } = await admin
        .from("notification_deliveries")
        .update({
          status: "failed",
          attempts: update.attempts,
          last_error: update.error.slice(0, 1000),
          failed_at: update.failedAt,
          updated_at: update.failedAt,
        })
        .eq("idempotency_key", idempotencyKey)
        .eq("status", "sending");

      if (error) throw new Error("Unable to record notification failure");
    },
  };
}

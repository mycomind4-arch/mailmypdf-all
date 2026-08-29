import type { EventLog } from "./eventLog";
import type { MailWebhookEvent } from "./webhookProcessor";

export type TrackingState = "accepted" | "sent" | "in_transit" | "delivered" | "returned";

const stateMap: Record<MailWebhookEvent["type"], TrackingState | null> = {
  "mailing.accepted": "accepted", "mailing.sent": "sent", "mailing.in_transit": "in_transit",
  "mailing.delivered": "delivered", "mailing.returned": "returned", "proof.generated": null,
};

export async function processTrackingEvent(event: MailWebhookEvent, events: EventLog): Promise<TrackingState | "proof_generated" | null> {
  if (event.type === "proof.generated") {
    await events.append({ businessId: String(event.data?.businessId ?? "unknown"), type: "proof.generated", entityId: event.mailJobId, metadata: event.data });
    return "proof_generated";
  }
  const state = stateMap[event.type];
  if (!state) return null;
  const eventType = state === "delivered" ? "mailing.delivered" : state === "returned" ? "mailing.returned" : state === "sent" ? "mailing.sent" : undefined;
  if (eventType) await events.append({ businessId: String(event.data?.businessId ?? "unknown"), type: eventType, entityId: event.mailJobId, metadata: { webhookId: event.id, state, ...event.data } });
  return state;
}

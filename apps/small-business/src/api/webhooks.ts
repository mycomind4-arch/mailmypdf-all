import { normalizeWebhook, verifyWebhookSignature } from "../services/webhookProcessor";
import { processTrackingEvent } from "../services/trackingService";
import type { EventLog } from "../services/eventLog";
import type { N8nEventPublisher } from "../services/n8nEvents";

export async function handleMailMyPDFWebhook(input: {
  rawBody: string;
  signature: string;
  secret: string;
  events: EventLog;
  publisher?: N8nEventPublisher;
}) {
  if (!verifyWebhookSignature(input.rawBody, input.signature, input.secret)) throw new Error("Invalid webhook signature");
  const event = normalizeWebhook(JSON.parse(input.rawBody));
  const state = await processTrackingEvent(event, input.events);
  if (input.publisher) {
    await input.publisher.publish({
      id: event.id,
      businessId: String(event.data?.businessId ?? "unknown"),
      type: event.type,
      entityId: event.mailJobId,
      occurredAt: event.occurredAt,
      metadata: { state, ...event.data },
    });
  }
  return { eventId: event.id, mailJobId: event.mailJobId, state };
}

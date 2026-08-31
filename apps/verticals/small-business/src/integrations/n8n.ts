export interface N8nWebhookOptions {
  webhookUrl: string;
  secret?: string;
}

/** Send MailMyPDF Business domain events into an n8n workflow webhook. */
export async function emitToN8n(
  options: N8nWebhookOptions,
  event: { type: string; occurredAt: string; businessId: string; data: Record<string, unknown> },
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.secret) headers.set("x-mailmypdf-webhook-secret", options.secret);

  const response = await fetch(options.webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error(`n8n webhook failed: ${response.status}`);
  return response.text();
}

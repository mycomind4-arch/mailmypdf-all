import type { BusinessEvent } from "./eventLog";

export type N8nEventPublisher = {
  publish(event: BusinessEvent): Promise<void>;
};

export class WebhookN8nPublisher implements N8nEventPublisher {
  constructor(private readonly webhookUrl: string, private readonly secret?: string) {}

  async publish(event: BusinessEvent): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.secret ? { "x-mailmypdf-signature": this.secret } : {}),
      },
      body: JSON.stringify({ source: "mailmypdf-smallbusiness", event }),
    });
    if (!response.ok) throw new Error(`n8n webhook returned ${response.status}`);
  }
}

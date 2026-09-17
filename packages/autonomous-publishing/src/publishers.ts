import type { AnalyticsAdapter, PublisherAdapter } from "./adapters.js";
import type { PublicationManifest } from "./manifest.js";

export interface WebhookPublisherOptions {
  url: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

export function createWebhookPublisher(options: WebhookPublisherOptions): PublisherAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async publish(rendered, manifest: PublicationManifest) {
      const response = await fetchImpl(options.url, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        },
        body: JSON.stringify({
          publicationId: manifest.id,
          editionId: rendered.edition.editionId,
          subject: rendered.edition.subject,
          preheader: rendered.edition.preheader,
          html: rendered.html,
          text: rendered.text,
        }),
      });
      if (!response.ok) throw new Error(`PUBLISH_FAILED:${response.status}`);
      const data = await response.json().catch(() => ({})) as Record<string, unknown>;
      return {
        publicationUrl: typeof data.publicationUrl === "string" ? data.publicationUrl : undefined,
        providerId: typeof data.providerId === "string" ? data.providerId : undefined,
      };
    },
  };
}

export function createRequiredDeliveryPublisher(): PublisherAdapter {
  return {
    async publish() {
      throw new Error("DELIVERY_NOT_CONFIGURED");
    },
  };
}

export function createNoopPublisher(): PublisherAdapter {
  return {
    async publish(rendered) {
      return { providerId: `preview:${rendered.edition.editionId}` };
    },
  };
}

export function createNoopAnalyticsAdapter(): AnalyticsAdapter {
  return { async recordPublication() {} };
}

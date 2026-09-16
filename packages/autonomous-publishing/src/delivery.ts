import type { AnalyticsAdapter, PublisherAdapter } from "./adapters.js";
import type { PublicationManifest } from "./manifest.js";

function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export interface ListmonkPublisherOptions {
  baseUrl: string;
  username: string;
  apiToken: string;
  listIds: readonly number[];
  templateId?: number;
  fromEmail?: string;
  fetchImpl?: typeof fetch;
  /**
   * Keep false for approval-safe draft creation. When true, the adapter asks
   * listmonk to start the campaign immediately after creation.
   */
  startImmediately?: boolean;
}

export function createListmonkPublisher(options: ListmonkPublisherOptions): PublisherAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return {
    async publish(rendered, manifest: PublicationManifest) {
      if (!options.listIds.length) throw new Error("LISTMONK_LIST_IDS_REQUIRED");

      const createResponse = await fetchImpl(`${baseUrl}/api/campaigns`, {
        method: "POST",
        redirect: "error",
        headers: {
          authorization: basicAuth(options.username, options.apiToken),
          "content-type": "application/json;charset=utf-8",
        },
        body: JSON.stringify({
          name: `${manifest.name} — ${rendered.edition.editionId}`,
          subject: rendered.edition.subject,
          lists: [...options.listIds],
          from_email: options.fromEmail,
          content_type: "html",
          messenger: "email",
          type: "regular",
          template_id: options.templateId,
          body: rendered.html,
          altbody: rendered.text,
          tags: [manifest.id, "studio-autonomous-publishing"],
        }),
      });
      if (!createResponse.ok) throw new Error(`LISTMONK_CREATE_FAILED:${createResponse.status}`);

      const payload = await createResponse.json() as {
        data?: { id?: number; uuid?: string };
      };
      const campaignId = payload.data?.id;
      if (!campaignId) throw new Error("LISTMONK_CREATE_INVALID_RESPONSE");

      if (options.startImmediately) {
        const statusResponse = await fetchImpl(`${baseUrl}/api/campaigns/${campaignId}/status`, {
          method: "PUT",
          redirect: "error",
          headers: {
            authorization: basicAuth(options.username, options.apiToken),
            "content-type": "application/json;charset=utf-8",
          },
          body: JSON.stringify({ status: "running" }),
        });
        if (!statusResponse.ok) throw new Error(`LISTMONK_START_FAILED:${statusResponse.status}`);
      }

      return {
        providerId: `listmonk:${campaignId}`,
        publicationUrl: payload.data?.uuid
          ? `${baseUrl}/archive/${payload.data.uuid}`
          : undefined,
      };
    },
  };
}

export interface UmamiAnalyticsOptions {
  baseUrl: string;
  websiteId: string;
  hostname: string;
  fetchImpl?: typeof fetch;
}

export function createUmamiAnalyticsAdapter(options: UmamiAnalyticsOptions): AnalyticsAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return {
    async recordPublication(input) {
      const response = await fetchImpl(`${baseUrl}/api/send`, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          "user-agent": "StudioAutonomousPublishing/1.0",
        },
        body: JSON.stringify({
          type: "event",
          payload: {
            website: options.websiteId,
            hostname: options.hostname,
            url: input.publicationUrl ?? `/publications/${input.publicationId}/editions/${input.editionId}`,
            title: input.editionId,
            name: "newsletter-published",
            data: {
              publicationId: input.publicationId,
              editionId: input.editionId,
              providerId: input.providerId,
            },
          },
        }),
      });
      if (!response.ok) throw new Error(`UMAMI_EVENT_FAILED:${response.status}`);
    },
  };
}

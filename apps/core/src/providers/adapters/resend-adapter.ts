/**
 * Resend adapter — implements NotificationProvider using the Resend email API.
 *
 * Wraps the existing email integration from src/lib/email.server.ts
 * behind the NotificationProvider interface.
 */

import { getConfig } from "@/config";
import { flags } from "@/lib/feature-flags";
import {
  type NotificationProvider,
  type EmailMessage,
  type NotificationResult,
  type ProviderHealth,
} from "@/providers/interfaces";

const RESEND_API_BASE = "https://api.resend.com/emails";
const DEFAULT_FROM = "MailMyPDF <onboarding@resend.dev>";

export class ResendAdapter implements NotificationProvider {
  readonly name = "resend";

  isConfigured(): boolean {
    return flags.isEmailEnabled();
  }

  async send(message: EmailMessage): Promise<NotificationResult> {
    try {
      const config = getConfig();
      const from = message.from || config.email.fromAddress || DEFAULT_FROM;

      const res = await fetch(RESEND_API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.email.resendApiKey}`,
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
      }

      const data = await res.json().catch(() => ({}));
      return { ok: true, messageId: data.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async checkHealth(): Promise<ProviderHealth> {
    if (!this.isConfigured()) {
      return { status: "down", message: "RESEND_API_KEY not configured", lastCheckedAt: new Date().toISOString() };
    }
    // Resend doesn't have a public health endpoint, so we just verify the key exists
    return { status: "healthy", lastCheckedAt: new Date().toISOString() };
  }
}

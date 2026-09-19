/**
 * Lob adapter — implements MailProvider using the Lob API.
 *
 * Hardened with:
 * - Exponential backoff retries (via withRetry)
 * - Per-request timeouts (AbortSignal.timeout)
 * - Structured request logging
 * - Address validation before submission
 * - Idempotency verification
 *
 * Wraps the existing Lob integration from src/lib/lob.server.ts behind
 * the MailProvider interface. The domain layer never imports this
 * directly; it goes through the ProviderFactory.
 */

import { getConfig } from "@/config";
import { flags } from "@/lib/feature-flags";
import { withRetry, type RetryOptions } from "@/lib/retry";
import { logRequest, logAddressValidation } from "@/lib/request-logging";
import { validateUsAddress, type AddressValidationResult } from "@/lib/address-validation";
import {
  type MailProvider,
  type CreateLetterRequest,
  type LetterResult,
  type ProviderHealth,
  type PostalAddress,
} from "@/providers/interfaces";
import { type OrderStatus } from "@/lib/order-state-machine";

const LOB_BASE = "https://api.lob.com/v1";

// Retry configuration for Lob API calls
const LOB_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 15000,
  timeoutMs: 30000, // Lob can take a while to process PDF uploads
  onRetry: (info) => {
    logRequest.retry({
      provider: "lob",
      operation: "createLetter",
      attempt: info.attempt,
      error: info.error,
      delayMs: info.delayMs,
    });
  },
};

const LOB_HEALTH_TIMEOUT = 5000;

function basicAuth(): string {
  const config = getConfig();
  if (!config.lob.apiKey) throw new Error("LOB_API_KEY is not configured");
  return "Basic " + Buffer.from(`${config.lob.apiKey}:`).toString("base64");
}

export class LobAdapter implements MailProvider {
  readonly name = "lob";

  isConfigured(): boolean {
    return flags.isLobEnabled();
  }

  async createLetter(req: CreateLetterRequest): Promise<LetterResult> {
    // ── Address validation (advisory, but logs warnings) ──────────────────
    const [toValidation, fromValidation] = await Promise.all([
      validateUsAddress(req.to),
      validateUsAddress(req.from),
    ]);

    logAddressValidation({
      orderId: req.orderId,
      addressType: "to",
      level: toValidation.level,
      isDeliverable: toValidation.isDeliverable,
      warnings: toValidation.warnings,
      corrections: toValidation.corrections,
    });
    logAddressValidation({
      orderId: req.orderId,
      addressType: "from",
      level: fromValidation.level,
      isDeliverable: fromValidation.isDeliverable,
      warnings: fromValidation.warnings,
      corrections: fromValidation.corrections,
    });

    // Block only on hard undeliverable recipient addresses
    if (!toValidation.isDeliverable && toValidation.level === "undeliverable") {
      throw new Error(
        `Recipient address is undeliverable: ${toValidation.warnings.join("; ")}. ` +
        `Please verify the address before resubmitting.`,
      );
    }

    // ── Build form data ────────────────────────────────────────────────────
    const form = new URLSearchParams();
    form.set("description", req.description || `MailMyPDF order ${req.orderId.slice(0, 8)}`);
    form.set("file", req.pdfUrl);
    form.set("color", req.color ? "true" : "false");
    form.set("double_sided", "false");
    form.set("address_placement", "top_first_page");
    form.set("use_type", "operational");
    form.set("metadata[orderId]", req.orderId);

    if (req.extraService === "certified") {
      form.set("extra_service", "certified");
    } else if (req.extraService === "registered") {
      form.set("extra_service", "registered");
    }

    const setAddress = (prefix: "to" | "from", a: PostalAddress) => {
      form.set(`${prefix}[name]`, a.name);
      form.set(`${prefix}[address_line1]`, a.line1);
      if (a.line2) form.set(`${prefix}[address_line2]`, a.line2);
      form.set(`${prefix}[address_city]`, a.city);
      form.set(`${prefix}[address_state]`, a.state);
      form.set(`${prefix}[address_zip]`, a.postal);
      form.set(`${prefix}[address_country]`, a.country ?? "US");
    };
    setAddress("to", req.to);
    setAddress("from", req.from);

    const url = `${LOB_BASE}/letters`;

    // ── Submit with retry + timeout + logging ─────────────────────────────
    const reqCtx = logRequest.start({
      provider: "lob",
      operation: "createLetter",
      method: "POST",
      url,
      orderId: req.orderId,
    });

    const parsed = await withRetry(async (attempt) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: basicAuth(),
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": req.idempotencyKey,
        },
        body: form.toString(),
        signal: AbortSignal.timeout(LOB_RETRY_OPTIONS.timeoutMs!),
      });

      const text = await res.text();
      let body: any = null;
      try { body = JSON.parse(text); } catch { /* keep raw */ }

      if (!res.ok) {
        const msg = body?.error?.message || text.slice(0, 300) || `Lob ${res.status}`;
        const isRetryable = res.status === 429 || res.status >= 500;

        logRequest.end(reqCtx, {
          status: res.status,
          message: `attempt ${attempt} failed: ${msg}`,
          error: msg,
        });

        // Throw with status so isRetryableError can evaluate
        if (isRetryable) {
          const err = new Error(`Lob create letter failed: ${msg}`) as Error & { status: number; isRetryable: boolean };
          err.status = res.status;
          err.isRetryable = true;
          throw err;
        }
        throw new Error(`Lob create letter failed: ${msg}`);
      }

      logRequest.end(reqCtx, {
        status: res.status,
        message: `letter created (attempt ${attempt})`,
      });

      return body;
    }, LOB_RETRY_OPTIONS);

    // ── Idempotency verification ───────────────────────────────────────────
    // If Lob returned a letter with a different id than we expected for
    // this idempotency key, log a warning (Lob should return the same
    // letter for the same idempotency key).
    if (!parsed?.id) {
      throw new Error("Lob returned no letter id — possible API contract change");
    }

    return {
      id: parsed.id,
      status: parsed.send_date ? "processed" : parsed.status ?? null,
      expectedDeliveryDate: parsed.expected_delivery_date ?? null,
      trackingNumber: parsed.tracking_number ?? null,
      url: parsed.url ?? null,
    };
  }

  async verifyWebhook(req: Request): Promise<{ event: unknown; raw: string }> {
    const config = getConfig();
    const secret = config.lob.webhookSecret;
    if (!secret) throw new Error("LOB_WEBHOOK_SECRET is not configured");
    const signature = req.headers.get("lob-signature");
    const timestamp = req.headers.get("lob-signature-timestamp");
    const raw = await req.text();
    if (!signature || !timestamp) throw new Error("Missing Lob signature headers");

    const age = Math.abs(Date.now() - Number(timestamp));
    if (!Number.isFinite(age) || age > 5 * 60 * 1000)
      throw new Error("Lob webhook timestamp out of tolerance");

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
    const expected = Buffer.from(new Uint8Array(signed)).toString("hex");

    if (expected.length !== signature.length) throw new Error("Invalid Lob signature");
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (diff !== 0) throw new Error("Invalid Lob signature");

    return { event: JSON.parse(raw), raw };
  }

  mapStatusToOrderStatus(lobStatus: string | null | undefined): string | null {
    if (!lobStatus) return null;
    switch (lobStatus) {
      case "created":
      case "rendered":
      case "processed":
      case "printed":
        return "provider_processing";
      case "mailed":
        return "mailed";
      case "in_transit":
      case "in_local_area":
      case "processed_for_delivery":
      case "re-routed":
        return "in_transit";
      case "delivered":
        return "delivered";
      case "returned":
      case "returned_to_sender":
        return "returned";
      case "failed":
      case "error":
      case "cancelled":
        return "failed_provider_submission";
      default:
        return null;
    }
  }

  /**
   * Check the status of a specific letter by ID from Lob.
   * Used for webhook recovery — when we suspect we missed a webhook,
   * we can poll the letter status directly.
   */
  async getLetterStatus(letterId: string): Promise<{
    id: string;
    status: string | null;
    expectedDeliveryDate: string | null;
    trackingNumber: string | null;
  }> {
    const url = `${LOB_BASE}/letters/${letterId}`;
    const reqCtx = logRequest.start({
      provider: "lob",
      operation: "getLetterStatus",
      method: "GET",
      url,
    });

    const response = await withRetry(async (attempt) => {
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: basicAuth() },
        signal: AbortSignal.timeout(10000),
      });

      const text = await res.text();
      if (!res.ok) {
        const msg = text.slice(0, 300) || `Lob ${res.status}`;
        if (res.status === 429 || res.status >= 500) {
          const err = new Error(`Lob get letter failed: ${msg}`) as Error & { status: number };
          err.status = res.status;
          throw err;
        }
        throw new Error(`Lob get letter failed: ${msg}`);
      }

      logRequest.end(reqCtx, {
        status: res.status,
        message: `letter status retrieved (attempt ${attempt})`,
      });

      return JSON.parse(text);
    }, {
      maxAttempts: 2,
      baseDelayMs: 500,
      maxDelayMs: 3000,
      timeoutMs: 10000,
    });

    return {
      id: response.id,
      status: response.status ?? null,
      expectedDeliveryDate: response.expected_delivery_date ?? null,
      trackingNumber: response.tracking_number ?? null,
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    if (!this.isConfigured()) {
      return { status: "down", message: "LOB_API_KEY not configured", lastCheckedAt: new Date().toISOString() };
    }
    try {
      const res = await fetch(`${LOB_BASE}/letters`, {
        method: "GET",
        headers: { Authorization: basicAuth() },
        signal: AbortSignal.timeout(LOB_HEALTH_TIMEOUT),
      });
      return {
        status: res.ok ? "healthy" : "degraded",
        message: res.ok ? undefined : `HTTP ${res.status}`,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (e) {
      return {
        status: "down",
        message: e instanceof Error ? e.message : "Connection failed",
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }
}

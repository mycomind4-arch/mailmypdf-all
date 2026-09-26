import { withRetry } from "@mailmypdf/core";

const DEFAULT_LOB_API_BASE = "https://api.lob.com/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

export type LobMailClass = "standard" | "certified" | "certified_return_receipt" | "registered";

export interface LobAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
  country?: string;
}

export interface LobLetter {
  id: string;
  status?: string | null;
  expectedDeliveryDate?: string | null;
  trackingNumber?: string | null;
  url?: string | null;
}

export interface LobProviderOptions {
  apiKey: string;
  apiBase?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (info: { attempt: number; error: unknown; delayMs: number }) => void;
}

export interface CreateLobLetterInput {
  referenceId: string;
  pdfUrl: string;
  to: LobAddress;
  from: LobAddress;
  description?: string;
  idempotencyKey: string;
  color?: boolean;
  extraService?: LobMailClass;
}

export type NormalizedLobStatus =
  | "submitted"
  | "provider_processing"
  | "mailed"
  | "in_transit"
  | "delivered"
  | "returned"
  | "failed"
  | "cancelled";

export class LobProviderError extends Error {
  readonly status?: number;
  readonly retryable: boolean;

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "LobProviderError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

function basicAuth(apiKey: string): string {
  if (!apiKey.trim()) throw new LobProviderError("Lob API key is required.");
  return `Basic ${btoa(`${apiKey}:`)}`;
}

function providerError(status: number, message: string): LobProviderError {
  return new LobProviderError(`Lob request failed (${status}): ${message}`, {
    status,
    retryable: status === 429 || status >= 500,
  });
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof LobProviderError) return error.retryable;
  return error instanceof TypeError;
}

function setAddress(form: URLSearchParams, prefix: "to" | "from", address: LobAddress): void {
  form.set(`${prefix}[name]`, address.name);
  form.set(`${prefix}[address_line1]`, address.line1);
  if (address.line2) form.set(`${prefix}[address_line2]`, address.line2);
  form.set(`${prefix}[address_city]`, address.city);
  form.set(`${prefix}[address_state]`, address.state);
  form.set(`${prefix}[address_zip]`, address.postal);
  form.set(`${prefix}[address_country]`, address.country ?? "US");
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  if (!response.ok) {
    const candidate = body as { error?: { message?: unknown } } | null;
    const message =
      typeof candidate?.error?.message === "string"
        ? candidate.error.message
        : text.slice(0, 300) || `HTTP ${response.status}`;
    throw providerError(response.status, message);
  }

  if (!body || typeof body !== "object") {
    throw new LobProviderError("Lob returned an invalid JSON payload.");
  }
  return body as Record<string, unknown>;
}

export async function createLobLetter(
  input: CreateLobLetterInput,
  options: LobProviderOptions,
): Promise<LobLetter> {
  if (!input.idempotencyKey.trim()) {
    throw new LobProviderError("Lob idempotency key is required.");
  }
  if (!input.pdfUrl.trim()) {
    throw new LobProviderError("Lob PDF URL is required.");
  }

  const form = new URLSearchParams();
  form.set("description", input.description || `MailMyPDF ${input.referenceId.slice(0, 32)}`);
  form.set("file", input.pdfUrl);
  form.set("color", input.color ? "true" : "false");
  form.set("double_sided", "false");
  form.set("address_placement", "top_first_page");
  form.set("use_type", "operational");
  form.set("metadata[referenceId]", input.referenceId);

  if (input.extraService && input.extraService !== "standard") {
    form.set("extra_service", input.extraService);
  }

  setAddress(form, "to", input.to);
  setAddress(form, "from", input.from);

  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBase = (options.apiBase ?? DEFAULT_LOB_API_BASE).replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const parsed = await withRetry(
    async () => {
      const response = await fetchImpl(`${apiBase}/letters`, {
        method: "POST",
        headers: {
          Authorization: basicAuth(options.apiKey),
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: form.toString(),
        signal: AbortSignal.timeout(timeoutMs),
      });
      return readJsonResponse(response);
    },
    {
      maxAttempts: options.maxAttempts ?? 3,
      baseDelayMs: options.baseDelayMs ?? 1_000,
      maxDelayMs: 15_000,
      shouldRetry,
      onRetry: options.onRetry,
    },
  );

  const id = parsed.id;
  if (typeof id !== "string" || !id) {
    throw new LobProviderError("Lob returned no letter id.");
  }

  return {
    id,
    status:
      typeof parsed.send_date === "string"
        ? "processed"
        : typeof parsed.status === "string"
          ? parsed.status
          : null,
    expectedDeliveryDate:
      typeof parsed.expected_delivery_date === "string" ? parsed.expected_delivery_date : null,
    trackingNumber:
      typeof parsed.tracking_number === "string" ? parsed.tracking_number : null,
    url: typeof parsed.url === "string" ? parsed.url : null,
  };
}

export async function getLobLetter(
  letterId: string,
  options: LobProviderOptions,
): Promise<LobLetter> {
  if (!letterId.trim()) throw new LobProviderError("Lob letter id is required.");

  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBase = (options.apiBase ?? DEFAULT_LOB_API_BASE).replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const parsed = await withRetry(
    async () => {
      const response = await fetchImpl(`${apiBase}/letters/${encodeURIComponent(letterId)}`, {
        method: "GET",
        headers: { Authorization: basicAuth(options.apiKey) },
        signal: AbortSignal.timeout(timeoutMs),
      });
      return readJsonResponse(response);
    },
    {
      maxAttempts: options.maxAttempts ?? 3,
      baseDelayMs: options.baseDelayMs ?? 1_000,
      maxDelayMs: 15_000,
      shouldRetry,
      onRetry: options.onRetry,
    },
  );

  const id = typeof parsed.id === "string" ? parsed.id : letterId;
  return {
    id,
    status: typeof parsed.status === "string" ? parsed.status : null,
    expectedDeliveryDate:
      typeof parsed.expected_delivery_date === "string" ? parsed.expected_delivery_date : null,
    trackingNumber:
      typeof parsed.tracking_number === "string" ? parsed.tracking_number : null,
    url: typeof parsed.url === "string" ? parsed.url : null,
  };
}

export function normalizeLobStatus(status: unknown): NormalizedLobStatus {
  switch (status) {
    case "created":
      return "submitted";
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
    case "pickup_available":
    case "international_exit":
      return "in_transit";
    case "delivered":
      return "delivered";
    case "returned":
    case "returned_to_sender":
      return "returned";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "failed":
    case "error":
      return "failed";
    default:
      throw new LobProviderError(`Unknown Lob status: ${String(status)}`);
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index++) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function verifyLobWebhook(
  request: Request,
  secret: string,
  options: { toleranceMs?: number; now?: number } = {},
): Promise<{ event: unknown; raw: string }> {
  if (!secret.trim()) throw new LobProviderError("Lob webhook secret is required.");

  const signature = request.headers.get("lob-signature");
  const timestamp = request.headers.get("lob-signature-timestamp");
  const raw = await request.text();

  if (!signature || !timestamp) {
    throw new LobProviderError("Missing Lob signature headers.");
  }

  const timestampValue = Number(timestamp);
  const timestampMs = timestampValue < 1_000_000_000_000 ? timestampValue * 1000 : timestampValue;
  const toleranceMs = options.toleranceMs ?? DEFAULT_WEBHOOK_TOLERANCE_MS;
  const now = options.now ?? Date.now();
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > toleranceMs) {
    throw new LobProviderError("Lob webhook timestamp out of tolerance.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${raw}`),
  );
  const expected = bytesToHex(new Uint8Array(signed));

  if (!constantTimeEqual(expected, signature.toLowerCase())) {
    throw new LobProviderError("Invalid Lob signature.");
  }

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    throw new LobProviderError("Lob webhook body is invalid JSON.");
  }
  return { event, raw };
}

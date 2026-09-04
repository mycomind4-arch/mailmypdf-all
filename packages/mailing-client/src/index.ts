/**
 * @mailmypdf/mailing-client
 *
 * The shared HTTP client for the MailMyPDF v1 API.
 *
 * Every vertical that mails physical documents uses this client
 * instead of duplicating its own adapter. This eliminates the 4+
 * near-identical copies of mailmypdf.ts across the ecosystem.
 *
 * Configuration via environment variables:
 *   MAILMYPDF_API_URL  — base URL (e.g. https://mailmypdf.ai)
 *   MAILMYPDF_API_KEY  — bearer token
 *
 * The client automatically handles:
 *   - Bearer auth headers
 *   - Content-Type for JSON vs FormData
 *   - Idempotency-Key header for createCommunication
 *   - Response shape normalization ({ document: ... } vs direct)
 *   - Error parsing with MailMyPDFPlatformError
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type MailType = "first_class" | "certified" | "certified_return_receipt" | "registered";

export interface MailMyPDFDocument {
  id: string;
  filename: string;
  mime_type: string;
  sha256: string;
  size_bytes: number;
  source?: string;
  created_at: string;
}

export interface MailingRecipient {
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
}

export interface LegalReference {
  type: "statute" | "lease_clause" | "contract_term" | "regulation" | "ordinance" | "other";
  citation: string;
  description: string;
  response_window_days?: number | null;
  notes?: string;
}

export interface MailingSender {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
}

export interface CreateCommunicationInput {
  document_id: string;
  recipient: MailingRecipient;
  mail_type: MailType;
  matter_reference: string;
  matter_type: string;
  legal_reference?: LegalReference;
  from_address?: MailingSender;
  metadata?: Record<string, unknown>;
  idempotency_key: string;
}

export interface MailMyPDFCommunication {
  id: string;
  status?: string;
  tracking_number?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// ── Error ────────────────────────────────────────────────────────────────────

export class MailMyPDFPlatformError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "MailMyPDFPlatformError";
  }
}

// ── Client ──────────────────────────────────────────────────────────────────

function getConfig() {
  const baseUrl = process.env.MAILMYPDF_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.MAILMYPDF_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new MailMyPDFPlatformError(
      "MailMyPDF platform is not configured. Set MAILMYPDF_API_URL and MAILMYPDF_API_KEY.",
      503,
    );
  }
  return { baseUrl, apiKey };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", "application/json");

  // Only set Content-Type for non-FormData bodies.
  // FormData bodies need the runtime to set multipart/form-data with boundary.
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { message?: string; code?: string } }).error
        : undefined;
    throw new MailMyPDFPlatformError(
      error?.message ?? `MailMyPDF request failed (${response.status})`,
      response.status,
      error?.code,
    );
  }
  return payload as T;
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Upload a document to MailMyPDF for mailing.
 * Returns the document metadata including the id needed for createCommunication.
 */
export async function uploadDocument(file: File): Promise<MailMyPDFDocument> {
  const form = new FormData();
  form.append("file", file, file.name);
  const result = await request<{ document?: MailMyPDFDocument } | MailMyPDFDocument>(
    "/v1/documents",
    { method: "POST", body: form },
  );
  // Normalize response shape: some deployments return { document: ... },
  // others return the document directly.
  if ("document" in result && result.document) return result.document;
  return result as MailMyPDFDocument;
}

/**
 * Upload a document from base64 content (no File object needed).
 */
export async function uploadDocumentBase64(input: {
  content: string;
  filename: string;
  mime_type?: string;
}): Promise<MailMyPDFDocument> {
  const result = await request<{ document?: MailMyPDFDocument } | MailMyPDFDocument>(
    "/v1/documents",
    { method: "POST", body: JSON.stringify(input) },
  );
  if ("document" in result && result.document) return result.document;
  return result as MailMyPDFDocument;
}

/**
 * Create a communication (mailing) through MailMyPDF.
 * The idempotency_key is sent both as a header and in the body
 * for maximum compatibility across MailMyPDF API versions.
 */
export async function createCommunication(input: CreateCommunicationInput): Promise<MailMyPDFCommunication> {
  return request<MailMyPDFCommunication>("/v1/communications", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotency_key },
    body: JSON.stringify(input),
  });
}

/**
 * Retrieve the status of a communication by id.
 */
export async function getCommunication(id: string): Promise<MailMyPDFCommunication> {
  return request<MailMyPDFCommunication>(`/v1/communications/${encodeURIComponent(id)}`);
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a configured MailMyPDF client with a vertical tag.
 * The vertical tag is automatically added to metadata in createCommunication.
 */
export function createMailingClient(verticalSlug: string) {
  return {
    uploadDocument,
    uploadDocumentBase64,
    async createCommunication(input: CreateCommunicationInput): Promise<MailMyPDFCommunication> {
      return createCommunication({
        ...input,
        metadata: { vertical: verticalSlug, product: verticalSlug, ...(input.metadata ?? {}) },
      });
    },
    getCommunication,
  };
}

export type MailingClient = ReturnType<typeof createMailingClient>;

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

export interface ImmigrationRecipient {
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
}

export interface ImmigrationSender {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
}

export interface CreateImmigrationCommunicationInput {
  document_id: string;
  recipient: ImmigrationRecipient;
  mail_type: MailType;
  matter_reference: string;
  matter_type: string;
  legal_reference: { type: "statute" | "lease_clause" | "contract_term" | "regulation" | "ordinance" | "other"; citation: string; description: string; response_window_days?: number | null; notes?: string };
  from_address?: ImmigrationSender;
  metadata?: Record<string, unknown>;
  idempotency_key: string;
}

export interface MailMyPDFCommunication { id: string; status?: string; tracking_number?: string; updated_at?: string; [key: string]: unknown; }

export class MailMyPDFPlatformError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); this.name = "MailMyPDFPlatformError"; }
}

function getConfig() {
  const baseUrl = process.env.MAILMYPDF_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.MAILMYPDF_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("MailMyPDF platform is not configured. Set MAILMYPDF_API_URL and MAILMYPDF_API_KEY.");
  return { baseUrl, apiKey };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload ? (payload as { error?: { message?: string; code?: string } }).error : undefined;
    throw new MailMyPDFPlatformError(error?.message ?? `MailMyPDF request failed (${response.status})`, response.status, error?.code);
  }
  return payload as T;
}

export async function uploadDocument(file: File): Promise<MailMyPDFDocument> {
  const form = new FormData();
  form.append("file", file, file.name);
  const result = await request<{ document?: MailMyPDFDocument } | MailMyPDFDocument>("/v1/documents", { method: "POST", body: form });
  return "document" in result && result.document ? result.document : result as MailMyPDFDocument;
}

export async function uploadDocumentBase64(input: { content: string; filename: string; mime_type?: string }): Promise<MailMyPDFDocument> {
  const result = await request<{ document?: MailMyPDFDocument } | MailMyPDFDocument>("/v1/documents", { method: "POST", body: JSON.stringify(input) });
  return "document" in result && result.document ? result.document : result as MailMyPDFDocument;
}

export async function createCommunication(input: CreateImmigrationCommunicationInput): Promise<MailMyPDFCommunication> {
  return request<MailMyPDFCommunication>("/v1/communications", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotency_key },
    body: JSON.stringify({ ...input, metadata: { vertical: "immigration-mail", product: "immigration-mail", ...(input.metadata ?? {}) } }),
  });
}

export async function getCommunication(id: string): Promise<MailMyPDFCommunication> {
  return request<MailMyPDFCommunication>(`/v1/communications/${encodeURIComponent(id)}`);
}

/**
 * Proof-of-Service Client SDK
 *
 * A TypeScript client for the Proof-of-Service API. This is what the calling application
 * (or any other vertical app) imports to interact with the PoS API.
 *
 * Usage:
 *   import { ProofOfServiceClient } from "@/lib/proof-of-service/client";
 *
 *   const client = new ProofOfServiceClient({
 *     baseUrl: "https://mailmypdf.ai/api/v1",
 *     apiKey: process.env.PROOF_OF_SERVICE_API_KEY,
 *   });
 *
 *   // Upload a document
 *   const doc = await client.documents.upload(file);
 *
 *   // Create + send a communication
 *   const comm = await client.communications.create({
 *     document_id: doc.id,
 *     legal_reference: { ... },
 *     recipient: { ... },
 *     mail_type: "certified",
 *     matter_reference: "Humboldt-CE-2026-0042",
 *     matter_type: "code_enforcement",
 *   });
 *
 *   // Get the proof bundle
 *   const bundle = await client.communications.getProofBundle(comm.id);
 */

export interface ClientConfig {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
}

export interface ProofDocument {
  id: string;
  tenant_id: string;
  filename: string;
  mime_type: string;
  sha256: string;
  size_bytes: number;
  source: string;
  template_id: string | null;
  created_at: string;
}

export interface LegalReference {
  type: "statute" | "lease_clause" | "contract_term" | "regulation" | "ordinance" | "other";
  citation: string;
  description: string;
  response_window_days: number | null;
  response_window_ends: string | null;
  notes?: string;
}

export interface Recipient {
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
}

export type MailType = "first_class" | "certified" | "certified_return_receipt" | "registered";

export interface CreateCommunicationParams {
  document_id: string;
  legal_reference: LegalReference;
  recipient: Recipient;
  mail_type: MailType;
  matter_reference: string;
  matter_type: string;
  metadata?: Record<string, unknown>;
  from_address?: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postal: string;
  };
}

export interface CustodyEvent {
  timestamp: string;
  event_type: string;
  description: string;
  event_hash: string;
  prior_event_hash: string | null;
}

export interface CommunicationRecord {
  id: string;
  tenant_id: string;
  document_id: string;
  document_sha256: string;
  legal_reference: LegalReference;
  recipient: Recipient;
  mail_type: MailType;
  matter_reference: string;
  matter_type: string;
  status: string;
  carrier: string | null;
  tracking_number: string | null;
  lob_letter_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  signature_image_url: string | null;
  record_sha256: string;
  prior_record_hash: string | null;
  metadata: Record<string, unknown> | null;
  custody_chain: CustodyEvent[];
  created_at: string;
}

export interface ProofBundle {
  id: string;
  communication_id: string;
  document_sha256: string;
  document_filename: string;
  sent_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  mail_type: MailType;
  delivered_at: string | null;
  signature_image_url: string | null;
  proof_of_delivery: unknown | null;
  legal_reference: LegalReference;
  response_window_status: string;
  response_window_ends: string | null;
  custody_chain: CustodyEvent[];
  bundle_sha256: string;
  generated_at: string;
}

export interface ProofTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  vertical: string;
  body_html: string;
  variables: string[];
  default_legal_reference: LegalReference | null;
  created_at: string;
}

export interface VerificationResult {
  verified: boolean;
  tracking_number?: string;
  carrier?: string;
  mail_type?: string;
  status?: string;
  sent_at?: string;
  delivered_at?: string;
  document_sha256?: string;
  legal_citation?: string;
  legal_description?: string;
  response_window_ends?: string;
  custody_chain?: CustodyEvent[];
  message?: string;
}

export interface ListResult<T> {
  data: T[];
  has_more: boolean;
}

export class ProofOfServiceClient {
  private baseUrl: string;
  private apiKey: string;
  private fetchFn: typeof fetch;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.fetchFn = config.fetch ?? fetch;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers);

    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.apiKey}`);
    }

    const response = await this.fetchFn(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const message = body?.error?.message ?? response.statusText;
      const error = new Error(`ProofOfService API error (${response.status}): ${message}`);
      (error as any).status = response.status;
      (error as any).body = body;
      throw error;
    }

    return response.json() as Promise<T>;
  }

  readonly documents = {
    /**
     * Upload a document (PDF, PNG, or JPEG, max 10MB).
     * SHA-256 hash is computed server-side.
     */
    upload: async (file: File | Blob, filename?: string): Promise<ProofDocument> => {
      const formData = new FormData();
      formData.append("file", file, filename);
      return this.request<ProofDocument>("/documents", {
        method: "POST",
        body: formData,
      });
    },

    /**
     * Upload a document from a base64-encoded string.
     */
    uploadBase64: async (content: string, filename: string, mimeType = "application/pdf"): Promise<ProofDocument> => {
      return this.request<ProofDocument>("/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, filename, mime_type: mimeType }),
      });
    },

    /**
     * Get a document's metadata and hash.
     */
    get: async (id: string): Promise<ProofDocument> => {
      return this.request<ProofDocument>(`/documents/${id}`);
    },
  };

  readonly communications = {
    /**
     * Create a communication record and send it via Lob.
     * This is the core endpoint — it:
     * 1. Validates the document exists
     * 2. Creates the communication record with hash chain
     * 3. Submits to Lob for mailing
     * 4. Appends custody events
     * 5. Returns the full communication record
     */
    create: async (params: CreateCommunicationParams): Promise<CommunicationRecord> => {
      return this.request<CommunicationRecord>("/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    },

    /**
     * Get a full communication record including the custody chain.
     */
    get: async (id: string): Promise<CommunicationRecord> => {
      return this.request<CommunicationRecord>(`/communications/${id}`);
    },

    /**
     * List communications with optional filtering.
     */
    list: async (params?: {
      matter_reference?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }): Promise<ListResult<CommunicationRecord>> => {
      const search = new URLSearchParams();
      if (params?.matter_reference) search.set("matter_reference", params.matter_reference);
      if (params?.status) search.set("status", params.status);
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.offset) search.set("offset", String(params.offset));
      const query = search.toString();
      return this.request<ListResult<CommunicationRecord>>(`/communications${query ? `?${query}` : ""}`);
    },

    /**
     * Get the proof bundle — the exportable evidence package.
     * This is what you hand to a judge or attach to a filing.
     */
    getProofBundle: async (id: string): Promise<ProofBundle> => {
      return this.request<ProofBundle>(`/communications/${id}/proof`);
    },
  };

  readonly templates = {
    /**
     * Create a reusable notice template.
     */
    create: async (params: {
      name: string;
      description?: string;
      vertical?: string;
      body_html: string;
      variables?: string[];
      default_legal_reference?: Partial<LegalReference>;
    }): Promise<ProofTemplate> => {
      return this.request<ProofTemplate>("/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    },

    /**
     * List templates, optionally filtered by vertical.
     */
    list: async (vertical?: string): Promise<{ data: ProofTemplate[] }> => {
      const query = vertical ? `?vertical=${encodeURIComponent(vertical)}` : "";
      return this.request<{ data: ProofTemplate[] }>(`/templates${query}`);
    },

    /**
     * Render a template with variables → returns a Document.
     * The rendered PDF is hashed and stored — use the returned document_id
     * in communications.create().
     */
    render: async (templateId: string, variables: Record<string, string>): Promise<ProofDocument> => {
      return this.request<ProofDocument>(`/templates/${templateId}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables }),
      });
    },
  };

  readonly verify = {
    /**
     * Public verification — no API key needed.
     * A third party (judge, auditor, opposing counsel) can verify a send.
     */
    verifyByTracking: async (trackingNumber: string, documentHash: string): Promise<VerificationResult> => {
      const url = `${this.baseUrl.replace("/api/v1", "")}/api/v1/verify/${encodeURIComponent(trackingNumber)}?document_hash=${documentHash}`;
      const response = await this.fetchFn(url);
      return response.json() as Promise<VerificationResult>;
    },
  };
}

/**
 * Factory function for creating a client from environment variables.
 * Expects PROOF_OF_SERVICE_BASE_URL and PROOF_OF_SERVICE_API_KEY.
 */
export function createProofOfServiceClient(): ProofOfServiceClient {
  const baseUrl = process.env.PROOF_OF_SERVICE_BASE_URL ?? "https://mailmypdf.ai/api/v1";
  const apiKey = required("PROOF_OF_SERVICE_API_KEY");

  return new ProofOfServiceClient({ baseUrl, apiKey });
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

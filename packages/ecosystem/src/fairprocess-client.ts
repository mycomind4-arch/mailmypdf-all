/**
 * FairProcess API Client
 *
 * Connects MailMyPDF vertical apps to the FairProcess canonical
 * due-process engine running on Cloudflare Workers + PostgreSQL.
 *
 * This is a shared package — every vertical imports from here
 * rather than having its own copy.
 *
 * API surface:
 *   POST /api/cases              — create a case
 *   GET  /api/cases/:id          — get case details
 *   POST /api/cases/:id/evidence — register evidence metadata
 *   GET  /api/cases/:id/audit-trail — tamper-evident audit trail
 *   POST /api/cases/:id/correspondence — register outgoing correspondence
 *   POST /api/correspondence/:id/authorize — authorize correspondence
 *   GET  /health                 — health check
 */

const FAIRPROCESS_API_URL = import.meta.env.VITE_FAIRPROCESS_API_URL ?? "";
const FAIRPROCESS_API_KEY = import.meta.env.VITE_FAIRPROCESS_API_KEY ?? "";

// ── Types ──────────────────────────────────────────────────────

export interface FairProcessCase {
  id: string;
  tenantId: string;
  jurisdiction: string | null;
  agency: string | null;
  agencyCaseNumber: string | null;
  asOf: string | null;
  status: string;
}

export interface FairProcessEvidence {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface FairProcessAuditEvent {
  id: string;
  actor: string;
  action: string;
  sourceHashes: string[];
  result: Record<string, unknown>;
  humanAuthorizedBy: string | null;
  eventHash: string;
  createdAt: string;
}

export interface CreateCaseInput {
  id?: string;
  jurisdiction?: string;
  agency?: string;
  agencyCaseNumber?: string;
  asOf?: string;
  apns?: string[];
}

export interface RegisterEvidenceInput {
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  storagePath: string;
}

export interface CreateCorrespondenceInput {
  type: string;
  recipient: string;
  content: string;
  method?: string;
}

// ── Client ─────────────────────────────────────────────────────

async function fpFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!FAIRPROCESS_API_URL) {
    throw new Error("VITE_FAIRPROCESS_API_URL is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (FAIRPROCESS_API_KEY) {
    headers["Authorization"] = `Bearer ${FAIRPROCESS_API_KEY}`;
  }

  const response = await fetch(`${FAIRPROCESS_API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`FairProcess API error (${response.status}): ${error.error ?? response.statusText}`);
  }

  return response;
}

// ── Case Management ────────────────────────────────────────────

export async function createCase(input: CreateCaseInput): Promise<{ id: string }> {
  const response = await fpFetch("/api/cases", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json();
}

export async function getCase(caseId: string): Promise<{
  case: FairProcessCase;
  evidence: FairProcessEvidence[];
  facts: unknown[];
  expectations: unknown[];
}> {
  const response = await fpFetch(`/api/cases/${caseId}`);
  return response.json();
}

// ── Evidence ───────────────────────────────────────────────────

export async function registerEvidence(
  caseId: string,
  input: RegisterEvidenceInput,
): Promise<{ id: string }> {
  const response = await fpFetch(`/api/cases/${caseId}/evidence`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json();
}

export async function uploadEvidenceMetadata(
  caseId: string,
  file: File,
  storagePath: string,
): Promise<{ id: string; sha256: string }> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const sha256 = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const result = await registerEvidence(caseId, {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    sha256,
    storagePath,
  });

  return { id: result.id, sha256 };
}

// ── Audit Trail ─────────────────────────────────────────────────

export async function getAuditTrail(caseId: string): Promise<{
  events: FairProcessAuditEvent[];
}> {
  const response = await fpFetch(`/api/cases/${caseId}/audit-trail`);
  return response.json();
}

// ── Correspondence ──────────────────────────────────────────────

export async function createCorrespondence(
  caseId: string,
  input: CreateCorrespondenceInput,
): Promise<{ id: string }> {
  const response = await fpFetch(`/api/cases/${caseId}/correspondence`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json();
}

export async function authorizeCorrespondence(
  correspondenceId: string,
  authorizedBy: string,
): Promise<{ id: string }> {
  const response = await fpFetch(`/api/correspondence/${correspondenceId}/authorize`, {
    method: "POST",
    body: JSON.stringify({ authorizedBy }),
  });
  return response.json();
}

// ── Health ──────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fpFetch("/health");
  return response.json();
}

export function isConfigured(): boolean {
  return Boolean(FAIRPROCESS_API_URL && FAIRPROCESS_API_KEY);
}

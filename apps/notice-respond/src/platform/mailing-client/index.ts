/**
 * Local @mailmypdf/mailing-client shim.
 *
 * Provides the same interface as the shared platform package
 * so the build resolves without the private npm dependency.
 * The real implementation lives in the MailMyPDF platform service;
 * this shim handles document upload via the platform API.
 */

export type MailType = "standard" | "certified" | "registered";

export interface MailMyPDFDocument {
  id: string;
  name: string;
  url: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface MailingRecipient {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface CreateCommunicationInput {
  recipient: MailingRecipient;
  documents: MailMyPDFDocument[];
  mailType: MailType;
  referenceId?: string;
  workflowId?: string;
}

export interface MailMyPDFCommunication {
  id: string;
  status: string;
  trackingNumber?: string;
  createdAt: string;
  mailType: MailType;
}

export class MailMyPDFPlatformError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "MailMyPDFPlatformError";
  }
}

const PLATFORM_BASE = (typeof process !== "undefined" && process.env?.MAILMYPDF_PLATFORM_URL) || "https://mailmypdf-etc.pages.dev";

export async function uploadDocument(file: File): Promise<MailMyPDFDocument> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${PLATFORM_BASE}/api/documents`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new MailMyPDFPlatformError(`Document upload failed (${res.status})`, res.status);
  }
  return res.json();
}

export async function uploadDocumentBase64(base64: string, filename: string, contentType = "application/pdf"): Promise<MailMyPDFDocument> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const file = new File([bytes], filename, { type: contentType });
  return uploadDocument(file);
}

export async function createCommunication(input: CreateCommunicationInput): Promise<MailMyPDFCommunication> {
  const res = await fetch(`${PLATFORM_BASE}/api/communications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new MailMyPDFPlatformError(`Communication creation failed (${res.status})`, res.status);
  }
  return res.json();
}

export async function getCommunication(id: string): Promise<MailMyPDFCommunication> {
  const res = await fetch(`${PLATFORM_BASE}/api/communications/${id}`);
  if (!res.ok) {
    throw new MailMyPDFPlatformError(`Failed to fetch communication (${res.status})`, res.status);
  }
  return res.json();
}

export function createMailingClient() {
  return { uploadDocument, uploadDocumentBase64, createCommunication, getCommunication };
}

export const SSDI_WORKFLOW_ID = "ssdi-denial";
export const SSDI_VERTICAL_ID = "appeal-mail";

export const EVIDENCE_KINDS = [
  "medical_records",
  "physician_statement",
  "test_results",
  "medication_history",
  "functional_capacity",
  "work_history",
  "prior_decision",
  "correspondence",
  "other",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type MailClass = "standard" | "certified" | "registered";

export interface WorkflowCase {
  id: string;
  workflow_id: string;
  vertical_id: string;
  status: "intake" | "analyzed" | "evidence" | "drafted" | "approved" | "submitted" | "abandoned";
  created_at: string;
  updated_at: string;
}

export interface CaseDocument {
  id: string;
  document_id: string;
  role: "subject_notice" | "evidence";
  evidence_kind: EvidenceKind | null;
  page_count: number | null;
  included: boolean;
  position: number;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  security_status: string;
  usable: boolean;
}

export interface ServerQuote {
  workflowId: string;
  verticalId: string;
  actualPages: number;
  totalCents: number;
  currency: string;
  quotedAt: string;
  [key: string]: unknown;
}

export interface PacketPreview {
  packetSha256: string;
  responsePages: number;
  supportingPages: number;
  manifest: Array<{
    documentId?: string;
    filename?: string;
    pageCount?: number;
    [key: string]: unknown;
  }>;
  quote: ServerQuote;
}

export interface Recipient {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
}

export interface ApprovalResult {
  approval_id: string;
  packet_sha256: string;
  response_pages: number;
  supporting_pages: number;
  quote: ServerQuote;
}

export function evidenceLabel(kind: EvidenceKind | null): string {
  if (!kind) return "Supporting document";
  return kind.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function includedDocuments(documents: CaseDocument[]): CaseDocument[] {
  return documents
    .filter((document) => document.included)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "subject_notice" ? -1 : 1;
      return a.position - b.position;
    });
}

export function packetBlockers(documents: CaseDocument[]): string[] {
  const included = includedDocuments(documents);
  const blockers: string[] = [];
  if (!included.some((document) => document.role === "subject_notice"))
    blockers.push("Add the SSDI denial notice.");
  const pending = included.filter((document) => !document.usable);
  if (pending.length)
    blockers.push(
      `${pending.length} included document${pending.length === 1 ? " is" : "s are"} still awaiting a security scan.`,
    );
  return blockers;
}

export function formatServerMoney(quote: ServerQuote): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: quote.currency || "USD",
  }).format(quote.totalCents / 100);
}

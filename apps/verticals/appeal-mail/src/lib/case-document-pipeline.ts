export type CaseDocumentKind = "source" | "evidence" | "supporting";

export type CaseDocumentRecord = {
  id: string;
  caseId: string;
  ownerId: string;
  filename: string;
  mimeType: string;
  kind: CaseDocumentKind;
  pageCount?: number;
  extractedText?: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  createdAt: string;
};

const MAX_EXTRACTED_TEXT = 200_000;
const SUPPORTED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export function validateCaseDocumentInput(input: Pick<CaseDocumentRecord, "filename" | "mimeType">) {
  if (!input.filename.trim()) throw new Error("A filename is required");
  if (!SUPPORTED_TYPES.has(input.mimeType)) throw new Error("Unsupported document type");
  return true;
}

export function normalizeExtractedText(text: string) {
  return text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim().slice(0, MAX_EXTRACTED_TEXT);
}

export function buildAiDocumentContext(documents: CaseDocumentRecord[]) {
  return documents
    .filter((document) => document.status === "ready" && document.extractedText)
    .map((document) => `DOCUMENT: ${document.filename}\nKIND: ${document.kind}\n${document.extractedText}`)
    .join("\n\n---\n\n");
}

export function isDocumentReadyForPacket(document: CaseDocumentRecord) {
  return document.status === "ready" && Boolean(document.filename) && SUPPORTED_TYPES.has(document.mimeType);
}

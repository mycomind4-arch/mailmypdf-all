import { describe, expect, it } from "vitest";
import {
  buildAiDocumentContext,
  isDocumentReadyForPacket,
  normalizeExtractedText,
  validateCaseDocumentInput,
  type CaseDocumentRecord,
} from "./case-document-pipeline";

function document(overrides: Partial<CaseDocumentRecord> = {}): CaseDocumentRecord {
  return {
    id: "doc-1",
    caseId: "case-1",
    ownerId: "owner-1",
    filename: "decision.pdf",
    mimeType: "application/pdf",
    kind: "source",
    extractedText: "Decision text",
    status: "ready",
    createdAt: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("case document pipeline", () => {
  it("accepts packet-supported source types and rejects arbitrary types", () => {
    expect(validateCaseDocumentInput({ filename: "notice.pdf", mimeType: "application/pdf" })).toBe(true);
    expect(() => validateCaseDocumentInput({ filename: "script.html", mimeType: "text/html" })).toThrow("Unsupported document type");
  });

  it("normalizes extracted text before it is sent to AI", () => {
    expect(normalizeExtractedText("abc\u0000   \n def ")).toBe("abc\n def");
  });

  it("builds AI context only from ready documents with extracted text", () => {
    const context = buildAiDocumentContext([
      document(),
      document({ id: "doc-2", filename: "pending.pdf", status: "processing" }),
    ]);
    expect(context).toContain("DOCUMENT: decision.pdf");
    expect(context).not.toContain("pending.pdf");
  });

  it("only treats supported ready documents as packet-ready", () => {
    expect(isDocumentReadyForPacket(document())).toBe(true);
    expect(isDocumentReadyForPacket(document({ status: "processing" }))).toBe(false);
    expect(isDocumentReadyForPacket(document({ mimeType: "text/plain" }))).toBe(false);
  });
});

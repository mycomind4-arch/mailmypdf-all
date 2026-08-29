/**
 * Immigration-Mail domain intelligence contracts.
 *
 * This layer is intentionally provider-neutral. It is shaped to consume the
 * shared MailMyPDF Platform document/provenance/AI contracts without coupling
 * the vertical to a particular model, OCR vendor, or realtime runtime.
 */

export type ImmigrationAgency = "USCIS" | "DOS" | "ICE" | "CBP" | "EOIR" | "DHS" | "OTHER";

export type ImmigrationDocumentType =
  | "notice"
  | "request-for-evidence"
  | "notice-of-intent"
  | "receipt"
  | "decision"
  | "appointment"
  | "biometrics"
  | "interview"
  | "correspondence"
  | "form"
  | "identity"
  | "supporting-evidence"
  | "unknown";

export interface ImmigrationSourceRef {
  documentId: string;
  documentName: string;
  page?: number;
  excerpt?: string;
}

export interface ExtractedImmigrationFact {
  key: string;
  value: string;
  confidence: number;
  source?: ImmigrationSourceRef;
}

export interface ImmigrationDeadline {
  label: string;
  date: string;
  confidence: number;
  source?: ImmigrationSourceRef;
  /** Never treat an inferred deadline as authoritative without review. */
  basis: "explicit-document-date" | "user-provided" | "inferred";
}

export interface ImmigrationDocumentAnalysis {
  documentType: ImmigrationDocumentType;
  agency: ImmigrationAgency;
  confidence: number;
  facts: readonly ExtractedImmigrationFact[];
  deadlines: readonly ImmigrationDeadline[];
  requestedActions: readonly string[];
  warnings: readonly string[];
  sources: readonly ImmigrationSourceRef[];
}

export interface ImmigrationCaseContext {
  caseId: string;
  applicantId?: string;
  receiptNumbers: readonly string[];
  alienNumbers: readonly string[];
  documents: readonly string[];
  facts: readonly ExtractedImmigrationFact[];
  deadlines: readonly ImmigrationDeadline[];
}

export interface ImmigrationDraftRequest {
  objective: string;
  facts: readonly ExtractedImmigrationFact[];
  sourceDocuments: readonly ImmigrationSourceRef[];
  language: string;
}

export interface ImmigrationDraftResult {
  draft: string;
  warnings: readonly string[];
  unsupportedClaims: readonly string[];
  sources: readonly ImmigrationSourceRef[];
}

export interface ImmigrationPreflightIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  source?: ImmigrationSourceRef;
}

export interface ImmigrationPreflightResult {
  ready: boolean;
  issues: readonly ImmigrationPreflightIssue[];
}

export interface ImmigrationIntelligenceProvider {
  analyzeDocument(input: {
    documentId: string;
    filename: string;
    extractedText: string;
    source?: ImmigrationSourceRef;
  }): Promise<ImmigrationDocumentAnalysis>;

  draftResponse(input: ImmigrationDraftRequest): Promise<ImmigrationDraftResult>;

  preflight(input: {
    draft: string;
    recipient: { name: string; organization?: string; address: string };
    caseContext?: ImmigrationCaseContext;
  }): Promise<ImmigrationPreflightResult>;
}

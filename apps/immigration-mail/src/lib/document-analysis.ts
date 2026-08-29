/**
 * Document analysis types — the structured output of analyzing an immigration document.
 * Used by the /analyze page and the server-side analysis API.
 */

export type DocumentType =
  | "request_for_evidence"
  | "notice_of_intent_to_deny"
  | "biometrics_notice"
  | "interview_notice"
  | "rejection_notice"
  | "approval_notice"
  | "denial_notice"
  | "document_request"
  | "government_correspondence"
  | "attorney_correspondence"
  | "consular_correspondence"
  | "visa_correspondence"
  | "other";

export type Agency =
  | "USCIS"
  | "DOS"
  | "CBP"
  | "ICE"
  | "NVC"
  | "EOIR"
  | "SSA"
  | "DOL"
  | "other";

export type AnalysisConfidence = "high" | "medium" | "low";

export type FactSource = "document" | "user" | "inferred" | "unknown";

export interface ExtractedDate {
  label: string;
  value: string; // ISO date string
  source: FactSource;
  confidence: AnalysisConfidence;
}

export interface RequestedAction {
  description: string;
  deadline?: string; // ISO date if stated
  confidence: AnalysisConfidence;
}

export interface DocumentAnalysis {
  document_type: DocumentType;
  document_type_label: string; // Human-readable
  agency: Agency;
  agency_label: string;
  confidence: AnalysisConfidence;
  receipt_number?: string;
  case_number?: string;
  applicant_name?: string;
  petitioner_name?: string;
  notice_date?: string;
  response_deadline?: string;
  extracted_dates: ExtractedDate[];
  requested_actions: RequestedAction[];
  referenced_forms: string[];
  mailing_address?: {
    name?: string;
    org?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  warnings: string[];
  plain_english_explanation: string;
  what_it_means: string;
  what_to_do: string[];
  documents_to_verify: string[];
  recommended_workflow?: string;
  // Metadata about the analysis itself
  analysis_notes?: string;
  uncertainty_flags: string[];
}

/**
 * Default/empty analysis for when analysis hasn't completed yet.
 */
export const emptyAnalysis: DocumentAnalysis = {
  document_type: "other",
  document_type_label: "Unknown document type",
  agency: "other",
  agency_label: "Unknown agency",
  confidence: "low",
  extracted_dates: [],
  requested_actions: [],
  referenced_forms: [],
  warnings: [],
  plain_english_explanation: "",
  what_it_means: "",
  what_to_do: [],
  documents_to_verify: [],
  uncertainty_flags: [],
};

/**
 * Human-readable labels for document types.
 */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  request_for_evidence: "Request for Evidence (RFE)",
  notice_of_intent_to_deny: "Notice of Intent to Deny (NOID)",
  biometrics_notice: "Biometrics Appointment Notice",
  interview_notice: "Interview Appointment Notice",
  rejection_notice: "Rejection Notice",
  approval_notice: "Approval Notice",
  denial_notice: "Denial Notice",
  document_request: "Document Request",
  government_correspondence: "Government Correspondence",
  attorney_correspondence: "Attorney Correspondence",
  consular_correspondence: "Consular Correspondence",
  visa_correspondence: "Visa Correspondence",
  other: "Other Immigration Document",
};

/**
 * Human-readable labels for agencies.
 */
export const AGENCY_LABELS: Record<Agency, string> = {
  USCIS: "U.S. Citizenship and Immigration Services (USCIS)",
  DOS: "U.S. Department of State",
  CBP: "U.S. Customs and Border Protection (CBP)",
  ICE: "U.S. Immigration and Customs Enforcement (ICE)",
  NVC: "National Visa Center (NVC)",
  EOIR: "Executive Office for Immigration Review (EOIR)",
  SSA: "Social Security Administration (SSA)",
  DOL: "U.S. Department of Labor (DOL)",
  other: "Unknown Agency",
};

/**
 * The prompt sent to the AI for document analysis.
 * This is a system prompt that instructs the AI on how to analyze
 * immigration documents and return structured JSON.
 */
export const ANALYSIS_SYSTEM_PROMPT = `You are an immigration document analyzer. You help users understand immigration-related correspondence they have received.

Your job:
1. Identify the document type (RFE, NOID, biometrics notice, interview notice, rejection, approval, denial, etc.)
2. Identify the issuing agency (USCIS, DOS, CBP, ICE, NVC, EOIR, SSA, DOL)
3. Extract key information: receipt/case numbers, applicant/petitioner names, dates, deadlines
4. Extract any requested actions or documents
5. Identify referenced forms
6. Extract mailing address if present
7. Provide a plain-English explanation of what the document is and why the person likely received it
8. List what the person should do next
9. Flag any information that is uncertain or could not be determined

CRITICAL RULES:
- Never fabricate information. If something is not in the document, do not include it.
- Never state legal conclusions or provide legal advice.
- Use "The notice states..." language rather than "You legally have..." language.
- If a deadline is mentioned, note it but do not confirm it is legally binding.
- Flag uncertainty explicitly.
- The document text provided may be incomplete or OCR-imperfect. Work with what you have.
- If you cannot determine the document type, say so.

Return your analysis as JSON matching this TypeScript interface:

{
  document_type: string,
  document_type_label: string,
  agency: string,
  agency_label: string,
  confidence: "high" | "medium" | "low",
  receipt_number?: string,
  case_number?: string,
  applicant_name?: string,
  petitioner_name?: string,
  notice_date?: string,
  response_deadline?: string,
  extracted_dates: [{ label: string, value: string, source: "document" | "user" | "inferred" | "unknown", confidence: "high" | "medium" | "low" }],
  requested_actions: [{ description: string, deadline?: string, confidence: "high" | "medium" | "low" }],
  referenced_forms: string[],
  mailing_address?: { name?, org?, address1?, address2?, city?, state?, zip? },
  warnings: string[],
  plain_english_explanation: string,
  what_it_means: string,
  what_to_do: string[],
  documents_to_verify: string[],
  recommended_workflow?: string,
  analysis_notes?: string,
  uncertainty_flags: string[]
}

Return ONLY the JSON. No markdown, no code fences, no preamble.`;

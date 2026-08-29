export type Confidence = "high" | "medium" | "low";

export type ExtractedField = {
  value: string;
  confidence: Confidence;
  source?: string;
};

export type AppealAnalysis = {
  decisionDate?: ExtractedField;
  appealDeadline?: ExtractedField;
  decisionMaker?: ExtractedField;
  decisionType?: ExtractedField;
  decisionSummary?: ExtractedField;
  denialReason?: ExtractedField;
  appealMechanism?: ExtractedField;
  issues: string[];
  missingEvidence: string[];
  requiredActions: string[];
  warnings: string[];
};

export const APPEAL_ANALYSIS_PROMPT = `You are the document-analysis layer for AppealReply, an evidence-first correspondence product built on MailMyPDF.

Analyze the uploaded decision or denial document. Extract only information supported by the document. Do not invent legal conclusions, deadlines, appeal rights, or facts.

Return strict JSON matching this shape:
{
  "decisionDate": {"value":"", "confidence":"high|medium|low","source":""},
  "appealDeadline": {"value":"","confidence":"high|medium|low","source":""},
  "decisionMaker": {"value":"","confidence":"high|medium|low","source":""},
  "decisionType": {"value":"","confidence":"high|medium|low","source":""},
  "decisionSummary": {"value":"","confidence":"high|medium|low","source":""},
  "denialReason": {"value":"","confidence":"high|medium|low","source":""},
  "appealMechanism": {"value":"","confidence":"high|medium|low","source":""},
  "issues": [],
  "missingEvidence": [],
  "requiredActions": [],
  "warnings": []
}

For dates, preserve the document's stated date and explain ambiguity in warnings rather than guessing. Treat all extracted information as requiring user verification before it is used in an appeal.`;

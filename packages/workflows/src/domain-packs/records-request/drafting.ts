import type {
  RecordsRequestDraft,
  RecordsRequestDraftInput,
} from "./types.js";

export interface RecordsRequestDraftValidation {
  passed: boolean;
  errors: readonly string[];
}

export function validateRecordsRequestDraftInput(
  input: RecordsRequestDraftInput,
): RecordsRequestDraftValidation {
  const errors: string[] = [];

  if (!input.recordsSought?.trim()) {
    errors.push("recordsSought is required.");
  }

  for (const value of input.priorRequestDates ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors.push(`priorRequestDates contains a non-calendar-date value: ${value}`);
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Builds the grounded drafting instructions that an AI adapter may execute.
 * This module intentionally does not call a model directly; the shared AI
 * package owns model selection, tracing, retries, and provider credentials.
 */
export function buildRecordsRequestDraftPrompt(input: RecordsRequestDraftInput): string {
  const validation = validateRecordsRequestDraftInput(input);
  if (!validation.passed) {
    throw new Error(validation.errors.join(" "));
  }

  const authority = input.authority;
  const authorityBlock = authority
    ? [
        `LAW / AUTHORITY: ${authority.name}`,
        authority.requestCitation ? `REQUEST CITATION: ${authority.requestCitation}` : null,
        authority.withholdingInstruction
          ? `WITHHOLDING / REDACTION REQUEST: ${authority.withholdingInstruction}`
          : null,
      ].filter(Boolean).join("\n")
    : "LAW / AUTHORITY: Use only authority supplied or verified elsewhere in the workflow; do not invent citations.";

  return `Draft a public or agency records request letter.

Primary objectives:
1. Identify the records sought with enough specificity that the recipient can locate them.
2. Use only facts and references supplied below. Never invent a case number, date, address, agency, statute, or prior request.
3. Ask for confirmation of receipt and a response or production timeline.
4. If a governing authority profile is supplied, follow it exactly and do not add unverified legal citations.
5. Keep the request concise and operational. Do not accuse the agency of misconduct or state unsupported legal conclusions.
6. Surface missing information as open questions rather than guessing.

${authorityBlock}

RECIPIENT AGENCY: ${input.agency?.trim() || "not supplied"}
RECIPIENT / CUSTODIAN: ${input.recipient?.trim() || "not supplied"}
RECORDS SOUGHT: ${input.recordsSought.trim()}
CASE / MATTER REFERENCE: ${input.caseReference?.trim() || "not supplied"}
PROPERTY / SUBJECT REFERENCE: ${input.propertyReference?.trim() || "not supplied"}
DATE RANGE: ${input.dateRange?.trim() || "not supplied"}
PRIOR REQUEST DATES: ${JSON.stringify(input.priorRequestDates ?? [])}
PREFERRED FORMAT: ${input.preferredFormat?.trim() || "not supplied"}
ADDITIONAL VERIFIED INSTRUCTIONS: ${JSON.stringify(input.additionalInstructions ?? [])}

Return JSON only:
{"subject": string, "body": string, "openQuestions": string[]}`;
}

export function validateRecordsRequestDraft(
  draft: RecordsRequestDraft,
): RecordsRequestDraftValidation {
  const errors: string[] = [];
  const subject = draft.subject?.trim() ?? "";
  const body = draft.body?.trim() ?? "";

  if (!subject) errors.push("Draft subject is required.");
  if (!body) errors.push("Draft body is required.");

  const combined = `${subject}\n${body}`;
  const placeholderPatterns = [
    /\[(?:your|insert|agency|date|name|address)[^\]]*\]/i,
    /\{\{[^}]+\}\}/,
    /<[^>]*(?:insert|name|date|address)[^>]*>/i,
  ];
  if (placeholderPatterns.some((pattern) => pattern.test(combined))) {
    errors.push("Draft contains unresolved placeholders.");
  }

  return { passed: errors.length === 0, errors };
}

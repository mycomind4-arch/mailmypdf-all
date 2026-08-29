/* ═══════════════════════════════════════════════════════════
   RESPONSE DRAFT GENERATION
   Produces a structured response letter from the analysis
   results. Deterministic — uses templates, not LLM calls.
   ═══════════════════════════════════════════════════════════ */

import type { NoticeFact } from "./fact";
import type { Deadline } from "./deadline";
import type { Strategy } from "./strategy";
import { STRATEGY_TYPE_LABELS } from "./strategy";

export interface UnresolvedPlaceholder {
  placeholder: string;
  reason: string;
}

export interface ResponseDraft {
  content: string;
  wordCount: number;
  unresolvedPlaceholders: UnresolvedPlaceholder[];
}

export interface ResponseDraftInput {
  agency?: string;
  referenceNumber?: string;
  noticeDate?: string;
  facts: NoticeFact[];
  deadline: Deadline;
  selectedStrategy: Strategy;
  userObjective?: string;
  userFacts?: string;
  hasSignature: boolean;
}

export function generateResponseDraft(input: ResponseDraftInput): ResponseDraft {
  const placeholders: UnresolvedPlaceholder[] = [];

  const agencyName = input.agency ?? (() => {
    placeholders.push({ placeholder: "AGENCY_NAME", reason: "No issuing agency was identified" });
    return "[AGENCY_NAME]";
  })();

  const refLine = input.referenceNumber
    ? `Re: ${input.referenceNumber}`
    : (() => {
      placeholders.push({ placeholder: "REFERENCE_NUMBER", reason: "No reference or case number was found" });
      return "Re: [REFERENCE_NUMBER]";
    })();

  const noticeDateLine = input.noticeDate
    ? `Notice Date: ${input.noticeDate}`
    : "";

  const deadlineLine = input.deadline.date
    ? `Response Deadline: ${input.deadline.date}`
    : (() => {
      placeholders.push({ placeholder: "DEADLINE", reason: "No response deadline was identified" });
      return "Response Deadline: [DEADLINE]";
    })();

  /* ── Strategy-specific opening ── */
  const strategyLabel = STRATEGY_TYPE_LABELS[input.selectedStrategy.type];
  let opening: string;

  switch (input.selectedStrategy.type) {
    case "factual_correction":
      opening = "I am writing to correct factual errors in the notice referenced above. After reviewing the notice against my records, I have identified several inaccuracies that I would like to address.";
      break;
    case "dispute_full":
      opening = "I am writing to formally dispute the notice referenced above in its entirety. The factual basis of the notice is incorrect, and I am providing documentation to support my position.";
      break;
    case "dispute_partial":
      opening = "I am writing regarding the notice referenced above. While I acknowledge certain aspects of the notice, I am disputing specific items as described below.";
      break;
    case "payment_plan":
      opening = "I am writing to acknowledge the balance referenced in the notice and to request a payment plan or installment agreement to satisfy the amount owed.";
      break;
    case "appeal_rights":
      opening = "I am writing to exercise my appeal rights as stated in the notice referenced above. I respectfully request that this matter be reviewed through the formal appeal process.";
      break;
    case "request_extension":
      opening = "I am writing to request an extension of the response deadline for the notice referenced above. I am in the process of gathering information needed to provide a complete response.";
      break;
    case "request_hearing":
      opening = "I am writing to formally request a hearing regarding the proposed action referenced above. I wish to contest this action and present my case.";
      break;
    case "foia_request":
      opening = "I am writing to appeal the determination regarding my records request referenced above. I believe additional records exist that should be disclosed.";
      break;
    case "compliance_acknowledgment":
      opening = "I am writing to acknowledge receipt of the notice referenced above and to confirm my compliance with the requirements stated therein.";
      break;
    case "supplemental_submission":
      opening = "I am writing in response to the notice referenced above and am providing supplemental documentation in support of my position.";
      break;
    default:
      opening = "I am writing in response to the notice referenced above.";
  }

  /* ── Facts section ── */
  const factLines = input.facts.length > 0
    ? input.facts.map((f) => `  • ${f.label}: ${f.value}`).join("\n")
    : (() => {
      placeholders.push({ placeholder: "FACTS", reason: "No facts were extracted from the notice" });
      return "  [FACTS — no facts were automatically extracted]";
    })();

  /* ── User facts ── */
  const userFactsLine = input.userFacts
    ? `\nAdditional information from my records:\n${input.userFacts}`
    : "";

  /* ── User objective ── */
  const objectiveLine = input.userObjective
    ? `\nMy objective in this response: ${input.userObjective}`
    : "";

  /* ── Evidence section ── */
  const evidenceSection = "Please find enclosed the following supporting documentation:\n  [LIST ENCLOSED DOCUMENTS]";

  /* ── Closing ── */
  const closing = input.hasSignature
    ? "Sincerely,\n[YOUR NAME]"
    : (() => {
      placeholders.push({ placeholder: "SIGNATURE", reason: "No signature provided" });
      return "Sincerely,\n[YOUR NAME]";
    })();

  /* ── Assemble letter ── */
  const content = [
    refLine,
    noticeDateLine,
    deadlineLine,
    "",
    `Dear ${agencyName},`,
    "",
    opening,
    "",
    "The following information was identified from the notice:",
    factLines,
    userFactsLine,
    objectiveLine,
    "",
    evidenceSection,
    "",
    input.selectedStrategy.reason ? `My response strategy: ${strategyLabel}. ${input.selectedStrategy.reason}` : "",
    "",
    "I respectfully request that you consider this response in a timely manner. If you require additional information, please contact me at your earliest convenience.",
    "",
    closing,
  ].filter((line) => line !== "").join("\n");

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return { content, wordCount, unresolvedPlaceholders: placeholders };
}

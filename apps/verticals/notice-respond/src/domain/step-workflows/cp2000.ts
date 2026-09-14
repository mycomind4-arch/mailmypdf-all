/**
 * CP2000 as a step-workflow — the dedicated, mature CP2000 domain engine
 * (extraction/discrepancy/evidence/strategy/validation in `../cp2000*.ts`,
 * already IRS-verified and tested — see cp2000-*.test.ts) wired into the
 * same StepShell/workflow-ui shape every other new-style workflow uses
 * (tax-notice, contractor-dispute, ...), instead of the old pre-step-workflow
 * monolith at routes/workflows/cp2000-response.tsx.
 *
 * That monolith remains live and untouched at /workflows/cp2000-response —
 * this is an additive, parallel implementation. Once this is verified end
 * to end it can become the canonical CP2000 experience; nothing here
 * changes the old route's behavior.
 */
import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import type { CP2000Extraction } from "../cp2000";
import { analyzeCP2000Discrepancies, type Discrepancy } from "../cp2000-discrepancy";
import { buildCP2000EvidenceChecklist, type EvidenceChecklistResult } from "../cp2000-evidence";
import { generateCP2000Strategy, type StrategyInput } from "../cp2000-strategy";
import { createCP2000Case, setCaseAnalysis, setCaseDraft, setCaseValidation, type CP2000ResponseStrategy, type CP2000ValidationResult } from "../cp2000-case";
import { validateCP2000Draft } from "../cp2000-validation";
import type { Finding } from "../finding";

export const cp2000StepWorkflow: StepWorkflowDefinition = {
  id: "cp2000",
  title: "CP2000 Notice",
  steps: [
    { id: "intake", label: "Intake" },
    { id: "notice-details", label: "Notice Details" },
    { id: "documents", label: "Documents" },
    { id: "analysis", label: "Analysis" },
    { id: "response-position", label: "Response Position" },
    { id: "draft", label: "Draft" },
    { id: "review", label: "Review" },
    { id: "mail", label: "Mail" },
  ],
  requiresApprovalBeforeStep: "mail",
};

// ── Combined data shape ──────────────────────────────────────────────────

export type CP2000FilingStatus = "single" | "married_joint" | "married_separate" | "head_of_household" | "widow";
export type CP2000IssueType = "unreported_income" | "unreported_deduction" | "math_error" | "identity_theft" | "other";

export type CP2000Data = {
  // Intake
  taxYear?: string;
  noticeDate?: string;
  responseDeadline?: string;
  proposedChangeAmount?: string;
  primaryIssueType?: CP2000IssueType;
  filingStatus?: CP2000FilingStatus;
  taxpayerName?: string;
  mailingAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatHappened?: string;
  whatResponseSought?: string;
  // Notice Details
  noticeNumber?: string;
  ssnLast4?: string;
  irsExplanationSummary?: string;
  reportedBySource?: string;
  taxReturnFiledDate?: string;
  irsResponseAddress?: string;
  additionalNotes?: string;
  reportedIncome?: string;
  irsReportedIncome?: string;
  // Analysis
  /**
   * Per-discrepancy-type resolution the user chose in the Analysis step —
   * anything other than "unresolved" clears validateCP2000Draft's
   * unresolved_issues block for that item. Keyed by `type`
   * (e.g. "amount_mismatch"), not `id`: analyzeCP2000Discrepancies mints a
   * fresh crypto.randomUUID() id on every call, so an id-keyed resolution
   * would never match again after the next re-analysis. `type` is stable
   * and, for CP2000's one-issue-per-type shape, unambiguous.
   */
  discrepancyResolutions?: Record<string, "unresolved" | "user_correct" | "irs_correct" | "unclear">;
  // Response Position
  responsePosition?: "agree" | "disagree" | "disagree_some";
  userFacts?: string;
};

/** "notice-details" reviews and can correct anything "intake" collected, same merge pattern as tax-notice's getCombinedIntake. */
export function getCombinedCP2000Data(matter: StepMatterState): CP2000Data {
  const intake = (matter.steps.intake?.data ?? {}) as CP2000Data;
  const noticeDetails = (matter.steps["notice-details"]?.data ?? {}) as CP2000Data;
  const analysis = (matter.steps.analysis?.data ?? {}) as CP2000Data;
  const responsePosition = (matter.steps["response-position"]?.data ?? {}) as CP2000Data;
  return { ...intake, ...noticeDetails, ...analysis, ...responsePosition };
}

/**
 * Builds a CP2000Extraction from the structured fields the user typed,
 * rather than from OCR'd notice text — this workflow has the user enter
 * the notice's facts directly (see the Intake/Notice Details steps), so
 * there is nothing to run the text extractor against. Every downstream
 * engine function (`analyzeCP2000Discrepancies`, `generateCP2000Strategy`,
 * `validateCP2000Draft`, ...) only reads this shape, so it doesn't know or
 * care that the fields came from a form instead of a parsed document.
 */
export function buildCP2000Extraction(data: CP2000Data): CP2000Extraction {
  return {
    isCP2000: true,
    classificationConfidence: 1,
    noticeNumber: data.noticeNumber ?? null,
    noticeDate: data.noticeDate ?? null,
    responseDeadline: data.responseDeadline ?? null,
    taxYear: data.taxYear ?? null,
    proposedTaxIncrease: data.proposedChangeAmount ?? null,
    proposedPenalty: null,
    reportedIncome: data.reportedIncome ?? null,
    irsReportedIncome: data.irsReportedIncome ?? null,
    incomeSource: data.reportedBySource ?? null,
    payerName: null,
    responseAddress: data.irsResponseAddress ?? null,
    contactPhone: data.contactPhone ?? null,
    requestedAction: null,
    facts: [],
    warnings: [],
  };
}

export interface CP2000Analysis {
  extraction: CP2000Extraction;
  discrepancies: Discrepancy[];
  findings: Finding[];
  evidence: EvidenceChecklistResult;
}

/** Runs the full discrepancy + evidence-checklist analysis for a given data snapshot. */
export function analyzeCP2000Data(data: CP2000Data): CP2000Analysis {
  const extraction = buildCP2000Extraction(data);
  const { discrepancies: rawDiscrepancies, findings } = analyzeCP2000Discrepancies({ extraction });
  const resolutions = data.discrepancyResolutions ?? {};
  const discrepancies = rawDiscrepancies.map((d) => (resolutions[d.type] ? { ...d, status: resolutions[d.type] } : d));
  const evidence = buildCP2000EvidenceChecklist({ extraction, discrepancies, findings });
  return { extraction, discrepancies, findings, evidence };
}

/** Runs the full discrepancy + evidence-checklist analysis for the matter's current (saved) data. */
export function analyzeCP2000Matter(matter: StepMatterState): CP2000Analysis {
  return analyzeCP2000Data(getCombinedCP2000Data(matter));
}

/** Runs the strategy engine against a given data snapshot's analysis + user facts/objective. */
export function generateCP2000StrategyForData(data: CP2000Data): CP2000ResponseStrategy {
  const { discrepancies, findings, evidence } = analyzeCP2000Data(data);
  const input: StrategyInput = {
    discrepancies,
    findings,
    evidence: evidence.items,
    userFacts: data.whatHappened ?? data.userFacts ?? null,
    userObjective: data.whatResponseSought ?? null,
    hasDeadline: Boolean(data.responseDeadline),
    extractionConfident: true,
  };
  return generateCP2000Strategy(input);
}

/** Runs the strategy engine against the matter's current (saved) data. */
export function generateCP2000MatterStrategy(matter: StepMatterState): CP2000ResponseStrategy {
  return generateCP2000StrategyForData(getCombinedCP2000Data(matter));
}

/**
 * Composes the response letter from everything collected so far: notice
 * reference, taxpayer's position and facts, the strategy engine's
 * explanations, and the evidence being enclosed. This is the "Draft" step's
 * starting point — the user can still edit the text before it's mailed.
 */
export function generateCP2000Draft(data: CP2000Data): string {
  const { evidence } = analyzeCP2000Data(data);
  const strategy = generateCP2000StrategyForData(data);

  const positionLine = data.responsePosition === "agree"
    ? "I agree with the proposed changes described in this notice."
    : data.responsePosition === "disagree_some"
      ? "I agree with part of the proposed changes but disagree with the remainder, as explained below."
      : "I disagree with the proposed changes described in this notice, as explained below.";

  const enclosedItems = evidence.items.filter((item) => item.type !== "cp2000_notice" && item.requirement !== "not_applicable");

  const figureLines: string[] = [];
  if (data.reportedIncome || data.irsReportedIncome) {
    figureLines.push(
      `According to the notice, the IRS received a report of ${data.irsReportedIncome ?? "[AMOUNT]"} from third-party sources, while I reported ${data.reportedIncome ?? "[AMOUNT]"} on my return.`,
    );
  }
  if (data.proposedChangeAmount) {
    figureLines.push(`The notice proposes a change of ${data.proposedChangeAmount} to my tax liability.`);
  }

  const lines: string[] = [
    `Re: CP2000 Notice ${data.noticeNumber ?? "[NOTICE NUMBER]"}`,
    `Tax Year: ${data.taxYear ?? "[TAX YEAR]"}`,
    `Notice Date: ${data.noticeDate ?? "[NOTICE DATE]"}`,
    `Response Deadline: ${data.responseDeadline ?? "[RESPONSE DEADLINE]"}`,
    "",
    "Dear Sir or Madam,",
    "",
    `I am writing in response to the CP2000 notice referenced above for tax year ${data.taxYear ?? "[TAX YEAR]"}.`,
    "",
    positionLine,
    "",
    data.whatHappened?.trim() || "[Describe the facts relevant to this notice.]",
    ...(figureLines.length > 0 ? ["", ...figureLines] : []),
  ];

  if (strategy.explanations.length > 0) {
    lines.push("", ...strategy.explanations);
  }

  if (data.whatResponseSought?.trim()) {
    lines.push("", `Requested action: ${data.whatResponseSought.trim()}`);
  }

  if (enclosedItems.length > 0) {
    lines.push("", "Enclosed supporting documentation:", ...enclosedItems.map((item) => `  - ${item.label}`));
  }

  lines.push("", "Sincerely,", data.taxpayerName || "[YOUR NAME]");

  return lines.join("\n");
}

/** Composes the response letter from the matter's current (saved) data. */
export function generateCP2000MatterDraft(matter: StepMatterState): string {
  return generateCP2000Draft(getCombinedCP2000Data(matter));
}

/** Runs the mature factual/requirement validator against the current draft text. */
export function validateCP2000MatterDraft(matter: StepMatterState, draftText: string): CP2000ValidationResult {
  const { extraction, discrepancies, findings, evidence } = analyzeCP2000Matter(matter);
  let case_ = createCP2000Case(extraction);
  case_ = setCaseAnalysis(case_, { discrepancies, findings, evidence: evidence.items });
  case_ = setCaseDraft(case_, { content: draftText, wordCount: draftText.split(/\s+/).length, unresolvedPlaceholders: [] });
  const validation = validateCP2000Draft(case_);
  setCaseValidation(case_, validation);
  return validation;
}

export const cp2000MailingPackage = [
  { label: "Response letter addressed to the IRS Automated Underreporter unit" },
  { label: "Copy of the original CP2000 notice" },
  { label: "Supporting tax records (W-2s, 1099s, return, account transcript)" },
  { label: "Preparation fee ($69.99, includes 8 response pages)" },
  { label: "Proof of delivery (certified mail with return receipt)" },
];

export function getCP2000Readiness(matter: StepMatterState): ChecklistItemState[] {
  const data = getCombinedCP2000Data(matter);
  const files = (matter.steps.documents?.data.files as { id: string; name: string; category?: string }[]) ?? [];
  const hasNoticeUpload = files.some((f) => /notice/i.test(f.category ?? f.name));

  return [
    { id: "noticeDetails", label: "Notice number, tax year, and deadline confirmed", done: Boolean(data.noticeNumber && data.taxYear && data.responseDeadline) },
    { id: "taxpayer", label: "Your name and mailing address", done: Boolean(data.taxpayerName && data.mailingAddress) },
    { id: "irsAddress", label: "IRS response address confirmed", done: Boolean(data.irsResponseAddress) },
    { id: "noticeUpload", label: "Notice document uploaded", done: hasNoticeUpload },
    { id: "position", label: "Response position selected", done: Boolean(data.responsePosition) },
    { id: "facts", label: "Facts explaining your situation", done: Boolean(data.whatHappened?.trim()) },
  ];
}

import { validateLetterDraft, type DraftValidationFinding, type DraftValidationResult } from "../../draft-validator.js";
import type { Cp2000AnalysisResult, Cp2000NoticeFacts } from "./cp2000-analysis.js";

export interface Cp2000DraftValidationInput {
  draft: string;
  notice: Cp2000NoticeFacts & {
    referenceNumber?: string | null;
    proposedInterest?: string | null;
  };
  analysis: Cp2000AnalysisResult;
  userFacts?: string | null;
  includedEvidenceKinds?: readonly string[];
  requireRequestedAction?: boolean;
}

function finding(input: DraftValidationFinding): DraftValidationFinding {
  return input;
}

function containsAmount(text: string, amount: string): boolean {
  return text.includes(amount) || text.replace(/[$,\s]/g, "").includes(amount.replace(/[$,\s]/g, ""));
}

function addFinding(
  findings: DraftValidationFinding[],
  input: DraftValidationFinding,
): void {
  findings.push(finding(input));
}

/**
 * Validates a CP2000 response independently from the model that wrote it.
 * It checks factual grounding and response completeness without deciding which
 * income figure is correct or giving tax advice.
 */
export function validateCp2000Draft(
  input: Cp2000DraftValidationInput,
): DraftValidationResult {
  const draft = input.draft.trim();
  const lower = draft.toLowerCase();
  const generic = validateLetterDraft(draft, {
    referenceNumber: input.notice.referenceNumber ?? undefined,
    deadline: input.notice.responseDate ?? undefined,
    keyFacts: [
      input.notice.taxYear,
      input.notice.proposedTax,
      input.notice.proposedPenalty,
      input.notice.proposedInterest,
    ].filter((value): value is string => Boolean(value)),
  }, {
    minimumWords: 1,
    forbiddenPhrases: [
      "tax advice",
      "tax recommendation",
      "guaranteed approval",
      "certain to",
      "you owe",
      "the correct tax is",
      "the law states",
    ],
  });
  const findings = [...generic.findings];

  const amounts = [
    input.notice.reportedIncome,
    input.notice.irsReportedIncome,
    input.notice.proposedTax,
    input.notice.proposedPenalty,
    input.notice.proposedInterest,
  ].filter((value): value is string => Boolean(value));
  const knownAmounts = new Set([
    ...amounts.map((amount) => amount.replace(/[$,\s]/g, "")),
    ...(input.userFacts?.match(/\$?[\d,]+\.?\d*/g) ?? []).map((amount) => amount.replace(/[$,\s]/g, "")),
  ]);
  for (const amount of draft.match(/\$[\d,]+(?:\.\d{1,2})?/g) ?? []) {
    const normalized = amount.replace(/[$,\s]/g, "");
    if (!knownAmounts.has(normalized)) {
      addFinding(findings, {
        check: `unsupported_amount:${amount}`,
        passed: false,
        detail: `Amount "${amount}" is not found in notice facts or user-provided facts. Verify it before mailing.`,
        severity: "warning",
      });
    }
  }

  for (const [check, value, label, severity] of [
    ["tax_year_present", input.notice.taxYear, "tax year", "warning"],
    ["income_source_present", input.notice.incomeSource, "income source", "info"],
  ] as const) {
    if (!value) continue;
    const passed = lower.includes(value.toLowerCase());
    addFinding(findings, {
      check,
      passed,
      detail: passed ? `${label} is present in the draft.` : `${label} from the notice is not present; verify the draft manually.`,
      severity,
    });
  }

  for (const discrepancy of input.analysis.discrepancies) {
    if (discrepancy.type !== "amount_mismatch" && discrepancy.type !== "documentation_gap") continue;
    const passed = Boolean(
      (discrepancy.irsAmount && containsAmount(draft, discrepancy.irsAmount)) ||
      (discrepancy.userAmount && containsAmount(draft, discrepancy.userAmount)) ||
      lower.includes("discrepancy") ||
      lower.includes("difference"),
    );
    addFinding(findings, {
      check: `discrepancy_addressed:${discrepancy.id}`,
      passed,
      detail: passed ? "The draft appears to address the analyzed discrepancy." : "The analyzed discrepancy is not clearly addressed in the draft.",
      severity: "warning",
    });
  }

  const includedEvidence = input.includedEvidenceKinds?.filter(Boolean) ?? [];
  if (includedEvidence.length > 0) {
    const passed = /\b(enclosed|attached|include|enclosure)\b/i.test(draft);
    addFinding(findings, {
      check: "evidence_listed",
      passed,
      detail: passed ? "The draft references enclosed or attached documentation." : "The draft does not reference the evidence selected for enclosure.",
      severity: "block",
    });
  }

  if (input.analysis.discrepancies.some((discrepancy) => discrepancy.status === "unresolved")) {
    addFinding(findings, {
      check: "unresolved_issues",
      passed: false,
      detail: "Unresolved CP2000 discrepancies remain; the response must state the user's position without presenting the issue as settled.",
      severity: "block",
    });
  }

  if (input.requireRequestedAction) {
    const passed = /\b(request|please|ask)\b/i.test(draft);
    addFinding(findings, {
      check: "requested_action_present",
      passed,
      detail: passed ? "The draft contains a requested action." : "The draft does not clearly state the requested action.",
      severity: "warning",
    });
  }

  const errors = findings.filter((current) => current.severity === "error" && !current.passed).length;
  const warnings = findings.filter((current) => current.severity === "warning" && !current.passed).length;
  const blocks = findings.filter((current) => current.severity === "block" && !current.passed).length;
  return {
    findings,
    passed: errors === 0 && blocks === 0,
    errors,
    warnings,
    blocks,
  };
}

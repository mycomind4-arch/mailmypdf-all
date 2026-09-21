import type {
  Cp2000AnalysisResult,
  Cp2000Discrepancy,
  Cp2000Finding,
  Cp2000NoticeFacts,
} from "./cp2000-analysis.js";

export type Cp2000EvidenceRequirement = "required" | "recommended" | "optional";
export type Cp2000EvidenceState = "missing" | "provided";

export interface Cp2000EvidenceChecklistItem {
  id: string;
  type: string;
  label: string;
  purpose: string;
  requirement: Cp2000EvidenceRequirement;
  state: Cp2000EvidenceState;
  supportsFindingIds: readonly string[];
  supportsDiscrepancyIds: readonly string[];
}

export interface Cp2000EvidenceChecklist {
  items: readonly Cp2000EvidenceChecklistItem[];
  requiredCount: number;
  providedCount: number;
  missingCount: number;
  complete: boolean;
  ready: boolean;
}

function item(input: Cp2000EvidenceChecklistItem): Cp2000EvidenceChecklistItem {
  return input;
}

function findingIds(findings: readonly Cp2000Finding[], type: string): string[] {
  return findings.filter((finding) => finding.type === type).map((finding) => finding.id);
}

function discrepancyIds(
  discrepancies: readonly Cp2000Discrepancy[],
  type: Cp2000Discrepancy["type"],
): string[] {
  return discrepancies.filter((discrepancy) => discrepancy.type === type).map((discrepancy) => discrepancy.id);
}

/**
 * Builds stable evidence requirements from CP2000 analysis facts.
 *
 * The checklist describes what should be collected; it does not claim that a
 * document exists. Actual uploaded-document state stays in the case runtime.
 */
export function buildCp2000EvidenceChecklist(
  notice: Cp2000NoticeFacts,
  analysis: Cp2000AnalysisResult,
): Cp2000EvidenceChecklist {
  const items: Cp2000EvidenceChecklistItem[] = [
    item({
      id: "cp2000-notice",
      type: "cp2000_notice",
      label: "CP2000 Notice",
      purpose: "The complete IRS notice being answered, including its response date and destination.",
      requirement: "required",
      state: "provided",
      supportsFindingIds: analysis.findings.map((finding) => finding.id),
      supportsDiscrepancyIds: analysis.discrepancies.map((discrepancy) => discrepancy.id),
    }),
  ];

  if (notice.taxYear) {
    items.push(item({
      id: `tax-return-${notice.taxYear}`,
      type: "tax_return",
      label: `Tax Return (Form 1040) for ${notice.taxYear}`,
      purpose: "Shows what income was reported for the referenced tax year.",
      requirement: "required",
      state: "missing",
      supportsFindingIds: findingIds(analysis.findings, "income_mismatch"),
      supportsDiscrepancyIds: discrepancyIds(analysis.discrepancies, "amount_mismatch"),
    }));
  }

  if (notice.incomeSource) {
    items.push(item({
      id: "information-return",
      type: "information_return",
      label: `Copy of ${notice.incomeSource}`,
      purpose: "Shows what the payer reported to the IRS.",
      requirement: "required",
      state: "missing",
      supportsFindingIds: findingIds(analysis.findings, "income_mismatch"),
      supportsDiscrepancyIds: discrepancyIds(analysis.discrepancies, "amount_mismatch"),
    }));
  }

  const amountDiscrepancies = discrepancyIds(analysis.discrepancies, "amount_mismatch");
  if (amountDiscrepancies.length > 0) {
    items.push(item({
      id: "bank-statements",
      type: "bank_statement",
      label: `Bank Statements (${notice.taxYear ?? "referenced tax year"})`,
      purpose: "Shows amounts actually received from the payer.",
      requirement: "recommended",
      state: "missing",
      supportsFindingIds: findingIds(analysis.findings, "income_mismatch"),
      supportsDiscrepancyIds: amountDiscrepancies,
    }));
    items.push(item({
      id: "corrected-information-return",
      type: "corrected_return",
      label: "Corrected Information Return (if applicable)",
      purpose: "Shows whether the payer issued a corrected W-2 or 1099.",
      requirement: "optional",
      state: "missing",
      supportsFindingIds: [],
      supportsDiscrepancyIds: [],
    }));
  }

  items.push(item({
    id: "prior-irs-correspondence",
    type: "correspondence",
    label: "Prior IRS Correspondence (if any)",
    purpose: "Shows prior communications about the same issue.",
    requirement: "optional",
    state: "missing",
    supportsFindingIds: [],
    supportsDiscrepancyIds: [],
  }));

  const requiredCount = items.filter((current) => current.requirement === "required").length;
  const providedCount = items.filter((current) => current.state === "provided").length;
  const missingCount = items.filter((current) => current.state === "missing").length;
  const requiredMissing = items.some(
    (current) => current.requirement === "required" && current.state === "missing",
  );

  return {
    items,
    requiredCount,
    providedCount,
    missingCount,
    complete: missingCount === 0,
    ready: !requiredMissing,
  };
}

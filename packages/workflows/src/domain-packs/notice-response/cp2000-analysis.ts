import { findCp2000ResearchSource } from "./cp2000-research.js";

export type Cp2000DiscrepancyType =
  | "amount_mismatch"
  | "wrong_tax_year"
  | "documentation_gap";

export type Cp2000DiscrepancyStatus =
  | "unresolved"
  | "user_correct"
  | "irs_correct"
  | "unclear";

export interface Cp2000NoticeFacts {
  isCp2000: boolean;
  classificationConfidence: number;
  taxYear: string | null;
  responseDate: string | null;
  proposedTax: string | null;
  proposedPenalty: string | null;
  proposedIncomeChanges: readonly string[];
  payerReferences: readonly string[];
  reportedIncome?: string | null;
  irsReportedIncome?: string | null;
  incomeSource?: string | null;
  warnings?: readonly string[];
}

export interface Cp2000Discrepancy {
  id: string;
  type: Cp2000DiscrepancyType;
  description: string;
  irsAmount: string | null;
  userAmount: string | null;
  difference: string | null;
  possibleExplanations: readonly string[];
  evidenceNeeded: readonly string[];
  confidence: "high" | "medium" | "low";
  status: Cp2000DiscrepancyStatus;
  findingId: string;
}

export interface Cp2000Finding {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  statement: string;
  supportingFacts: readonly string[];
  provenance: readonly never[];
  sourceReferences: readonly string[];
  confidence: "high" | "medium" | "low";
  recommendedAction: string;
  unresolved: boolean;
  analysisRule: string;
}

export interface Cp2000AnalysisResult {
  discrepancies: readonly Cp2000Discrepancy[];
  findings: readonly Cp2000Finding[];
  unresolvedCount: number;
  totalIssues: number;
}

function parseAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\$?([\d,]+\.?\d*)/);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]!.replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

function formatDifference(left: number | null, right: number | null): string | null {
  if (left === null || right === null) return null;
  const difference = Math.abs(left - right);
  return difference === 0 ? null : `$${difference.toLocaleString()}`;
}

function finding(input: {
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  statement: string;
  supportingFacts: string[];
  confidence: "high" | "medium" | "low";
  recommendedAction: string;
}): Cp2000Finding {
  const sourceReferences = input.type === "appeal_rights"
    ? ["irs.pub-5"]
    : ["irs.cp2000-series", "irs.topic-652"]
      .filter((sourceId) => Boolean(findCp2000ResearchSource(sourceId)) || sourceId === "irs.topic-652");
  return {
    id: crypto.randomUUID(),
    type: input.type,
    severity: input.severity,
    statement: input.statement,
    supportingFacts: input.supportingFacts,
    provenance: [],
    sourceReferences,
    confidence: input.confidence,
    recommendedAction: input.recommendedAction,
    unresolved: true,
    analysisRule: `cp2000.${input.type}`,
  };
}

export function analyzeCp2000Notice(
  notice: Cp2000NoticeFacts,
): Cp2000AnalysisResult {
  const discrepancies: Cp2000Discrepancy[] = [];
  const findings: Cp2000Finding[] = [];
  const reportedAmount = notice.reportedIncome;
  const irsAmount = notice.irsReportedIncome;

  if (reportedAmount && irsAmount) {
    const reported = parseAmount(reportedAmount);
    const irs = parseAmount(irsAmount);
    if (reported !== null && irs !== null && reported !== irs) {
      const difference = formatDifference(reported, irs);
      const irsHigher = irs > reported;
      const result = finding({
        type: "income_mismatch",
        severity: irsHigher && difference && irs - reported > 5000 ? "critical" : "high",
        statement: `The IRS reports ${irsAmount} in income from ${notice.incomeSource ?? "a third party"}, but your return reports ${reportedAmount}. The difference is ${difference ?? "unknown"}.`,
        supportingFacts: [
          `Income You Reported: ${reportedAmount}`,
          `Income Reported to IRS: ${irsAmount}`,
          ...(notice.incomeSource ? [`Income Source: ${notice.incomeSource}`] : []),
        ],
        confidence: "high",
        recommendedAction: irsHigher
          ? "Verify whether the IRS amount is correct and provide records showing the amount actually received if it is not."
          : "Verify whether your reported amount is correct and provide supporting documentation for the difference.",
      });
      findings.push(result);
      discrepancies.push({
        id: crypto.randomUUID(),
        type: "amount_mismatch",
        description: `IRS reports ${irsAmount}, you reported ${reportedAmount}. Difference: ${difference ?? "unknown"}.`,
        irsAmount,
        userAmount: reportedAmount,
        difference,
        possibleExplanations: [
          "The IRS received a corrected information return",
          "The payer reported a different amount than what was paid",
          "The income may belong to a different tax year",
          "The income may not be taxable",
        ],
        evidenceNeeded: [
          `Copy of the ${notice.incomeSource ?? "information return"} from the payer`,
          "The tax return for the referenced year",
          "Bank statements or payment records showing amounts received",
        ],
        confidence: "high",
        status: "unresolved",
        findingId: result.id,
      });
    }
  }

  if (!reportedAmount && irsAmount) {
    const result = finding({
      type: "documentation_gap",
      severity: "high",
      statement: `The IRS reports ${irsAmount} in income, but no reported income amount was found in the notice data.`,
      supportingFacts: [
        `Income Reported to IRS: ${irsAmount}`,
        "Reported income amount: not found",
      ],
      confidence: "medium",
      recommendedAction: "Verify the actual reported income for the tax year against the IRS amount.",
    });
    findings.push(result);
    discrepancies.push({
      id: crypto.randomUUID(),
      type: "documentation_gap",
      description: "Unable to compare amounts because the reported income amount was not found.",
      irsAmount,
      userAmount: null,
      difference: null,
      possibleExplanations: [
        "The notice may not include the reported amount",
        "The extraction may have missed the field",
      ],
      evidenceNeeded: ["The tax return for the referenced year"],
      confidence: "low",
      status: "unclear",
      findingId: result.id,
    });
  }

  if (notice.taxYear && Number.parseInt(notice.taxYear, 10) > new Date().getFullYear()) {
    const result = finding({
      type: "wrong_tax_year",
      severity: "high",
      statement: `The notice references tax year ${notice.taxYear}, which is in the future.`,
      supportingFacts: [`Tax Year: ${notice.taxYear}`],
      confidence: "high",
      recommendedAction: "Verify the tax year on the notice before proceeding.",
    });
    findings.push(result);
    discrepancies.push({
      id: crypto.randomUUID(),
      type: "wrong_tax_year",
      description: `Notice references tax year ${notice.taxYear}, which is in the future.`,
      irsAmount: null,
      userAmount: null,
      difference: null,
      possibleExplanations: ["IRS processing error", "Extraction error"],
      evidenceNeeded: ["The original notice document"],
      confidence: "high",
      status: "unresolved",
      findingId: result.id,
    });
  }

  if (!notice.responseDate) {
    findings.push(finding({
      type: "deadline_risk",
      severity: "high",
      statement: "No response date was found in the notice data.",
      supportingFacts: ["Response date: not found"],
      confidence: "high",
      recommendedAction: "Locate and confirm the controlling response date on the notice.",
    }));
  }

  if (notice.proposedTax) {
    findings.push(finding({
      type: "proposed_change",
      severity: "high",
      statement: `The IRS proposes a tax change of ${notice.proposedTax}${notice.proposedPenalty ? ` plus a proposed penalty of ${notice.proposedPenalty}` : ""}.`,
      supportingFacts: [
        `Proposed tax: ${notice.proposedTax}`,
        ...(notice.proposedPenalty ? [`Proposed penalty: ${notice.proposedPenalty}`] : []),
      ],
      confidence: "high",
      recommendedAction: "Review the proposed changes and support any disagreement with records actually provided.",
    }));
  }

  if (!notice.isCp2000) {
    findings.push(finding({
      type: "classification_warning",
      severity: "medium",
      statement: `The document was not confidently identified as a CP2000 notice (${Math.round(notice.classificationConfidence * 100)}% confidence).`,
      supportingFacts: [`Classification confidence: ${notice.classificationConfidence}`],
      confidence: "high",
      recommendedAction: "Verify that the document is a CP2000 notice before continuing.",
    }));
  }

  for (const warning of notice.warnings ?? []) {
    findings.push(finding({
      type: "missing_info",
      severity: "medium",
      statement: warning,
      supportingFacts: ["Extraction warning"],
      confidence: "medium",
      recommendedAction: "Review the notice manually to confirm the missing information.",
    }));
  }

  return {
    discrepancies,
    findings,
    unresolvedCount: discrepancies.filter((item) => item.status === "unresolved").length,
    totalIssues: findings.length,
  };
}

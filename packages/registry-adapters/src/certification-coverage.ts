import type { CertificationSearchCoverage } from "@mailmypdf/identity-capacity";
import type { SearchExecution } from "./search-strategy.js";

export function searchExecutionToCertificationCoverage(
  execution: SearchExecution,
): CertificationSearchCoverage {
  const successful = execution.attempts.filter(
    (attempt) => attempt.status === "success" && attempt.result,
  );

  return {
    complete:
      execution.completeness === "complete" &&
      execution.attempts.length > 0 &&
      execution.attempts.every((attempt) => attempt.status === "success"),
    sourceIds: [...new Set(
      successful
        .map((attempt) => attempt.sourceId)
        .filter((value): value is string => Boolean(value)),
    )],
    searchedNames: [...new Set(execution.plan.steps.map((step) => step.value))],
    totalRecords: execution.totalRecords,
    warnings: [...new Set([
      ...execution.warnings,
      ...successful.flatMap((attempt) => attempt.result?.warnings ?? []),
    ])],
  };
}

import {
  assessPriorityAnalysisReadiness,
  buildCompetingInterestMatrix,
  type CompetingInterestEvidenceRecord,
} from "@mailmypdf/secured-transactions";
import type { JurisdictionRuleResult, UccPriorityRuleData } from "@mailmypdf/jurisdiction-rules";

export function composePriorityStrategy(input: {
  readonly records: readonly CompetingInterestEvidenceRecord[];
  readonly rule: JurisdictionRuleResult<UccPriorityRuleData>;
}) {
  const matrix = buildCompetingInterestMatrix(input.records);
  const readiness = assessPriorityAnalysisReadiness({ matrix, rule: input.rule });
  return {
    matrix,
    readiness,
    status: readiness.status,
    requiresHumanReview: readiness.requiresHumanReview || matrix.warnings.length > 0,
    priorityLegallyDetermined: false as const,
    consequentialActionAllowed: false as const,
  };
}

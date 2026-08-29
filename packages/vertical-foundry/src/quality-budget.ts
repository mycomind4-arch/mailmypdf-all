export interface QualityBudget { maxBlockers: number; maxWarnings: number; minimumScore: number }
export interface QualitySnapshot { blockers: number; warnings: number; score: number }
export function qualityWithinBudget(snapshot: QualitySnapshot, budget: QualityBudget): boolean {
  return snapshot.blockers <= budget.maxBlockers && snapshot.warnings <= budget.maxWarnings && snapshot.score >= budget.minimumScore
}

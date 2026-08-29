import type { QAResult } from './qa-pipeline.js'

export interface QualityReport { score: number; passed: boolean; blockers: string[]; warnings: string[] }
export function toQualityReport(result: QAResult): QualityReport {
  return {
    score: result.score,
    passed: result.passed && !result.findings.some((f) => f.severity === 'BLOCKER'),
    blockers: result.findings.filter((f) => f.severity === 'BLOCKER').map((f) => f.message),
    warnings: result.findings.filter((f) => f.severity === 'WARN').map((f) => f.message),
  }
}

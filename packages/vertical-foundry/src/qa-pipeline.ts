export interface QAFinding { severity: 'INFO' | 'WARN' | 'BLOCKER'; message: string; source: string }
export interface QAResult { passed: boolean; score: number; findings: QAFinding[] }

export function gateQA(result: QAResult, minimumScore = 80): void {
  if (result.findings.some((finding) => finding.severity === 'BLOCKER')) throw new Error('QA blocked release')
  if (result.score < minimumScore) throw new Error(`QA score ${result.score} is below ${minimumScore}`)
}

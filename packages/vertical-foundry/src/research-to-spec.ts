import type { VerticalCandidate } from './foundry-contract.js'

export interface VerticalSpec { id: string; name: string; description: string; evidence: string[]; platformCapabilities: string[] }

export function candidateToSpec(candidate: VerticalCandidate, platformCapabilities: string[] = []): VerticalSpec {
  if (candidate.score.overall < 70) throw new Error('Candidate score is below the minimum specification threshold')
  return {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    evidence: candidate.findings.filter((f) => f.confidence >= 0.7).map((f) => `${f.source}: ${f.claim}`),
    platformCapabilities,
  }
}

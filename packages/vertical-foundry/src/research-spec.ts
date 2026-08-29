import type { VerticalCandidate } from './foundry-contract.js'

export interface VerticalSpec { id:string; name:string; problem:string; targetUser:string; workflows:string[]; evidence:string[]; reusableCapabilities:string[] }
export function compileSpec(candidate:VerticalCandidate, reusableCapabilities:string[]=[]):VerticalSpec {
  if (candidate.score.overall < 70) throw new Error('Candidate below Foundry specification threshold')
  const evidence = candidate.findings.filter(f=>f.confidence>=0.7).map(f=>`${f.source}: ${f.claim}`)
  return { id:candidate.id, name:candidate.name, problem:candidate.description, targetUser:'Derived from research', workflows:[], evidence, reusableCapabilities }
}

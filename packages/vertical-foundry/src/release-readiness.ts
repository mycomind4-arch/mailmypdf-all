export interface ReadinessInput { qaScore: number; blockers: string[]; verified: boolean; previewUrl?: string }

export function releaseReady(input: ReadinessInput): boolean {
  return input.qaScore >= 80 && input.blockers.length === 0 && input.verified && Boolean(input.previewUrl)
}

export interface VerticalScore { market: number; utility: number; differentiation: number; feasibility: number; total: number }
export function scoreVertical(input: Omit<VerticalScore, 'total'>): VerticalScore {
  const total = (input.market + input.utility + input.differentiation + input.feasibility) / 4
  return { ...input, total }
}

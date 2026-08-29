export type KeywordIntent = 'transactional' | 'commercial' | 'informational' | 'navigational'

export interface KeywordEvidence {
  source: string
  keyword: string
  intent: KeywordIntent
  volume?: number
  difficulty?: number
  cpc?: number
  trend?: 'rising' | 'stable' | 'falling'
  evidence: string
}

export interface KeywordResearchRequest {
  vertical: string
  seedTopics: string[]
  geography?: string
  language?: string
  competitors?: string[]
}

export interface KeywordResearchReport {
  vertical: string
  generatedAt: string
  keywords: KeywordEvidence[]
  clusters: Array<{ name: string; keywords: string[]; priority: number }>
  opportunities: Array<{ keyword: string; score: number; rationale: string }>
  rejected: Array<{ keyword: string; reason: string }>
}

export interface KeywordResearchProvider {
  research(request: KeywordResearchRequest): Promise<KeywordEvidence[]>
}

/**
 * Deterministic opportunity scoring. Raw search metrics are evidence, not truth;
 * the agent must retain source/evidence for every recommendation.
 */
export function scoreKeywordOpportunity(keyword: KeywordEvidence): number {
  const volume = Math.min(keyword.volume ?? 0, 10_000) / 10_000
  const difficulty = 1 - Math.min(Math.max(keyword.difficulty ?? 100, 0), 100) / 100
  const cpc = Math.min(keyword.cpc ?? 0, 100) / 100
  const intent = keyword.intent === 'transactional' ? 1 : keyword.intent === 'commercial' ? 0.8 : keyword.intent === 'informational' ? 0.45 : 0.2
  const trend = keyword.trend === 'rising' ? 1 : keyword.trend === 'stable' ? 0.7 : 0.35
  return Math.round((volume * 0.25 + difficulty * 0.2 + cpc * 0.2 + intent * 0.25 + trend * 0.1) * 100)
}

export async function runKeywordResearch(provider: KeywordResearchProvider, request: KeywordResearchRequest): Promise<KeywordResearchReport> {
  const raw = await provider.research(request)
  const deduped = [...new Map(raw.map((item) => [item.keyword.trim().toLowerCase(), item])).values()]
  const scored = deduped.map((item) => ({ item, score: scoreKeywordOpportunity(item) })).sort((a, b) => b.score - a.score)
  const opportunities = scored.filter(({ score }) => score >= 60).map(({ item, score }) => ({ keyword: item.keyword, score, rationale: `${item.intent} intent with ${item.trend ?? 'unknown'} trend and available competitive evidence.` }))
  const rejected = scored.filter(({ score }) => score < 60).map(({ item, score }) => ({ keyword: item.keyword, reason: `Opportunity score ${score} is below the research threshold.` }))
  const clusters = request.seedTopics.map((name) => {
    const keywords = deduped.filter((item) => item.keyword.toLowerCase().includes(name.toLowerCase())).map((item) => item.keyword)
    return { name, keywords, priority: keywords.length ? Math.round(keywords.reduce((sum, keyword) => sum + (opportunities.find((x) => x.keyword === keyword)?.score ?? 0), 0) / keywords.length) : 0 }
  }).sort((a, b) => b.priority - a.priority)
  return { vertical: request.vertical, generatedAt: new Date().toISOString(), keywords: deduped, clusters, opportunities, rejected }
}

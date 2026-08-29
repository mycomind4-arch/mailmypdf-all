/**
 * Milestone 78: Vertical Discovery & Research Pipeline
 *
 * Discovers new vertical opportunities by:
 * - Analyzing keyword/search data for high-intent queries
 * - Identifying gaps in competitor coverage
 * - Matching against platform capabilities (what MailMyPDF can fulfill)
 * - Scoring opportunities using the Foundry scoring system
 * - Producing ranked VerticalCandidate list ready for the pipeline
 */

import type { VerticalCandidate, ResearchFinding, OpportunityScore } from './foundry-contract.js'
import { scoreOpportunity } from './foundry-contract.js'

export interface KeywordOpportunity {
  keyword: string
  monthlyVolume: number
  keywordDifficulty: number
  cpc: number        // Cost per click — indicates commercial intent
  intent: 'informational' | 'commercial' | 'transactional'
  trend: 'rising' | 'stable' | 'declining'
}

export interface CompetitorGap {
  competitor: string
  whatTheyDo: string
  whatTheyMiss: string
  gapScore: number  // 0-100, higher = bigger opportunity
}

export interface PlatformCapability {
  capability: string
  supported: boolean
  notes: string
}

export interface DiscoveryInput {
  keywords: KeywordOpportunity[]
  competitors: CompetitorGap[]
  capabilities: PlatformCapability[]
}

export interface DiscoveryResult {
  candidates: VerticalCandidate[]
  totalOpportunities: number
  topCandidate: VerticalCandidate | null
  analysisDate: string
  input: DiscoveryInput
}

/**
 * Analyzes discovery inputs and produces ranked vertical candidates.
 */
export function discoverVerticals(input: DiscoveryInput): DiscoveryResult {
  const candidates: VerticalCandidate[] = []

  // Group keywords by theme
  const keywordThemes = groupKeywordsByTheme(input.keywords)

  for (const [theme, keywords] of keywordThemes) {
    // Skip if platform can't support this theme
    const matchingCapabilities = findMatchingCapabilities(theme, input.capabilities)
    if (matchingCapabilities.length === 0) continue

    // Score the opportunity
    const demand = Math.min(100, Math.max(...keywords.map(k => k.monthlyVolume)) / 200)
    const competition = Math.max(0, 100 - Math.min(...keywords.map(k => k.keywordDifficulty)))
    const differentiation = scoreDifferentiation(input.competitors, theme)
    const reuse = scoreReuse(matchingCapabilities)
    const feasibility = 90 // Static sites are highly feasible
    const risk = 85 // Low risk for well-understood markets

    const score: OpportunityScore = scoreOpportunity({
      demand, competition, differentiation, reuse, feasibility, risk,
    })

    if (score.overall < 60) continue // Skip low-scoring opportunities

    // Build findings from the research data
    const findings: ResearchFinding[] = [
      ...keywords.map(k => ({
        source: 'Keyword Research',
        claim: `"${k.keyword}" has ${k.monthlyVolume} monthly searches, KD=${k.keywordDifficulty}, ${k.intent} intent, ${k.trend} trend.`,
        confidence: 0.8 + (k.monthlyVolume > 10000 ? 0.1 : 0),
        capturedAt: new Date().toISOString(),
      })),
      ...matchingCapabilities.map(c => ({
        source: 'Platform Capability Audit',
        claim: `Platform ${c.supported ? 'supports' : 'does not support'} ${c.capability}: ${c.notes}`,
        confidence: c.supported ? 0.95 : 0.3,
        capturedAt: new Date().toISOString(),
      })),
      ...input.competitors
        .filter(c => c.gapScore > 50)
        .map(c => ({
          source: 'Competitor Analysis',
          claim: `${c.competitor} ${c.whatTheyDo} but misses: ${c.whatTheyMiss}`,
          confidence: 0.75,
          capturedAt: new Date().toISOString(),
        })),
    ]

    const candidate: VerticalCandidate = {
      id: themeToId(theme),
      name: themeToName(theme),
      description: buildDescription(theme, keywords, matchingCapabilities),
      findings,
      score,
    }

    candidates.push(candidate)
  }

  candidates.sort((a, b) => b.score.overall - a.score.overall)

  return {
    candidates,
    totalOpportunities: candidates.length,
    topCandidate: candidates[0] ?? null,
    analysisDate: new Date().toISOString(),
    input,
  }
}

// ── Helper functions ────────────────────────────────────────────────────────

function groupKeywordsByTheme(keywords: KeywordOpportunity[]): Map<string, KeywordOpportunity[]> {
  const themes = new Map<string, KeywordOpportunity[]>()

  for (const kw of keywords) {
    const theme = extractTheme(kw.keyword)
    if (!themes.has(theme)) themes.set(theme, [])
    themes.get(theme)!.push(kw)
  }

  return themes
}

function extractTheme(keyword: string): string {
  const lower = keyword.toLowerCase()

  // Theme extraction heuristics
  if (lower.includes('certified') || lower.includes('certified mail')) return 'certified mail'
  if (lower.includes('invoice') || lower.includes('billing')) return 'invoice mailing'
  if (lower.includes('legal') || lower.includes('eviction') || lower.includes('notice')) return 'legal notice'
  if (lower.includes('tax') || lower.includes('irs')) return 'tax document mailing'
  if (lower.includes('medical') || lower.includes('hipaa')) return 'medical document mailing'
  if (lower.includes('contractor') || lower.includes('estimate')) return 'contractor document mailing'
  if (lower.includes('postcard') || lower.includes('marketing')) return 'postcard marketing'
  if (lower.includes('rent') || lower.includes('lease')) return 'rental document mailing'

  return 'general document mailing'
}

function findMatchingCapabilities(theme: string, capabilities: PlatformCapability[]): PlatformCapability[] {
  const lowerTheme = theme.toLowerCase()
  return capabilities.filter(c => {
    if (!c.supported) return false
    const cap = c.capability.toLowerCase()
    if (lowerTheme.includes('certified') && cap.includes('certified')) return true
    if (lowerTheme.includes('invoice') && (cap.includes('batch') || cap.includes('print'))) return true
    if (lowerTheme.includes('legal') && cap.includes('certified')) return true
    if (lowerTheme.includes('tax') && cap.includes('print')) return true
    if (lowerTheme.includes('medical') && (cap.includes('secure') || cap.includes('hipaa'))) return true
    if (lowerTheme.includes('postcard') && cap.includes('postcard')) return true
    return cap.includes('generic') || cap.includes('document')
  })
}

function scoreDifferentiation(competitors: CompetitorGap[], theme: string): number {
  const matchingGaps = competitors.filter(c =>
    c.whatTheyMiss.toLowerCase().includes(theme) ||
    c.whatTheyDo.toLowerCase().includes(theme),
  )
  if (matchingGaps.length === 0) return 70 // Default differentiation
  const avgGap = matchingGaps.reduce((sum, c) => sum + c.gapScore, 0) / matchingGaps.length
  return Math.min(100, Math.round(avgGap))
}

function scoreReuse(capabilities: PlatformCapability[]): number {
  if (capabilities.length === 0) return 0
  const supported = capabilities.filter(c => c.supported).length
  return Math.min(100, supported * 30 + 40)
}

function themeToId(theme: string): string {
  return theme
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function themeToName(theme: string): string {
  return theme
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function buildDescription(theme: string, keywords: KeywordOpportunity[], capabilities: PlatformCapability[]): string {
  const sortedKw = [...keywords].sort((a, b) => b.monthlyVolume - a.monthlyVolume)
  const cap = capabilities[0]
  return `Upload ${theme} PDFs and we print, stuff, and mail them via USPS. ` +
    `Targeting "${sortedKw[0]?.keyword ?? 'unknown'}" searchers (${sortedKw[0]?.monthlyVolume ?? 0}/mo). ` +
    `Leverages platform capability: ${cap?.capability ?? 'document mailing'}.`
}

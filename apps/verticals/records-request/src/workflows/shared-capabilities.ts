import type { RecordsDomainCapability } from './domain-pack'

export const FULL_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings',
  'evidence', 'research', 'risk', 'strategy', 'draft', 'draftProvenance',
  'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
]

export const GENERIC_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_ATTACHMENT', 'UNEXPLAINED_WITHHOLDING',
  'REDACTION_REVIEW', 'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export function textHelper(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

export function categoriesHelper<T extends string>(
  input: Record<string, unknown>,
  all: readonly T[],
): T[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...all]
  const known = new Set(all)
  const selected = raw.filter((entry): entry is T => typeof entry === 'string' && known.has(entry as T))
  return selected.length ? selected : [...all]
}

// Words common enough that any free-text category description or generic
// filename ("response.pdf", "records.pdf", "production.pdf"...) is likely to
// contain them regardless of subject matter. Left in the keyword list, a
// single one of these can make matchesCategory-style matching treat an
// unrelated record as covering a requested category — the exact bug behind
// a real false negative: "dispatch-cad" read as covered because a generic
// "response.pdf" record's filename happened to contain the word "response",
// itself only present because the category description mentions
// "response/disposition codes". Keep this list conservative (only truly
// generic words) rather than trying to anticipate every collision.
const CATEGORY_KEYWORD_STOPWORDS = new Set([
  'existing', 'response', 'responses', 'responsive', 'record', 'records',
  'recording', 'recordings', 'request', 'requests', 'requested', 'produce',
  'produced', 'production', 'productions', 'document', 'documents',
  'material', 'materials', 'information', 'where', 'when', 'that', 'this',
  'with', 'from', 'have', 'were', 'been', 'being', 'will', 'shall', 'must',
  'should', 'lawfully', 'accessible', 'available', 'applicable', 'related',
  'relevant', 'within', 'during', 'through', 'prefer', 'preferred', 'cover',
  'covers', 'covering', 'period', 'topic', 'matter', 'agency', 'agencies',
  'notes', 'note', 'status', 'index', 'indexes', 'item', 'items', 'other',
  'each', 'also', 'used', 'uses', 'using', 'officer', 'officers', 'agency',
  'department', 'case', 'cases',
])

/**
 * Derives keyword hints for a requested category from its free-text
 * description: lowercase words, minimum length, generic-stopword filtered,
 * deduplicated, capped. Use this instead of duplicating the raw
 * `description.split(/\W+/).filter(...)` pattern — without the stopword
 * filter, a generic word pulled from the description can spuriously match
 * an unrelated record's filename or text and hide a real missing category.
 */
export function deriveCategoryKeywords(description: string, limit = 20): string[] {
  const seen = new Set<string>()
  const keywords: string[] = []
  for (const raw of description.split(/\W+/)) {
    const word = raw.toLowerCase()
    if (word.length < 4) continue
    if (CATEGORY_KEYWORD_STOPWORDS.has(word)) continue
    if (seen.has(word)) continue
    seen.add(word)
    keywords.push(word)
    if (keywords.length >= limit) break
  }
  return keywords
}

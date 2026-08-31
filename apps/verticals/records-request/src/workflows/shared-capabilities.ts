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

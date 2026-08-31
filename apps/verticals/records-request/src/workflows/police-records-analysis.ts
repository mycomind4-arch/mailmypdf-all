export type PoliceProductionRecord = {
  id: string
  filename: string
  category?: string
  text?: string
  sha256?: string
}

export type PoliceRequestedCategory = {
  id: string
  label: string
  keywords: readonly string[]
}

export type PoliceProductionFindingType =
  | 'MISSING_REQUESTED_CATEGORY'
  | 'REFERENCED_RECORD_NOT_PRODUCED'
  | 'INCIDENT_IDENTIFIER_MISMATCH'
  | 'DATE_GAP'
  | 'DUPLICATE_RECORD'
  | 'MISSING_MEDIA'
  | 'UNEXPLAINED_WITHHOLDING'
  | 'REDACTION_REVIEW'
  | 'PARTIAL_PRODUCTION'
  | 'UNRESPONSIVE_ITEM'

export type PoliceProductionFinding = {
  id: string
  type: PoliceProductionFindingType
  severity: 'info' | 'warning' | 'critical'
  description: string
  recordIds: string[]
  requestedCategoryId?: string
}

export type PoliceProductionIdentifiers = {
  incidentNumber?: string
  arrestNumber?: string
  location?: string
  person?: string
  vehicle?: string
}

export type PoliceProductionAnalysis = {
  recordsReviewed: number
  findings: PoliceProductionFinding[]
  coveredCategoryIds: string[]
  missingCategoryIds: string[]
  mediaRecordIds: string[]
  referencedRecordIds: string[]
}

const REDACTION_PATTERNS = /(?:redacted|withheld|exempt|privileged|confidential|blackout)/i
const REFERENCE_PATTERNS = /(?:see attached|attached|enclosed|supplement(?:al)?\s+report|CAD|body[- ]?worn|dash[- ]?cam|911\s+call|video|photograph|recording|report\s+number)/i
const MEDIA_PATTERNS = /(?:video|audio|recording|body[- ]?cam|dash[- ]?cam|photograph|photo|911\s+call)/i
const INCIDENT_NUMBER_PATTERN = /\b(?:case|incident|report|CAD)\s*(?:number|no\.?|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})/gi

function textFor(record: PoliceProductionRecord): string {
  return `${record.filename} ${record.category ?? ''} ${record.text ?? ''}`.trim()
}

function matchesCategory(record: PoliceProductionRecord, category: PoliceRequestedCategory): boolean {
  if (record.category?.toLowerCase() === category.id.toLowerCase()) return true

  const filename = record.filename.toLowerCase()
  if (category.keywords.some((keyword) => filename.includes(keyword.toLowerCase()))) return true

  const content = record.text ?? ''
  if (!content.trim()) return false

  const keywordMatch = category.keywords.some((keyword) => content.toLowerCase().includes(keyword.toLowerCase()))
  if (!keywordMatch) return false

  // A generic response that merely points to another record is not itself proof
  // that the referenced category was produced. Prefer explicit record metadata
  // or a clearly named output file before counting a category as covered.
  return !REFERENCE_PATTERNS.test(content)
}

function hasIdentifierMismatch(record: PoliceProductionRecord, identifiers: PoliceProductionIdentifiers): boolean {
  if (!identifiers.incidentNumber && !identifiers.arrestNumber) return false
  const text = record.text ?? ''
  const expected = [identifiers.incidentNumber, identifiers.arrestNumber]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase())
  if (!expected.length) return false

  const found = new Set<string>()
  for (const match of text.matchAll(INCIDENT_NUMBER_PATTERN)) found.add(match[1].toLowerCase())
  if (!found.size) return false
  return [...found].some((value) => !expected.includes(value))
}

export function analyzePoliceProduction(
  requested: readonly PoliceRequestedCategory[],
  records: readonly PoliceProductionRecord[],
  identifiers: PoliceProductionIdentifiers = {},
): PoliceProductionAnalysis {
  const findings: PoliceProductionFinding[] = []
  const coveredCategoryIds: string[] = []
  const mediaRecordIds: string[] = []
  const referencedRecordIds: string[] = []

  for (const category of requested) {
    const matches = records.filter((record) => matchesCategory(record, category))
    if (matches.length) {
      coveredCategoryIds.push(category.id)
      continue
    }

    findings.push({
      id: `missing-${category.id}`,
      type: 'MISSING_REQUESTED_CATEGORY',
      severity: 'warning',
      description: `No produced record was matched to requested police-record category: ${category.label}.`,
      recordIds: [],
      requestedCategoryId: category.id,
    })
  }

  const seenHashes = new Map<string, string>()
  for (const record of records) {
    const content = textFor(record)
    if (MEDIA_PATTERNS.test(content)) mediaRecordIds.push(record.id)
    if (REFERENCE_PATTERNS.test(content)) referencedRecordIds.push(record.id)

    if (record.sha256) {
      const previous = seenHashes.get(record.sha256)
      if (previous) {
        findings.push({
          id: `duplicate-${record.id}`,
          type: 'DUPLICATE_RECORD',
          severity: 'info',
          description: `Record appears to duplicate produced record ${previous} by SHA-256.`,
          recordIds: [previous, record.id],
        })
      } else {
        seenHashes.set(record.sha256, record.id)
      }
    }

    if (hasIdentifierMismatch(record, identifiers)) {
      findings.push({
        id: `identifier-mismatch-${record.id}`,
        type: 'INCIDENT_IDENTIFIER_MISMATCH',
        severity: 'warning',
        description: `Record ${record.filename} appears to contain an incident or report identifier different from the supplied identifiers; review before treating it as responsive.`,
        recordIds: [record.id],
      })
    }

    if (REDACTION_PATTERNS.test(content)) {
      findings.push({
        id: `redaction-${record.id}`,
        type: 'REDACTION_REVIEW',
        severity: 'warning',
        description: `Record ${record.filename} contains withholding or redaction language and should be reviewed for the agency's stated basis.`,
        recordIds: [record.id],
      })
    }

    if (REFERENCE_PATTERNS.test(content) && !MEDIA_PATTERNS.test(content)) {
      findings.push({
        id: `referenced-${record.id}`,
        type: 'REFERENCED_RECORD_NOT_PRODUCED',
        severity: 'warning',
        description: `Record ${record.filename} appears to reference another police record or media item; confirm whether that referenced item was separately produced.`,
        recordIds: [record.id],
      })
    }
  }

  if (mediaRecordIds.length === 0 && requested.some((category) => /body[- ]?camera|dash[- ]?camera|911|video|photograph|media/i.test(category.label))) {
    findings.push({
      id: 'missing-media',
      type: 'MISSING_MEDIA',
      severity: 'warning',
      description: 'The production contains no record identified as media even though the requested scope includes media-related categories; this is a review finding, not proof that media does not exist.',
      recordIds: [],
    })
  }

  const missingCategoryIds = requested
    .filter((category) => !coveredCategoryIds.includes(category.id))
    .map((category) => category.id)

  if (coveredCategoryIds.length > 0 && missingCategoryIds.length > 0) {
    findings.push({
      id: 'partial-production',
      type: 'PARTIAL_PRODUCTION',
      severity: 'warning',
      description: `The production matched ${coveredCategoryIds.length} of ${requested.length} requested record categories. Review the missing categories before treating the response as complete.`,
      recordIds: [],
    })
  }

  return { recordsReviewed: records.length, findings, coveredCategoryIds, missingCategoryIds, mediaRecordIds, referencedRecordIds }
}

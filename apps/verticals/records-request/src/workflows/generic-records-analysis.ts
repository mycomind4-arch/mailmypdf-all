export type GenericProductionRecord = { id: string; filename: string; category?: string; text?: string; sha256?: string }
export type GenericRequestedCategory = { id: string; label: string; keywords: readonly string[] }
export type GenericFindingType = 'MISSING_REQUESTED_CATEGORY' | 'REFERENCED_RECORD_NOT_PRODUCED' | 'IDENTIFIER_MISMATCH' | 'DATE_GAP' | 'DUPLICATE_RECORD' | 'MISSING_ATTACHMENT' | 'UNEXPLAINED_WITHHOLDING' | 'REDACTION_REVIEW' | 'PARTIAL_PRODUCTION' | 'UNRESPONSIVE_ITEM'
export type GenericProductionFinding = { id: string; type: GenericFindingType; severity: 'info' | 'warning' | 'critical'; description: string; recordIds: string[]; requestedCategoryId?: string }
export type GenericProductionAnalysis = { recordsReviewed: number; findings: GenericProductionFinding[]; coveredCategoryIds: string[]; missingCategoryIds: string[] }

const REDACTION = /\b(redacted|withheld|exempt|privileged|confidential|blackout)\b/i
const REFERENCE = /\b(see attached|attached|enclosed|exhibit|referenced|cross-referenced|see also|appendix|attachment)\b/i

function content(r: GenericProductionRecord) { return `${r.filename} ${r.category ?? ''} ${r.text ?? ''}`.trim() }
function categoryToken(id: string) { return id.replace(/-/g, '').toLowerCase() }

function matches(r: GenericProductionRecord, c: GenericRequestedCategory) {
  if (r.category?.toLowerCase() === c.id.toLowerCase()) return true
  const filenameToken = r.filename.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (filenameToken.includes(categoryToken(c.id))) return true
  const text = r.text ?? ''
  if (REFERENCE.test(text) && !r.category) return false
  const h = content(r).toLowerCase()
  return c.keywords.some(k => h.includes(k.toLowerCase()))
}

export function analyzeGenericProduction(
  requested: readonly GenericRequestedCategory[],
  records: readonly GenericProductionRecord[],
  identifierLabel = 'record'
): GenericProductionAnalysis {
  const findings: GenericProductionFinding[] = []
  const covered: string[] = []
  for (const c of requested) {
    const m = records.filter(r => matches(r, c))
    if (m.length) covered.push(c.id)
    else findings.push({ id: `missing-${c.id}`, type: 'MISSING_REQUESTED_CATEGORY', severity: 'warning', description: `No produced record was matched to requested ${identifierLabel} category: ${c.label}.`, recordIds: [], requestedCategoryId: c.id })
  }
  const hashes = new Map<string, string>()
  for (const r of records) {
    const t = content(r)
    if (r.sha256) { const prior = hashes.get(r.sha256); if (prior) findings.push({ id: `duplicate-${r.id}`, type: 'DUPLICATE_RECORD', severity: 'info', description: `Record appears to duplicate produced record ${prior} by SHA-256.`, recordIds: [prior, r.id] }); else hashes.set(r.sha256, r.id) }
    if (REDACTION.test(t)) findings.push({ id: `redaction-${r.id}`, type: 'REDACTION_REVIEW', severity: 'warning', description: `Record ${r.filename} contains withholding or redaction language and should be reviewed for the stated basis.`, recordIds: [r.id] })
    if (REFERENCE.test(t) && !r.category) findings.push({ id: `reference-${r.id}`, type: 'REFERENCED_RECORD_NOT_PRODUCED', severity: 'warning', description: `Record ${r.filename} appears to reference another ${identifierLabel}; confirm whether that referenced material was separately produced.`, recordIds: [r.id] })
  }
  const missing = requested.filter(c => !covered.includes(c.id)).map(c => c.id)
  if (covered.length && missing.length) findings.push({ id: 'partial-production', type: 'PARTIAL_PRODUCTION', severity: 'warning', description: `The production matched ${covered.length} of ${requested.length} requested categories. Review the missing categories before treating the response as complete.`, recordIds: [] })
  return { recordsReviewed: records.length, findings, coveredCategoryIds: covered, missingCategoryIds: missing }
}

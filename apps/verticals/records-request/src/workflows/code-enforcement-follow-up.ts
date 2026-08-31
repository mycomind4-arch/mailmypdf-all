import type { ProductionFinding } from './code-enforcement-analysis'

export type CodeEnforcementFollowUp = {
  id: string
  priority: 'high' | 'medium' | 'low'
  category?: string
  title: string
  requestText: string
  reason: string
  sourceRecordIds: string[]
  identifiersToInclude: string[]
  searchTargets: string[]
}

export type CodeEnforcementFollowUpContext = {
  propertyAddress?: string
  parcelNumber?: string
  caseNumber?: string
  violationNumber?: string
  dateStart?: string
  dateEnd?: string
  likelyCustodians?: string[]
}

function identifiers(context: CodeEnforcementFollowUpContext): string[] {
  return [
    context.propertyAddress && `property address: ${context.propertyAddress}`,
    context.parcelNumber && `parcel/APN: ${context.parcelNumber}`,
    context.caseNumber && `case number: ${context.caseNumber}`,
    context.violationNumber && `violation/citation number: ${context.violationNumber}`,
    context.dateStart && context.dateEnd && `date range: ${context.dateStart} through ${context.dateEnd}`,
  ].filter((v): v is string => Boolean(v))
}

function targetFor(type: ProductionFinding['type']): string[] {
  switch (type) {
    case 'MISSING_ATTACHMENT':
    case 'REFERENCED_RECORD_NOT_PRODUCED': return ['code-enforcement case/file system', 'document imaging or electronic records repository', 'inspection/photo/media system']
    case 'DATE_GAP': return ['case activity log', 'inspection and reinspection system', 'correspondence and notice records']
    case 'IDENTIFIER_MISMATCH': return ['master case index', 'parcel/property index', 'violation/citation index']
    case 'UNEXPLAINED_REDACTION': return ['withholding/redaction log', 'responsive record repository', 'records custodian review']
    default: return ['code-enforcement case/file system']
  }
}

export function buildCodeEnforcementFollowUps(
  findings: readonly ProductionFinding[],
  context: CodeEnforcementFollowUpContext,
): CodeEnforcementFollowUp[] {
  const ids = identifiers(context)
  return findings
    .filter((finding) => finding.severity !== 'info')
    .map((finding, index) => {
      const high = finding.severity === 'critical'
      const targets = targetFor(finding.type)
      const scope = ids.length ? ` Please search using ${ids.join('; ')}.` : ''
      let title = 'Clarify incomplete code-enforcement production'
      let requestText = `Please conduct a supplemental search for records responsive to the identified code-enforcement matter and provide any responsive records not included in the prior production.${scope}`
      if (finding.type === 'MISSING_ATTACHMENT' || finding.type === 'REFERENCED_RECORD_NOT_PRODUCED') {
        title = 'Produce referenced but missing records or attachments'
        requestText = `Please produce the record, attachment, exhibit, photograph, video, report, or other material referenced by the produced record(s) identified below, including any responsive native files and associated metadata where maintained.${scope}`
      } else if (finding.type === 'DATE_GAP') {
        title = 'Account for unexplained case activity gap'
        requestText = `Please search for case activity, inspection, reinspection, notice, correspondence, enforcement, abatement, and closure records that account for the identified chronology gap.${scope}`
      } else if (finding.type === 'IDENTIFIER_MISMATCH') {
        title = 'Reconcile conflicting matter identifiers'
        requestText = `Please search the agency's master case, parcel/property, and violation indexes to identify and produce records responsive to the matter despite the conflicting identifiers observed in the prior production.${scope}`
      } else if (finding.type === 'UNEXPLAINED_REDACTION') {
        title = 'Provide withholding/redaction basis and responsive record'
        requestText = `Please identify the legal or administrative basis for each withholding or redaction identified below and provide any non-exempt portions or segregable responsive records.${scope}`
      }
      return {
        id: `follow-up-${index + 1}-${finding.id}`,
        priority: high ? 'high' : 'medium',
        category: finding.requestedCategoryId,
        title,
        requestText,
        reason: finding.description,
        sourceRecordIds: finding.recordIds,
        identifiersToInclude: ids,
        searchTargets: [...new Set([...(context.likelyCustodians ?? []), ...targets])],
      }
    })
}

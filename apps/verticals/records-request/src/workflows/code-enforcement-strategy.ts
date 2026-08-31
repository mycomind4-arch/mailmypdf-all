import type { ProductionFinding } from './code-enforcement-analysis'

export type FollowUpAction = {
  type: 'clarify' | 'request_missing_records' | 'ask_for_redaction_basis' | 'reconcile_identifier' | 'request_attachment' | 'review'
  rationale: string
  findingId?: string
}

export function recommendCodeEnforcementFollowUps(findings: readonly ProductionFinding[]): FollowUpAction[] {
  return findings.map((finding) => {
    switch (finding.type) {
      case 'MISSING_REQUESTED_CATEGORY':
        return { type: 'request_missing_records', rationale: `Ask the custodian to confirm whether the requested category was searched and, if responsive records exist, produce them.`, findingId: finding.id }
      case 'UNEXPLAINED_REDACTION':
        return { type: 'ask_for_redaction_basis', rationale: `Request the stated basis for the withholding/redaction and identify the affected record or portion.`, findingId: finding.id }
      case 'IDENTIFIER_MISMATCH':
        return { type: 'reconcile_identifier', rationale: `Ask the custodian to reconcile the inconsistent case, parcel, address, or violation identifier.`, findingId: finding.id }
      case 'MISSING_ATTACHMENT':
        return { type: 'request_attachment', rationale: `Request the referenced attachment or explain whether it was omitted from production.`, findingId: finding.id }
      case 'REFERENCED_RECORD_NOT_PRODUCED':
        return { type: 'request_missing_records', rationale: `Ask for the record referenced by the produced document and identify it by the source record.`, findingId: finding.id }
      case 'PARTIAL_PRODUCTION':
      case 'UNRESPONSIVE_ITEM':
        return { type: 'clarify', rationale: `Ask the custodian to identify which portion of the request was searched and which portion was not produced.`, findingId: finding.id }
      case 'PRODUCTION_AMBIGUITY':
      case 'DATE_GAP':
      case 'DUPLICATE_RECORD':
        return { type: 'review', rationale: `Review the source records and determine whether a targeted follow-up is warranted.`, findingId: finding.id }
      default:
        return { type: 'review', rationale: `Review this finding before taking further action.`, findingId: finding.id }
    }
  })
}

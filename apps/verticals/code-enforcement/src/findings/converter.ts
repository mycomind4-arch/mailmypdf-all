// ─── FINDING CONVERTERS ─────────────────────────────────────────────────
// Convert FindingViewModel (UI) and discrepancy findings to UnifiedFinding
// so the defense pipeline can consume them uniformly.

import type { UnifiedFinding, FindingType, FindingSeverity } from './taxonomy'
import type { FindingViewModel } from '../ui/types/view-models'
import type { Discrepancy, DiscrepancyType } from '../domain/discrepancy-engine'

let convertSeq = 0

export function findingVMToUnified(
  vm: FindingViewModel,
  source: UnifiedFinding['source'] = 'investigation',
): UnifiedFinding {
  return {
    id: vm.id,
    type: vm.type as FindingType,
    severity: vm.severity as FindingSeverity,
    statement: vm.description,
    supportingFacts: vm.evidence,
    confidence: vm.severity === 'critical' || vm.severity === 'high' ? 'high' : 'medium',
    recommendedAction: vm.recommendedAction || vm.whatThisMeans,
    source,
    unresolved: vm.status === 'open' || vm.status === 'reviewing',
    evidenceIds: vm.evidence,
    analysisRule: vm.type,
  }
}

export function discrepancyToUnified(d: Discrepancy): UnifiedFinding {
  return {
    id: d.id,
    type: discrepancyTypeToFindingType(d.type),
    severity: d.severity as FindingSeverity,
    statement: d.rationale,
    supportingFacts: [d.evidence],
    confidence: d.confidence > 0.8 ? 'high' : d.confidence > 0.5 ? 'medium' : 'low',
    recommendedAction: 'Review the discrepancy and determine if it affects the response strategy.',
    source: 'discrepancy',
    unresolved: d.reviewState !== 'reviewed' && d.reviewState !== 'resolved',
    analysisRule: d.type,
  }
}

function discrepancyTypeToFindingType(type: DiscrepancyType): FindingType {
  switch (type) {
    case 'recipient_mismatch':
    case 'owner_mismatch':
    case 'property_mismatch':
    case 'apn_mismatch':
    case 'complaint_mismatch':
    case 'case_number_mismatch':
      return 'IDENTIFIER_MISMATCH'
    case 'date_mismatch':
    case 'deadline_mismatch':
    case 'timeline_inconsistency':
      return 'DATE_GAP'
    case 'missing_service_evidence':
      return 'MISSING_ATTACHMENT'
    case 'missing_complaint_reference':
      return 'FACIAL_DEFECT'
    case 'missing_inspection_basis':
      return 'JURISDICTION_ERROR'
    case 'authority_mismatch':
      return 'JURISDICTION_ERROR'
    case 'scope_mismatch':
      return 'FACIAL_DEFECT'
    case 'public_record_no_match':
      return 'IDENTIFIER_MISMATCH'
    case 'deceased_recipient':
      return 'FACIAL_DEFECT'
    case 'general':
    default:
      return 'FACIAL_DEFECT'
  }
}

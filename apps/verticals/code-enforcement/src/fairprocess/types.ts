export type FairProcessPolicyStatus =
  | 'active'
  | 'legal_review_required'
  | 'disabled';

export type JurisdictionConnectorKind =
  | 'parcel'
  | 'gis'
  | 'permit'
  | 'code_enforcement'
  | 'county_code'
  | 'public_records'
  | 'appeal'
  | 'recorder'
  | 'other';

export interface JurisdictionConnector {
  id: string;
  kind: JurisdictionConnectorKind;
  name: string;
  baseUrl: string;
  official: boolean;
  enabled: boolean;
  provenanceRequired: boolean;
  notes?: string;
}

export interface JurisdictionPolicyReference {
  id: string;
  version: string;
  status: FairProcessPolicyStatus;
  sourceRepository?: string;
  sourcePath?: string;
  notes?: string;
}

export type JurisdictionRecordsCategory =
  | 'property_identity'
  | 'current_case_status'
  | 'current_allegations'
  | 'complaint_record'
  | 'inspection_record'
  | 'notice_and_service'
  | 'permit_history'
  | 'agency_communications'
  | 'photos_and_media'
  | 'hearing_and_appeal'
  | 'abatement_and_costs'
  | 'other';

export interface JurisdictionRecordsCustodianRoute {
  key: string;
  label: string;
  categories: JurisdictionRecordsCategory[];
  connectorId?: string;
  notes?: string;
}

export interface JurisdictionPack {
  id: string;
  version: string;
  name: string;
  country: string;
  state: string;
  county?: string;
  municipality?: string;
  aliases: string[];
  supportedCaseTypes: string[];
  policy: JurisdictionPolicyReference;
  connectors: JurisdictionConnector[];
  recordsCustodians?: JurisdictionRecordsCustodianRoute[];
  /**
   * A pack can exist for data discovery before its legal rules are activated.
   * This prevents an unreviewed local rule from silently becoming a legal conclusion.
   */
  allowJurisdictionSpecificLegalConclusions: boolean;
}

export type PacketEvidenceStatus =
  | 'verified'
  | 'user_assertion'
  | 'agency_assertion'
  | 'inference'
  | 'unknown';

export interface PacketSourceRef {
  evidenceId: string;
  label: string;
  page?: number;
  sha256?: string;
  sourceUrl?: string;
}

export interface PacketFact {
  id: string;
  statement: string;
  status: PacketEvidenceStatus;
  confidence?: number;
  sourceRefs: PacketSourceRef[];
}

export interface PacketTimelineEvent {
  id: string;
  date?: string;
  title: string;
  description: string;
  actor?: string;
  sourceRefs: PacketSourceRef[];
}

export interface PacketFinding {
  id: string;
  title: string;
  detail: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'open' | 'reviewed' | 'resolved' | 'unknown';
  sourceRefs: PacketSourceRef[];
  authority?: string;
  citation?: string;
  policyStatus?: FairProcessPolicyStatus;
  counselReviewRequired?: boolean;
}

export interface PacketAllegation {
  id: string;
  allegation: string;
  authority?: string;
  status: 'supported' | 'disputed' | 'unsupported_by_current_record' | 'unknown';
  supportingEvidence: PacketSourceRef[];
  contraryEvidence: PacketSourceRef[];
  missingEvidence: string[];
}

export interface AttorneyPacketSourceReadiness {
  attorneyPacketBlocked: boolean;
  currentAssessmentBlocked: boolean;
  unresolvedCriticalCount: number;
  unresolvedHighCount: number;
  unresolvedRequirementIds: string[];
  unresolvedRequirementTitles: string[];
}

export interface AttorneyPacketInput {
  caseId: string;
  caseName: string;
  caseNumber?: string;
  generatedAt: string;
  jurisdiction: JurisdictionPack;
  property?: {
    address?: string;
    apn?: string;
    ownerOfRecord?: string;
  };
  proceduralPosture?: string;
  nextDeadline?: string;
  facts: PacketFact[];
  timeline: PacketTimelineEvent[];
  allegations: PacketAllegation[];
  findings: PacketFinding[];
  evidence: PacketSourceRef[];
  communications?: PacketSourceRef[];
  recordsRequests?: PacketSourceRef[];
  sourceReadiness?: AttorneyPacketSourceReadiness;
}

export type AttorneyPacketSectionId =
  | 'cover'
  | 'executive_summary'
  | 'procedural_posture'
  | 'property_and_parties'
  | 'deadline_sheet'
  | 'chronology'
  | 'allegation_matrix'
  | 'findings'
  | 'records_requests'
  | 'communications'
  | 'evidence_index'
  | 'counsel_review'
  | 'exhibits';

export interface AttorneyPacketSection {
  id: AttorneyPacketSectionId;
  title: string;
  required: boolean;
  itemCount: number;
  ready: boolean;
  notes: string[];
}

export interface AttorneyPacketReadiness {
  score: number;
  readyForAttorneyHandoff: boolean;
  blockingIssues: string[];
  warnings: string[];
}

export interface AttorneyPacketManifest {
  formatVersion: 1;
  packetType: 'fairprocess-attorney-handoff';
  caseId: string;
  caseName: string;
  caseNumber?: string;
  generatedAt: string;
  jurisdictionPackId: string;
  jurisdictionPackVersion: string;
  sections: AttorneyPacketSection[];
  readiness: AttorneyPacketReadiness;
  sourceEvidenceIds: string[];
  disclaimers: string[];
}

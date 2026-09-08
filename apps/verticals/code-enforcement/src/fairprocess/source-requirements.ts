import type { HumboldtPropertyIntelligence } from './jurisdictions/humboldt-intelligence';

export type SourceRequirementStatus =
  | 'missing'
  | 'requested'
  | 'received'
  | 'verified'
  | 'not_applicable';

export type SourceAcquisitionMethod =
  | 'verified_connector'
  | 'public_portal'
  | 'public_records_request'
  | 'user_upload'
  | 'agency_correspondence'
  | 'attorney_discovery'
  | 'manual_verification';

export type SourceRequirementCategory =
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

export interface SourceAcquisitionOption {
  method: SourceAcquisitionMethod;
  connectorId?: string;
  label: string;
  url?: string;
  notes?: string;
}

export interface SourceRequirement {
  id: string;
  category: SourceRequirementCategory;
  title: string;
  reason: string;
  status: SourceRequirementStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  blocks: Array<'current_case_assessment' | 'attorney_packet' | 'legal_conclusion' | 'deadline_analysis'>;
  acquisitionOptions: SourceAcquisitionOption[];
  satisfiedByEvidenceIds: string[];
  freshness?: {
    required: 'current' | 'case_date' | 'historical_context';
    historicalDataAsOf?: string;
  };
  notes: string[];
}

export interface RecordsInvestigationPlan {
  caseId: string;
  generatedAt: string;
  requirements: SourceRequirement[];
  criticalMissingCount: number;
  highPriorityMissingCount: number;
  attorneyPacketBlocked: boolean;
  currentAssessmentBlocked: boolean;
}

function missingRequirement(
  requirement: Omit<SourceRequirement, 'status' | 'satisfiedByEvidenceIds'>,
): SourceRequirement {
  return {
    ...requirement,
    status: 'missing',
    satisfiedByEvidenceIds: [],
  };
}

/**
 * Builds the baseline Humboldt acquisition plan from what the verified public
 * connectors can and cannot currently establish.
 *
 * This function intentionally treats the 2025-01-15 public CE layer as
 * historical context only. It can never satisfy a requirement for current case
 * status, current allegations, deadlines, or procedural posture.
 */
export function buildHumboldtSourceRequirements(
  intelligence: HumboldtPropertyIntelligence,
): SourceRequirement[] {
  const requirements: SourceRequirement[] = [];
  const parcelEvidence = intelligence.parcels.map((item) => item.sourceEvidenceId);

  if (intelligence.parcels.length > 0) {
    requirements.push({
      id: 'humboldt-property-identity',
      category: 'property_identity',
      title: 'Verify property identity and parcel context',
      reason: 'Current county parcel data is available for the supplied APN.',
      status: 'verified',
      priority: 'high',
      blocks: [],
      acquisitionOptions: [
        {
          method: 'verified_connector',
          connectorId: 'humboldt-parcels',
          label: 'Humboldt County parcel GIS',
        },
      ],
      satisfiedByEvidenceIds: parcelEvidence,
      freshness: { required: 'current' },
      notes: [
        'GIS data is source-backed context and should still be reconciled against notices, deeds, permits, or other controlling records when material.',
      ],
    });
  } else {
    requirements.push(
      missingRequirement({
        id: 'humboldt-property-identity',
        category: 'property_identity',
        title: 'Verify property identity and APN',
        reason: 'The verified parcel connector did not return a parcel for the supplied APN.',
        priority: 'critical',
        blocks: ['current_case_assessment', 'attorney_packet'],
        acquisitionOptions: [
          {
            method: 'manual_verification',
            connectorId: 'humboldt-parcels',
            label: 'Verify APN/address in Humboldt County GIS',
          },
          {
            method: 'user_upload',
            label: 'Upload a current tax bill, deed, notice, or other property-identifying record',
          },
        ],
        freshness: { required: 'current' },
        notes: [],
      }),
    );
  }

  requirements.push(
    missingRequirement({
      id: 'humboldt-current-ce-status',
      category: 'current_case_status',
      title: 'Obtain the current code-enforcement case status',
      reason:
        'No verified current machine-readable Humboldt source is available in the jurisdiction pack. The public GIS CE layer is only a 2025-01-15 historical snapshot.',
      priority: 'critical',
      blocks: ['current_case_assessment', 'attorney_packet', 'legal_conclusion', 'deadline_analysis'],
      acquisitionOptions: [
        {
          method: 'agency_correspondence',
          label: 'Use the latest county notice or correspondence already received',
        },
        {
          method: 'public_records_request',
          connectorId: 'humboldt-public-records',
          label: 'Request the current case file and case chronology from Humboldt County',
        },
        {
          method: 'user_upload',
          label: 'Upload current county case records or notices',
        },
      ],
      freshness: {
        required: 'current',
        historicalDataAsOf: '2025-01-15',
      },
      notes:
        intelligence.historicalCodeEnforcementCases.length > 0
          ? [
              'A historical CE record exists for this APN, but it is context only and does not satisfy current-status verification.',
            ]
          : [
              'Absence from the historical public layer does not establish that no current or prior code-enforcement matter exists.',
            ],
    }),
  );

  requirements.push(
    missingRequirement({
      id: 'humboldt-current-allegations',
      category: 'current_allegations',
      title: 'Capture the agency’s current allegations and cited authorities',
      reason:
        'FairProcess must analyze the actual current notice/case record rather than infer allegations from historical GIS data.',
      priority: 'critical',
      blocks: ['current_case_assessment', 'attorney_packet', 'legal_conclusion'],
      acquisitionOptions: [
        {
          method: 'agency_correspondence',
          label: 'Extract allegations from the latest notice, order, inspection request, or hearing document',
        },
        {
          method: 'public_records_request',
          connectorId: 'humboldt-public-records',
          label: 'Request current notices, violation records, and cited code sections',
        },
      ],
      freshness: { required: 'current' },
      notes: [],
    }),
  );

  requirements.push(
    missingRequirement({
      id: 'humboldt-complaint-source',
      category: 'complaint_record',
      title: 'Obtain the originating complaint or referral record',
      reason:
        'The complaint/referral can establish what triggered the investigation, when it was received, what was alleged, and what source information existed before inspection or enforcement.',
      priority: 'high',
      blocks: [],
      acquisitionOptions: [
        {
          method: 'public_records_request',
          connectorId: 'humboldt-public-records',
          label: 'Request complaint, referral, intake, routing, and related metadata',
        },
      ],
      freshness: { required: 'case_date' },
      notes: [
        'Redactions or withholding should be recorded as part of the source history rather than filled in by inference.',
      ],
    }),
  );

  requirements.push(
    missingRequirement({
      id: 'humboldt-inspection-records',
      category: 'inspection_record',
      title: 'Obtain inspection and investigator records',
      reason:
        'Inspection notes, photographs, measurements, field observations, access records, and investigator chronology are needed to test each allegation against its evidentiary basis.',
      priority: 'high',
      blocks: ['legal_conclusion'],
      acquisitionOptions: [
        {
          method: 'public_records_request',
          connectorId: 'humboldt-public-records',
          label: 'Request inspection notes, photographs, reports, logs, measurements, and field records',
        },
        {
          method: 'user_upload',
          label: 'Upload owner photographs, video, permits, receipts, declarations, or other contrary/context evidence',
        },
      ],
      freshness: { required: 'case_date' },
      notes: [],
    }),
  );

  requirements.push(
    missingRequirement({
      id: 'humboldt-notice-service',
      category: 'notice_and_service',
      title: 'Verify notice, service, and deadline records',
      reason:
        'The actual notice and service history are needed before FairProcess can calculate or characterize a response, hearing, inspection, or appeal deadline.',
      priority: 'critical',
      blocks: ['deadline_analysis', 'attorney_packet'],
      acquisitionOptions: [
        {
          method: 'user_upload',
          label: 'Upload the notice, envelope, service declaration, posting photograph, or delivery record',
        },
        {
          method: 'public_records_request',
          connectorId: 'humboldt-public-records',
          label: 'Request notice/service records and mailing or posting proof',
        },
      ],
      freshness: { required: 'case_date' },
      notes: [],
    }),
  );

  requirements.push(
    missingRequirement({
      id: 'humboldt-permit-history',
      category: 'permit_history',
      title: 'Capture the relevant permit and planning history',
      reason:
        'Humboldt permit records are publicly searchable in Accela, but FairProcess has not verified a supported automated interface.',
      priority: 'high',
      blocks: ['legal_conclusion'],
      acquisitionOptions: [
        {
          method: 'public_portal',
          connectorId: 'humboldt-building-permits',
          label: 'Search Humboldt Accela and capture the relevant public permit record',
          url: intelligence.permitSearch.url,
          notes: 'User-assisted/manual capture until a supported machine interface is verified.',
        },
        {
          method: 'public_records_request',
          connectorId: 'humboldt-public-records',
          label: 'Request permit, planning, inspection, and application records',
        },
        {
          method: 'user_upload',
          label: 'Upload permits, plans, approvals, inspection cards, or related records',
        },
      ],
      freshness: { required: 'case_date' },
      notes: [],
    }),
  );

  requirements.push(
    missingRequirement({
      id: 'humboldt-agency-communications',
      category: 'agency_communications',
      title: 'Obtain material internal and external agency communications',
      reason:
        'Communications may clarify chronology, decision-making, changed allegations, referrals, supervisory review, and what evidence officials relied upon.',
      priority: 'medium',
      blocks: [],
      acquisitionOptions: [
        {
          method: 'public_records_request',
          connectorId: 'humboldt-public-records',
          label: 'Request material emails, messages, referrals, routing notes, and inter-agency communications for the case',
        },
      ],
      freshness: { required: 'case_date' },
      notes: [],
    }),
  );

  return requirements;
}

export function buildRecordsInvestigationPlan(input: {
  caseId: string;
  generatedAt: string;
  requirements: SourceRequirement[];
}): RecordsInvestigationPlan {
  // Requested or received records remain unresolved until the provenance layer
  // verifies the evidence. This prevents a request submission or raw upload from
  // silently unblocking current-case analysis or attorney handoff.
  const unresolved = input.requirements.filter(
    (requirement) => requirement.status !== 'verified' && requirement.status !== 'not_applicable',
  );

  return {
    caseId: input.caseId,
    generatedAt: input.generatedAt,
    requirements: input.requirements,
    criticalMissingCount: unresolved.filter((requirement) => requirement.priority === 'critical').length,
    highPriorityMissingCount: unresolved.filter((requirement) => requirement.priority === 'high').length,
    attorneyPacketBlocked: unresolved.some((requirement) => requirement.blocks.includes('attorney_packet')),
    currentAssessmentBlocked: unresolved.some((requirement) => requirement.blocks.includes('current_case_assessment')),
  };
}

export function satisfySourceRequirement(
  requirement: SourceRequirement,
  evidenceIds: string[],
): SourceRequirement {
  if (evidenceIds.length === 0) {
    throw new Error('At least one evidence ID is required to satisfy a source requirement.');
  }

  return {
    ...requirement,
    status: 'received',
    satisfiedByEvidenceIds: [...new Set([...requirement.satisfiedByEvidenceIds, ...evidenceIds])],
  };
}

export function verifySourceRequirement(requirement: SourceRequirement): SourceRequirement {
  if (requirement.satisfiedByEvidenceIds.length === 0) {
    throw new Error('A source requirement cannot be verified without evidence.');
  }

  return { ...requirement, status: 'verified' };
}

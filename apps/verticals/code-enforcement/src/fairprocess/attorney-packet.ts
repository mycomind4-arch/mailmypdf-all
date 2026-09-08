import type {
  AttorneyPacketInput,
  AttorneyPacketManifest,
  AttorneyPacketReadiness,
  AttorneyPacketSection,
  PacketSourceRef,
} from './types';

function uniqueEvidenceIds(refs: PacketSourceRef[]): string[] {
  return [...new Set(refs.map((ref) => ref.evidenceId).filter(Boolean))].sort();
}

function collectSourceRefs(input: AttorneyPacketInput): PacketSourceRef[] {
  return [
    ...input.evidence,
    ...input.facts.flatMap((fact) => fact.sourceRefs),
    ...input.timeline.flatMap((event) => event.sourceRefs),
    ...input.allegations.flatMap((allegation) => [
      ...allegation.supportingEvidence,
      ...allegation.contraryEvidence,
    ]),
    ...input.findings.flatMap((finding) => finding.sourceRefs),
    ...(input.communications ?? []),
    ...(input.recordsRequests ?? []),
  ];
}

function countUnsourcedClaims(input: AttorneyPacketInput): number {
  const unsourcedFacts = input.facts.filter((fact) => fact.sourceRefs.length === 0).length;
  const unsourcedEvents = input.timeline.filter((event) => event.sourceRefs.length === 0).length;
  const unsourcedFindings = input.findings.filter((finding) => finding.sourceRefs.length === 0).length;
  return unsourcedFacts + unsourcedEvents + unsourcedFindings;
}

function buildReadiness(input: AttorneyPacketInput): AttorneyPacketReadiness {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (!input.property?.address && !input.property?.apn) {
    blockingIssues.push('Property identity is missing. Add an address or APN before attorney handoff.');
    score -= 20;
  }

  if (input.evidence.length === 0) {
    blockingIssues.push('No source evidence is indexed.');
    score -= 30;
  }

  if (input.timeline.length === 0) {
    blockingIssues.push('No sourced chronology has been assembled.');
    score -= 20;
  }

  const unsourcedClaims = countUnsourcedClaims(input);
  if (unsourcedClaims > 0) {
    warnings.push(`${unsourcedClaims} fact, timeline event, or finding item(s) have no source reference.`);
    score -= Math.min(20, unsourcedClaims * 3);
  }

  const unreviewedPolicyFindings = input.findings.filter(
    (finding) => finding.policyStatus === 'legal_review_required',
  );
  if (unreviewedPolicyFindings.length > 0) {
    warnings.push(
      `${unreviewedPolicyFindings.length} finding(s) rely on policy material that still requires legal review.`,
    );
    score -= Math.min(15, unreviewedPolicyFindings.length * 3);
  }

  if (!input.jurisdiction.allowJurisdictionSpecificLegalConclusions) {
    warnings.push(
      `Jurisdiction pack ${input.jurisdiction.id} is discovery-capable but its jurisdiction-specific legal conclusions are not activated.`,
    );
  }

  if (input.allegations.length === 0) {
    warnings.push('No allegation matrix is present.');
    score -= 5;
  }

  if (!input.nextDeadline) {
    warnings.push('No next deadline is recorded. Confirm whether the case has an active response, hearing, appeal, or records deadline.');
    score -= 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    readyForAttorneyHandoff: blockingIssues.length === 0 && score >= 70,
    blockingIssues,
    warnings,
  };
}

function section(
  id: AttorneyPacketSection['id'],
  title: string,
  required: boolean,
  itemCount: number,
  ready: boolean,
  notes: string[] = [],
): AttorneyPacketSection {
  return { id, title, required, itemCount, ready, notes };
}

export function buildAttorneyPacketManifest(input: AttorneyPacketInput): AttorneyPacketManifest {
  const readiness = buildReadiness(input);
  const allRefs = collectSourceRefs(input);

  const sections: AttorneyPacketSection[] = [
    section('cover', 'Case Cover', true, 1, Boolean(input.caseName && input.caseId)),
    section(
      'executive_summary',
      'Executive Case Summary',
      true,
      input.facts.length,
      input.facts.length > 0,
      input.facts.length === 0 ? ['No structured facts are available for the summary.'] : [],
    ),
    section(
      'procedural_posture',
      'Procedural Posture',
      true,
      input.proceduralPosture ? 1 : 0,
      Boolean(input.proceduralPosture),
      input.proceduralPosture ? [] : ['Procedural posture has not been recorded.'],
    ),
    section(
      'property_and_parties',
      'Property and Parties',
      true,
      [input.property?.address, input.property?.apn, input.property?.ownerOfRecord].filter(Boolean).length,
      Boolean(input.property?.address || input.property?.apn),
    ),
    section(
      'deadline_sheet',
      'Deadline Sheet',
      true,
      input.nextDeadline ? 1 : 0,
      Boolean(input.nextDeadline),
      input.nextDeadline ? [] : ['No active deadline has been recorded.'],
    ),
    section('chronology', 'Sourced Chronology', true, input.timeline.length, input.timeline.length > 0),
    section(
      'allegation_matrix',
      'Allegation and Evidence Matrix',
      true,
      input.allegations.length,
      input.allegations.length > 0,
    ),
    section('findings', 'Findings and Open Questions', false, input.findings.length, true),
    section(
      'records_requests',
      'Public Records Request History',
      false,
      input.recordsRequests?.length ?? 0,
      true,
    ),
    section(
      'communications',
      'Communications and Mailing Proof',
      false,
      input.communications?.length ?? 0,
      true,
    ),
    section('evidence_index', 'Evidence Index', true, input.evidence.length, input.evidence.length > 0),
    section(
      'counsel_review',
      'Issues for Counsel to Review',
      true,
      input.findings.filter((finding) => finding.counselReviewRequired).length,
      true,
      input.jurisdiction.allowJurisdictionSpecificLegalConclusions
        ? []
        : ['Jurisdiction-specific legal conclusions remain gated pending review of the active policy pack.'],
    ),
    section('exhibits', 'Indexed Exhibits', true, uniqueEvidenceIds(allRefs).length, uniqueEvidenceIds(allRefs).length > 0),
  ];

  return {
    formatVersion: 1,
    packetType: 'fairprocess-attorney-handoff',
    caseId: input.caseId,
    caseName: input.caseName,
    caseNumber: input.caseNumber,
    generatedAt: input.generatedAt,
    jurisdictionPackId: input.jurisdiction.id,
    jurisdictionPackVersion: input.jurisdiction.version,
    sections,
    readiness,
    sourceEvidenceIds: uniqueEvidenceIds(allRefs),
    disclaimers: [
      'This packet organizes the case record and source material; it does not determine that any person or agency acted unlawfully.',
      'User assertions, agency assertions, verified facts, inferences, and unknowns must remain visibly distinguishable in rendered output.',
      'Citations, deadlines, jurisdiction, and legal authorities should be independently verified by counsel before reliance.',
      'Policy rules marked legal_review_required must not be rendered as controlling legal conclusions.',
    ],
  };
}

export function getPacketReadiness(input: AttorneyPacketInput): AttorneyPacketReadiness {
  return buildReadiness(input);
}

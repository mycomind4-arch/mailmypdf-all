import type {
  Claim,
  Evidence,
  InvestigationSource,
  InvestigationState,
} from '../investigation/types';
import type {
  AttorneyPacketInput,
  JurisdictionPack,
  PacketAllegation,
  PacketEvidenceStatus,
  PacketFinding,
  PacketSourceRef,
  PacketTimelineEvent,
} from './types';

export interface InvestigationPacketContext {
  caseName: string;
  caseNumber?: string;
  generatedAt: string;
  jurisdiction: JurisdictionPack;
  property?: AttorneyPacketInput['property'];
  proceduralPosture?: string;
  nextDeadline?: string;
  timeline?: PacketTimelineEvent[];
  allegations?: PacketAllegation[];
  communications?: PacketSourceRef[];
  recordsRequests?: PacketSourceRef[];
}

function sourceForEvidence(
  state: InvestigationState,
  evidence: Evidence,
): InvestigationSource | undefined {
  return state.sources.get(evidence.sourceId);
}

function evidenceRef(state: InvestigationState, evidenceId: string): PacketSourceRef | undefined {
  const evidence = state.evidence.get(evidenceId);
  if (!evidence) return undefined;
  const source = sourceForEvidence(state, evidence);

  return {
    evidenceId: evidence.id,
    label: source?.title || evidence.text.slice(0, 120) || evidence.id,
    sourceUrl: source?.url,
  };
}

function refsForClaim(state: InvestigationState, claim: Claim): PacketSourceRef[] {
  const ids = [...claim.supportingEvidence, ...claim.contradictingEvidence];
  const refs = ids
    .map((id) => evidenceRef(state, id))
    .filter((ref): ref is PacketSourceRef => Boolean(ref));

  return [...new Map(refs.map((ref) => [ref.evidenceId, ref])).values()];
}

function classifyClaimStatus(state: InvestigationState, claim: Claim): PacketEvidenceStatus {
  const supporting = claim.supportingEvidence
    .map((id) => state.evidence.get(id))
    .filter((value): value is Evidence => Boolean(value));

  if (supporting.some((evidence) => evidence.independentConfirmation)) {
    return 'verified';
  }

  const hasAgencySource = supporting.some((evidence) => {
    const source = sourceForEvidence(state, evidence);
    return source?.sourceType === 'GOVERNMENT_RECORD';
  });

  if (hasAgencySource) return 'agency_assertion';
  if (claim.status === 'EXPLAINED') return 'inference';
  return 'unknown';
}

function findingsFromContradictions(state: InvestigationState): PacketFinding[] {
  return [...state.contradictions.values()].map((contradiction) => {
    const claimA = state.claims.get(contradiction.claimA);
    const claimB = state.claims.get(contradiction.claimB);
    const refs = [
      ...(claimA ? refsForClaim(state, claimA) : []),
      ...(claimB ? refsForClaim(state, claimB) : []),
    ];

    const sourceRefs = [...new Map(refs.map((ref) => [ref.evidenceId, ref])).values()];
    const requiresCounselReview = contradiction.status === 'CONFIRMED' || contradiction.status === 'UNRESOLVED';

    return {
      id: contradiction.id,
      title:
        contradiction.status === 'CONFIRMED'
          ? 'Confirmed record contradiction'
          : contradiction.status === 'EXPLAINED'
            ? 'Explained record contradiction'
            : 'Potential record contradiction',
      detail: contradiction.resolution
        ? `${contradiction.description} Resolution recorded: ${contradiction.resolution}`
        : contradiction.description,
      severity:
        contradiction.status === 'CONFIRMED'
          ? 'high'
          : contradiction.status === 'UNRESOLVED'
            ? 'medium'
            : 'low',
      status: contradiction.status === 'EXPLAINED' ? 'resolved' : 'open',
      sourceRefs,
      counselReviewRequired: requiresCounselReview,
    };
  });
}

export function investigationToAttorneyPacketInput(
  state: InvestigationState,
  context: InvestigationPacketContext,
): AttorneyPacketInput {
  const evidence = [...state.evidence.values()]
    .map((item) => evidenceRef(state, item.id))
    .filter((ref): ref is PacketSourceRef => Boolean(ref));

  const facts = [...state.claims.values()].map((claim) => ({
    id: claim.id,
    statement: claim.text,
    status: classifyClaimStatus(state, claim),
    sourceRefs: refsForClaim(state, claim),
  }));

  return {
    caseId: state.id,
    caseName: context.caseName,
    caseNumber: context.caseNumber,
    generatedAt: context.generatedAt,
    jurisdiction: context.jurisdiction,
    property: context.property,
    proceduralPosture: context.proceduralPosture,
    nextDeadline: context.nextDeadline,
    facts,
    timeline: context.timeline ?? [],
    allegations: context.allegations ?? [],
    findings: findingsFromContradictions(state),
    evidence,
    communications: context.communications,
    recordsRequests: context.recordsRequests,
  };
}

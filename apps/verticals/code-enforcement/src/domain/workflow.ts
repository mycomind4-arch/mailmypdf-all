/**
 * Code Enforcement Workflow Definition
 *
 * Flagship workflow: "Respond to a Code Enforcement Property Inspection Request"
 *
 * Gold pipeline stages:
 * secure_ingest → classify → extract → timeline → evidence →
 * discrepancies → strategy → draft → validate → review →
 * authorize → submit → track → prove
 */

export type CEWorkflowStage =
  | 'secure_ingest'
  | 'classify'
  | 'extract'
  | 'complaint_provenance'
  | 'recipient_reconciliation'
  | 'property_intelligence'
  | 'jurisdiction_identification'
  | 'jurisdiction_research'
  | 'scope_analysis'
  | 'authority_analysis'
  | 'warrant_analysis'
  | 'timeline'
  | 'evidence_graph'
  | 'discrepancies'
  | 'strategy'
  | 'draft'
  | 'draft_critique'
  | 'final_validation'
  | 'human_review'
  | 'human_authorization'
  | 'fulfillment'
  | 'tracking'
  | 'proof';

export interface WorkflowStep {
  id: CEWorkflowStage;
  title: string;
  status: 'pending' | 'active' | 'complete' | 'blocked';
  required: boolean;
  evidenceRequired?: boolean;
  description: string;
}

export const GOLD_PIPELINE: WorkflowStep[] = [
  { id: 'secure_ingest', title: 'Secure Document Ingestion', status: 'pending', required: true, evidenceRequired: true, description: 'Accept and validate uploaded documents with prompt-injection defenses.' },
  { id: 'classify', title: 'Document Classification', status: 'pending', required: true, evidenceRequired: true, description: 'Classify document type with confidence and source provenance.' },
  { id: 'extract', title: 'Notice Extraction', status: 'pending', required: true, evidenceRequired: true, description: 'Extract all fields from the notice with provenance.' },
  { id: 'complaint_provenance', title: 'Complaint Provenance', status: 'pending', required: true, evidenceRequired: true, description: 'Distinguish complaint allegation from verified condition.' },
  { id: 'recipient_reconciliation', title: 'Recipient / Ownership Reconciliation', status: 'pending', required: true, evidenceRequired: true, description: 'Reconcile notice recipient with property ownership.' },
  { id: 'property_intelligence', title: 'Property Intelligence', status: 'pending', required: true, evidenceRequired: true, description: 'Resolve address, APN, zoning, permits, prior cases.' },
  { id: 'jurisdiction_identification', title: 'Jurisdiction Identification', status: 'pending', required: true, evidenceRequired: true, description: 'Identify the exact governing jurisdiction.' },
  { id: 'jurisdiction_research', title: 'Authoritative Research', status: 'pending', required: true, evidenceRequired: true, description: 'Research official sources for inspection procedure.' },
  { id: 'scope_analysis', title: 'Inspection Scope Analysis', status: 'pending', required: true, evidenceRequired: true, description: 'Identify exactly what the agency wants access to.' },
  { id: 'authority_analysis', title: 'Consent / Authority Analysis', status: 'pending', required: true, evidenceRequired: true, description: 'Analyze consent request, authority claimed, consequences.' },
  { id: 'warrant_analysis', title: 'Warrant Language Analysis', status: 'pending', required: false, evidenceRequired: true, description: 'Extract and analyze warrant references.' },
  { id: 'timeline', title: 'Timeline Construction', status: 'pending', required: true, evidenceRequired: true, description: 'Build deterministic timeline with fact classification.' },
  { id: 'evidence_graph', title: 'Evidence Graph', status: 'pending', required: true, evidenceRequired: true, description: 'Create traceability from complaint to draft.' },
  { id: 'discrepancies', title: 'Discrepancy Engine', status: 'pending', required: true, evidenceRequired: true, description: 'Detect mismatches and conflicts across all data.' },
  { id: 'strategy', title: 'Strategy Engine', status: 'pending', required: true, evidenceRequired: true, description: 'Generate grounded response strategies.' },
  { id: 'draft', title: 'Draft Engine', status: 'pending', required: true, evidenceRequired: true, description: 'Create factual, professional response draft.' },
  { id: 'draft_critique', title: 'Independent Draft Critique', status: 'pending', required: true, evidenceRequired: true, description: 'Independent provider reviews the draft.' },
  { id: 'final_validation', title: 'Final Validation', status: 'pending', required: true, evidenceRequired: true, description: 'Final validation by a different provider than drafting.' },
  { id: 'human_review', title: 'Human Review', status: 'pending', required: true, evidenceRequired: true, description: 'Present complete case summary for human review.' },
  { id: 'human_authorization', title: 'Human Authorization', status: 'pending', required: true, evidenceRequired: true, description: 'User must explicitly approve before any send.' },
  { id: 'fulfillment', title: 'Fulfillment Adapter', status: 'pending', required: true, evidenceRequired: true, description: 'Create approved document package for MailMyPDF.' },
  { id: 'tracking', title: 'Tracking', status: 'pending', required: true, evidenceRequired: true, description: 'Track fulfillment status.' },
  { id: 'proof', title: 'Proof Generation', status: 'pending', required: true, evidenceRequired: true, description: 'Preserve immutable proof of submission.' },
];

export interface CEWorkflowDefinition {
  id: 'respond-to-property-inspection-request';
  title: string;
  description: string;
  disclaimer: string;
  canonicalRoute: string;
  stages: WorkflowStep[];
  version: string;
}

export const FLAGSHIP_WORKFLOW: CEWorkflowDefinition = {
  id: 'respond-to-property-inspection-request',
  title: 'Respond to a Code Enforcement Property Inspection Request',
  description:
    'Evidence-first, property-aware, jurisdiction-aware analysis of a code enforcement inspection request. Extract what the notice says, identify the governing jurisdiction, research authoritative sources, detect discrepancies, generate response options, and prepare a professional response draft — all with multi-LLM verification and full provenance.',
  disclaimer:
    'This system is not a substitute for an attorney. It does not decide your legal position. It helps you understand, verify, document, and respond. Every AI conclusion is traceable to its evidence source.',
  canonicalRoute: '/workflows/respond-to-property-inspection-request',
  stages: GOLD_PIPELINE,
  version: '1.0.0',
};

// ─── Stage Gating ────────────────────────────────────────────────────────────

export function canAdvance(
  currentStage: CEWorkflowStage,
  completedStages: Set<CEWorkflowStage>,
): boolean {
  const stageOrder = GOLD_PIPELINE.map(s => s.id);
  const currentIdx = stageOrder.indexOf(currentStage);
  if (currentIdx <= 0) return true;
  const prevStage = stageOrder[currentIdx - 1];
  return completedStages.has(prevStage);
}

export function getBlockingStages(
  targetStage: CEWorkflowStage,
  completedStages: Set<CEWorkflowStage>,
): CEWorkflowStage[] {
  const stageOrder = GOLD_PIPELINE.map(s => s.id);
  const targetIdx = stageOrder.indexOf(targetStage);
  const blocking: CEWorkflowStage[] = [];
  for (let i = 0; i < targetIdx; i++) {
    if (!completedStages.has(stageOrder[i])) {
      blocking.push(stageOrder[i]);
    }
  }
  return blocking;
}

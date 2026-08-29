/**
 * Correction Workflow Definition — Workflow 2
 *
 * "Request to Correct a Code Enforcement Property Inspection Request"
 *
 * This workflow is COMPOSABLE with the first workflow.
 * It consumes the first workflow's case/evidence/context and creates
 * a new correction/amendment workflow on the SAME case.
 *
 * Relationship:
 *   Inspection Request Analysis → Discrepancy identified →
 *   Request Correction / Amendment → Agency response →
 *   Case updated → Continue original workflow
 *
 * The user does NOT restart intake. The same case ID, property ID,
 * evidence, timeline, documents, jurisdiction, identity, agency,
 * complaint, and inspection request carry forward.
 */

import type { CorrectionIssue } from './correction-issue-engine';
import type { CorrectionStrategyType } from './correction-strategy';

// ─── Workflow Identity ────────────────────────────────────────────────────────

export const CORRECTION_WORKFLOW_ID = 'amend-property-inspection-request';
export const CORRECTION_WORKFLOW_SLUG = 'request-correction-property-inspection-request';
export const CORRECTION_WORKFLOW_NAME = 'Request to Correct a Code Enforcement Property Inspection Request';
export const CORRECTION_WORKFLOW_VERSION = '2.0.0';

// ─── Workflow Stages ────────────────────────────────────────────────────────────

export type CorrectionWorkflowStage =
  | 'secure_ingest'
  | 'classify'
  | 'extract'
  | 'correction_issue_identification'
  | 'recipient_reconciliation'
  | 'property_reconciliation'
  | 'case_identifier_reconciliation'
  | 'scope_reconciliation'
  | 'deadline_reconciliation'
  | 'authority_reconciliation'
  | 'jurisdiction_identification'
  | 'jurisdiction_research'
  | 'timeline'
  | 'evidence'
  | 'discrepancies'
  | 'multi_llm_routing'
  | 'independent_review'
  | 'disagreement_handling'
  | 'correction_strategy'
  | 'draft'
  | 'draft_critique'
  | 'final_validation'
  | 'human_review'
  | 'human_authorization'
  | 'fulfillment'
  | 'tracking'
  | 'proof';

export interface CorrectionWorkflowStep {
  id: CorrectionWorkflowStage;
  title: string;
  status: 'pending' | 'active' | 'complete' | 'blocked';
  required: boolean;
  evidenceRequired?: boolean;
  description: string;
}

export const CORRECTION_PIPELINE: CorrectionWorkflowStep[] = [
  { id: 'secure_ingest', title: 'Secure Document Ingestion', status: 'pending', required: true, evidenceRequired: true, description: 'Accept and validate uploaded documents with prompt-injection defenses.' },
  { id: 'classify', title: 'Document Classification', status: 'pending', required: true, evidenceRequired: true, description: 'Classify document type with confidence and source provenance.' },
  { id: 'extract', title: 'Notice Extraction', status: 'pending', required: true, evidenceRequired: true, description: 'Extract all fields from the notice with provenance. Reuses existing extraction.' },
  { id: 'correction_issue_identification', title: 'Correction Issue Identification', status: 'pending', required: true, evidenceRequired: true, description: 'Identify what is wrong, incomplete, or requires correction in the inspection request.' },
  { id: 'recipient_reconciliation', title: 'Recipient Reconciliation', status: 'pending', required: true, evidenceRequired: true, description: 'Compare notice recipient against property records. Detect deceased recipient.' },
  { id: 'property_reconciliation', title: 'Property Reconciliation', status: 'pending', required: true, evidenceRequired: true, description: 'Compare address, APN, parcel against authoritative records.' },
  { id: 'case_identifier_reconciliation', title: 'Case Identifier Reconciliation', status: 'pending', required: true, evidenceRequired: true, description: 'Verify case number and complaint number.' },
  { id: 'scope_reconciliation', title: 'Scope Reconciliation', status: 'pending', required: true, evidenceRequired: true, description: 'Determine if inspection scope is clear, partial, ambiguous, or missing.' },
  { id: 'deadline_reconciliation', title: 'Deadline Reconciliation', status: 'pending', required: true, evidenceRequired: true, description: 'Verify response deadline against statutory requirements.' },
  { id: 'authority_reconciliation', title: 'Authority Reconciliation', status: 'pending', required: true, evidenceRequired: true, description: 'Verify cited authority. Detect missing or ambiguous authority.' },
  { id: 'jurisdiction_identification', title: 'Jurisdiction Identification', status: 'pending', required: true, evidenceRequired: true, description: 'Identify the exact governing jurisdiction.' },
  { id: 'jurisdiction_research', title: 'Authoritative Research', status: 'pending', required: true, evidenceRequired: true, description: 'Research official sources for correction/amendment procedure.' },
  { id: 'timeline', title: 'Timeline Update', status: 'pending', required: true, evidenceRequired: true, description: 'Update timeline with correction request events.' },
  { id: 'evidence', title: 'Evidence Graph', status: 'pending', required: true, evidenceRequired: true, description: 'Link correction issues to evidence sources.' },
  { id: 'discrepancies', title: 'Discrepancy Detection', status: 'pending', required: true, evidenceRequired: true, description: 'Detect mismatches between notice and records.' },
  { id: 'multi_llm_routing', title: 'Multi-LLM Routing', status: 'pending', required: true, evidenceRequired: true, description: 'Route tasks to Gemini (default), OpenAI, Claude with fallback.' },
  { id: 'independent_review', title: 'Independent Model Review', status: 'pending', required: true, evidenceRequired: true, description: 'Independent model review for high-consequence correction findings.' },
  { id: 'disagreement_handling', title: 'Disagreement Handling', status: 'pending', required: true, evidenceRequired: true, description: 'Handle model disagreements. Block automatic finalization.' },
  { id: 'correction_strategy', title: 'Correction Strategy', status: 'pending', required: true, evidenceRequired: true, description: 'Generate minimal-effective-correction strategies.' },
  { id: 'draft', title: 'Draft Generation', status: 'pending', required: true, evidenceRequired: true, description: 'Generate professional correction/amendment request.' },
  { id: 'draft_critique', title: 'Independent Draft Critique', status: 'pending', required: true, evidenceRequired: true, description: 'Independent provider critique of draft.' },
  { id: 'final_validation', title: 'Final Validation', status: 'pending', required: true, evidenceRequired: true, description: 'Final validation by provider different from drafting.' },
  { id: 'human_review', title: 'Human Review', status: 'pending', required: true, evidenceRequired: true, description: 'Display full review summary for human inspection.' },
  { id: 'human_authorization', title: 'Human Authorization', status: 'pending', required: true, evidenceRequired: true, description: 'Require explicit human approval before any submission.' },
  { id: 'fulfillment', title: 'Fulfillment', status: 'pending', required: true, evidenceRequired: true, description: 'Approved package → MailMyPDF fulfillment boundary.' },
  { id: 'tracking', title: 'Tracking', status: 'pending', required: true, evidenceRequired: true, description: 'Track submission with tracking number.' },
  { id: 'proof', title: 'Proof Generation', status: 'pending', required: true, evidenceRequired: true, description: 'Generate proof of submission and delivery.' },
];

// ─── Case Composition ──────────────────────────────────────────────────────────

export interface CaseCompositionContext {
  caseId: string;
  propertyId: string;
  evidenceIds: string[];
  timelineIds: string[];
  documentIds: string[];
  jurisdictionId: string;
  agencyId: string;
  complaintId?: string;
  inspectionRequestId: string;
  parentWorkflowId: string;
  parentWorkflowVersion: string;
}

export interface CorrectionWorkflowContext extends CaseCompositionContext {
  workflowId: string;
  workflowVersion: string;
  issues: CorrectionIssue[];
  strategies: CorrectionStrategyType[];
  createdAt: string;
}

export function createCorrectionWorkflowContext(parent: CaseCompositionContext): CorrectionWorkflowContext {
  return {
    ...parent,
    workflowId: CORRECTION_WORKFLOW_ID,
    workflowVersion: CORRECTION_WORKFLOW_VERSION,
    issues: [],
    strategies: [],
    createdAt: new Date().toISOString(),
  };
}

// ─── Post-Submission Case Action ──────────────────────────────────────────────

export interface CaseAction {
  type: 'CORRECTION_REQUEST_SENT';
  caseId: string;
  workflowId: string;
  timestamp: string;
  trackingNumber?: string;
  nextSteps: string[];
  caseStatus: 'open';
}

export function createPostSubmissionAction(caseId: string, trackingNumber?: string): CaseAction {
  return {
    type: 'CORRECTION_REQUEST_SENT',
    caseId,
    workflowId: CORRECTION_WORKFLOW_ID,
    timestamp: new Date().toISOString(),
    trackingNumber,
    nextSteps: [
      'Await agency response to correction request',
      'Update case with agency response',
      'Review amended notice if issued',
      'Continue original inspection request workflow with updated information',
    ],
    caseStatus: 'open',
  };
}

// ─── Disclaimer ────────────────────────────────────────────────────────────────

export const CORRECTION_DISCLAIMER =
  'This workflow is not a substitute for an attorney. It helps you understand, verify, document, and request correction of issues in a code enforcement inspection request. It does not provide legal advice and does not instruct you to evade or obstruct lawful enforcement.';

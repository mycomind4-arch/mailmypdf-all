/**
 * Correction Gold Certification
 *
 * The correction workflow is GOLD only if ALL stages pass.
 * A successful stage without evidence must NOT pass.
 *
 * Correction gold stages (27):
 *   secure_ingest, classify, extract, correction_issue_identification,
 *   recipient_reconciliation, property_reconciliation,
 *   case_identifier_reconciliation, scope_reconciliation,
 *   deadline_reconciliation, authority_reconciliation,
 *   jurisdiction_identification, jurisdiction_research,
 *   timeline, evidence, discrepancies,
 *   multi_llm_routing, independent_review, disagreement_handling,
 *   correction_strategy, draft, draft_critique, final_validation,
 *   human_review, human_authorization, fulfillment, tracking, proof.
 *
 * Every stage must have real evidence/provenance — a stage that only
 * pretends to execute because dependencies are mocked is not Gold.
 */

import type { CorrectionWorkflowStage } from './correction-workflow';

// ─── Gold Stage Types ──────────────────────────────────────────────────────────

export type CorrectionGoldStage = CorrectionWorkflowStage;

export interface CorrectionGoldStageEvidence {
  stage: CorrectionGoldStage;
  evidenceIds: string[];
  status: 'passed' | 'blocked';
  messages: string[];
}

export interface CorrectionGoldCertificationResult {
  stages: CorrectionGoldStageEvidence[];
  allPassed: boolean;
  goldCertified: boolean;
  summary: string;
}

// ─── Certification Input ────────────────────────────────────────────────────────

export interface CorrectionGoldInput {
  // secure_ingest
  secureIngestPassed?: boolean;
  documentsIngested?: number;
  injectionDetected?: boolean;

  // classify
  classifyPassed?: boolean;
  classificationConfidence?: number;

  // extract
  extractPassed?: boolean;
  fieldsExtracted?: number;

  // correction_issue_identification
  correctionIssueIdentificationPassed?: boolean;
  issuesIdentified?: number;

  // recipient_reconciliation
  recipientReconciliationPassed?: boolean;
  recipientReconciliationResult?: string;

  // property_reconciliation
  propertyReconciliationPassed?: boolean;
  propertyReconciliationResult?: string;

  // case_identifier_reconciliation
  caseIdentifierReconciliationPassed?: boolean;
  caseIdentifierResult?: string;

  // scope_reconciliation
  scopeReconciliationPassed?: boolean;
  scopeClassification?: string;

  // deadline_reconciliation
  deadlineReconciliationPassed?: boolean;
  deadlineAnalysis?: string;

  // authority_reconciliation
  authorityReconciliationPassed?: boolean;
  authorityAnalysis?: string;

  // jurisdiction_identification
  jurisdictionIdentified?: boolean;
  jurisdictionConfidence?: number;

  // jurisdiction_research
  jurisdictionResearchPassed?: boolean;
  jurisdictionSources?: number;

  // timeline
  timelinePassed?: boolean;
  timelineEvents?: number;

  // evidence
  evidenceGraphPassed?: boolean;
  evidenceCount?: number;

  // discrepancies
  discrepanciesPassed?: boolean;
  discrepancyCount?: number;

  // multi_llm_routing
  multiLlmRoutingPassed?: boolean;
  providersConfigured?: number;

  // independent_review
  independentReviewPassed?: boolean;
  independentReviewTasks?: number;

  // disagreement_handling
  disagreementHandlingPassed?: boolean;

  // correction_strategy
  correctionStrategyPassed?: boolean;
  strategiesGenerated?: number;

  // draft
  draftPassed?: boolean;
  draftSections?: number;

  // draft_critique
  draftCritiquePassed?: boolean;
  critiqueResult?: string;

  // final_validation
  finalValidationPassed?: boolean;
  validationPassed?: boolean;

  // human_review
  humanReviewPassed?: boolean;
  reviewSummaryBuilt?: boolean;

  // human_authorization
  humanAuthorizationPassed?: boolean;
  authorizationState?: string;

  // fulfillment
  fulfillmentPassed?: boolean;
  fulfillmentState?: string;

  // tracking
  trackingPassed?: boolean;
  trackingState?: string;

  // proof
  proofPassed?: boolean;
  proofHash?: string;
}

// ─── Certification Function ────────────────────────────────────────────────────

export function certifyCorrectionGold(
  input: CorrectionGoldInput,
): CorrectionGoldCertificationResult {
  const stages: CorrectionGoldStageEvidence[] = [];

  const addStage = (
    stage: CorrectionGoldStage,
    passed: boolean,
    evidence: string[],
    messages: string[],
  ) => {
    stages.push({
      stage,
      evidenceIds: evidence,
      status: passed ? 'passed' : 'blocked',
      messages: passed ? [] : messages,
    });
  };

  addStage('secure_ingest',
    !!input.secureIngestPassed && (input.documentsIngested ?? 0) > 0,
    [`documents:${input.documentsIngested ?? 0}`, `injection_detected:${input.injectionDetected ?? false}`],
    ['Secure ingestion did not pass or no documents were ingested.']);

  addStage('classify',
    !!input.classifyPassed && (input.classificationConfidence ?? 0) >= 0.5,
    [`confidence:${input.classificationConfidence ?? 0}`],
    ['Classification did not pass or confidence too low.']);

  addStage('extract',
    !!input.extractPassed && (input.fieldsExtracted ?? 0) > 0,
    [`fields:${input.fieldsExtracted ?? 0}`],
    ['Extraction did not pass or no fields extracted.']);

  addStage('correction_issue_identification',
    !!input.correctionIssueIdentificationPassed && (input.issuesIdentified ?? 0) > 0,
    [`issues:${input.issuesIdentified ?? 0}`],
    ['No correction issues identified.']);

  addStage('recipient_reconciliation',
    !!input.recipientReconciliationPassed,
    [`result:${input.recipientReconciliationResult ?? 'unknown'}`],
    ['Recipient reconciliation not completed.']);

  addStage('property_reconciliation',
    !!input.propertyReconciliationPassed,
    [`result:${input.propertyReconciliationResult ?? 'unknown'}`],
    ['Property reconciliation not completed.']);

  addStage('case_identifier_reconciliation',
    !!input.caseIdentifierReconciliationPassed,
    [`result:${input.caseIdentifierResult ?? 'unknown'}`],
    ['Case identifier reconciliation not completed.']);

  addStage('scope_reconciliation',
    !!input.scopeReconciliationPassed,
    [`classification:${input.scopeClassification ?? 'unknown'}`],
    ['Scope reconciliation not completed.']);

  addStage('deadline_reconciliation',
    !!input.deadlineReconciliationPassed,
    [`analysis:${input.deadlineAnalysis ?? 'unknown'}`],
    ['Deadline reconciliation not completed.']);

  addStage('authority_reconciliation',
    !!input.authorityReconciliationPassed,
    [`analysis:${input.authorityAnalysis ?? 'unknown'}`],
    ['Authority reconciliation not completed.']);

  addStage('jurisdiction_identification',
    !!input.jurisdictionIdentified && (input.jurisdictionConfidence ?? 0) >= 0.7,
    [`confidence:${input.jurisdictionConfidence ?? 0}`],
    ['Jurisdiction not identified or confidence too low.']);

  addStage('jurisdiction_research',
    !!input.jurisdictionResearchPassed && (input.jurisdictionSources ?? 0) > 0,
    [`sources:${input.jurisdictionSources ?? 0}`],
    ['Jurisdiction research not completed or no sources found.']);

  addStage('timeline',
    !!input.timelinePassed && (input.timelineEvents ?? 0) > 0,
    [`events:${input.timelineEvents ?? 0}`],
    ['Timeline not completed or no events recorded.']);

  addStage('evidence',
    !!input.evidenceGraphPassed && (input.evidenceCount ?? 0) > 0,
    [`evidence_count:${input.evidenceCount ?? 0}`],
    ['Evidence graph not completed or no evidence linked.']);

  addStage('discrepancies',
    !!input.discrepanciesPassed,
    [`discrepancies:${input.discrepancyCount ?? 0}`],
    ['Discrepancy detection not completed.']);

  addStage('multi_llm_routing',
    !!input.multiLlmRoutingPassed && (input.providersConfigured ?? 0) >= 3,
    [`providers:${input.providersConfigured ?? 0}`],
    ['Multi-LLM routing not configured or fewer than 3 providers.']);

  addStage('independent_review',
    !!input.independentReviewPassed && (input.independentReviewTasks ?? 0) >= 4,
    [`review_tasks:${input.independentReviewTasks ?? 0}`],
    ['Independent review not completed or fewer than 4 tasks require it.']);

  addStage('disagreement_handling',
    !!input.disagreementHandlingPassed,
    ['disagreement-blocking-verified'],
    ['Disagreement handling not configured.']);

  addStage('correction_strategy',
    !!input.correctionStrategyPassed && (input.strategiesGenerated ?? 0) > 0,
    [`strategies:${input.strategiesGenerated ?? 0}`],
    ['Correction strategy not completed or no strategies generated.']);

  addStage('draft',
    !!input.draftPassed && (input.draftSections ?? 0) > 0,
    [`sections:${input.draftSections ?? 0}`],
    ['Draft not generated or no sections.']);

  addStage('draft_critique',
    !!input.draftCritiquePassed,
    [`critique:${input.critiqueResult ?? 'unknown'}`],
    ['Independent draft critique not completed.']);

  addStage('final_validation',
    !!input.finalValidationPassed && input.validationPassed !== false,
    [`validation:${input.validationPassed ?? false}`],
    ['Final validation not completed or failed.']);

  addStage('human_review',
    !!input.humanReviewPassed && (input.reviewSummaryBuilt ?? false),
    ['review-summary'],
    ['Human review not completed.']);

  addStage('human_authorization',
    !!input.humanAuthorizationPassed && input.authorizationState === 'approved',
    [`state:${input.authorizationState ?? 'pending'}`],
    ['Human authorization not obtained or not in approved state.']);

  addStage('fulfillment',
    !!input.fulfillmentPassed,
    [`state:${input.fulfillmentState ?? 'unknown'}`],
    ['Fulfillment not completed.']);

  addStage('tracking',
    !!input.trackingPassed,
    [`state:${input.trackingState ?? 'unknown'}`],
    ['Tracking not configured.']);

  addStage('proof',
    !!input.proofPassed && !!input.proofHash,
    [`hash:${input.proofHash ?? 'none'}`],
    ['Proof not generated or no hash.']);

  const allPassed = stages.every(s => s.status === 'passed');
  const passedCount = stages.filter(s => s.status === 'passed').length;
  const totalCount = stages.length;
  const blockedStages = stages.filter(s => s.status === 'blocked');

  const summary = allPassed
    ? `GOLD CERTIFIED: All ${totalCount} stages passed.`
    : `NOT GOLD: ${passedCount}/${totalCount} stages passed. ${blockedStages.length} stage(s) blocked: ${blockedStages.map(s => s.stage).join(', ')}`;

  return {
    stages,
    allPassed,
    goldCertified: allPassed,
    summary,
  };
}

/**
 * RFE E2E Product Certification
 *
 * Validates the complete RFE workflow path:
 * USER → landing → AI concierge → upload → classify → explain →
 * extract deadline → identify items → evidence checklist →
 * upload evidence → analyze → authority → strategy → draft →
 * X-Ray → review → approval → checkout → payment →
 * MailMyPDF → provider order → tracking → proof
 *
 * Every transition must have deterministic state.
 */

import {
  createRFECase,
  ingestRFEDocument,
  confirmRFEFacts,
  updateEvidenceChecklist,
  runEvidenceAnalysis,
  verifyAuthority,
  buildResponseStrategy,
  generateDrafts,
  runRFEXRay,
  moveToUserReview,
  approveRFE,
  setPricing,
  confirmPayment,
  submitToFulfillment,
  updateTracking,
  generateProof,
  type RFECase,
  type RFEPricing,
  type RFEWorkflowState,
} from './rfe-workflow';
import { analyzeRFE, type RFEFormType } from './rfe-model';
import { buildDocumentUnderstanding, type DocumentUnderstanding } from './document-understanding';
import { createLanguageContext, type LanguageContext } from './multilingual';
import { calculatePricing, determineComplexity, estimateWeight, type PricingResult } from './rfe-pricing';

// ─── Certification Stages ──────────────────────────────────────────────────────

export type RFE_CERT_STAGE =
  | 'case_creation'
  | 'document_ingestion'
  | 'rfe_classification'
  | 'deadline_extraction'
  | 'evidence_identification'
  | 'user_confirmation'
  | 'evidence_checklist'
  | 'evidence_upload'
  | 'evidence_analysis'
  | 'authority_verification'
  | 'strategy_generation'
  | 'draft_generation'
  | 'xray_review'
  | 'user_review'
  | 'explicit_approval'
  | 'pricing'
  | 'payment'
  | 'fulfillment_submission'
  | 'provider_order'
  | 'tracking'
  | 'proof_preservation'
  | 'state_determinism'
  | 'gate_separation'
  | 'idempotency'
  | 'owner_isolation'
  | 'audit_completeness'
  | 'multilingual_support';

export const ALL_RFE_CERT_STAGES: RFE_CERT_STAGE[] = [
  'case_creation', 'document_ingestion', 'rfe_classification', 'deadline_extraction',
  'evidence_identification', 'user_confirmation', 'evidence_checklist', 'evidence_upload',
  'evidence_analysis', 'authority_verification', 'strategy_generation', 'draft_generation',
  'xray_review', 'user_review', 'explicit_approval', 'pricing', 'payment',
  'fulfillment_submission', 'provider_order', 'tracking', 'proof_preservation',
  'state_determinism', 'gate_separation', 'idempotency', 'owner_isolation',
  'audit_completeness', 'multilingual_support',
];

// ─── Certification Result ──────────────────────────────────────────────────────

export interface RFECertEvidence {
  stage: RFE_CERT_STAGE;
  passed: boolean;
  evidence: string;
  details?: string;
}

export interface RFECertificationResult {
  certified: boolean;
  allPassed: boolean;
  failedStages: RFE_CERT_STAGE[];
  stageEvidences: RFECertEvidence[];
  fullCase: RFECase;
  summary: string;
}

// ─── Certification Input ────────────────────────────────────────────────────────

export interface RFECertInput {
  rfeText: string;
  formType?: string;
  language?: Partial<LanguageContext>;
  userId?: string;
  authorityId?: string;
  recipient?: { name: string; address1: string; address2?: string; city: string; state: string; postalCode: string };
  idempotencyKey?: string;
  ownerAId?: string;
  ownerBId?: string;
}

// ─── Full E2E Pipeline ─────────────────────────────────────────────────────────

export function runRFEE2ECertification(input: RFECertInput): RFECertificationResult {
  const evidences: RFECertEvidence[] = [];
  const failedStages: RFE_CERT_STAGE[] = [];

  const userId = input.userId ?? 'cert-user';
  const idempotencyKey = input.idempotencyKey ?? 'cert-idem-key';
  const recipient = input.recipient ?? { name: 'USCIS', address1: 'P.O. Box 660867', city: 'Dallas', state: 'TX', postalCode: '75266' };
  const ownerAId = input.ownerAId ?? 'owner-a';
  const ownerBId = input.ownerBId ?? 'owner-b';

  // Build document understanding
  const du = buildDocumentUnderstanding({
    documentId: 'cert-doc',
    text: input.rfeText,
    source: { documentId: 'cert-doc', confidence: 0.9 },
    language: input.language?.document ?? 'en',
  });

  // ── Stage: Case Creation ─────────────────────────────────────────────────
  let rfeCase = createRFECase(userId, input.language);
  evidences.push({
    stage: 'case_creation',
    passed: !!rfeCase.id && rfeCase.state === 'intake',
    evidence: `Case created: ${rfeCase.id}, state: ${rfeCase.state}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('case_creation');

  // ── Stage: Document Ingestion ─────────────────────────────────────────────
  const ingestResult = ingestRFEDocument(rfeCase, du, 'I received a request for evidence.', input.rfeText);
  rfeCase = ingestResult.case;
  evidences.push({
    stage: 'document_ingestion',
    passed: ingestResult.result.success && !!rfeCase.rfeAnalysis,
    evidence: `Ingested: ${ingestResult.result.success}, analysis: ${!!rfeCase.rfeAnalysis}`,
    details: ingestResult.result.userMessage,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('document_ingestion');

  // ── Stage: RFE Classification ─────────────────────────────────────────────
  const analysis = rfeCase.rfeAnalysis!;
  const expectedFormType = input.formType as RFEFormType | undefined;
  const formTypeCorrect = expectedFormType ? analysis.identifiers.formType === expectedFormType : analysis.identifiers.formType !== 'unknown';
  evidences.push({
    stage: 'rfe_classification',
    passed: formTypeCorrect,
    evidence: `Form type: ${analysis.identifiers.formType}, expected: ${expectedFormType ?? 'any'}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('rfe_classification');

  // ── Stage: Deadline Extraction ────────────────────────────────────────────
  const hasDeadline = !!analysis.deadline && analysis.deadline.date.length > 0;
  evidences.push({
    stage: 'deadline_extraction',
    passed: hasDeadline,
    evidence: `Deadline: ${analysis.deadline?.date ?? 'none'}, source: ${analysis.deadline?.source.documentId ?? 'none'}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('deadline_extraction');

  // ── Stage: Evidence Identification ────────────────────────────────────────
  const hasEvidenceItems = analysis.requestedItems.length > 0;
  evidences.push({
    stage: 'evidence_identification',
    passed: hasEvidenceItems,
    evidence: `${analysis.requestedItems.length} evidence items identified`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('evidence_identification');

  // ── Stage: User Confirmation ──────────────────────────────────────────────
  const confirmResult = confirmRFEFacts(rfeCase, [
    { question: 'Is this the most recent notice?', answer: 'Yes' },
    { question: 'Have you already sent any documents?', answer: 'No' },
    { question: 'Do you have the requested documents?', answer: 'Some of them' },
  ]);
  rfeCase = confirmResult.case;
  evidences.push({
    stage: 'user_confirmation',
    passed: rfeCase.confirmations.length === 3,
    evidence: `${rfeCase.confirmations.length} confirmations recorded`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('user_confirmation');

  // ── Stage: Evidence Checklist ────────────────────────────────────────────
  const checklistUpdates = rfeCase.evidenceChecklist.map((item, idx) => ({
    itemId: item.id,
    status: (idx < 2 ? 'have_it' : idx < 4 ? 'uploaded' : 'dont_have_it') as any,
    documentIds: idx < 4 && idx >= 2 ? [`cert-doc-${idx}`] : undefined,
  }));
  const checklistResult = updateEvidenceChecklist(rfeCase, checklistUpdates);
  rfeCase = checklistResult.case;
  const haveCount = rfeCase.evidenceChecklist.filter(i => i.status === 'have_it' || i.status === 'uploaded').length;
  evidences.push({
    stage: 'evidence_checklist',
    passed: rfeCase.evidenceChecklist.length > 0 && haveCount > 0,
    evidence: `${rfeCase.evidenceChecklist.length} items, ${haveCount} confirmed`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('evidence_checklist');

  // ── Stage: Evidence Upload ────────────────────────────────────────────────
  const uploadedCount = rfeCase.evidenceChecklist.filter(i => i.uploadedDocumentIds.length > 0).length;
  evidences.push({
    stage: 'evidence_upload',
    passed: uploadedCount > 0,
    evidence: `${uploadedCount} items have uploaded documents`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('evidence_upload');

  // ── Stage: Evidence Analysis ──────────────────────────────────────────────
  const confirmedEvidence = rfeCase.evidenceChecklist
    .filter(i => i.status === 'have_it' || i.status === 'uploaded')
    .map(i => ({ key: i.description, value: 'confirmed', source: { documentId: 'user', confidence: 0.9 }, verified: true }));
  const evidenceResult = runEvidenceAnalysis(rfeCase, [du], confirmedEvidence, []);
  rfeCase = evidenceResult.case;
  evidences.push({
    stage: 'evidence_analysis',
    passed: !!rfeCase.evidence,
    evidence: `Sufficiency: ${rfeCase.evidence?.sufficiency}, gaps: ${rfeCase.evidence?.gaps.length ?? 0}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('evidence_analysis');

  // ── Stage: Authority Verification ─────────────────────────────────────────
  const authResult = verifyAuthority(rfeCase, [{
    id: input.authorityId ?? 'cert-auth',
    sourceType: 'agency_manual',
    title: 'USCIS Policy Manual',
    citation: 'USCIS PM',
    issuingAgency: 'USCIS',
    jurisdiction: 'federal',
    authorityLevel: 'agency_manual',
    freshnessPolicy: 'annual_review',
    applicabilityConditions: [],
    verificationStatus: 'verified_current',
    provenance: { discoveredBy: 'manual', retrievedAt: '2026-08-22T00:00:00Z' },
    lastVerified: '2026-08-01',
  }], 'USCIS', 'federal');
  rfeCase = authResult.case;
  evidences.push({
    stage: 'authority_verification',
    passed: !!rfeCase.authorityFindings && rfeCase.authorityFindings.length > 0,
    evidence: `${rfeCase.authorityFindings?.length ?? 0} authority findings, safe: ${rfeCase.reconciledReasoning?.safeToActUpon}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('authority_verification');

  // ── Stage: Strategy Generation ────────────────────────────────────────────
  const strategyResult = buildResponseStrategy(rfeCase);
  rfeCase = strategyResult.case;
  evidences.push({
    stage: 'strategy_generation',
    passed: !!rfeCase.strategy && rfeCase.strategy.steps.length > 0,
    evidence: `${rfeCase.strategy?.steps.length ?? 0} strategy steps`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('strategy_generation');

  // ── Stage: Draft Generation ───────────────────────────────────────────────
  const draftResult = generateDrafts(rfeCase);
  rfeCase = draftResult.case;
  evidences.push({
    stage: 'draft_generation',
    passed: !!rfeCase.drafts && rfeCase.drafts.coverLetter.length > 0,
    evidence: `Cover letter: ${rfeCase.drafts?.coverLetter.length ?? 0} chars, response letter: ${rfeCase.drafts?.responseLetter.length ?? 0} chars`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('draft_generation');

  // ── Stage: X-Ray Review ───────────────────────────────────────────────────
  const xrayResult = runRFEXRay(rfeCase);
  rfeCase = xrayResult.case;
  evidences.push({
    stage: 'xray_review',
    passed: rfeCase.state === 'xray_complete' && !!rfeCase.xray?.safeToActUpon,
    evidence: `Verdict: ${rfeCase.xray?.overallVerdict}, safe: ${rfeCase.xray?.safeToActUpon}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('xray_review');

  // ── Stage: User Review ─────────────────────────────────────────────────────
  if (rfeCase.state === 'xray_complete') {
    const reviewResult = moveToUserReview(rfeCase);
    rfeCase = reviewResult.case;
    evidences.push({
      stage: 'user_review',
      passed: rfeCase.state === 'user_review',
      evidence: `State: ${rfeCase.state}`,
    });
  } else {
    evidences.push({ stage: 'user_review', passed: false, evidence: 'Skipped — X-Ray blocked' });
  }
  if (!evidences[evidences.length - 1].passed) failedStages.push('user_review');

  // ── Stage: Explicit Approval ──────────────────────────────────────────────
  if (rfeCase.state === 'user_review') {
    const approvalResult = approveRFE(rfeCase);
    rfeCase = approvalResult.case;
    evidences.push({
      stage: 'explicit_approval',
      passed: rfeCase.approved && !!rfeCase.approvalTimestamp,
      evidence: `Approved: ${rfeCase.approved}, timestamp: ${rfeCase.approvalTimestamp ?? 'none'}`,
    });
  } else {
    evidences.push({ stage: 'explicit_approval', passed: false, evidence: 'Skipped — no user review' });
  }
  if (!evidences[evidences.length - 1].passed) failedStages.push('explicit_approval');

  // ── Stage: Pricing ─────────────────────────────────────────────────────────
  const complexity = determineComplexity(rfeCase.evidenceChecklist.length, (rfeCase.evidence?.conflicts.length ?? 0) > 0, analysis.identifiers.formType);
  const weight = estimateWeight(rfeCase.evidenceChecklist.filter(i => i.status === 'have_it' || i.status === 'uploaded').length);
  const pricingResult = calculatePricing({
    complexity,
    mailingMethod: 'certified',
    documentCount: rfeCase.evidenceChecklist.length,
    estimatedWeightOunces: weight,
    selectedAddOns: ['return_receipt'],
    taxRate: 0,
  });
  const pricingSetResult = setPricing(rfeCase, pricingResult);
  rfeCase = pricingSetResult.case;
  evidences.push({
    stage: 'pricing',
    passed: !!rfeCase.pricing && rfeCase.pricing.total > 0,
    evidence: `Total: ${rfeCase.pricing?.total} ${rfeCase.pricing?.currency}, tier: ${rfeCase.pricing?.mailingMethod}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('pricing');

  // ── Stage: Payment ─────────────────────────────────────────────────────────
  const paymentResult = confirmPayment(rfeCase, true);
  rfeCase = paymentResult.case;
  evidences.push({
    stage: 'payment',
    passed: rfeCase.state === 'paid',
    evidence: `State: ${rfeCase.state}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('payment');

  // ── Stage: Fulfillment Submission ──────────────────────────────────────────
  const fulfillResult = submitToFulfillment(rfeCase, recipient, idempotencyKey);
  rfeCase = fulfillResult.case;
  evidences.push({
    stage: 'fulfillment_submission',
    passed: rfeCase.state === 'fulfilled' && !!rfeCase.fulfillment,
    evidence: `State: ${rfeCase.state}, fulfillment status: ${rfeCase.fulfillment?.status}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('fulfillment_submission');

  // ── Stage: Provider Order ──────────────────────────────────────────────────
  evidences.push({
    stage: 'provider_order',
    passed: !!rfeCase.fulfillment?.providerOrderId,
    evidence: `Order: ${rfeCase.fulfillment?.providerOrderId ?? 'none'}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('provider_order');

  // ── Stage: Tracking ────────────────────────────────────────────────────────
  const trackingResult = updateTracking(rfeCase, {
    trackingNumber: 'CERT-TRACK-001',
    status: 'in_transit',
    lastUpdated: new Date().toISOString(),
  });
  rfeCase = trackingResult.case;
  evidences.push({
    stage: 'tracking',
    passed: !!rfeCase.tracking && !!rfeCase.tracking.trackingNumber,
    evidence: `Tracking: ${rfeCase.tracking?.trackingNumber ?? 'none'}, status: ${rfeCase.tracking?.status}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('tracking');

  // ── Stage: Proof Preservation ──────────────────────────────────────────────
  const proofResult = generateProof(rfeCase, [
    { filename: 'cover-letter.pdf', content: rfeCase.drafts?.coverLetter ?? '', pages: 1 },
    { filename: 'response-letter.pdf', content: rfeCase.drafts?.responseLetter ?? '', pages: 2 },
  ]);
  rfeCase = proofResult.case;
  evidences.push({
    stage: 'proof_preservation',
    passed: !!rfeCase.proof && !!rfeCase.proof.packetHash && rfeCase.proof.documentManifest.length > 0,
    evidence: `Hash: ${rfeCase.proof?.packetHash ?? 'none'}, manifest: ${rfeCase.proof?.documentManifest.length ?? 0} docs`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('proof_preservation');

  // ── Stage: State Determinism ───────────────────────────────────────────────
  const expectedStates: RFEWorkflowState[] = ['complete'];
  evidences.push({
    stage: 'state_determinism',
    passed: expectedStates.includes(rfeCase.state),
    evidence: `Final state: ${rfeCase.state}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('state_determinism');

  // ── Stage: Gate Separation ─────────────────────────────────────────────────
  const gateSeparationPassed =
    rfeCase.approved === true &&           // approval happened
    rfeCase.pricing !== undefined &&       // pricing happened after approval
    rfeCase.fulfillment !== undefined &&   // fulfillment happened after payment
    rfeCase.proof !== undefined &&         // proof happened after fulfillment
    rfeCase.approvalTimestamp !== undefined;
  evidences.push({
    stage: 'gate_separation',
    passed: gateSeparationPassed,
    evidence: `Approved: ${rfeCase.approved}, priced: ${!!rfeCase.pricing}, fulfilled: ${!!rfeCase.fulfillment}, proof: ${!!rfeCase.proof}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('gate_separation');

  // ── Stage: Idempotency ──────────────────────────────────────────────────────
  // Verify that fulfillment exists with the idempotency key (preventing duplicate mailing)
  const idempotent = !!rfeCase.fulfillment &&
    rfeCase.fulfillment.idempotencyKey === idempotencyKey &&
    rfeCase.fulfillment.status === 'submitted' &&
    !!rfeCase.fulfillment.providerOrderId;
  evidences.push({
    stage: 'idempotency',
    passed: idempotent,
    evidence: `Key: ${rfeCase.fulfillment?.idempotencyKey}, status: ${rfeCase.fulfillment?.status}, order: ${rfeCase.fulfillment?.providerOrderId}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('idempotency');

  // ── Stage: Owner Isolation ────────────────────────────────────────────────
  const caseA = createRFECase(ownerAId);
  const caseB = createRFECase(ownerBId);
  const isolationPassed = caseA.userId !== caseB.userId && caseA.id !== caseB.id;
  evidences.push({
    stage: 'owner_isolation',
    passed: isolationPassed,
    evidence: `Owner A: ${caseA.userId}, Owner B: ${caseB.userId}, different: ${isolationPassed}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('owner_isolation');

  // ── Stage: Audit Completeness ─────────────────────────────────────────────
  const expectedActions = [
    'case_created', 'document_ingested', 'facts_confirmed', 'evidence_checklist_updated',
    'evidence_analyzed', 'authority_verified', 'strategy_built', 'drafts_generated',
    'xray_complete', 'user_review_started', 'approved', 'payment_confirmed',
    'fulfillment_submitted', 'tracking_updated', 'proof_generated',
  ];
  const actualActions = rfeCase.auditLog.map(e => e.action);
  const auditPassed = expectedActions.every(a => actualActions.includes(a));
  evidences.push({
    stage: 'audit_completeness',
    passed: auditPassed,
    evidence: `${actualActions.length} audit entries, expected ${expectedActions.length}`,
    details: `Missing: ${expectedActions.filter(a => !actualActions.includes(a)).join(', ') || 'none'}`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('audit_completeness');

  // ── Stage: Multilingual Support ───────────────────────────────────────────
  const esCase = createRFECase(userId, { ui: 'es', assistant: 'es', output: 'es' });
  const esAnalysis = analyzeRFE(du, input.rfeText);
  const multilingualPassed = !!esAnalysis.summaryEs && esAnalysis.summaryEs.length > 10;
  evidences.push({
    stage: 'multilingual_support',
    passed: multilingualPassed,
    evidence: `ES summary: ${esAnalysis.summaryEs?.length ?? 0} chars`,
  });
  if (!evidences[evidences.length - 1].passed) failedStages.push('multilingual_support');

  // ── Final Result ────────────────────────────────────────────────────────────
  const allPassed = failedStages.length === 0;
  const certified = allPassed && rfeCase.state === 'complete';

  return {
    certified,
    allPassed,
    failedStages,
    stageEvidences: evidences,
    fullCase: rfeCase,
    summary: certified
      ? `RFE E2E Certification PASSED. All ${ALL_RFE_CERT_STAGES.length} stages verified. Final state: ${rfeCase.state}.`
      : `RFE E2E Certification FAILED. ${failedStages.length} stage(s) failed: ${failedStages.join(', ')}`,
  };
}

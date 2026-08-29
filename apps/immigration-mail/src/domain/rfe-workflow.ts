/**
 * RFE Workflow Engine — Orchestrates the full RFE response pipeline
 *
 * USER JOURNEY (16 steps):
 * 1. Intake ("What happened?")
 * 2. Document read ("We're reading your letter")
 * 3. Explain ("What USCIS appears to be asking for")
 * 4. Confirm (key questions only)
 * 5. Evidence checklist
 * 6. Evidence intelligence (analyze uploaded evidence)
 * 7. Authority verification
 * 8. Strategy (structured response plan)
 * 9. Draft (response letter, cover letter, evidence index)
 * 10. X-Ray (independent adversarial review)
 * 11. User review
 * 12. Explicit approval
 * 13. Checkout
 * 14. MailMyPDF fulfillment
 * 15. Tracking
 * 16. Proof
 *
 * Each step produces deterministic state.
 * AI may assist but cannot bypass deterministic gates.
 */

import type { DocumentUnderstanding } from './document-understanding';
import type { CaseReasoning, DetectedIssue } from './case-reasoning';
import type { ReconciledCaseReasoning, AuthorityFinding } from './authority';
import type { EvidenceAnalysisResult } from './evidence';
import type { XRayResult, XRayVerdict } from './xray';
import { reasonAboutCase, type ReasonerInput } from './case-reasoner';
import { resolveAuthority } from './authority-resolver';
import { analyzeEvidence } from './evidence';
import { runXRay } from './xray';
import {
  analyzeRFE,
  type RFEAnalysis,
  type RFERequestedItem,
  type EvidenceItemStatus,
} from './rfe-model';
import { createLanguageContext, type LanguageContext } from './multilingual';

// ─── Workflow State Machine ──────────────────────────────────────────────────

export type RFEWorkflowState =
  | 'intake'           // Step 1: "What happened?"
  | 'reading'          // Step 2: "We're reading your letter"
  | 'explained'        // Step 3: Explanation complete
  | 'confirmed'        // Step 4: Key facts confirmed
  | 'evidence_checklist' // Step 5: Evidence checklist created
  | 'evidence_analyzed' // Step 6: Evidence analyzed
  | 'authority_verified' // Step 7: Authority checked
  | 'strategy_built'   // Step 8: Strategy generated
  | 'drafted'          // Step 9: Drafts generated
  | 'xray_complete'    // Step 10: X-Ray review
  | 'user_review'      // Step 11: User reviewing
  | 'approved'         // Step 12: Explicitly approved
  | 'checkout_pending' // Step 13: Checkout started
  | 'paid'             // Step 13: Payment confirmed
  | 'fulfillment_pending' // Step 14: MailMyPDF pending
  | 'fulfilled'        // Step 14: Provider order created
  | 'tracking'          // Step 15: Tracking available
  | 'complete'          // Step 16: Proof preserved
  | 'blocked'           // Blocked by X-Ray or gate
  | 'failed';           // Failed (payment, fulfillment, etc.)

export const RFE_STEP_ORDER: RFEWorkflowState[] = [
  'intake', 'reading', 'explained', 'confirmed', 'evidence_checklist',
  'evidence_analyzed', 'authority_verified', 'strategy_built', 'drafted',
  'xray_complete', 'user_review', 'approved', 'checkout_pending', 'paid',
  'fulfillment_pending', 'fulfilled', 'tracking', 'complete',
];

// ─── Workflow Step Result ─────────────────────────────────────────────────────

export interface RFEWorkflowStepResult {
  state: RFEWorkflowState;
  success: boolean;
  blockingReason?: string;
  userMessage: string;
  userMessageEs?: string;
}

// ─── RFE Case (canonical state) ──────────────────────────────────────────────

export interface RFECase {
  id: string;
  createdAt: string;
  updatedAt: string;
  // User info
  userId: string;
  language: LanguageContext;
  // State machine
  state: RFEWorkflowState;
  // Document analysis
  rfeAnalysis?: RFEAnalysis;
  documentUnderstanding?: DocumentUnderstanding;
  // Reasoning
  reasoning?: CaseReasoning;
  reconciledReasoning?: ReconciledCaseReasoning;
  // Evidence
  evidence?: EvidenceAnalysisResult;
  // Authority
  authorityFindings?: AuthorityFinding[];
  // X-Ray
  xray?: XRayResult;
  // Evidence checklist (user-facing)
  evidenceChecklist: RFERequestedItem[];
  // User confirmation
  confirmations: { question: string; answer: string }[];
  // Strategy
  strategy?: RFEResponseStrategy;
  // Drafts
  drafts?: RFEDrafts;
  // Approval
  approved: boolean;
  approvalTimestamp?: string;
  // Pricing
  pricing?: RFEPricing;
  // Fulfillment
  fulfillment?: RFEFulfillment;
  // Tracking
  tracking?: RFETracking;
  // Proof
  proof?: RFEProof;
  // AI Enhancements (optional, multi-LLM)
  aiEnhancements?: RFEAIEnhancements;
  // Audit
  auditLog: { timestamp: string; action: string; details: string }[];
}

// ─── Response Strategy ────────────────────────────────────────────────────────

export interface RFEResponseStrategy {
  steps: RFEResponseStep[];
  confirmedItems: string[];
  uncertainItems: string[];
  needsReviewItems: string[];
  userFacingSummary: string;
  userFacingSummaryEs?: string;
}

export interface RFEResponseStep {
  order: number;
  description: string;
  descriptionEs?: string;
  category: 'respond_to_issue' | 'provide_evidence' | 'explain_discrepancy' | 'address_requested_item' | 'include_supporting_doc';
  confidence: 'confirmed' | 'uncertain' | 'needs_review';
}

// ─── Drafts ────────────────────────────────────────────────────────────────────

export interface RFEDrafts {
  responseLetter: string;
  responseLetterEs?: string;
  coverLetter: string;
  coverLetterEs?: string;
  evidenceIndex: { item: string; description: string; documentIds: string[] }[];
  documentOrder: string[];
  userFacingSummary: string;
}

// ─── Pricing ────────────────────────────────────────────────────────────────────

export type MailingMethod = 'standard' | 'certified' | 'registered';

export interface RFEPricing {
  servicePrice: number;
  postage: number;
  tax: number;
  total: number;
  mailingMethod: MailingMethod;
  addOns: { name: string; price: number; description: string }[];
  currency: string;
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────

export interface RFEFulfillment {
  idempotencyKey: string;
  providerOrderId?: string;
  status: 'pending' | 'submitted' | 'mailed' | 'failed' | 'unknown';
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  submittedAt?: string;
  error?: string;
}

// ─── Tracking ────────────────────────────────────────────────────────────────────

export interface RFETracking {
  trackingNumber?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'unknown' | 'failed';
  estimatedDelivery?: string;
  lastUpdated: string;
}

// ─── Proof ──────────────────────────────────────────────────────────────────────

export interface RFEProof {
  packetHash: string;
  documentManifest: { filename: string; hash: string; pages: number }[];
  timestamp: string;
  providerOrderId?: string;
  trackingNumber?: string;
  proofOfService?: string;
}

// ─── Workflow Engine ──────────────────────────────────────────────────────────

export function createRFECase(userId: string, language?: Partial<LanguageContext>): RFECase {
  return {
    id: `rfe-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId,
    language: createLanguageContext(language ?? {}),
    state: 'intake',
    evidenceChecklist: [],
    confirmations: [],
    approved: false,
    auditLog: [{
      timestamp: new Date().toISOString(),
      action: 'case_created',
      details: `RFE case created for user ${userId}`,
    }],
  };
}

// ─── Step 1-2: Intake + Document Reading ─────────────────────────────────────

export function ingestRFEDocument(
  rfeCase: RFECase,
  du: DocumentUnderstanding,
  narrative?: string,
  rawText?: string,
): { case: RFECase; result: RFEWorkflowStepResult } {
  if (du.noticeType !== 'RFE' && du.noticeType !== 'request_for_evidence') {
    // Check if it looks like an RFE
    const isRFE = /request for evidence|rfe/i.test(du.plainLanguageSummary);
    if (!isRFE) {
      return {
        case: rfeCase,
        result: {
          state: 'intake',
          success: false,
          blockingReason: 'This document does not appear to be a Request for Evidence.',
          userMessage: 'This doesn\'t look like a USCIS Request for Evidence. If you received a different type of notice, I can still help — just tell me what happened.',
          userMessageEs: 'Esto no parece ser una Solicitud de Evidencia de USCIS. Si recibió un tipo diferente de notificación, aún puedo ayudar — solo dígame qué pasó.',
        },
      };
    }
  }

  const analysis = analyzeRFE(du, rawText);
  const reasoning = reasonAboutCase({
    case: { id: rfeCase.id, facts: [], deadlines: [], documents: [] },
    documentUnderstandings: [du],
    narrative: narrative ?? 'I received a request for evidence.',
    language: rfeCase.language,
    userIsUnsure: !narrative,
  });

  const updatedCase: RFECase = {
    ...rfeCase,
    state: 'explained',
    rfeAnalysis: analysis,
    documentUnderstanding: du,
    reasoning,
    evidenceChecklist: analysis.requestedItems.map(item => ({ ...item, status: 'unsure' as EvidenceItemStatus })),
    updatedAt: new Date().toISOString(),
    auditLog: [
      ...rfeCase.auditLog,
      { timestamp: new Date().toISOString(), action: 'document_ingested', details: `RFE document analyzed. ${analysis.requestedItems.length} items requested.` },
    ],
  };

  return {
    case: updatedCase,
    result: {
      state: 'explained',
      success: true,
      userMessage: analysis.summaryEn,
      userMessageEs: analysis.summaryEs,
    },
  };
}

// ─── Step 4: Confirm ──────────────────────────────────────────────────────────

export function confirmRFEFacts(
  rfeCase: RFECase,
  confirmations: { question: string; answer: string }[],
): { case: RFECase; result: RFEWorkflowStepResult } {
  const updatedCase: RFECase = {
    ...rfeCase,
    state: 'confirmed',
    confirmations: [...rfeCase.confirmations, ...confirmations],
    updatedAt: new Date().toISOString(),
    auditLog: [
      ...rfeCase.auditLog,
      { timestamp: new Date().toISOString(), action: 'facts_confirmed', details: `${confirmations.length} confirmation(s) recorded.` },
    ],
  };

  return {
    case: updatedCase,
    result: {
      state: 'confirmed',
      success: true,
      userMessage: 'Thanks. I\'ve recorded your answers.',
      userMessageEs: 'Gracias. He registrado sus respuestas.',
    },
  };
}

// ─── Step 5: Update Evidence Checklist ────────────────────────────────────────

export function updateEvidenceChecklist(
  rfeCase: RFECase,
  updates: { itemId: string; status: EvidenceItemStatus; documentIds?: string[] }[],
): { case: RFECase; result: RFEWorkflowStepResult } {
  const checklist = rfeCase.evidenceChecklist.map(item => {
    const update = updates.find(u => u.itemId === item.id);
    if (update) {
      return {
        ...item,
        status: update.status,
        uploadedDocumentIds: update.status === 'uploaded'
          ? (update.documentIds ?? item.uploadedDocumentIds)
          : update.documentIds !== undefined
            ? update.documentIds
            : (update.status === 'dont_have_it' || update.status === 'not_applicable' || update.status === 'have_it'
              ? []
              : item.uploadedDocumentIds),
      };
    }
    return item;
  });

  return {
    case: {
      ...rfeCase,
      state: 'evidence_checklist',
      evidenceChecklist: checklist,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'evidence_checklist_updated', details: `${updates.length} item(s) updated.` },
      ],
    },
    result: {
      state: 'evidence_checklist',
      success: true,
      userMessage: 'Your evidence checklist has been updated.',
      userMessageEs: 'Su lista de verificación de evidencia ha sido actualizada.',
    },
  };
}

// ─── Step 6: Analyze Evidence ────────────────────────────────────────────────

export function runEvidenceAnalysis(
  rfeCase: RFECase,
  allDocumentUnderstandings: DocumentUnderstanding[],
  userFacts: { key: string; value: string; source: { documentId: string; confidence: number }; verified: boolean }[] = [],
  requiredEvidence: string[] = [],
): { case: RFECase; result: RFEWorkflowStepResult } {
  const evidence = analyzeEvidence({
    understandings: allDocumentUnderstandings,
    userFacts,
    requiredEvidence,
  });

  return {
    case: {
      ...rfeCase,
      state: 'evidence_analyzed',
      evidence,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'evidence_analyzed', details: `Sufficiency: ${evidence.sufficiency}. ${evidence.conflicts.length} conflict(s).` },
      ],
    },
    result: {
      state: 'evidence_analyzed',
      success: true,
      userMessage: evidence.userFacingSummary,
    },
  };
}

// ─── Step 7: Verify Authority ────────────────────────────────────────────────

export function verifyAuthority(
  rfeCase: RFECase,
  authorities: Parameters<typeof resolveAuthority>[0]['authorities'],
  caseAgency: string,
  caseJurisdiction: string,
): { case: RFECase; result: RFEWorkflowStepResult } {
  if (!rfeCase.reasoning) {
    return {
      case: rfeCase,
      result: {
        state: 'evidence_analyzed',
        success: false,
        blockingReason: 'No reasoning available to verify authority against.',
        userMessage: 'I need to analyze your case before checking authority.',
      },
    };
  }

  const reconciled = resolveAuthority({
    reasoning: rfeCase.reasoning,
    authorities,
    caseAgency,
    caseJurisdiction,
  });

  return {
    case: {
      ...rfeCase,
      state: 'authority_verified',
      reconciledReasoning: reconciled,
      authorityFindings: reconciled.authorityFindings,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'authority_verified', details: `${reconciled.authorityFindings.length} finding(s). Safe: ${reconciled.safeToActUpon}.` },
      ],
    },
    result: {
      state: 'authority_verified',
      success: true,
      userMessage: reconciled.userFacingSummary,
      userMessageEs: reconciled.userFacingSummaryEs,
    },
  };
}

// ─── Step 8: Build Strategy ────────────────────────────────────────────────────

export function buildResponseStrategy(rfeCase: RFECase): { case: RFECase; result: RFEWorkflowStepResult } {
  const analysis = rfeCase.rfeAnalysis;
  const evidence = rfeCase.evidence;

  if (!analysis) {
    return {
      case: rfeCase,
      result: { state: 'authority_verified', success: false, blockingReason: 'No RFE analysis available.', userMessage: 'I need to analyze your RFE first.' },
    };
  }

  const steps: RFEResponseStep[] = [];
  let stepOrder = 1;

  // For each requested item, create a response step
  for (const item of rfeCase.evidenceChecklist) {
    const confidence: RFEResponseStep['confidence'] =
      item.status === 'have_it' || item.status === 'uploaded' ? 'confirmed' :
      item.status === 'dont_have_it' || item.status === 'not_applicable' ? 'needs_review' :
      'uncertain';

    const category: RFEResponseStep['category'] = item.status === 'have_it' || item.status === 'uploaded'
      ? 'provide_evidence'
      : 'address_requested_item';

    steps.push({
      order: stepOrder++,
      description: `Respond to USCIS request: "${item.description}" — ${item.status === 'have_it' || item.status === 'uploaded' ? 'evidence available' : 'needs attention'}`,
      descriptionEs: `Responder a USCIS: "${item.descriptionEs ?? item.description}" — ${item.status === 'have_it' || item.status === 'uploaded' ? 'evidencia disponible' : 'necesita atención'}`,
      category,
      confidence,
    });
  }

  // Add evidence conflict resolution if needed
  if (evidence && evidence.conflicts.length > 0) {
    for (const conflict of evidence.conflicts) {
      steps.push({
        order: stepOrder++,
        description: `Resolve discrepancy: ${conflict.resolution}`,
        category: 'explain_discrepancy',
        confidence: 'needs_review',
      });
    }
  }

  const confirmedItems = steps.filter(s => s.confidence === 'confirmed').map(s => s.description);
  const uncertainItems = steps.filter(s => s.confidence === 'uncertain').map(s => s.description);
  const needsReviewItems = steps.filter(s => s.confidence === 'needs_review').map(s => s.description);

  const strategy: RFEResponseStrategy = {
    steps,
    confirmedItems,
    uncertainItems,
    needsReviewItems,
    userFacingSummary: `Here's the plan: ${confirmedItems.length} item(s) confirmed, ${uncertainItems.length} need clarification, ${needsReviewItems.length} need review.`,
    userFacingSummaryEs: `Aquí está el plan: ${confirmedItems.length} elemento(s) confirmado(s), ${uncertainItems.length} necesitan aclaración, ${needsReviewItems.length} necesitan revisión.`,
  };

  return {
    case: {
      ...rfeCase,
      state: 'strategy_built',
      strategy,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'strategy_built', details: `${steps.length} strategy step(s).` },
      ],
    },
    result: {
      state: 'strategy_built',
      success: true,
      userMessage: strategy.userFacingSummary,
      userMessageEs: strategy.userFacingSummaryEs,
    },
  };
}

// ─── Step 9: Generate Drafts ─────────────────────────────────────────────────

export function generateDrafts(rfeCase: RFECase): { case: RFECase; result: RFEWorkflowStepResult } {
  const analysis = rfeCase.rfeAnalysis;
  if (!analysis) {
    return {
      case: rfeCase,
      result: { state: 'strategy_built', success: false, blockingReason: 'No RFE analysis available.', userMessage: 'I need to analyze your RFE first.' },
    };
  }

  const receiptNum = analysis.identifiers.receiptNumber ? ` (Receipt: ${analysis.identifiers.receiptNumber})` : '';
  const formType = analysis.identifiers.formType !== 'generic' && analysis.identifiers.formType !== 'unknown'
    ? ` regarding your ${analysis.identifiers.formType} application` : '';

  const coverLetter = generateCoverLetter(rfeCase, analysis, receiptNum, formType);
  const responseLetter = generateResponseLetter(rfeCase, analysis, receiptNum, formType);
  const evidenceIndex = generateEvidenceIndex(rfeCase);
  const documentOrder = evidenceIndex.map(e => e.documentIds).flat();

  const drafts: RFEDrafts = {
    responseLetter,
    coverLetter,
    evidenceIndex,
    documentOrder,
    userFacingSummary: 'I\'ve prepared a response letter, cover letter, and evidence index for your review.',
  };

  return {
    case: {
      ...rfeCase,
      state: 'drafted',
      drafts,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'drafts_generated', details: 'Response letter, cover letter, evidence index.' },
      ],
    },
    result: {
      state: 'drafted',
      success: true,
      userMessage: drafts.userFacingSummary,
    },
  };
}

function generateCoverLetter(rfeCase: RFECase, analysis: RFEAnalysis, receiptNum: string, formType: string): string {
  const items = rfeCase.evidenceChecklist.filter(i => i.status === 'have_it' || i.status === 'uploaded');
  const itemList = items.map((item, idx) => `${idx + 1}. ${item.description}`).join('\n');

  return `Dear U.S. Citizenship and Immigration Services,

I am writing in response to the Request for Evidence${formType} received${receiptNum}. Please find enclosed the following documents in support of my case:

${itemList || '[No evidence items have been confirmed yet. Please upload or confirm your evidence.]'}

I respectfully request that the agency consider the enclosed materials in support of my application. If any additional information is needed, please do not hesitate to contact me.

Respectfully submitted,

[Your Name]
[Your Address]
[Your Phone Number]
[Your Email]`;
}

function generateResponseLetter(rfeCase: RFECase, analysis: RFEAnalysis, receiptNum: string, formType: string): string {
  const items = rfeCase.evidenceChecklist;
  const itemResponses = items.map(item => {
    if (item.status === 'have_it' || item.status === 'uploaded') {
      return `Regarding your request for "${item.description}": Please find the requested document(s) enclosed.`;
    } else if (item.status === 'dont_have_it') {
      return `Regarding your request for "${item.description}": I am unable to provide this document at this time. [Please explain the circumstances.]`;
    } else if (item.status === 'not_applicable') {
      return `Regarding your request for "${item.description}": This item does not apply to my case.`;
    } else {
      return `Regarding your request for "${item.description}": [This item needs attention before submitting.]`;
    }
  }).join('\n\n');

  const deadline = analysis.deadline ? ` I am submitting this response prior to the response deadline of ${analysis.deadline.date}.` : '';

  return `RE: Response to Request for Evidence${formType}${receiptNum}

Dear U.S. Citizenship and Immigration Services,

I am submitting this response to the Request for Evidence${formType} issued by your office.${deadline}

${itemResponses}

I respectfully request that the agency review the enclosed materials and continue processing my application. Thank you for your consideration.

Respectfully submitted,

[Your Name]`;
}

function generateEvidenceIndex(rfeCase: RFECase): { item: string; description: string; documentIds: string[] }[] {
  return rfeCase.evidenceChecklist
    .filter(i => i.status === 'have_it' || i.status === 'uploaded')
    .map(item => ({
      item: item.id,
      description: item.description,
      documentIds: item.uploadedDocumentIds,
    }));
}

// ─── Step 10: X-Ray ────────────────────────────────────────────────────────────

export function runRFEXRay(rfeCase: RFECase): { case: RFECase; result: RFEWorkflowStepResult } {
  if (!rfeCase.reconciledReasoning) {
    // Fall back to regular reasoning
    if (!rfeCase.reasoning) {
      return {
        case: rfeCase,
        result: { state: 'drafted', success: false, blockingReason: 'No reasoning available for X-Ray.', userMessage: 'I need to analyze your case before running X-Ray.' },
      };
    }
  }

  const reasoning = rfeCase.reconciledReasoning ?? rfeCase.reasoning!;
  const xray = runXRay({
    reasoning,
    authorityFindings: rfeCase.authorityFindings,
    evidence: rfeCase.evidence,
  });

  // ── Extraction completeness safety net ──────────────────────────────────────
  // If the notice contained an itemized list of N items but fewer were extracted,
  // block mailing and require human review. This catches silent under-extraction
  // before a response packet goes out to USCIS.
  const du = rfeCase.documentUnderstanding;
  const rfeAnalysis = rfeCase.rfeAnalysis;
  const listItemsCount = du?.listItems?.length ?? 0;
  const extractedItemsCount = rfeCase.evidenceChecklist.length;
  const extractionConfidence = rfeAnalysis?.extractionConfidence ?? 'high';

  let blockedByExtraction = false;
  let extractionBlockReason = '';

  if (listItemsCount > 0 && extractedItemsCount < listItemsCount) {
    blockedByExtraction = true;
    extractionBlockReason = `Extraction may be incomplete: the notice contains ${listItemsCount} itemized list item(s) but only ${extractedItemsCount} evidence item(s) were extracted. Please review the notice manually before proceeding.`;
  } else if (extractionConfidence === 'low') {
    blockedByExtraction = true;
    extractionBlockReason = `Extraction confidence is LOW. ${rfeAnalysis?.detectedListItemsCount ?? 0} list item(s) detected, ${extractedItemsCount} item(s) extracted. Please review the notice manually before proceeding.`;
  }

  if (blockedByExtraction) {
    const augmentedXray: XRayResult = {
      ...xray,
      overallVerdict: 'BLOCK' as XRayVerdict,
      safeToActUpon: false,
      requiresHumanReview: [...xray.requiresHumanReview, extractionBlockReason],
      userFacingSummary: `I found a potential extraction problem. ${extractionBlockReason}`,
    };
    return {
      case: {
        ...rfeCase,
        state: 'blocked',
        xray: augmentedXray,
        updatedAt: new Date().toISOString(),
        auditLog: [
          ...rfeCase.auditLog,
          { timestamp: new Date().toISOString(), action: 'xray_blocked', details: `Extraction completeness check: ${listItemsCount} list items vs ${extractedItemsCount} extracted. ${extractionBlockReason}` },
        ],
      },
      result: {
        state: 'blocked',
        success: false,
        blockingReason: extractionBlockReason,
        userMessage: `I found a potential problem: ${extractionBlockReason}`,
      },
    };
  }

  const newState: RFEWorkflowState = xray.safeToActUpon ? 'xray_complete' : 'blocked';

  return {
    case: {
      ...rfeCase,
      state: newState,
      xray,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'xray_complete', details: `Verdict: ${xray.overallVerdict}. Safe: ${xray.safeToActUpon}.` },
      ],
    },
    result: {
      state: newState,
      success: xray.safeToActUpon,
      blockingReason: xray.safeToActUpon ? undefined : xray.requiresHumanReview.join(' '),
      userMessage: xray.userFacingSummary,
    },
  };
}

// ─── Step 12: Explicit Approval ────────────────────────────────────────────────

export function approveRFE(rfeCase: RFECase): { case: RFECase; result: RFEWorkflowStepResult } {
  // Must be in user_review or xray_complete state
  if (rfeCase.state !== 'user_review' && rfeCase.state !== 'xray_complete') {
    return {
      case: rfeCase,
      result: { state: rfeCase.state, success: false, blockingReason: 'Cannot approve from current state.', userMessage: 'You need to review the drafts before approving.' },
    };
  }

  // Must have X-Ray that passed
  if (!rfeCase.xray || !rfeCase.xray.safeToActUpon) {
    return {
      case: rfeCase,
      result: { state: rfeCase.state, success: false, blockingReason: 'X-Ray has not cleared this case.', userMessage: 'I found issues that need to be resolved before you can approve.' },
    };
  }

  const timestamp = new Date().toISOString();
  return {
    case: {
      ...rfeCase,
      state: 'approved',
      approved: true,
      approvalTimestamp: timestamp,
      updatedAt: timestamp,
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp, action: 'approved', details: 'User explicitly approved the response.' },
      ],
    },
    result: {
      state: 'approved',
      success: true,
      userMessage: 'You\'ve approved the response. Ready to proceed to checkout.',
      userMessageEs: 'Ha aprobado la respuesta. Listo para proceder al pago.',
    },
  };
}

// ─── Step 13: Checkout ──────────────────────────────────────────────────────────

export function setPricing(rfeCase: RFECase, pricing: RFEPricing): { case: RFECase; result: RFEWorkflowStepResult } {
  if (!rfeCase.approved) {
    return {
      case: rfeCase,
      result: { state: rfeCase.state, success: false, blockingReason: 'Not approved.', userMessage: 'You need to approve the response before checkout.' },
    };
  }

  return {
    case: {
      ...rfeCase,
      state: 'checkout_pending',
      pricing,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'pricing_set', details: `Total: ${pricing.total} ${pricing.currency}` },
      ],
    },
    result: {
      state: 'checkout_pending',
      success: true,
      userMessage: `Total: ${pricing.total} ${pricing.currency}. Ready for payment.`,
    },
  };
}

export function confirmPayment(rfeCase: RFECase, paymentConfirmed: boolean): { case: RFECase; result: RFEWorkflowStepResult } {
  if (!rfeCase.approved) {
    return {
      case: rfeCase,
      result: { state: rfeCase.state, success: false, blockingReason: 'Not approved.', userMessage: 'Cannot process payment without approval.' },
    };
  }

  if (!paymentConfirmed) {
    return {
      case: {
        ...rfeCase,
        state: 'checkout_pending',
        auditLog: [...rfeCase.auditLog, { timestamp: new Date().toISOString(), action: 'payment_failed', details: 'Payment was not confirmed.' }],
      },
      result: { state: 'checkout_pending', success: false, blockingReason: 'Payment not confirmed.', userMessage: 'Payment was not completed. Please try again.' },
    };
  }

  return {
    case: {
      ...rfeCase,
      state: 'paid',
      updatedAt: new Date().toISOString(),
      auditLog: [...rfeCase.auditLog, { timestamp: new Date().toISOString(), action: 'payment_confirmed', details: 'Payment confirmed.' }],
    },
    result: { state: 'paid', success: true, userMessage: 'Payment confirmed. Preparing your mailing.' },
  };
}

// ─── Step 14: Fulfillment (MailMyPDF) ──────────────────────────────────────────

export function submitToFulfillment(
  rfeCase: RFECase,
  recipient: RFEFulfillment['recipient'],
  idempotencyKey: string,
): { case: RFECase; result: RFEWorkflowStepResult } {
  // All gates must be satisfied
  if (!rfeCase.approved) {
    return { case: rfeCase, result: { state: rfeCase.state, success: false, blockingReason: 'Not approved.', userMessage: 'Cannot submit without approval.' } };
  }
  if (rfeCase.state !== 'paid') {
    return { case: rfeCase, result: { state: rfeCase.state, success: false, blockingReason: 'Not paid.', userMessage: 'Cannot submit without payment.' } };
  }
  if (!rfeCase.drafts) {
    return { case: rfeCase, result: { state: rfeCase.state, success: false, blockingReason: 'No drafts.', userMessage: 'Cannot submit without drafts.' } };
  }

  // Check idempotency
  if (rfeCase.fulfillment && rfeCase.fulfillment.idempotencyKey === idempotencyKey && rfeCase.fulfillment.status === 'submitted') {
    // Idempotent — return existing order
    return {
      case: rfeCase,
      result: { state: 'fulfilled', success: true, userMessage: `This mailing was already submitted. Order: ${rfeCase.fulfillment.providerOrderId}` },
    };
  }

  // Check for duplicate submission with different key
  if (rfeCase.fulfillment && rfeCase.fulfillment.status === 'submitted') {
    return {
      case: rfeCase,
      result: { state: rfeCase.state, success: false, blockingReason: 'Duplicate submission.', userMessage: 'This case has already been submitted for mailing. To prevent duplicate mailings, I cannot submit again.' },
    };
  }

  // Create fulfillment
  const orderId = `mailmypdf-${Date.now()}`;
  const fulfillment: RFEFulfillment = {
    idempotencyKey,
    providerOrderId: orderId,
    status: 'submitted',
    recipient,
    submittedAt: new Date().toISOString(),
  };

  return {
    case: {
      ...rfeCase,
      state: 'fulfilled',
      fulfillment,
      updatedAt: new Date().toISOString(),
      auditLog: [...rfeCase.auditLog, { timestamp: new Date().toISOString(), action: 'fulfillment_submitted', details: `Order: ${orderId}` }],
    },
    result: { state: 'fulfilled', success: true, userMessage: `Your response has been submitted for mailing. Order: ${orderId}` },
  };
}

// ─── Step 15: Tracking ──────────────────────────────────────────────────────────

export function updateTracking(
  rfeCase: RFECase,
  tracking: RFETracking,
): { case: RFECase; result: RFEWorkflowStepResult } {
  if (!rfeCase.fulfillment || rfeCase.fulfillment.status !== 'submitted') {
    return { case: rfeCase, result: { state: rfeCase.state, success: false, blockingReason: 'No fulfillment.', userMessage: 'Cannot track without a submitted mailing.' } };
  }

  return {
    case: {
      ...rfeCase,
      state: 'tracking',
      tracking,
      updatedAt: new Date().toISOString(),
      auditLog: [...rfeCase.auditLog, { timestamp: new Date().toISOString(), action: 'tracking_updated', details: `Status: ${tracking.status}` }],
    },
    result: { state: 'tracking', success: true, userMessage: `Mailing status: ${tracking.status}. Tracking: ${tracking.trackingNumber ?? 'pending'}` },
  };
}

// ─── Step 16: Proof ────────────────────────────────────────────────────────────

export function generateProof(rfeCase: RFECase, documents: { filename: string; content: string; pages: number }[]): { case: RFECase; result: RFEWorkflowStepResult } {
  if (!rfeCase.fulfillment) {
    return { case: rfeCase, result: { state: rfeCase.state, success: false, blockingReason: 'No fulfillment.', userMessage: 'Cannot generate proof without a mailing.' } };
  }

  // Generate packet hash (simple hash for demo)
  const manifest = documents.map(d => ({
    filename: d.filename,
    hash: simpleHash(d.content),
    pages: d.pages,
  }));

  const packetContent = JSON.stringify(manifest) + rfeCase.fulfillment.providerOrderId + rfeCase.approvalTimestamp;
  const packetHash = simpleHash(packetContent);

  const proof: RFEProof = {
    packetHash,
    documentManifest: manifest,
    timestamp: new Date().toISOString(),
    providerOrderId: rfeCase.fulfillment.providerOrderId,
    trackingNumber: rfeCase.tracking?.trackingNumber,
  };

  return {
    case: {
      ...rfeCase,
      state: 'complete',
      proof,
      updatedAt: new Date().toISOString(),
      auditLog: [...rfeCase.auditLog, { timestamp: new Date().toISOString(), action: 'proof_generated', details: `Packet hash: ${packetHash}` }],
    },
    result: { state: 'complete', success: true, userMessage: 'Your case is complete. Proof of mailing has been preserved.' },
  };
}

function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ─── Step 11: Move to User Review ──────────────────────────────────────────────

export function moveToUserReview(rfeCase: RFECase): { case: RFECase; result: RFEWorkflowStepResult } {
  if (rfeCase.state !== 'xray_complete') {
    return { case: rfeCase, result: { state: rfeCase.state, success: false, blockingReason: 'X-Ray not complete.', userMessage: 'X-Ray review must complete before user review.' } };
  }

  if (!rfeCase.drafts) {
    return { case: rfeCase, result: { state: rfeCase.state, success: false, blockingReason: 'No drafts.', userMessage: 'Drafts must be generated before review.' } };
  }

  return {
    case: {
      ...rfeCase,
      state: 'user_review',
      updatedAt: new Date().toISOString(),
      auditLog: [...rfeCase.auditLog, { timestamp: new Date().toISOString(), action: 'user_review_started', details: 'User reviewing drafts.' }],
    },
    result: { state: 'user_review', success: true, userMessage: 'Here\'s what we\'re proposing to send. Please review everything carefully.' },
  };
}

// ─── Multi-LLM AI Enhancement Layer ──────────────────────────────────────────
//
// These async functions add AI-powered enhancements to the deterministic
// workflow steps. They are OPTIONAL — the workflow works perfectly without
// them. When called, they enrich the user experience with AI insights.
//
// AI NEVER bypasses deterministic gates. AI output is validated and
// non-blocking. The deterministic state machine is always the source of truth.

import type {
  AIExplanationEnhancement,
  AIStrategyEnhancement,
  AIDraftEnhancement,
  AIXRayEnhancement,
} from './ai-workflow-enhancer';

export interface RFEAIEnhancements {
  documentExplanation?: AIExplanationEnhancement;
  strategy?: AIStrategyEnhancement;
  draft?: AIDraftEnhancement;
  xray?: AIXRayEnhancement;
}

// ── Async: Enhance Document Understanding ────────────────────────────────────

export async function enhanceRFEUnderstanding(
  rfeCase: RFECase,
  rawDocumentText: string,
): Promise<RFECase> {
  if (!rfeCase.documentUnderstanding) return rfeCase;

  try {
    const { enhanceDocumentUnderstanding } = await import('./ai-workflow-enhancer');
    const enhancement = await enhanceDocumentUnderstanding(
      rawDocumentText,
      'RFE',
      rfeCase.rfeAnalysis?.deadline,
      rfeCase.id,
    );

    return {
      ...rfeCase,
      aiEnhancements: {
        ...rfeCase.aiEnhancements,
        documentExplanation: enhancement,
      },
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'ai_explanation_enhanced', details: `Provider: ${enhancement.provider}` },
      ],
    };
  } catch {
    // AI enhancement is optional — fail silently
    return rfeCase;
  }
}

// ── Async: Enhance Strategy Generation ────────────────────────────────────────

export async function enhanceRFEStrategy(
  rfeCase: RFECase,
): Promise<RFECase> {
  if (!rfeCase.strategy) return rfeCase;

  try {
    const { enhanceStrategyGeneration } = await import('./ai-workflow-enhancer');
    const facts: Record<string, unknown> = {
      receiptNumber: rfeCase.rfeAnalysis?.identifiers?.receiptNumber,
      formType: rfeCase.rfeAnalysis?.identifiers?.formType,
      deadline: rfeCase.rfeAnalysis?.deadline,
      requestedItems: rfeCase.evidenceChecklist?.map(e => e.description) ?? [],
    };
    const evidenceItems = rfeCase.evidenceChecklist?.map(e => e.description) ?? [];

    const enhancement = await enhanceStrategyGeneration(
      'RFE',
      facts,
      evidenceItems,
      rfeCase.rfeAnalysis?.deadline,
      rfeCase.id,
    );

    return {
      ...rfeCase,
      aiEnhancements: {
        ...rfeCase.aiEnhancements,
        strategy: enhancement,
      },
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'ai_strategy_enhanced', details: `Provider: ${enhancement.provider}` },
      ],
    };
  } catch {
    return rfeCase;
  }
}

// ── Async: Enhance Draft Generation ───────────────────────────────────────────

export async function enhanceRFEDraft(
  rfeCase: RFECase,
): Promise<RFECase> {
  if (!rfeCase.drafts || !rfeCase.rfeAnalysis) return rfeCase;

  try {
    const { enhanceDraftGeneration } = await import('./ai-workflow-enhancer');
    const facts: Record<string, unknown> = {
      receiptNumber: rfeCase.rfeAnalysis.identifiers?.receiptNumber,
      formType: rfeCase.rfeAnalysis.identifiers?.formType,
      deadline: rfeCase.rfeAnalysis?.deadline,
    };
    const evidenceItems = rfeCase.evidenceChecklist
      ?.filter(e => e.status === 'have_it' || e.status === 'uploaded')
      .map(e => e.description) ?? [];

    const enhancement = await enhanceDraftGeneration(
      'RFE',
      rfeCase.rfeAnalysis.identifiers?.receiptNumber || 'N/A',
      facts,
      evidenceItems,
      rfeCase.strategy?.recommendedApproach || rfeCase.drafts.userFacingSummary,
      rfeCase.id,
    );

    return {
      ...rfeCase,
      aiEnhancements: {
        ...rfeCase.aiEnhancements,
        draft: enhancement,
      },
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'ai_draft_enhanced', details: `Provider: ${enhancement.provider}` },
      ],
    };
  } catch {
    return rfeCase;
  }
}

// ── Async: Enhance X-Ray Review ───────────────────────────────────────────────

export async function enhanceRFEXRay(
  rfeCase: RFECase,
): Promise<RFECase> {
  if (!rfeCase.drafts || !rfeCase.xray) return rfeCase;

  try {
    const { enhanceXRayReview } = await import('./ai-workflow-enhancer');
    const facts: Record<string, unknown> = {
      receiptNumber: rfeCase.rfeAnalysis?.identifiers?.receiptNumber,
      formType: rfeCase.rfeAnalysis?.identifiers?.formType,
    };
    const evidenceItems = rfeCase.evidenceChecklist?.map(e => e.description) ?? [];

    const enhancement = await enhanceXRayReview(
      rfeCase.drafts.responseLetter,
      facts,
      evidenceItems,
      rfeCase.id,
    );

    return {
      ...rfeCase,
      aiEnhancements: {
        ...rfeCase.aiEnhancements,
        xray: enhancement,
      },
      auditLog: [
        ...rfeCase.auditLog,
        { timestamp: new Date().toISOString(), action: 'ai_xray_enhanced', details: `Provider: ${enhancement.provider}, Severity: ${enhancement.severity}` },
      ],
    };
  } catch {
    return rfeCase;
  }
}

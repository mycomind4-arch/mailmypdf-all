/**
 * Consular Processing Workflow Engine
 *
 * State machine:
 *   intake -> analyzed -> classified -> strategy_built -> drafted -> validated ->
 *   xray_complete -> user_review -> approved -> paid -> fulfilled -> tracked -> proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional NVC/embassy notice upload)
 *   - Authority (INA 222, 9 FAM, 22 CFR 42)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - Visa Refusal: handles the refusal/denial event specifically, not the full lifecycle
 *   - I-130 Response: handles RFE/NOID for the petition, not the consular processing stage
 *   - Case Inquiry: general case status, not NVC/embassy-specific
 *   - Naturalization: domestic USCIS process, not consular/embassy
 *   - I-797 routing: this is the action layer for NVC/embassy correspondence
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeConsular,
  buildConsularStrategy,
  type ConsularAnalysis,
  type ConsularStrategy,
  type ConsularEventType,
  type ConsularUrgency,
  type NVCStage,
  type VisaCategory,
  type DocumentType,
} from './consular-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type ConsularState =
  | 'intake'
  | 'analyzed'
  | 'classified'
  | 'strategy_built'
  | 'drafted'
  | 'validated'
  | 'xray_complete'
  | 'user_review'
  | 'approved'
  | 'paid'
  | 'fulfilled'
  | 'tracked'
  | 'proven';

export const CONSULAR_STATES: ConsularState[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface ConsularContext {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  formType?: string;
  nvcCaseNumber?: string;
  interviewDate?: string;
  visaExpirationDate?: string;
  analysis?: ConsularAnalysis;
  strategy?: ConsularStrategy;
  draft?: string;
  validationIssues: string[];
  xrayIssues: string[];
  approved: boolean;
  paid: boolean;
  fulfillmentId?: string;
  trackingNumber?: string;
  proofId?: string;
  auditTrail: { timestamp: string; event: string; detail?: string }[];
}

export function createConsularContext(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): ConsularContext {
  return {
    caseId,
    ownerId,
    language: createLanguageContext({ ui: language }),
    userText: '',
    validationIssues: [],
    xrayIssues: [],
    approved: false,
    paid: false,
    auditTrail: [],
  };
}

// ─── State Transitions ───────────────────────────────────────────────────────

export function intake(ctx: ConsularContext, text: string, formType?: string, nvcCaseNumber?: string, interviewDate?: string, visaExpirationDate?: string): ConsularContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    formType,
    nvcCaseNumber,
    interviewDate,
    visaExpirationDate,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described consular processing situation' }],
  };
}

export function analyze(ctx: ConsularContext): ConsularContext {
  const analysis = analyzeConsular(ctx.userText, ctx.formType, ctx.nvcCaseNumber, ctx.interviewDate, ctx.visaExpirationDate);
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Event: ${analysis.eventType}, urgency: ${analysis.urgency}, NVC stage: ${analysis.nvcStage}` }],
  };
}

export function classify(ctx: ConsularContext): ConsularContext {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `Form: ${ctx.analysis.eventType}, NVC stage: ${ctx.analysis.nvcStage}, visa category: ${ctx.analysis.visaCategory}, risk: ${ctx.analysis.riskLevel}` }],
  };
}

export function buildStrategy(ctx: ConsularContext): ConsularContext {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildConsularStrategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach}` }],
  };
}

export function draft(ctx: ConsularContext): ConsularContext {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;

  const draftText = [
    `${s.approach}`,
    ``,
    `To: ${a.embassy ? `US Embassy/Consulate, ${a.embassy}` : 'US Embassy/Consulate'}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Immigrant Visa Application${a.nvcCaseNumber ? ` — NVC Case Number: ${a.nvcCaseNumber}` : ''}`,
    `Form Type: ${a.formType ?? 'DS-260'}`,
    a.interviewDate ? `Interview Date: ${a.interviewDate}` : '',
    a.visaExpirationDate ? `Visa Expiration Date: ${a.visaExpirationDate}` : '',
    a.priorityDate ? `Priority Date: ${a.priorityDate}` : '',
    ``,
    `Dear Consular Officer,`,
    ``,
    `I am writing regarding my immigrant visa application${a.nvcCaseNumber ? ` (NVC Case Number: ${a.nvcCaseNumber})` : ''}.`,
    ``,
    s.keyArguments.map(arg => `- ${arg}`).join('\n'),
    ``,
    `I respectfully request your assistance with this matter.`,
    ``,
    s.supportingEvidence.length > 0 ? `Supporting documentation is enclosed:\n${s.supportingEvidence.map(e => `- ${e}`).join('\n')}` : '',
    ``,
    `Thank you for your attention to this matter.`,
    ``,
    `Sincerely,`,
    `[Your Name]`,
    `[Your Contact Information]`,
    `[Your NVC Case Number, if applicable]`,
  ].filter(line => line !== '').join('\n');

  const now = new Date().toISOString();
  return {
    ...ctx,
    draft: draftText,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: 'Consular processing letter drafted' }],
  };
}

export function validate(ctx: ConsularContext): ConsularContext {
  const issues: string[] = [];

  if (!ctx.draft) throw new Error('Must draft before validating');
  if (!ctx.analysis) throw new Error('No analysis');

  if (ctx.analysis.eventType === 'nvc_processing' && !ctx.analysis.nvcCaseNumber) {
    issues.push('NVC case number not provided — recommended for efficient processing');
  }
  if (ctx.analysis.eventType === 'interview_rescheduling' && !ctx.analysis.interviewDate) {
    issues.push('Interview date not provided — needed to verify reschedule window');
  }
  if (ctx.analysis.eventType === 'missed_interview' && ctx.analysis.canReschedule === false) {
    issues.push('Missed interview with no reschedule possible — may need petition refiling');
  }
  if (ctx.analysis.eventType === 'visa_issuance_urgency' && !ctx.analysis.visaExpirationDate) {
    issues.push('Visa expiration date not provided — critical for assessing travel deadline');
  }
  if (ctx.analysis.eventType === 'document_deficiency' && ctx.analysis.documentStatus.includes('unknown')) {
    issues.push('Specific missing documents not identified — list which civil documents are needed');
  }
  if (ctx.analysis.eventType === 'priority_date_retrogression' && !ctx.analysis.priorityDate) {
    issues.push('Priority date not provided — needed to track Visa Bulletin movement');
  }
  if (ctx.analysis.eventType === 'delayed_processing' && !ctx.analysis.nvcCaseNumber) {
    issues.push('NVC case number not provided — needed for status inquiry');
  }
  if (ctx.analysis.eventType === 'medical_exam_issue' && !ctx.userText.match(/expired|expir|panel physician|ds-3025|ds-3026|vaccination|designated|approved/i)) {
    issues.push('Medical exam issue details not specific — describe whether exam expired, physician unavailable, or other problem');
  }
  if (ctx.analysis.eventType === 'interview_preparation' && ctx.analysis.embassy === undefined) {
    issues.push('Embassy/consulate location not identified — interview preparation is embassy-specific');
  }
  if (ctx.analysis.eventType === 'unknown') {
    issues.push('Consular processing event type could not be determined — may need manual review');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: ConsularContext): ConsularContext {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');

  // Adversarial review
  if (ctx.analysis.eventType === 'missed_interview' && ctx.analysis.urgency !== 'critical') {
    issues.push('Missed interview should be classified as critical urgency — consequences may include case termination');
  }
  if (ctx.analysis.eventType === 'interview_rescheduling' && ctx.analysis.daysUntilInterview !== undefined && ctx.analysis.daysUntilInterview <= 0) {
    issues.push('Reschedule request but interview date has already passed — reclassify as missed interview');
  }
  if (ctx.analysis.eventType === 'visa_issuance_urgency' && ctx.analysis.urgency === 'routine') {
    issues.push('Visa issuance urgency should not be routine — visa expiration is a hard deadline');
  }
  if (ctx.analysis.eventType === 'nvc_processing' && ctx.analysis.riskLevel !== 'low') {
    issues.push('NVC processing should be low risk — standard procedural workflow');
  }
  if (ctx.analysis.eventType === 'interview_preparation' && ctx.analysis.riskLevel !== 'low') {
    issues.push('Interview preparation should be low risk — proactive preparation, not a problem');
  }
  if (ctx.analysis.eventType === 'delayed_processing' && ctx.analysis.daysSinceInterview !== undefined && ctx.analysis.daysSinceInterview > 180 && ctx.analysis.urgency !== 'critical') {
    issues.push('Delayed processing over 180 days since interview should be critical — possible administrative processing or refusal');
  }
  if (ctx.analysis.eventType === 'priority_date_retrogression' && ctx.analysis.urgency === 'critical') {
    issues.push('Priority date retrogression should not be critical — no immediate action required, case is waiting');
  }
  if (ctx.analysis.eventType === 'medical_exam_issue' && ctx.analysis.urgency === 'routine') {
    issues.push('Medical exam issue should not be routine — expired medical can block visa issuance');
  }
  if (ctx.analysis.eventType === 'document_deficiency' && ctx.analysis.urgency === 'critical') {
    issues.push('Document deficiency should not be critical — not an emergency, but should be time_sensitive');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY', detail: issues.length === 0 ? 'X-Ray passed' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: ConsularContext): ConsularContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: 'User reviewed the draft' }],
  };
}

export function approve(ctx: ConsularContext): ConsularContext {
  if (!ctx.draft) throw new Error('Must draft before approval');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved: true,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'APPROVED', detail: 'User approved the draft for mailing' }],
  };
}

export function pay(ctx: ConsularContext): ConsularContext {
  if (!ctx.approved) throw new Error('Must approve before payment');
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: true,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: 'Payment completed via Stripe' }],
  };
}

export function fulfill(ctx: ConsularContext, fulfillmentId: string): ConsularContext {
  if (!ctx.paid) throw new Error('Must pay before fulfillment');
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: ConsularContext, trackingNumber: string): ConsularContext {
  if (!ctx.fulfillmentId) throw new Error('Must fulfill before tracking');
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking number: ${trackingNumber}` }],
  };
}

export function prove(ctx: ConsularContext, proofId: string): ConsularContext {
  if (!ctx.trackingNumber) throw new Error('Must track before proof');
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

export function runFullConsular(
  caseId: string,
  ownerId: string,
  userText: string,
  formType?: string,
  nvcCaseNumber?: string,
  interviewDate?: string,
  visaExpirationDate?: string,
): ConsularContext {
  let ctx = createConsularContext(caseId, ownerId);
  ctx = intake(ctx, userText, formType, nvcCaseNumber, interviewDate, visaExpirationDate);
  ctx = analyze(ctx);
  ctx = classify(ctx);
  ctx = buildStrategy(ctx);
  ctx = draft(ctx);
  ctx = validate(ctx);
  ctx = xray(ctx);
  ctx = userReview(ctx);
  ctx = approve(ctx);
  ctx = pay(ctx);
  ctx = fulfill(ctx, `fulfill-${caseId}`);
  ctx = track(ctx, `track-${caseId}`);
  ctx = prove(ctx, `proof-${caseId}`);
  return ctx;
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

export function processConsularIdempotent(
  caseId: string,
  ownerId: string,
  userText: string,
  existingContext?: ConsularContext,
  formType?: string,
  nvcCaseNumber?: string,
  interviewDate?: string,
  visaExpirationDate?: string,
): ConsularContext {
  if (existingContext && existingContext.caseId === caseId && existingContext.proofId) {
    return existingContext;
  }
  return runFullConsular(caseId, ownerId, userText, formType, nvcCaseNumber, interviewDate, visaExpirationDate);
}

// ─── Owner Isolation ──────────────────────────────────────────────────────────

export function assertOwnerIsolation(ctx: ConsularContext, requestingUserId: string): void {
  if (ctx.ownerId !== requestingUserId) {
    throw new Error(`Owner isolation violation: case ${ctx.caseId} belongs to ${ctx.ownerId}, not ${requestingUserId}`);
  }
}

// ─── Failure/Retry ────────────────────────────────────────────────────────────

export function retryFromStage(ctx: ConsularContext, stage: ConsularState, text?: string): ConsularContext {
  const now = new Date().toISOString();
  let updated = { ...ctx, auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'RETRY', detail: `Retrying from stage: ${stage}` }] };

  if (text) {
    updated.userText = text;
    updated = intake(updated, text, updated.formType, updated.nvcCaseNumber, updated.interviewDate, updated.visaExpirationDate);
  }

  switch (stage) {
    case 'analyzed':
      return analyze(updated);
    case 'classified':
      return classify(analyze(updated));
    case 'strategy_built':
      return buildStrategy(classify(analyze(updated)));
    case 'drafted':
      return draft(buildStrategy(classify(analyze(updated))));
    case 'validated':
      return validate(draft(buildStrategy(classify(analyze(updated)))));
    case 'xray_complete':
      return xray(validate(draft(buildStrategy(classify(analyze(updated))))));
    default:
      return runFullConsular(updated.caseId, updated.ownerId, updated.userText, updated.formType, updated.nvcCaseNumber, updated.interviewDate, updated.visaExpirationDate);
  }
}

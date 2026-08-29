/**
 * I-751 Removal of Conditions Workflow Engine
 *
 * State machine:
 *   intake -> analyzed -> classified -> strategy_built -> drafted -> validated ->
 *   xray_complete -> user_review -> approved -> paid -> fulfilled -> tracked -> proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional I-797/notice upload)
 *   - Authority (INA 216, 8 CFR 216)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - I-130 Response: handles RFE/NOID for the initial petition, not removal of conditions
 *   - RFE/NOID: handles individual evidence requests, not the full I-751 lifecycle
 *   - Naturalization: domestic N-400 process, not conditional residence removal
 *   - Case Inquiry: general case status, not I-751-specific filing/interview lifecycle
 *   - Biometrics: ASC appointment scheduling, not I-751 field office interview
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeI751,
  buildI751Strategy,
  type I751Analysis,
  type I751Strategy,
  type I751EventType,
  type I751Urgency,
  type I751FilingType,
  type I751WaiverGround,
  type I751FilingStatus,
  type I751EvidenceType,
  type FilingWindowStatus,
} from './i751-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type I751State =
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

export const I751_STATES: I751State[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface I751Context {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  formType?: string;
  receiptNumber?: string;
  conditionalResidenceExpiryDate?: string;
  interviewDate?: string;
  analysis?: I751Analysis;
  strategy?: I751Strategy;
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

export function createI751Context(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): I751Context {
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

export function intake(
  ctx: I751Context,
  text: string,
  formType?: string,
  receiptNumber?: string,
  conditionalResidenceExpiryDate?: string,
  interviewDate?: string,
): I751Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    formType,
    receiptNumber,
    conditionalResidenceExpiryDate,
    interviewDate,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described I-751 removal of conditions situation' }],
  };
}

export function analyze(ctx: I751Context): I751Context {
  const analysis = analyzeI751(
    ctx.userText,
    ctx.formType,
    ctx.receiptNumber,
    ctx.conditionalResidenceExpiryDate,
    ctx.interviewDate,
  );
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Event: ${analysis.eventType}, urgency: ${analysis.urgency}, filing type: ${analysis.filingType}, filing status: ${analysis.filingStatus}` }],
  };
}

export function classify(ctx: I751Context): I751Context {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `Event: ${ctx.analysis.eventType}, filing type: ${ctx.analysis.filingType}, filing status: ${ctx.analysis.filingStatus}, risk: ${ctx.analysis.riskLevel}` }],
  };
}

export function buildStrategy(ctx: I751Context): I751Context {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildI751Strategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach}` }],
  };
}

export function draft(ctx: I751Context): I751Context {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;

  const draftText = [
    `${s.approach}`,
    ``,
    `To: USCIS California Service Center (or applicable USCIS lockbox)`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Form I-751 Petition to Remove Conditions on Residence${a.receiptNumber ? ` — Receipt Number: ${a.receiptNumber}` : ''}`,
    `Form Type: ${a.formType}`,
    a.conditionalResidenceExpiryDate ? `Conditional Residence Expiry Date: ${a.conditionalResidenceExpiryDate}` : '',
    a.interviewDate ? `Interview Date: ${a.interviewDate}` : '',
    ``,
    `Dear USCIS Officer,`,
    ``,
    `I am writing regarding my Form I-751 Petition to Remove Conditions on Residence${a.receiptNumber ? ` (Receipt Number: ${a.receiptNumber})` : ''}.`,
    ``,
    `Filing Type: ${a.filingType === 'joint_filing' ? 'Joint Filing' : a.filingType.startsWith('waiver') ? `Waiver Filing — ${a.waiverGround.replace(/_/g, ' ')}` : 'To Be Determined'}`,
    ``,
    s.keyArguments.map(arg => `- ${arg}`).join('\n'),
    ``,
    `I respectfully request your consideration of this matter.`,
    ``,
    s.supportingEvidence.length > 0 ? `Supporting documentation is enclosed:\n${s.supportingEvidence.map(e => `- ${e}`).join('\n')}` : '',
    ``,
    s.deadlineNote ? `Deadline Note: ${s.deadlineNote}` : '',
    ``,
    `Thank you for your attention to this matter.`,
    ``,
    `Sincerely,`,
    `[Your Name]`,
    `[Your Contact Information]`,
    a.receiptNumber ? `[Receipt Number: ${a.receiptNumber}]` : '[Your Receipt Number, if available]',
  ].filter(line => line !== '').join('\n');

  const now = new Date().toISOString();
  return {
    ...ctx,
    draft: draftText,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: 'I-751 letter drafted' }],
  };
}

export function validate(ctx: I751Context): I751Context {
  const issues: string[] = [];

  if (!ctx.draft) throw new Error('Must draft before validating');
  if (!ctx.analysis) throw new Error('No analysis');

  if (ctx.analysis.eventType === 'joint_filing_preparation' && ctx.analysis.filingType === 'not_determined') {
    issues.push('Filing type not determined — specify whether this is a joint filing or waiver filing');
  }
  if (ctx.analysis.eventType === 'waiver_filing_preparation' && ctx.analysis.waiverGround === 'none') {
    issues.push('Waiver ground not identified — specify the basis for the waiver (good faith marriage, hardship, abuse, or death of spouse)');
  }
  if (ctx.analysis.eventType === 'late_filing' && !ctx.userText.match(/good cause|beyond.*control|medical|emergency|incapacitat/i)) {
    issues.push('Good cause explanation for late filing not provided — document circumstances beyond control');
  }
  if (ctx.analysis.eventType === 'filing_window_warning' && !ctx.analysis.conditionalResidenceExpiryDate) {
    issues.push('Conditional residence expiry date not provided — needed to verify filing window status');
  }
  if (ctx.analysis.eventType === 'interview_rescheduling' && !ctx.analysis.interviewDate) {
    issues.push('Interview date not provided — needed to verify reschedule window');
  }
  if (ctx.analysis.eventType === 'missed_interview' && ctx.analysis.canReschedule === false) {
    issues.push('Missed interview with no reschedule possible — may result in automatic denial and NTA');
  }
  if (ctx.analysis.eventType === 'evidence_deficiency' && ctx.analysis.evidenceStatus.includes('unknown')) {
    issues.push('Specific evidence deficiencies not identified — list which bona fide marriage evidence is missing');
  }
  if (ctx.analysis.eventType === 'denial_handling' && !ctx.userText.match(/attorney|lawyer|legal/i)) {
    issues.push('Legal representation not mentioned — I-751 denial with NTA referral requires immigration attorney');
  }
  if (ctx.analysis.eventType === 'delayed_processing' && !ctx.receiptNumber) {
    issues.push('Receipt number not provided — needed for case inquiry');
  }
  if (ctx.analysis.filingType === 'waiver_good_faith_marriage' && !ctx.analysis.evidenceStatus.includes('divorce_decree')) {
    issues.push('Divorce decree not mentioned — required for good faith marriage waiver filing');
  }
  if (ctx.analysis.filingType === 'waiver_battery_extreme_cruelty' && !ctx.analysis.evidenceStatus.includes('abuse_evidence')) {
    issues.push('Abuse evidence not mentioned — required for battery/extreme cruelty waiver');
  }
  if (ctx.analysis.filingType === 'waiver_death_of_spouse' && !ctx.analysis.evidenceStatus.includes('death_certificate')) {
    issues.push('Death certificate not mentioned — required for death of spouse waiver');
  }
  if (ctx.analysis.eventType === 'unknown') {
    issues.push('I-751 event type could not be determined — may need manual review');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: I751Context): I751Context {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');

  // Adversarial review
  if (ctx.analysis.eventType === 'missed_interview' && ctx.analysis.urgency !== 'critical') {
    issues.push('Missed interview should be classified as critical urgency — automatic denial and NTA risk');
  }
  if (ctx.analysis.eventType === 'late_filing' && ctx.analysis.urgency !== 'critical') {
    issues.push('Late filing should be classified as critical — filing window has expired');
  }
  if (ctx.analysis.eventType === 'denial_handling' && ctx.analysis.riskLevel !== 'elevated') {
    issues.push('Denial handling should be elevated risk — NTA referral to immigration court');
  }
  if (ctx.analysis.eventType === 'interview_rescheduling' && ctx.analysis.daysUntilInterview !== undefined && ctx.analysis.daysUntilInterview <= 0) {
    issues.push('Reschedule request but interview date has already passed — reclassify as missed interview');
  }
  if (ctx.analysis.filingType === 'joint_filing' && ctx.analysis.eventType === 'waiver_filing_preparation') {
    issues.push('Filing type is joint but event is waiver preparation — contradictory classification');
  }
  if (ctx.analysis.filingType.startsWith('waiver') && ctx.analysis.waiverGround === 'none') {
    issues.push('Waiver filing type detected but no waiver ground identified — incomplete analysis');
  }
  if (ctx.analysis.filingWindowStatus === 'window_expired' && ctx.analysis.eventType !== 'late_filing' && ctx.analysis.eventType !== 'denial_handling') {
    issues.push('Filing window has expired but event is not late filing or denial — verify urgency classification');
  }
  if (ctx.analysis.eventType === 'evidence_deficiency' && ctx.analysis.evidenceStatus.length <= 1 && ctx.analysis.evidenceStatus.includes('unknown')) {
    issues.push('Evidence deficiency detected but no specific evidence types identified — incomplete analysis');
  }
  if (ctx.analysis.eventType === 'delayed_processing' && ctx.analysis.urgency === 'critical') {
    issues.push('Delayed processing classified as critical — verify whether a deadline is actually at risk');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY_COMPLETE', detail: issues.length === 0 ? 'Passed X-Ray review' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: I751Context, approved: boolean): I751Context {
  if (!ctx.draft) throw new Error('Must draft before user review');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: approved ? 'User approved the draft' : 'User rejected the draft' }],
  };
}

export function pay(ctx: I751Context, paymentVerified: boolean): I751Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: paymentVerified,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: paymentVerified ? 'Payment verified' : 'Payment failed' }],
  };
}

export function fulfill(ctx: I751Context, fulfillmentId: string): I751Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: I751Context, trackingNumber: string): I751Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking: ${trackingNumber}` }],
  };
}

export function prove(ctx: I751Context, proofId: string): I751Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

export function createIdempotencyKey(ctx: I751Context): string {
  return `i751:${ctx.caseId}:${ctx.ownerId}`;
}

export function verifyIdempotency(ctx: I751Context, previousKeys: Set<string>): { duplicate: boolean; key: string } {
  const key = createIdempotencyKey(ctx);
  return { duplicate: previousKeys.has(key), key };
}

// ─── Owner Isolation ────────────────────────────────────────────────────────

export function verifyOwnerIsolation(ctxA: I751Context, ctxB: I751Context): boolean {
  return ctxA.ownerId !== ctxB.ownerId || ctxA.caseId === ctxB.caseId;
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

export function runFullPipeline(
  caseId: string,
  ownerId: string,
  userText: string,
  options?: {
    formType?: string;
    receiptNumber?: string;
    conditionalResidenceExpiryDate?: string;
    interviewDate?: string;
    language?: 'en' | 'es';
    approved?: boolean;
    paymentVerified?: boolean;
    fulfillmentId?: string;
    trackingNumber?: string;
    proofId?: string;
  },
): I751Context {
  let ctx = createI751Context(caseId, ownerId, options?.language ?? 'en');
  ctx = intake(ctx, userText, options?.formType, options?.receiptNumber, options?.conditionalResidenceExpiryDate, options?.interviewDate);
  ctx = analyze(ctx);
  ctx = classify(ctx);
  ctx = buildStrategy(ctx);
  ctx = draft(ctx);
  ctx = validate(ctx);
  ctx = xray(ctx);
  ctx = userReview(ctx, options?.approved ?? true);
  ctx = pay(ctx, options?.paymentVerified ?? true);
  if (options?.fulfillmentId) ctx = fulfill(ctx, options.fulfillmentId);
  if (options?.trackingNumber) ctx = track(ctx, options.trackingNumber);
  if (options?.proofId) ctx = prove(ctx, options.proofId);
  return ctx;
}

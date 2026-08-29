/**
 * Naturalization / Citizenship Workflow Engine
 *
 * State machine:
 *   intake → analyzed → classified → strategy_built → drafted → validated →
 *   xray_complete → user_review → approved → paid → fulfilled → tracked → proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional notice upload)
 *   - Authority (INA § 316, 8 CFR § 316, USCIS Policy Manual Vol 12)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - RFE/NOID: not a pre-filing RFE, managing the naturalization lifecycle
 *   - Case Inquiry: specific to naturalization interview/oath, not general case status
 *   - Denial/Appeal: case is in process, not denied
 *   - Biometrics: different appointment type (interview, not fingerprint)
 *   - I-797 routing: this is the action layer for naturalization notices
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeNaturalization,
  buildNaturalizationStrategy,
  type NaturalizationAnalysis,
  type NaturalizationStrategy,
  type NaturalizationEventType,
  type NaturalizationUrgency,
  type InterviewStatus,
  type CivicsTestComponent,
} from './naturalization-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type NaturalizationState =
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

export const NATURALIZATION_STATES: NaturalizationState[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface NaturalizationContext {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  formType?: string;
  receiptNumber?: string;
  interviewDate?: string;
  oathDate?: string;
  analysis?: NaturalizationAnalysis;
  strategy?: NaturalizationStrategy;
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

export function createNaturalizationContext(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): NaturalizationContext {
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

export function intake(ctx: NaturalizationContext, text: string, formType?: string, receiptNumber?: string, interviewDate?: string, oathDate?: string): NaturalizationContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    formType,
    receiptNumber,
    interviewDate,
    oathDate,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described naturalization situation' }],
  };
}

export function analyze(ctx: NaturalizationContext): NaturalizationContext {
  const analysis = analyzeNaturalization(ctx.userText, ctx.formType, ctx.receiptNumber, ctx.interviewDate, ctx.oathDate);
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Event: ${analysis.eventType}, urgency: ${analysis.urgency}, status: ${analysis.interviewStatus}` }],
  };
}

export function classify(ctx: NaturalizationContext): NaturalizationContext {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `Form: ${ctx.analysis.formType}, can reschedule: ${ctx.analysis.canReschedule}, risk: ${ctx.analysis.riskLevel}` }],
  };
}

export function buildStrategy(ctx: NaturalizationContext): NaturalizationContext {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildNaturalizationStrategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach}` }],
  };
}

export function draft(ctx: NaturalizationContext): NaturalizationContext {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;

  const draftText = [
    `${s.approach}`,
    ``,
    `To: ${a.fieldOffice ? `USCIS Field Office, ${a.fieldOffice}` : 'USCIS Field Office'}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Naturalization Application${a.receiptNumber ? ` — Receipt Number: ${a.receiptNumber}` : ''}`,
    `Form Type: ${a.formType}`,
    a.interviewDate ? `Interview Date: ${a.interviewDate}` : '',
    a.interviewTime ? `Interview Time: ${a.interviewTime}` : '',
    a.oathDate ? `Oath Ceremony Date: ${a.oathDate}` : '',
    a.oathLocation ? `Oath Location: ${a.oathLocation}` : '',
    ``,
    `Dear USCIS Officer,`,
    ``,
    `I am writing regarding my naturalization application${a.receiptNumber ? ` (Receipt Number: ${a.receiptNumber})` : ''}.`,
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
    `[Your A-Number, if applicable]`,
  ].filter(line => line !== '').join('\n');

  const now = new Date().toISOString();
  return {
    ...ctx,
    draft: draftText,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: 'Naturalization letter drafted' }],
  };
}

export function validate(ctx: NaturalizationContext): NaturalizationContext {
  const issues: string[] = [];

  if (!ctx.draft) throw new Error('Must draft before validating');
  if (!ctx.analysis) throw new Error('No analysis');

  if (ctx.analysis.formType === 'unknown') {
    issues.push('Form type not identified — user should specify which form was filed');
  }
  if (!ctx.analysis.receiptNumber && ctx.analysis.eventType !== 'interview_preparation' && ctx.analysis.eventType !== 'civics_test_readiness') {
    issues.push('Receipt number not provided — recommended for efficient processing');
  }
  if (ctx.analysis.eventType === 'interview_rescheduling' && !ctx.analysis.interviewDate) {
    issues.push('Interview date not provided — needed to verify reschedule window');
  }
  if (ctx.analysis.eventType === 'missed_interview' && ctx.analysis.canReschedule === false) {
    issues.push('Missed interview with no reschedule possible — may need to refile N-400');
  }
  if (ctx.analysis.eventType === 'interview_notice_discrepancy' && !ctx.userText.match(/name|date|time|location|DOB|A-number|alien number/i)) {
    issues.push('Discrepancy type not specified — identify which field is incorrect on the notice');
  }
  if (ctx.analysis.eventType === 'post_interview_rfe' && !ctx.analysis.receiptNumber) {
    issues.push('Post-interview RFE without receipt number — difficult for USCIS to locate case');
  }
  if (ctx.analysis.eventType === 'delayed_decision' && ctx.analysis.daysSinceInterview === undefined) {
    issues.push('Interview date not provided — needed to calculate days since interview');
  }
  if (ctx.analysis.eventType === 'oath_document_issue' && !ctx.userText.match(/certificate|name|date of birth|DOB|damaged|incorrect|wrong/i)) {
    issues.push('Document issue type not specified — identify which document has the problem');
  }
  if (ctx.analysis.eventType === 'oath_ceremony_scheduling' && ctx.analysis.daysSinceInterview === undefined && ctx.analysis.daysUntilOath === undefined) {
    issues.push('No timing information provided — cannot assess delay duration');
  }
  if (ctx.analysis.eventType === 'unknown') {
    issues.push('Naturalization event type could not be determined — may need manual review');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: NaturalizationContext): NaturalizationContext {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');

  // Adversarial review
  if (ctx.analysis.eventType === 'missed_interview' && ctx.analysis.urgency !== 'critical') {
    issues.push('Missed interview should be classified as critical urgency — consequences may include N-400 denial');
  }
  if (ctx.analysis.eventType === 'interview_rescheduling' && ctx.analysis.daysUntilInterview !== undefined && ctx.analysis.daysUntilInterview <= 0) {
    issues.push('Reschedule request but interview date has already passed — reclassify as missed interview');
  }
  if (ctx.analysis.eventType === 'civics_test_readiness' && ctx.analysis.riskLevel !== 'low') {
    issues.push('Civics test readiness should be low risk — preparation activity, not a deadline');
  }
  if (ctx.analysis.eventType === 'interview_preparation' && ctx.analysis.riskLevel !== 'low') {
    issues.push('Interview preparation should be low risk — proactive preparation, not a problem');
  }
  if (ctx.analysis.eventType === 'delayed_decision' && ctx.analysis.daysSinceInterview !== undefined && ctx.analysis.daysSinceInterview > 120 && ctx.analysis.urgency !== 'critical') {
    issues.push('Delayed decision over 120 days should be critical urgency — mandamus eligibility');
  }
  if (ctx.analysis.eventType === 'oath_ceremony_scheduling' && ctx.analysis.daysSinceInterview !== undefined && ctx.analysis.daysSinceInterview > 90 && ctx.analysis.urgency === 'routine') {
    issues.push('Oath ceremony delayed over 90 days should not be routine — escalation needed');
  }
  if (ctx.analysis.eventType === 'post_interview_rfe' && ctx.analysis.urgency === 'routine') {
    issues.push('Post-interview RFE should not be routine — has a response deadline');
  }
  if (ctx.analysis.eventType === 'oath_document_issue' && ctx.analysis.urgency === 'routine') {
    issues.push('Oath document issue should not be routine — may affect citizenship status');
  }
  if (ctx.analysis.eventType === 'interview_notice_discrepancy' && ctx.analysis.urgency === 'routine') {
    issues.push('Interview notice discrepancy should not be routine — incorrect information requires prompt correction');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY', detail: issues.length === 0 ? 'X-Ray passed' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: NaturalizationContext): NaturalizationContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: 'User reviewed the draft' }],
  };
}

export function approve(ctx: NaturalizationContext): NaturalizationContext {
  if (!ctx.draft) throw new Error('Must draft before approval');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved: true,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'APPROVED', detail: 'User approved the draft for mailing' }],
  };
}

export function pay(ctx: NaturalizationContext): NaturalizationContext {
  if (!ctx.approved) throw new Error('Must approve before payment');
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: true,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: 'Payment completed via Stripe' }],
  };
}

export function fulfill(ctx: NaturalizationContext, fulfillmentId: string): NaturalizationContext {
  if (!ctx.paid) throw new Error('Must pay before fulfillment');
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: NaturalizationContext, trackingNumber: string): NaturalizationContext {
  if (!ctx.fulfillmentId) throw new Error('Must fulfill before tracking');
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking number: ${trackingNumber}` }],
  };
}

export function prove(ctx: NaturalizationContext, proofId: string): NaturalizationContext {
  if (!ctx.trackingNumber) throw new Error('Must track before proof');
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Full Workflow Run ────────────────────────────────────────────────────────

export function runFullNaturalization(
  caseId: string,
  ownerId: string,
  text: string,
  formType?: string,
  receiptNumber?: string,
  interviewDate?: string,
  oathDate?: string,
  language: 'en' | 'es' = 'en',
): NaturalizationContext {
  let ctx = createNaturalizationContext(caseId, ownerId, language);
  ctx = intake(ctx, text, formType, receiptNumber, interviewDate, oathDate);
  ctx = analyze(ctx);
  ctx = classify(ctx);
  ctx = buildStrategy(ctx);
  ctx = draft(ctx);
  ctx = validate(ctx);
  ctx = xray(ctx);
  ctx = userReview(ctx);
  return ctx;
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

const processedNaturalization = new Map<string, NaturalizationContext>();

export function processNaturalizationIdempotent(
  idempotencyKey: string,
  caseId: string,
  ownerId: string,
  text: string,
  formType?: string,
  receiptNumber?: string,
  interviewDate?: string,
  oathDate?: string,
  language: 'en' | 'es' = 'en',
): NaturalizationContext {
  const existing = processedNaturalization.get(idempotencyKey);
  if (existing) return existing;
  const result = runFullNaturalization(caseId, ownerId, text, formType, receiptNumber, interviewDate, oathDate, language);
  processedNaturalization.set(idempotencyKey, result);
  return result;
}

// ─── Owner Isolation ──────────────────────────────────────────────────────────

export function assertOwnerIsolation(ctx: NaturalizationContext, requestingUserId: string): void {
  if (ctx.ownerId !== requestingUserId) {
    throw new Error(`Owner isolation violation: case ${ctx.caseId} belongs to ${ctx.ownerId}, not ${requestingUserId}`);
  }
}

// ─── Failure/Retry ────────────────────────────────────────────────────────────

export function retryFromStage(ctx: NaturalizationContext, stage: NaturalizationState, text?: string): NaturalizationContext {
  const now = new Date().toISOString();
  let updated = { ...ctx, auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'RETRY', detail: `Retrying from stage: ${stage}` }] };

  if (text) {
    updated.userText = text;
    updated = intake(updated, text, updated.formType, updated.receiptNumber, updated.interviewDate, updated.oathDate);
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
      return runFullNaturalization(updated.caseId, updated.ownerId, updated.userText, updated.formType, updated.receiptNumber, updated.interviewDate, updated.oathDate);
  }
}

/**
 * Biometrics Scheduling Workflow Engine
 *
 * State machine:
 *   intake → analyzed → classified → strategy_built → drafted → validated →
 *   xray_complete → user_review → approved → paid → fulfilled → tracked → proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional appointment notice upload)
 *   - Authority (8 CFR § 103.2(b)(9), USCIS biometrics regulations)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - RFE/NOID: not responding to a notice, managing appointment logistics
 *   - Case Inquiry: specific to biometrics scheduling, not general case status
 *   - Denial/Appeal: case is pending, biometrics are part of process
 *   - I-797 routing: this is the action layer for biometrics notices
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeBiometrics,
  buildBiometricsStrategy,
  type BiometricsAnalysis,
  type BiometricsStrategy,
  type BiometricsEventType,
  type BiometricsUrgency,
  type AppointmentStatus,
} from './biometrics-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type BiometricsState =
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

export const BIOMETRICS_STATES: BiometricsState[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface BiometricsContext {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  formType?: string;
  receiptNumber?: string;
  appointmentDate?: string;
  analysis?: BiometricsAnalysis;
  strategy?: BiometricsStrategy;
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

export function createBiometricsContext(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): BiometricsContext {
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

export function intake(ctx: BiometricsContext, text: string, formType?: string, receiptNumber?: string, appointmentDate?: string): BiometricsContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    formType,
    receiptNumber,
    appointmentDate,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described biometrics situation' }],
  };
}

export function analyze(ctx: BiometricsContext): BiometricsContext {
  const analysis = analyzeBiometrics(ctx.userText, ctx.formType, ctx.receiptNumber, ctx.appointmentDate);
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Event: ${analysis.eventType}, urgency: ${analysis.urgency}, status: ${analysis.appointmentStatus}` }],
  };
}

export function classify(ctx: BiometricsContext): BiometricsContext {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `Form: ${ctx.analysis.formType}, can reschedule: ${ctx.analysis.canReschedule}, risk: ${ctx.analysis.riskLevel}` }],
  };
}

export function buildStrategy(ctx: BiometricsContext): BiometricsContext {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildBiometricsStrategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach}` }],
  };
}

export function draft(ctx: BiometricsContext): BiometricsContext {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;

  const draftText = [
    `${s.approach} Letter`,
    ``,
    `To: ${a.ascLocation ? `USCIS Application Support Center, ${a.ascLocation}` : 'USCIS Application Support Center'}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Biometrics Appointment${a.receiptNumber ? ` — Receipt Number: ${a.receiptNumber}` : ''}`,
    `Form Type: ${a.formType}`,
    a.appointmentDate ? `Appointment Date: ${a.appointmentDate}` : '',
    a.appointmentTime ? `Appointment Time: ${a.appointmentTime}` : '',
    a.ascCode ? `ASC Code: ${a.ascCode}` : '',
    ``,
    `Dear USCIS Officer,`,
    ``,
    `I am writing regarding my biometrics appointment for my ${a.formType} application${a.receiptNumber ? ` (Receipt Number: ${a.receiptNumber})` : ''}.`,
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
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: 'Biometrics letter drafted' }],
  };
}

export function validate(ctx: BiometricsContext): BiometricsContext {
  const issues: string[] = [];

  if (!ctx.draft) throw new Error('Must draft before validating');
  if (!ctx.analysis) throw new Error('No analysis');

  if (!ctx.analysis.formType || ctx.analysis.formType === 'unknown') {
    issues.push('Form type not identified — user should specify which form was filed');
  }
  if (!ctx.analysis.receiptNumber && ctx.analysis.eventType !== 'biometrics_reuse') {
    issues.push('Receipt number not provided — recommended for efficient processing');
  }
  if (ctx.analysis.eventType === 'reschedule_request' && !ctx.analysis.appointmentDate) {
    issues.push('Appointment date not provided — needed to verify reschedule window');
  }
  if (ctx.analysis.eventType === 'missed_appointment' && ctx.analysis.canReschedule === false) {
    issues.push('Missed appointment with no reschedule possible — may need to refile');
  }
  if (ctx.analysis.eventType === 'notice_discrepancy' && !ctx.userText.match(/name|date of birth|DOB|address|A-number|alien number/i)) {
    issues.push('Discrepancy type not specified — identify which field is incorrect on the notice');
  }
  if (ctx.analysis.eventType === 'asc_location_problem' && !ctx.analysis.ascCode) {
    issues.push('ASC code not identified — specify which ASC was assigned');
  }
  if (ctx.analysis.eventType === 'unknown') {
    issues.push('Biometrics event type could not be determined — may need manual review');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: BiometricsContext): BiometricsContext {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');

  // Adversarial review
  if (ctx.analysis.eventType === 'missed_appointment' && ctx.analysis.urgency !== 'critical') {
    issues.push('Missed appointment should be classified as critical urgency — consequences may include denial');
  }
  if (ctx.analysis.eventType === 'reschedule_request' && ctx.analysis.daysUntilAppointment !== undefined && ctx.analysis.daysUntilAppointment <= 0) {
    issues.push('Reschedule request but appointment date has already passed — reclassify as missed appointment');
  }
  if (ctx.analysis.eventType === 'biometrics_reuse' && ctx.analysis.riskLevel !== 'low') {
    issues.push('Biometrics reuse should be low risk — no action needed');
  }
  if (ctx.analysis.eventType === 'no_notice_received' && !ctx.analysis.receiptNumber) {
    issues.push('No notice received inquiry without receipt number — difficult for USCIS to locate case');
  }
  if (ctx.analysis.eventType === 'notice_discrepancy' && ctx.analysis.urgency === 'routine') {
    issues.push('Notice discrepancy should not be routine — incorrect information requires prompt correction before appointment');
  }
  if (ctx.analysis.eventType === 'asc_location_problem' && ctx.analysis.daysUntilAppointment !== undefined && ctx.analysis.daysUntilAppointment <= 7) {
    issues.push('ASC location problem with appointment imminent — may not allow time for transfer');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY', detail: issues.length === 0 ? 'X-Ray passed' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: BiometricsContext): BiometricsContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: 'Sent to user for review' }],
  };
}

export function approve(ctx: BiometricsContext, userId: string): BiometricsContext {
  if (userId !== ctx.ownerId) throw new Error('Only the case owner can approve');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved: true,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'APPROVED', detail: `Approved by owner ${userId}` }],
  };
}

export function markPaid(ctx: BiometricsContext): BiometricsContext {
  if (!ctx.approved) throw new Error('Must approve before payment');
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: true,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: 'Payment processed' }],
  };
}

export function fulfill(ctx: BiometricsContext, fulfillmentId: string): BiometricsContext {
  if (!ctx.paid) throw new Error('Must pay before fulfillment');
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: BiometricsContext, trackingNumber: string): BiometricsContext {
  if (!ctx.fulfillmentId) throw new Error('Must fulfill before tracking');
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking number: ${trackingNumber}` }],
  };
}

export function prove(ctx: BiometricsContext, proofId: string): BiometricsContext {
  if (!ctx.trackingNumber) throw new Error('Must track before proof');
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Full Workflow Run ────────────────────────────────────────────────────────

export function runFullBiometrics(
  caseId: string,
  ownerId: string,
  text: string,
  formType?: string,
  receiptNumber?: string,
  appointmentDate?: string,
  language: 'en' | 'es' = 'en',
): BiometricsContext {
  let ctx = createBiometricsContext(caseId, ownerId, language);
  ctx = intake(ctx, text, formType, receiptNumber, appointmentDate);
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

const processedBiometrics = new Map<string, BiometricsContext>();

export function processBiometricsIdempotent(
  idempotencyKey: string,
  caseId: string,
  ownerId: string,
  text: string,
  formType?: string,
  receiptNumber?: string,
  appointmentDate?: string,
  language: 'en' | 'es' = 'en',
): BiometricsContext {
  const existing = processedBiometrics.get(idempotencyKey);
  if (existing) return existing;
  const result = runFullBiometrics(caseId, ownerId, text, formType, receiptNumber, appointmentDate, language);
  processedBiometrics.set(idempotencyKey, result);
  return result;
}

// ─── Owner Isolation ──────────────────────────────────────────────────────────

export function assertOwnerIsolation(ctx: BiometricsContext, requestingUserId: string): void {
  if (ctx.ownerId !== requestingUserId) {
    throw new Error(`Owner isolation violation: case ${ctx.caseId} belongs to ${ctx.ownerId}, not ${requestingUserId}`);
  }
}

// ─── Failure/Retry ────────────────────────────────────────────────────────────

export function retryFromStage(ctx: BiometricsContext, stage: BiometricsState, text?: string): BiometricsContext {
  const now = new Date().toISOString();
  let updated = { ...ctx, auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'RETRY', detail: `Retrying from stage: ${stage}` }] };

  if (text) {
    updated.userText = text;
    updated = intake(updated, text, updated.formType, updated.receiptNumber, updated.appointmentDate);
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
      return runFullBiometrics(updated.caseId, updated.ownerId, updated.userText, updated.formType, updated.receiptNumber, updated.appointmentDate);
  }
}

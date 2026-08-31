/**
 * I-90 Application to Replace Permanent Resident Card — Workflow Engine
 *
 * State machine:
 *   intake -> analyzed -> classified -> strategy_built -> drafted -> validated ->
 *   xray_complete -> user_review -> approved -> paid -> fulfilled -> tracked -> proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional notice/upload)
 *   - Authority (INA 264, 8 CFR 264.5)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - I-751: removal of conditions on 2-year conditional card (not renewal)
 *   - Naturalization: citizenship application, not green card replacement
 *   - Case Inquiry: delay checking, not affirmative filing
 *   - RFE/NOID: evidence responses, not card renewal lifecycle
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeI90,
  buildI90Strategy,
  type I90Analysis,
  type I90Strategy,
} from './i90-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type I90State =
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

export const I90_STATES: I90State[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface I90Context {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  cardExpirationDate?: string;
  filingMethod?: 'paper' | 'online';
  receiptNumber?: string;
  analysis?: I90Analysis;
  strategy?: I90Strategy;
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

export function createI90Context(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): I90Context {
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
  ctx: I90Context,
  text: string,
  cardExpirationDate?: string,
  filingMethod?: 'paper' | 'online',
  receiptNumber?: string,
): I90Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    cardExpirationDate,
    filingMethod,
    receiptNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described I-90 green card situation' }],
  };
}

export function analyze(ctx: I90Context): I90Context {
  const analysis = analyzeI90(ctx.userText, ctx.cardExpirationDate, ctx.filingMethod);
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Card type: ${analysis.cardType}, reason: ${analysis.filingReason}, risk: ${analysis.risk}` }],
  };
}

export function classify(ctx: I90Context): I90Context {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `App type: ${ctx.analysis.appType}, filing window: ${ctx.analysis.filingWindow}` }],
  };
}

export function buildStrategy(ctx: I90Context): I90Context {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildI90Strategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach.substring(0, 100)}` }],
  };
}

export function draft(ctx: I90Context): I90Context {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;

  const draftText = [
    `${s.approach}`,
    ``,
    `To: USCIS ${a.filingMethod === 'online' ? '(file online via myUSCIS)' : 'Lockbox (check USCIS.gov for filing address)'}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Form I-90 Application to Replace Permanent Resident Card`,
    `Filing Reason: ${a.filingReason.replace(/_/g, ' ')}`,
    `Application Type: ${a.appType}`,
    `${ctx.receiptNumber ? `Receipt Number: ${ctx.receiptNumber}` : ''}`,
    ``,
    `Dear USCIS Officer,`,
    ``,
    `I am applying to replace my Permanent Resident Card (Form I-551) pursuant to Form I-90.`,
    ``,
    `Filing Reason:`,
    a.filingReason === 'expiring_card' ? 'My green card is expiring within the 180-day filing window.' :
    a.filingReason === 'expired_card' ? 'My green card has expired.' :
    a.filingReason === 'lost_stolen_destroyed' ? 'My green card was lost, stolen, or destroyed.' :
    a.filingReason === 'never_received' ? 'I never received my green card.' :
    a.filingReason === 'uscis_error' ? 'My green card contains a USCIS error.' :
    a.filingReason === 'name_change' ? 'I have legally changed my name.' :
    a.filingReason === 'biographic_change' ? 'My biographic information has changed.' :
    a.filingReason === 'commuter_status_change' ? 'I am changing my commuter/non-commuter status.' :
    a.filingReason === 'turning_14' ? 'I am turning 14 and my card expires before my 16th birthday.' :
    'Filing reason to be determined.',
    ``,
    `Evidence:`,
    s.supportingEvidence.length > 0 ? 'Supporting documentation enclosed:' : 'No supporting documentation identified.',
    ...s.supportingEvidence.map(e => `- ${e}`),
    a.missingEvidence.length > 0 ? `` : '',
    a.missingEvidence.length > 0 ? 'Missing evidence to gather:' : '',
    ...a.missingEvidence.map(e => `- ${e}`),
    ``,
    s.filingNote,
    ``,
    s.feeNote,
    ``,
    s.biometricsNote,
    ``,
    s.extensionNote,
    ``,
    s.naturalizationNote,
    ``,
    `Authority: ${a.authority.join('; ')}`,
    ``,
    `I respectfully request your favorable consideration of this application.`,
    ``,
    `Thank you for your attention to this matter.`,
    ``,
    `Sincerely,`,
    `[Your Name]`,
    `[Your Contact Information]`,
    `[A-Number: ___]`,
    ctx.receiptNumber ? `[Receipt Number: ${ctx.receiptNumber}]` : '[Your Receipt Number, if available]',
  ].filter(line => line !== '').join('\n');

  const now = new Date().toISOString();
  return {
    ...ctx,
    draft: draftText,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: `I-90 ${a.appType} letter drafted for ${a.filingReason.replace(/_/g, ' ')}` }],
  };
}

export function validate(ctx: I90Context): I90Context {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must draft before validating');
  const a = ctx.analysis;

  // Check conditional card redirect
  if (a.i90vsI751.redirect) {
    issues.push(a.i90vsI751.message);
  }

  // Check filing reason
  if (a.filingReason === 'not_determined') {
    issues.push('Filing reason not identified — specify whether this is renewal, replacement, or correction');
  }

  // Check filing window
  if (a.filingWindow === 'too_early') {
    issues.push(a.filingWindowNote);
  }

  // Check missing evidence
  if (a.missingEvidence.length > 0) {
    issues.push(`${a.missingEvidence.length} piece(s) of evidence missing: ${a.missingEvidence.join(', ')}`);
  }

  // Check card type
  if (a.cardType === 'unknown') {
    issues.push('Card type not identified — verify whether you have a 10-year permanent or 2-year conditional green card');
  }

  // Check naturalization alternative
  if (a.naturalizationCheck.recommendN400) {
    issues.push(`Naturalization alternative: ${a.naturalizationCheck.note}`);
  }

  // Check high risk
  if (a.risk === 'high') {
    issues.push('High risk: conditional resident cannot file I-90 — redirect to I-751 workflow');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: I90Context): I90Context {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');
  const a = ctx.analysis;

  // Conditional card filing I-90 → will be rejected
  if (a.cardType === 'conditional_2_year') {
    issues.push('CRITICAL: Conditional resident filing I-90 — will be rejected. Must file I-751 instead.');
  }

  // Filing too early → will be rejected
  if (a.filingWindow === 'too_early') {
    issues.push('Filing before 180-day window opens — USCIS will reject the application');
  }

  // No evidence detected
  if (a.evidenceTypes.length === 1 && a.evidenceTypes[0] === 'unknown' && a.filingReason !== 'not_determined') {
    issues.push('No evidence types detected — I-90 requires reason-specific supporting documentation');
  }

  // Unknown card type
  if (a.cardType === 'unknown' && a.filingReason !== 'not_determined') {
    issues.push('Card type unknown — cannot verify whether I-90 is the correct form');
  }

  // Lost/stolen without police report
  if (a.filingReason === 'lost_stolen_destroyed' && !a.evidenceTypes.includes('police_report')) {
    issues.push('Lost/stolen card without police report — include police report if card was stolen');
  }

  // USCIS error with fee
  if (a.filingReason === 'uscis_error' && a.fee.amount > 0) {
    issues.push('USCIS error filing should be free — fee should be $0');
  }

  // Naturalization not considered for renewal
  if ((a.filingReason === 'expiring_card' || a.filingReason === 'expired_card') && !a.naturalizationCheck.recommendN400) {
    issues.push('Renewal filing without naturalization alternative check — verify N-400 eligibility before filing I-90');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY_COMPLETE', detail: issues.length === 0 ? 'Passed X-Ray review' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: I90Context, approved: boolean): I90Context {
  if (!ctx.draft) throw new Error('Must draft before user review');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: approved ? 'User approved the draft' : 'User rejected the draft' }],
  };
}

export function pay(ctx: I90Context, paymentVerified: boolean): I90Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: paymentVerified,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: paymentVerified ? 'Payment verified' : 'Payment failed' }],
  };
}

export function fulfill(ctx: I90Context, fulfillmentId: string): I90Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: I90Context, trackingNumber: string): I90Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking: ${trackingNumber}` }],
  };
}

export function prove(ctx: I90Context, proofId: string): I90Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

export function createIdempotencyKey(ctx: I90Context): string {
  return `i90:${ctx.caseId}:${ctx.ownerId}`;
}

export function verifyIdempotency(ctx: I90Context, previousKeys: Set<string>): { duplicate: boolean; key: string } {
  const key = createIdempotencyKey(ctx);
  return { duplicate: previousKeys.has(key), key };
}

// ─── Owner Isolation ────────────────────────────────────────────────────────

export function verifyOwnerIsolation(ctxA: I90Context, ctxB: I90Context): boolean {
  return ctxA.ownerId !== ctxB.ownerId || ctxA.caseId === ctxB.caseId;
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

export function runFullPipeline(
  caseId: string,
  ownerId: string,
  userText: string,
  options?: {
    cardExpirationDate?: string;
    filingMethod?: 'paper' | 'online';
    receiptNumber?: string;
    language?: 'en' | 'es';
    approved?: boolean;
    paymentVerified?: boolean;
    fulfillmentId?: string;
    trackingNumber?: string;
    proofId?: string;
  },
): I90Context {
  let ctx = createI90Context(caseId, ownerId, options?.language ?? 'en');
  ctx = intake(ctx, userText, options?.cardExpirationDate, options?.filingMethod, options?.receiptNumber);
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

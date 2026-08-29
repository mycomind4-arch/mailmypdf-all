/**
 * Case Inquiry Workflow Engine
 *
 * State machine:
 *   intake → analyzed → classified → strategy_built → drafted → validated →
 *   xray_complete → user_review → approved → paid → fulfilled → tracked → proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional receipt notice upload)
 *   - Authority (USCIS processing time guidelines)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - RFE/NOID: no notice to respond to, proactive inquiry
 *   - Denial: case is pending, not denied
 *   - Appeal: no decision to appeal
 *   - FOIA: requesting case status, not records
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeInquiry,
  buildInquiryStrategy,
  type CaseInquiryAnalysis,
  type CaseInquiryStrategy,
  type InquiryType,
  type InquiryUrgency,
} from './case-inquiry-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type CaseInquiryState =
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

export const INQUIRY_STATES: CaseInquiryState[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface CaseInquiryContext {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  formType?: string;
  receiptNumber?: string;
  filingDate?: string;
  analysis?: CaseInquiryAnalysis;
  strategy?: CaseInquiryStrategy;
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

export function createInquiryContext(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): CaseInquiryContext {
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

export function intake(ctx: CaseInquiryContext, text: string, formType?: string, receiptNumber?: string, filingDate?: string): CaseInquiryContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    formType,
    receiptNumber,
    filingDate,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described case delay' }],
  };
}

export function analyze(ctx: CaseInquiryContext): CaseInquiryContext {
  const analysis = analyzeInquiry(ctx.userText, ctx.formType, ctx.receiptNumber, ctx.filingDate);
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Inquiry type: ${analysis.inquiryType}, urgency: ${analysis.urgency}` }],
  };
}

export function classify(ctx: CaseInquiryContext): CaseInquiryContext {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `Form: ${ctx.analysis.formType}, category: ${ctx.analysis.formCategory}, outside processing: ${ctx.analysis.outsideProcessingTime}` }],
  };
}

export function buildStrategy(ctx: CaseInquiryContext): CaseInquiryContext {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildInquiryStrategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach}` }],
  };
}

export function draft(ctx: CaseInquiryContext): CaseInquiryContext {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;

  const draftText = [
    `Case Inquiry Letter`,
    ``,
    `To: ${a.serviceCenter || 'USCIS Service Center'}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Case Status Inquiry${a.receiptNumber ? ` — Receipt Number: ${a.receiptNumber}` : ''}`,
    `Form Type: ${a.formType}`,
    a.filingDate ? `Filing Date: ${a.filingDate}` : '',
    ``,
    `Dear USCIS Officer,`,
    ``,
    `I am writing to inquire about the status of my ${a.formType} application${a.receiptNumber ? ` (Receipt Number: ${a.receiptNumber})` : ''}.`,
    ``,
    s.keyArguments.map(arg => `- ${arg}`).join('\n'),
    ``,
    `I respectfully request that USCIS review my case and provide a status update.`,
    ``,
    s.supportingEvidence.length > 0 ? `Supporting documentation is enclosed:\n${s.supportingEvidence.map(e => `- ${e}`).join('\n')}` : '',
    ``,
    `Thank you for your attention to this matter.`,
    ``,
    `Sincerely,`,
    `[Your Name]`,
    `[Your Contact Information]`,
  ].filter(line => line !== '').join('\n');

  const now = new Date().toISOString();
  return {
    ...ctx,
    draft: draftText,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: 'Inquiry letter drafted' }],
  };
}

export function validate(ctx: CaseInquiryContext): CaseInquiryContext {
  const issues: string[] = [];

  if (!ctx.draft) throw new Error('Must draft before validating');
  if (!ctx.analysis) throw new Error('No analysis');

  if (!ctx.analysis.formType || ctx.analysis.formType === 'unknown') {
    issues.push('Form type not identified — user should specify which form was filed');
  }
  if (!ctx.analysis.receiptNumber) {
    issues.push('Receipt number not provided — recommended for efficient inquiry');
  }
  if (!ctx.analysis.filingDate) {
    issues.push('Filing date not provided — needed to verify outside processing time');
  }
  if (ctx.analysis.inquiryType === 'unknown') {
    issues.push('Inquiry type could not be determined — may need manual review');
  }
  if (ctx.analysis.inquiryType === 'expedite_request' && ctx.analysis.urgency === 'routine') {
    issues.push('Expedite request detected but no urgency specified — qualify the expedite criteria');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: CaseInquiryContext): CaseInquiryContext {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');

  // Adversarial review
  if (ctx.analysis.outsideProcessingTime === false && ctx.analysis.inquiryType === 'service_request') {
    issues.push('Case appears within normal processing time — inquiry may be premature');
  }
  if (ctx.analysis.inquiryType === 'expedite_request') {
    const evidenceKeywords = /medical|hospital|doctor|financial|employment|job|eviction|foreclosure|humanitarian|hardship|disability|military|deploy/i;
    if (!evidenceKeywords.test(ctx.userText ?? '')) {
      issues.push('Expedite request has no supporting evidence — likely to be denied');
    }
  }
  if (ctx.analysis.urgency === 'critical' && ctx.analysis.inquiryType !== 'expedite_request') {
    issues.push('Critical urgency detected but not classified as expedite — reclassify');
  }
  if (ctx.analysis.inquiryType === 'congressional_inquiry' && ctx.language.ui === 'es') {
    // Congressional inquiries require the user to contact their representative
    issues.push('Congressional inquiry requires direct contact with representative office');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY', detail: issues.length === 0 ? 'X-Ray passed' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: CaseInquiryContext): CaseInquiryContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: 'Sent to user for review' }],
  };
}

export function approve(ctx: CaseInquiryContext, userId: string): CaseInquiryContext {
  if (userId !== ctx.ownerId) throw new Error('Only the case owner can approve');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved: true,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'APPROVED', detail: `Approved by owner ${userId}` }],
  };
}

export function markPaid(ctx: CaseInquiryContext): CaseInquiryContext {
  if (!ctx.approved) throw new Error('Must approve before payment');
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: true,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: 'Payment processed' }],
  };
}

export function fulfill(ctx: CaseInquiryContext, fulfillmentId: string): CaseInquiryContext {
  if (!ctx.paid) throw new Error('Must pay before fulfillment');
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: CaseInquiryContext, trackingNumber: string): CaseInquiryContext {
  if (!ctx.fulfillmentId) throw new Error('Must fulfill before tracking');
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking: ${trackingNumber}` }],
  };
}

export function prove(ctx: CaseInquiryContext, proofId: string): CaseInquiryContext {
  if (!ctx.trackingNumber) throw new Error('Must track before proof');
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Full E2E ────────────────────────────────────────────────────────────────

export function runFullInquiry(
  caseId: string,
  ownerId: string,
  text: string,
  formType?: string,
  receiptNumber?: string,
  filingDate?: string,
  language: 'en' | 'es' = 'en',
): CaseInquiryContext {
  let ctx = createInquiryContext(caseId, ownerId, language);
  ctx = intake(ctx, text, formType, receiptNumber, filingDate);
  ctx = analyze(ctx);
  ctx = classify(ctx);
  ctx = buildStrategy(ctx);
  ctx = draft(ctx);
  ctx = validate(ctx);
  ctx = xray(ctx);
  ctx = userReview(ctx);
  ctx = approve(ctx, ownerId);
  ctx = markPaid(ctx);
  ctx = fulfill(ctx, 'fulfill-001');
  ctx = track(ctx, 'TRK' + Date.now());
  ctx = prove(ctx, 'PRF' + Date.now());
  return ctx;
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

const processedInquiries = new Map<string, CaseInquiryContext>();

export function processInquiryIdempotent(
  idempotencyKey: string,
  caseId: string,
  ownerId: string,
  text: string,
  formType?: string,
  receiptNumber?: string,
  filingDate?: string,
  language: 'en' | 'es' = 'en',
): CaseInquiryContext {
  const existing = processedInquiries.get(idempotencyKey);
  if (existing) return existing;
  const result = runFullInquiry(caseId, ownerId, text, formType, receiptNumber, filingDate, language);
  processedInquiries.set(idempotencyKey, result);
  return result;
}

// ─── Owner Isolation ──────────────────────────────────────────────────────────

export function assertOwnerIsolation(ctx: CaseInquiryContext, requestingUserId: string): void {
  if (ctx.ownerId !== requestingUserId) {
    throw new Error(`Owner isolation violation: case ${ctx.caseId} belongs to ${ctx.ownerId}, not ${requestingUserId}`);
  }
}

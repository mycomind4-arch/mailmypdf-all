/**
 * I-765 Employment Authorization Document (EAD) Workflow Engine
 *
 * State machine:
 *   intake -> analyzed -> classified -> strategy_built -> drafted -> validated ->
 *   xray_complete -> user_review -> approved -> paid -> fulfilled -> tracked -> proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional notice/upload)
 *   - Authority (INA 274A, 8 CFR 274a.12, 274a.13)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - RFE/NOID: handles evidence requests, not EAD filing lifecycle
 *   - Case Inquiry: checks case status/delays, not affirmative filing
 *   - Biometrics: ASC scheduling only, not the full EAD lifecycle
 *   - I-601: inadmissibility waiver, not employment authorization
 *
 * RFE/NOID for I-765 applications route to the existing RFE/NOID engines
 * with I-765 form adapter context. Case inquiries for delayed I-765
 * applications route to the case-inquiry workflow.
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeI765,
  buildI765Strategy,
  type I765Analysis,
  type I765Strategy,
  type I765EventType,
  type I765Urgency,
  type EADApplicationType,
  type EADCategory,
  type UnderlyingCase,
  type EADEvidenceType,
  type I765RiskLevel,
  type ExpirationStatus,
  type AutoExtensionResult,
  type FeeResult,
} from './i765-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type I765State =
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

export const I765_STATES: I765State[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface I765Context {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  eadExpirationDate?: string;
  filingDate?: string;
  filingMethod?: 'paper' | 'online';
  receiptNumber?: string;
  analysis?: I765Analysis;
  strategy?: I765Strategy;
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

export function createI765Context(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): I765Context {
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
  ctx: I765Context,
  text: string,
  eadExpirationDate?: string,
  filingDate?: string,
  filingMethod?: 'paper' | 'online',
  receiptNumber?: string,
): I765Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    eadExpirationDate,
    filingDate,
    filingMethod,
    receiptNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described I-765 EAD situation' }],
  };
}

export function analyze(ctx: I765Context): I765Context {
  const analysis = analyzeI765(
    ctx.userText,
    ctx.eadExpirationDate,
    ctx.filingDate,
    ctx.filingMethod,
  );
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Type: ${analysis.applicationType}, category: ${analysis.category}, urgency: ${analysis.urgency}` }],
  };
}

export function classify(ctx: I765Context): I765Context {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `Category: ${ctx.analysis.categoryDescription.code}, risk: ${ctx.analysis.riskLevel}` }],
  };
}

export function buildStrategy(ctx: I765Context): I765Context {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildI765Strategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach.substring(0, 100)}` }],
  };
}

export function draft(ctx: I765Context): I765Context {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;
  const desc = a.categoryDescription;

  const draftText = [
    `${s.approach}`,
    ``,
    `To: USCIS ${a.filingMethod === 'online' ? '(file online via myUSCIS)' : 'Lockbox (varies by category — check USCIS.gov for filing address)'}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Form I-765 Application for Employment Authorization`,
    `Eligibility Category: ${desc.code} (${desc.name})`,
    `Application Type: ${a.applicationType}`,
    `${ctx.receiptNumber ? `Receipt Number: ${ctx.receiptNumber}` : ''}`,
    ``,
    `Dear USCIS Officer,`,
    ``,
    `I am applying for employment authorization under eligibility category ${desc.code} (${desc.name}).`,
    ``,
    `Application Type:`,
    a.applicationType === 'initial' ? 'Initial application for employment authorization.' : a.applicationType === 'renewal' ? 'Renewal of existing employment authorization.' : a.applicationType === 'replacement' ? 'Replacement of lost/stolen/damaged EAD.' : 'Application type to be determined.',
    ``,
    `Eligibility Category:`,
    `${desc.code} — ${desc.name}`,
    `Authority: ${desc.authority}`,
    ``,
    `Underlying Case:`,
    a.underlyingCase !== 'none' ? `My underlying case: ${a.underlyingCase.replace(/_/g, ' ')}.` : 'No specific underlying case mentioned.',
    a.underlyingConsistent ? 'Underlying case is consistent with the eligibility category.' : 'Verify underlying case status before filing.',
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
    s.expirationNote,
    ``,
    s.autoExtensionNote,
    ``,
    `I respectfully request your favorable consideration of this application.`,
    ``,
    `Thank you for your attention to this matter.`,
    ``,
    `Sincerely,`,
    `[Your Name]`,
    `[Your Contact Information]`,
    ctx.receiptNumber ? `[Receipt Number: ${ctx.receiptNumber}]` : '[Your Receipt Number, if available]',
  ].filter(line => line !== '').join('\n');

  const now = new Date().toISOString();
  return {
    ...ctx,
    draft: draftText,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: `I-765 ${a.applicationType} letter drafted for category ${desc.code}` }],
  };
}

export function validate(ctx: I765Context): I765Context {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must draft before validating');
  const a = ctx.analysis;

  // Check category identification
  if (a.category === 'unknown') {
    issues.push('EAD eligibility category not identified — determine your category based on your current immigration status (e.g., (c)(9) for pending I-485, (c)(8) for pending asylum)');
  }

  // Check underlying case consistency
  if (!a.underlyingConsistent && a.underlyingCase !== 'none' && a.category !== 'unknown') {
    issues.push(`Underlying case (${a.underlyingCase.replace(/_/g, ' ')}) may not support category ${a.categoryDescription.code} — verify before filing`);
  }

  // Check missing evidence
  if (a.missingEvidence.length > 0) {
    issues.push(`${a.missingEvidence.length} piece(s) of evidence missing: ${a.missingEvidence.join(', ')}`);
  }

  // Check expired EAD for renewal
  if (a.expirationStatus === 'expired' && a.applicationType === 'renewal') {
    issues.push('EAD has expired — file renewal immediately. Note: automatic extension may not apply if filed on or after Oct. 30, 2025');
  }

  // Check application type
  if (a.applicationType === 'not_determined') {
    issues.push('Application type not determined — specify whether this is an initial, renewal, or replacement application');
  }

  // Check unsupported category
  if (!a.categoryDescription.code.includes('(') && a.category !== 'unknown') {
    issues.push(`Category ${a.category} may not be a standard EAD eligibility category — verify category code`);
  }

  // Check auto extension warning for post-Oct 2025 filings
  if (a.autoExtension.eligible === false && a.applicationType === 'renewal' && a.autoExtension.extensionDays === 0 && a.category !== 'unknown') {
    issues.push('Automatic EAD extension no longer available for renewals filed on or after Oct. 30, 2025 — plan for potential gap in work authorization');
  }

  // Check legal representation for high-risk cases
  if (a.riskLevel === 'high' && !ctx.userText.match(/attorney|lawyer|legal counsel|representation/i)) {
    issues.push('High-risk case — legal representation strongly recommended');
  }

  // Check underlying case denied
  if (a.eventType === 'underlying_case_change') {
    issues.push('Underlying case status has changed — this may affect EAD eligibility. Verify category compatibility before filing.');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: I765Context): I765Context {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');
  const a = ctx.analysis;

  // Category mismatch with underlying case
  if (!a.underlyingConsistent && a.underlyingCase !== 'none' && a.category !== 'unknown') {
    issues.push(`Category ${a.categoryDescription.code} with incompatible underlying case (${a.underlyingCase}) — this will result in denial`);
  }

  // Unknown category with filing
  if (a.category === 'unknown' && a.applicationType !== 'not_determined') {
    issues.push('Application type selected but category unknown — cannot file without valid eligibility category');
  }

  // Missing all evidence
  if (a.evidenceTypes.length === 1 && a.evidenceTypes[0] === 'unknown' && a.category !== 'unknown') {
    issues.push('No evidence types detected — EAD application requires category-specific supporting documentation');
  }

  // Expired EAD with no auto extension
  if (a.expirationStatus === 'expired' && !a.autoExtension.eligible && a.applicationType === 'renewal') {
    issues.push('EAD expired with no automatic extension available — applicant has gap in work authorization');
  }

  // Renewal filed too early
  if (a.daysUntilExpiry !== null && a.daysUntilExpiry > 180 && a.applicationType === 'renewal') {
    issues.push(`Renewal filed ${a.daysUntilExpiry} days before expiration — USCIS recommends filing 90-180 days before expiration`);
  }

  // High risk with no attorney
  if (a.riskLevel === 'high' && !ctx.userText.match(/attorney|lawyer|legal counsel/i)) {
    issues.push('High-risk case without legal representation — attorney consultation recommended');
  }

  // Underlying case denied but still filing
  if (a.eventType === 'underlying_case_change' && ctx.userText.match(/denied/i)) {
    issues.push('Underlying case denied — EAD eligibility may be terminated. File appeal or new application immediately');
  }

  // Wrong fee
  if (a.category === 'c9' && a.fee.amount === 520 && a.filedWithI485) {
    issues.push('Filed with I-485 but standard fee applied — should be $260 (reduced fee for concurrent I-485 filing)');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY_COMPLETE', detail: issues.length === 0 ? 'Passed X-Ray review' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: I765Context, approved: boolean): I765Context {
  if (!ctx.draft) throw new Error('Must draft before user review');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: approved ? 'User approved the draft' : 'User rejected the draft' }],
  };
}

export function pay(ctx: I765Context, paymentVerified: boolean): I765Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: paymentVerified,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: paymentVerified ? 'Payment verified' : 'Payment failed' }],
  };
}

export function fulfill(ctx: I765Context, fulfillmentId: string): I765Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: I765Context, trackingNumber: string): I765Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking: ${trackingNumber}` }],
  };
}

export function prove(ctx: I765Context, proofId: string): I765Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

export function createIdempotencyKey(ctx: I765Context): string {
  return `i765:${ctx.caseId}:${ctx.ownerId}`;
}

export function verifyIdempotency(ctx: I765Context, previousKeys: Set<string>): { duplicate: boolean; key: string } {
  const key = createIdempotencyKey(ctx);
  return { duplicate: previousKeys.has(key), key };
}

// ─── Owner Isolation ────────────────────────────────────────────────────────

export function verifyOwnerIsolation(ctxA: I765Context, ctxB: I765Context): boolean {
  return ctxA.ownerId !== ctxB.ownerId || ctxA.caseId === ctxB.caseId;
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

export function runFullPipeline(
  caseId: string,
  ownerId: string,
  userText: string,
  options?: {
    eadExpirationDate?: string;
    filingDate?: string;
    filingMethod?: 'paper' | 'online';
    receiptNumber?: string;
    language?: 'en' | 'es';
    approved?: boolean;
    paymentVerified?: boolean;
    fulfillmentId?: string;
    trackingNumber?: string;
    proofId?: string;
  },
): I765Context {
  let ctx = createI765Context(caseId, ownerId, options?.language ?? 'en');
  ctx = intake(ctx, userText, options?.eadExpirationDate, options?.filingDate, options?.filingMethod, options?.receiptNumber);
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

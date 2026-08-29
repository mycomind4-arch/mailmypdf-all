/**
 * I-131 Advance Parole / Travel Document Workflow Engine
 *
 * State machine:
 *   intake -> analyzed -> classified -> strategy_built -> drafted -> validated ->
 *   xray_complete -> user_review -> approved -> paid -> fulfilled -> tracked -> proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional notice/upload)
 *   - Authority (INA 223, 212(d)(5), 245, 8 CFR 223, 212.5, 245.2)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - I-765: employment authorization lifecycle, not travel authorization
 *   - Consular Processing: visa lifecycle, not travel document filing
 *   - Case Inquiry: delay checking, not affirmative filing
 *   - RFE/NOID: evidence responses, not travel document lifecycle
 *
 * RFE/NOID for I-131 applications route to the existing RFE/NOID engines.
 * Case inquiries for delayed I-131 applications route to the case-inquiry workflow.
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeI131,
  buildI131Strategy,
  type I131Analysis,
  type I131Strategy,
  type I131EventType,
  type TravelDocType,
  type TravelAppType,
  type UnderlyingStatus,
  type TravelUrgency,
  type DocExpirationStatus,
  type TravelRiskLevel,
  type TravelRiskResult,
  type EmergencyAnalysis,
  type TravelEvidenceType,
  type FilingRiskLevel,
  type FeeResult,
} from './i131-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type I131State =
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

export const I131_STATES: I131State[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface I131Context {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  docExpirationDate?: string;
  travelDate?: string;
  filingMethod?: 'paper' | 'online';
  receiptNumber?: string;
  analysis?: I131Analysis;
  strategy?: I131Strategy;
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

export function createI131Context(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): I131Context {
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
  ctx: I131Context,
  text: string,
  docExpirationDate?: string,
  travelDate?: string,
  filingMethod?: 'paper' | 'online',
  receiptNumber?: string,
): I131Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    docExpirationDate,
    travelDate,
    filingMethod,
    receiptNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described I-131 travel document situation' }],
  };
}

export function analyze(ctx: I131Context): I131Context {
  const analysis = analyzeI131(
    ctx.userText,
    ctx.docExpirationDate,
    ctx.travelDate,
    ctx.filingMethod,
  );
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Doc type: ${analysis.docType}, app type: ${analysis.appType}, urgency: ${analysis.travelUrgency}` }],
  };
}

export function classify(ctx: I131Context): I131Context {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `Doc type: ${ctx.analysis.docType}, risk: ${ctx.analysis.filingRisk}` }],
  };
}

export function buildStrategy(ctx: I131Context): I131Context {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildI131Strategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach.substring(0, 100)}` }],
  };
}

export function draft(ctx: I131Context): I131Context {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;
  const docTypeName = a.docType.replace(/_/g, ' ');

  const draftText = [
    `${s.approach}`,
    ``,
    `To: USCIS ${a.filingMethod === 'online' ? '(file online via myUSCIS)' : 'Lockbox (varies by document type — check USCIS.gov for filing address)'}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Form I-131 Application for Travel Document`,
    `Document Type: ${docTypeName}`,
    `Application Type: ${a.appType}`,
    `${ctx.receiptNumber ? `Receipt Number: ${ctx.receiptNumber}` : ''}`,
    ``,
    `Dear USCIS Officer,`,
    ``,
    `I am applying for a ${docTypeName} pursuant to Form I-131.`,
    ``,
    `Document Type:`,
    `${docTypeName}`,
    `Authority: ${a.authority.join('; ')}`,
    ``,
    `Application Type:`,
    a.appType === 'initial' ? 'Initial application for travel document.' : a.appType === 'renewal' ? 'Renewal of existing travel document.' : a.appType === 'replacement' ? 'Replacement of lost/stolen/damaged travel document.' : a.appType === 'emergency' ? 'Emergency advance parole request.' : 'Application type to be determined.',
    ``,
    `Underlying Status:`,
    a.underlyingStatus !== 'none' ? `My underlying status: ${a.underlyingStatus.replace(/_/g, ' ')}.` : 'No specific underlying status mentioned.',
    a.statusConsistent ? 'Underlying status is consistent with the document type.' : 'Verify underlying status compatibility before filing.',
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
    s.validityNote,
    ``,
    s.expirationNote,
    ``,
    s.travelRiskNote,
    ``,
    a.appType === 'emergency' ? s.emergencyNote : '',
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
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: `I-131 ${a.appType} letter drafted for ${docTypeName}` }],
  };
}

export function validate(ctx: I131Context): I131Context {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must draft before validating');
  const a = ctx.analysis;

  // Check document type identification
  if (a.docType === 'not_determined') {
    issues.push('Travel document type not identified — determine whether you need Advance Parole, Re-entry Permit, or Refugee Travel Document based on your current immigration status');
  }

  // Check underlying status consistency
  if (!a.statusConsistent && a.underlyingStatus !== 'none' && a.docType !== 'not_determined' && a.docType !== 'replacement') {
    issues.push(`Underlying status (${a.underlyingStatus.replace(/_/g, ' ')}) may not support ${a.docType.replace(/_/g, ' ')} — verify eligibility before filing`);
  }

  // Check missing evidence
  if (a.missingEvidence.length > 0) {
    issues.push(`${a.missingEvidence.length} piece(s) of evidence missing: ${a.missingEvidence.join(', ')}`);
  }

  // Check expired document for renewal
  if (a.docExpiration === 'expired' && a.appType === 'renewal') {
    issues.push('Travel document has expired — file renewal immediately if you need to travel');
  }

  // Check application type
  if (a.appType === 'not_determined') {
    issues.push('Application type not determined — specify whether this is an initial, renewal, replacement, or emergency application');
  }

  // Check high travel risk
  if (a.travelRisk.level === 'high' || a.travelRisk.level === 'critical') {
    issues.push(`Travel risk is ${a.travelRisk.level}: ${a.travelRisk.factors.join('; ')}. Legal consultation strongly recommended.`);
  }

  // Check emergency without evidence
  if (a.appType === 'emergency' && a.emergencyAnalysis.isEmergency && !a.emergencyAnalysis.hasEvidence) {
    issues.push(`Emergency advance parole requested but no emergency evidence detected — gather: ${a.emergencyAnalysis.evidenceDescription}`);
  }

  // Check pending I-485 without advance parole (abandonment risk)
  if (a.underlyingStatus === 'pending_i485' && !a.hasDocument && a.docType === 'advance_parole') {
    issues.push('Travel without advance parole while I-485 is pending will result in abandonment of your adjustment application');
  }

  // Check H-1B/L-1 dual-intent
  if ((a.underlyingStatus === 'h1b_status' || a.underlyingStatus === 'l1_status') && a.docType === 'advance_parole') {
    issues.push('H-1B and L-1 visa holders may travel on their valid visa without advance parole (dual-intent exception). Filing I-131 is optional but recommended as a backup.');
  }

  // Check legal representation for high-risk cases
  if (a.filingRisk === 'high' && !ctx.userText.match(/attorney|lawyer|legal counsel|representation/i)) {
    issues.push('High-risk filing — legal representation strongly recommended');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: I131Context): I131Context {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');
  const a = ctx.analysis;

  // Document type with inconsistent status
  if (!a.statusConsistent && a.underlyingStatus !== 'none' && a.docType !== 'not_determined' && a.docType !== 'replacement') {
    issues.push(`Document type ${a.docType.replace(/_/g, ' ')} with incompatible status (${a.underlyingStatus}) — this will result in denial`);
  }

  // Unknown document type with filing
  if (a.docType === 'not_determined' && a.appType !== 'not_determined') {
    issues.push('Application type selected but document type unknown — cannot file without valid document type');
  }

  // No evidence detected
  if (a.evidenceTypes.length === 1 && a.evidenceTypes[0] === 'unknown' && a.docType !== 'not_determined') {
    issues.push('No evidence types detected — I-131 requires document-type-specific supporting documentation');
  }

  // High travel risk not addressed
  if (a.travelRisk.level === 'high' || a.travelRisk.level === 'critical') {
    issues.push(`Travel risk ${a.travelRisk.level} not addressed in filing — applicant should consult attorney`);
  }

  // Emergency without evidence
  if (a.appType === 'emergency' && !a.emergencyAnalysis.hasEvidence) {
    issues.push('Emergency advance parole without evidence of emergency — application will be denied');
  }

  // Document expiring before return (if travel date known)
  if (a.docExpiration === 'near_expiry' && a.travelUrgency !== 'routine') {
    issues.push('Travel document may expire before return — verify validity for entire trip duration');
  }

  // High filing risk without attorney
  if (a.filingRisk === 'high' && !ctx.userText.match(/attorney|lawyer|legal counsel/i)) {
    issues.push('High-risk filing without legal representation — attorney consultation recommended');
  }

  // Pending I-485 travel without AP
  if (a.underlyingStatus === 'pending_i485' && !a.hasDocument && a.docType === 'advance_parole') {
    issues.push('Critical: applicant has pending I-485 and no advance parole — any travel will abandon the adjustment application');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY_COMPLETE', detail: issues.length === 0 ? 'Passed X-Ray review' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: I131Context, approved: boolean): I131Context {
  if (!ctx.draft) throw new Error('Must draft before user review');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: approved ? 'User approved the draft' : 'User rejected the draft' }],
  };
}

export function pay(ctx: I131Context, paymentVerified: boolean): I131Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: paymentVerified,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: paymentVerified ? 'Payment verified' : 'Payment failed' }],
  };
}

export function fulfill(ctx: I131Context, fulfillmentId: string): I131Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: I131Context, trackingNumber: string): I131Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking: ${trackingNumber}` }],
  };
}

export function prove(ctx: I131Context, proofId: string): I131Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

export function createIdempotencyKey(ctx: I131Context): string {
  return `i131:${ctx.caseId}:${ctx.ownerId}`;
}

export function verifyIdempotency(ctx: I131Context, previousKeys: Set<string>): { duplicate: boolean; key: string } {
  const key = createIdempotencyKey(ctx);
  return { duplicate: previousKeys.has(key), key };
}

// ─── Owner Isolation ────────────────────────────────────────────────────────

export function verifyOwnerIsolation(ctxA: I131Context, ctxB: I131Context): boolean {
  return ctxA.ownerId !== ctxB.ownerId || ctxA.caseId === ctxB.caseId;
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

export function runFullPipeline(
  caseId: string,
  ownerId: string,
  userText: string,
  options?: {
    docExpirationDate?: string;
    travelDate?: string;
    filingMethod?: 'paper' | 'online';
    receiptNumber?: string;
    language?: 'en' | 'es';
    approved?: boolean;
    paymentVerified?: boolean;
    fulfillmentId?: string;
    trackingNumber?: string;
    proofId?: string;
  },
): I131Context {
  let ctx = createI131Context(caseId, ownerId, options?.language ?? 'en');
  ctx = intake(ctx, userText, options?.docExpirationDate, options?.travelDate, options?.filingMethod, options?.receiptNumber);
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

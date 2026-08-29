/**
 * I-601 / I-601A Inadmissibility Waiver Workflow Engine
 *
 * State machine:
 *   intake -> analyzed -> classified -> strategy_built -> drafted -> validated ->
 *   xray_complete -> user_review -> approved -> paid -> fulfilled -> tracked -> proven
 *
 * Reuses:
 *   - Case (shared canonical case)
 *   - IntakeSession (shared intake)
 *   - DocumentUnderstanding (optional notice upload)
 *   - Authority (INA 212, 8 CFR 212.7, Policy Manual Vol. 9)
 *   - MailMyPDF (fulfillment, tracking, proof)
 *   - Pricing (shared pricing)
 *   - Approval (explicit approval gate)
 *   - X-Ray (adversarial review)
 *   - Audit (audit trail)
 *
 * Distinct from:
 *   - I-751: removal of conditions on conditional residence, not inadmissibility waiver
 *   - Visa Refusal: handles 221(g)/214(b)/212(a) consular refusal, not the waiver filing lifecycle
 *   - Consular Processing: manages visa lifecycle (DS-260, NVC), not waiver adjudication
 *   - RFE/NOID: handles evidence requests, not the full I-601/I-601A filing lifecycle
 *   - Denial: handles denial responses, not waiver application preparation/filing
 *
 * RFE/NOID for I-601 applications route to the existing RFE/NOID engines
 * with I-601 form context passed through the form adapter.
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import {
  analyzeI601,
  buildI601Strategy,
  type I601Analysis,
  type I601Strategy,
  type I601EventType,
  type I601Urgency,
  type WaiverPathway,
  type InadmissibilityGround,
  type QualifyingRelativeType,
  type HardshipFactor,
  type WaiverEvidenceType,
  type I601RiskLevel,
  type I601AEligibility,
} from './i601-model';

// ─── States ──────────────────────────────────────────────────────────────────

export type I601State =
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

export const I601_STATES: I601State[] = [
  'intake', 'analyzed', 'classified', 'strategy_built', 'drafted',
  'validated', 'xray_complete', 'user_review', 'approved', 'paid',
  'fulfilled', 'tracked', 'proven',
];

// ─── Context ─────────────────────────────────────────────────────────────────

export interface I601Context {
  caseId: string;
  ownerId: string;
  language: LanguageContext;
  userText: string;
  formType?: string;
  receiptNumber?: string;
  filingDeadline?: string;
  interviewDate?: string;
  analysis?: I601Analysis;
  strategy?: I601Strategy;
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

export function createI601Context(caseId: string, ownerId: string, language: 'en' | 'es' = 'en'): I601Context {
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
  ctx: I601Context,
  text: string,
  formType?: string,
  receiptNumber?: string,
  filingDeadline?: string,
  interviewDate?: string,
): I601Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    userText: text,
    formType,
    receiptNumber,
    filingDeadline,
    interviewDate,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'INTAKE', detail: 'User described I-601/I-601A inadmissibility waiver situation' }],
  };
}

export function analyze(ctx: I601Context): I601Context {
  const analysis = analyzeI601(
    ctx.userText,
    ctx.formType,
    ctx.receiptNumber,
    ctx.filingDeadline,
    ctx.interviewDate,
  );
  const now = new Date().toISOString();
  return {
    ...ctx,
    analysis,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'ANALYZED', detail: `Pathway: ${analysis.pathway}, ground: ${analysis.inadmissibilityGround}, qualifying relative: ${analysis.qualifyingRelative}, hardship factors: ${analysis.hardshipFactors.length}` }],
  };
}

export function classify(ctx: I601Context): I601Context {
  if (!ctx.analysis) throw new Error('Must analyze before classifying');
  const now = new Date().toISOString();
  return {
    ...ctx,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'CLASSIFIED', detail: `Pathway: ${ctx.analysis.pathway}, ground: ${ctx.analysis.inadmissibilityGround}, risk: ${ctx.analysis.riskLevel}` }],
  };
}

export function buildStrategy(ctx: I601Context): I601Context {
  if (!ctx.analysis) throw new Error('Must analyze before building strategy');
  const strategy = buildI601Strategy(ctx.analysis);
  const now = new Date().toISOString();
  return {
    ...ctx,
    strategy,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'STRATEGY_BUILT', detail: `Approach: ${strategy.approach.substring(0, 100)}` }],
  };
}

export function draft(ctx: I601Context): I601Context {
  if (!ctx.analysis || !ctx.strategy) throw new Error('Must analyze and build strategy before drafting');

  const a = ctx.analysis;
  const s = ctx.strategy;

  const draftText = [
    `${s.approach}`,
    ``,
    `To: USCIS ${a.pathway === 'I-601A' ? 'Lockbox (Dallas or Chicago)' : 'USCIS Field Office or Lockbox'}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
    ``,
    `Re: Form ${a.pathway} Application for ${a.pathway === 'I-601A' ? 'Provisional Unlawful Presence Waiver' : 'Waiver of Grounds of Inadmissibility'}${a.receiptNumber ? ` — Receipt Number: ${a.receiptNumber}` : ''}`,
    `Inadmissibility Ground: ${a.inadmissibilityGround}`,
    `Pathway: ${a.pathway}`,
    ``,
    `Dear USCIS Officer,`,
    ``,
    `I am writing in support of my Form ${a.pathway} application${a.receiptNumber ? ` (Receipt Number: ${a.receiptNumber})` : ''}.`,
    ``,
    s.pathwayNote,
    ``,
    `Inadmissibility Ground:`,
    `I have been found inadmissible under ${getWaiverAuthorityText(a.inadmissibilityGround)}.`,
    ``,
    `Qualifying Relative:`,
    `My qualifying relative is my ${qualifyingRelativeLabel(a.qualifyingRelative)}.`,
    ``,
    `Extreme Hardship:`,
    s.hardshipNote,
    ``,
    `Hardship Factors:`,
    ...a.hardshipFactors.map(f => `- ${f.replace(/_/g, ' ')}`),
    ``,
    `Key Arguments:`,
    ...s.keyArguments.map(arg => `- ${arg}`),
    ``,
    s.supportingEvidence.length > 0 ? `Supporting Documentation Enclosed:` : '',
    ...s.supportingEvidence.map(e => `- ${e}`),
    ``,
    s.discretionaryNote,
    ``,
    s.consularNote,
    ``,
    `I respectfully request your favorable consideration of this waiver application.`,
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
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'DRAFTED', detail: `${a.pathway} waiver letter drafted` }],
  };
}

export function validate(ctx: I601Context): I601Context {
  const issues: string[] = [];

  if (!ctx.draft) throw new Error('Must draft before validating');
  if (!ctx.analysis) throw new Error('No analysis');

  const a = ctx.analysis;

  // Check waiver availability
  if (!a.waiverAvailable && a.inadmissibilityGround !== 'unknown') {
    issues.push(`Inadmissibility ground (${a.inadmissibilityGround}) may not be waivable — legal consultation required`);
  }

  // Check qualifying relative
  if (a.qualifyingRelative === 'no_qualifying_relative') {
    issues.push('No qualifying relative identified — waiver cannot be approved without a USC or LPR qualifying relative');
  }
  if (a.qualifyingRelative === 'unknown') {
    issues.push('Qualifying relative mentioned but USC/LPR status not confirmed — verify citizenship/residency status');
  }

  // Check I-601A eligibility
  if (a.pathway === 'I-601A' && a.i601aEligibilityFailures.length > 0) {
    issues.push(`I-601A eligibility issues (${a.i601aEligibilityFailures.length}): ${a.i601aEligibilityFailures.join('; ')}`);
  }

  // Check hardship factors
  if (a.hardshipFactors.length === 0 || (a.hardshipFactors.length === 1 && (a.hardshipFactors[0] === 'unknown' || a.hardshipFactors[0] === 'none'))) {
    issues.push('No extreme hardship factors identified — waiver requires demonstration of extreme hardship to qualifying relative');
  }

  // Check evidence
  if (a.evidenceTypes.length === 0 || (a.evidenceTypes.length === 1 && a.evidenceTypes[0] === 'unknown')) {
    issues.push('No documentary evidence identified — waiver application requires supporting documentation');
  }

  // Check pathway determination
  if (a.pathway === 'not_determined') {
    issues.push('Waiver pathway not determined — specify whether filing I-601 (after inadmissibility finding) or I-601A (provisional, before departure)');
  }

  // Check ground identification
  if (a.inadmissibilityGround === 'unknown') {
    issues.push('Inadmissibility ground not identified — specify the ground of inadmissibility (unlawful presence, fraud, criminal, health, smuggling, etc.)');
  }

  // Check non-waivable ground warnings
  if (a.inadmissibilityGround === 'security_ground') {
    issues.push('Security-related inadmissibility generally has no waiver available — consult immigration attorney immediately');
  }
  if (a.inadmissibilityGround === 'unlawful_presence_after_removal') {
    issues.push('Permanent bar (INA § 212(a)(9)(C)) requires I-212 permission to reapply after 10 years — I-601 alone is insufficient');
  }

  // Check I-601A child qualifying relative
  if (a.pathway === 'I-601A' && (a.qualifyingRelative === 'us_citizen_child' || a.qualifyingRelative === 'lpr_child')) {
    issues.push('I-601A qualifying relative is spouse or parent only — children do not qualify for I-601A');
  }

  // Check legal representation for high-risk cases
  if ((a.riskLevel === 'high' || a.riskLevel === 'elevated') && !ctx.userText.match(/attorney|lawyer|legal counsel|representation/i)) {
    issues.push(`High-risk case (${a.riskLevel}) — legal representation strongly recommended`);
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    validationIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'VALIDATED', detail: issues.length === 0 ? 'Passed validation' : `${issues.length} validation issues` }],
  };
}

export function xray(ctx: I601Context): I601Context {
  const issues: string[] = [];

  if (!ctx.draft || !ctx.analysis) throw new Error('Must validate before X-Ray');
  const a = ctx.analysis;

  // Adversarial review — catch classification errors and gaps

  // Non-waivable ground classified as waivable
  if (!a.waiverAvailable && a.inadmissibilityGround !== 'unknown' && a.pathway === 'I-601') {
    issues.push('Non-waivable ground classified as I-601 pathway — verify waiver availability before proceeding');
  }

  // I-601A with non-unlawful-presence ground
  if (a.pathway === 'I-601A' && a.inadmissibilityGround !== 'unlawful_presence' && a.inadmissibilityGround !== 'unknown') {
    issues.push('I-601A pathway selected but ground is not unlawful presence — I-601A only waives unlawful presence');
  }

  // I-601A with child as qualifying relative
  if (a.pathway === 'I-601A' && (a.qualifyingRelative === 'us_citizen_child' || a.qualifyingRelative === 'lpr_child')) {
    issues.push('I-601A with child as qualifying relative — I-601A qualifying relatives are spouse or parent only');
  }

  // High risk with weak hardship
  if (a.riskLevel === 'high' && a.hardshipFactors.length <= 1) {
    issues.push('High risk case with minimal hardship factors — waiver approval unlikely without stronger hardship evidence');
  }

  // No qualifying relative but waiver filed
  if (a.qualifyingRelative === 'no_qualifying_relative' && a.pathway !== 'not_determined') {
    issues.push('Waiver pathway selected but no qualifying relative — application will be denied');
  }

  // Fraud ground without § 212(i) authority
  if (a.inadmissibilityGround === 'fraud_misrepresentation' && !a.authority.some(auth => auth.includes('212(i)'))) {
    issues.push('Fraud/misrepresentation ground but INA § 212(i) authority not cited — verify correct waiver statute');
  }

  // Criminal ground without § 212(h) authority
  if (a.inadmissibilityGround === 'criminal_ground' && !a.authority.some(auth => auth.includes('212(h)'))) {
    issues.push('Criminal ground but INA § 212(h) authority not cited — verify correct waiver statute');
  }

  // I-601A eligibility failures not addressed in strategy
  if (a.pathway === 'I-601A' && a.i601aEligibilityFailures.length > 0 && a.strategy?.eligibilityGates.length === 0) {
    issues.push('I-601A eligibility failures detected but not listed in strategy eligibility gates');
  }

  // Elevated risk but no attorney recommendation
  if ((a.riskLevel === 'elevated' || a.riskLevel === 'high') && !a.recommendedAction.includes('attorney') && !a.recommendedAction.includes('legal')) {
    issues.push('Elevated/high risk case but no legal consultation recommended in action plan');
  }

  const now = new Date().toISOString();
  return {
    ...ctx,
    xrayIssues: issues,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'XRAY_COMPLETE', detail: issues.length === 0 ? 'Passed X-Ray review' : `${issues.length} X-Ray issues` }],
  };
}

export function userReview(ctx: I601Context, approved: boolean): I601Context {
  if (!ctx.draft) throw new Error('Must draft before user review');
  const now = new Date().toISOString();
  return {
    ...ctx,
    approved,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'USER_REVIEW', detail: approved ? 'User approved the draft' : 'User rejected the draft' }],
  };
}

export function pay(ctx: I601Context, paymentVerified: boolean): I601Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    paid: paymentVerified,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PAID', detail: paymentVerified ? 'Payment verified' : 'Payment failed' }],
  };
}

export function fulfill(ctx: I601Context, fulfillmentId: string): I601Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    fulfillmentId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'FULFILLED', detail: `Fulfillment ID: ${fulfillmentId}` }],
  };
}

export function track(ctx: I601Context, trackingNumber: string): I601Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    trackingNumber,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'TRACKED', detail: `Tracking: ${trackingNumber}` }],
  };
}

export function prove(ctx: I601Context, proofId: string): I601Context {
  const now = new Date().toISOString();
  return {
    ...ctx,
    proofId,
    auditTrail: [...ctx.auditTrail, { timestamp: now, event: 'PROVEN', detail: `Proof ID: ${proofId}` }],
  };
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

export function createIdempotencyKey(ctx: I601Context): string {
  return `i601:${ctx.caseId}:${ctx.ownerId}`;
}

export function verifyIdempotency(ctx: I601Context, previousKeys: Set<string>): { duplicate: boolean; key: string } {
  const key = createIdempotencyKey(ctx);
  return { duplicate: previousKeys.has(key), key };
}

// ─── Owner Isolation ────────────────────────────────────────────────────────

export function verifyOwnerIsolation(ctxA: I601Context, ctxB: I601Context): boolean {
  return ctxA.ownerId !== ctxB.ownerId || ctxA.caseId === ctxB.caseId;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWaiverAuthorityText(ground: InadmissibilityGround): string {
  const authMap: Record<string, string> = {
    unlawful_presence: 'INA § 212(a)(9)(B)',
    fraud_misrepresentation: 'INA § 212(a)(6)(C)(i)',
    criminal_ground: 'INA § 212(a)(2)',
    health_ground: 'INA § 212(a)(1)',
    smuggling: 'INA § 212(a)(6)(E)',
    prior_removal: 'INA § 212(a)(9)(A)',
    unlawful_presence_after_removal: 'INA § 212(a)(9)(C)',
    public_charge: 'INA § 212(a)(4)',
    security_ground: 'INA § 212(a)(3)',
    misrepresentation: 'INA § 212(a)(6)(C)',
    unknown: 'INA § 212',
  };
  return authMap[ground] || 'INA § 212';
}

function qualifyingRelativeLabel(rel: QualifyingRelativeType): string {
  const labels: Record<string, string> = {
    us_citizen_spouse: 'U.S. citizen spouse',
    lpr_spouse: 'lawful permanent resident spouse',
    us_citizen_parent: 'U.S. citizen parent',
    lpr_parent: 'lawful permanent resident parent',
    us_citizen_child: 'U.S. citizen son/daughter',
    lpr_child: 'lawful permanent resident son/daughter',
    no_qualifying_relative: 'no qualifying relative identified',
    unknown: 'qualifying relative (status to be verified)',
  };
  return labels[rel] || 'qualifying relative';
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

export function runFullPipeline(
  caseId: string,
  ownerId: string,
  userText: string,
  options?: {
    formType?: string;
    receiptNumber?: string;
    filingDeadline?: string;
    interviewDate?: string;
    language?: 'en' | 'es';
    approved?: boolean;
    paymentVerified?: boolean;
    fulfillmentId?: string;
    trackingNumber?: string;
    proofId?: string;
  },
): I601Context {
  let ctx = createI601Context(caseId, ownerId, options?.language ?? 'en');
  ctx = intake(ctx, userText, options?.formType, options?.receiptNumber, options?.filingDeadline, options?.interviewDate);
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

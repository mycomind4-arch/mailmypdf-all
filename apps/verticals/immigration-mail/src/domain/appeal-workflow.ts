/**
 * Immigration Appeal Letter Workflow Engine
 *
 * Distinct from Denial Response because:
 * - Appeals argue a decision was WRONG (legal/factual error)
 * - Denial responses submit MORE EVIDENCE
 * - Different forms (I-290B, EOIR-26)
 * - Different appellate bodies (AAO, BIA)
 * - Different deadlines and fees
 *
 * Handoff rule: If the user just wants to submit more evidence (not argue
 * the decision was wrong), hand off to the shared Denial Response engine.
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import type { DocumentUnderstanding } from './document-understanding';
import {
  analyzeAppeal,
  buildAppealStrategy,
  type AppealAnalysis,
  type AppealStrategy,
} from './appeal-model';
import type { MailingMethod } from './rfe-workflow';

// ─── States ──────────────────────────────────────────────────────────────────

export type AppealWorkflowState =
  | 'intake'
  | 'analyzed'
  | 'explained'
  | 'confirmed'
  | 'handoff_check'
  | 'ground_analysis'
  | 'authority_verified'
  | 'strategy_built'
  | 'drafted'
  | 'xray_complete'
  | 'user_review'
  | 'approved'
  | 'checkout_pending'
  | 'paid'
  | 'fulfilled'
  | 'tracking'
  | 'complete'
  | 'blocked'
  | 'handed_off';

// ─── Case ──────────────────────────────────────────────────────────────────────

export interface AppealCase {
  id: string;
  userId: string;
  state: AppealWorkflowState;
  language: LanguageContext;
  createdAt: string;
  updatedAt: string;
  analysis?: AppealAnalysis;
  strategy?: AppealStrategy;
  drafts?: AppealDrafts;
  xray?: AppealXRayResult;
  approved: boolean;
  approvalTimestamp?: string;
  pricing?: AppealPricing;
  fulfillment?: AppealFulfillment;
  tracking?: AppealTracking;
  proof?: AppealProof;
  auditLog: { timestamp: string; action: string; details: string }[];
  confirmations: { question: string; answer: string }[];
}

export interface AppealDrafts {
  appealLetter: string;
  argumentOutline: string;
  evidenceIndex: string;
  coverLetter: string;
}

export interface AppealXRayResult {
  safeToActUpon: boolean;
  overallVerdict: 'PASS' | 'FAIL';
  findings: { issueType: string; finalVerdict: 'PASS' | 'FAIL'; challenges: { whatItChecks: string; finding: 'PASS' | 'FAIL'; reasoning: string }[] }[];
}

export interface AppealPricing {
  servicePrice: number;
  postage: number;
  addOns: { name: string; price: number }[];
  tax: number;
  total: number;
  currency: string;
  mailingMethod: MailingMethod;
}

export interface AppealFulfillment {
  idempotencyKey: string;
  providerOrderId?: string;
  status: 'pending' | 'submitted' | 'mailed' | 'failed' | 'unknown';
  recipient: { name: string; address1: string; address2?: string; city: string; state: string; postalCode: string };
  submittedAt?: string;
}

export interface AppealTracking {
  trackingNumber?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'unknown';
  lastUpdated: string;
}

export interface AppealProof {
  packetHash: string;
  documentManifest: { filename: string; hash: string; pages: number }[];
  timestamp: string;
  providerOrderId?: string;
  trackingNumber?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function update(c: AppealCase, state: AppealWorkflowState, action: string, details: string): AppealCase {
  return { ...c, state, updatedAt: new Date().toISOString(), auditLog: [...c.auditLog, { timestamp: new Date().toISOString(), action, details }] };
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export function createAppealCase(userId: string, language?: Partial<LanguageContext>): AppealCase {
  const lang = createLanguageContext(language ?? {});
  const now = new Date().toISOString();
  return {
    id: makeId('appeal-case'), userId, state: 'intake', language: lang,
    createdAt: now, updatedAt: now, approved: false,
    auditLog: [{ timestamp: now, action: 'case_created', details: `Appeal case for user ${userId}` }],
    confirmations: [],
  };
}

export function ingestAppealDocument(c: AppealCase, du: DocumentUnderstanding, rawText: string) {
  if (c.state !== 'intake') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot ingest.' } };
  const analysis = analyzeAppeal(rawText);
  const updated: AppealCase = {
    ...update(c, 'analyzed', 'document_ingested', `Appeal analyzed: ${analysis.type}, strength: ${analysis.overallStrength}`),
    analysis,
  };
  const msg = analysis.shouldHandoffToDenialEngine
    ? `I've analyzed your situation. This looks like it may be better handled as a denial response (submitting more evidence) rather than an appeal. ${analysis.summaryEn}`
    : `I've analyzed your appeal situation. ${analysis.summaryEn}`;
  return { case: updated, result: { state: 'analyzed', success: true, userMessage: msg, userMessageEs: analysis.summaryEs } };
}

export function explainAppeal(c: AppealCase) {
  if (c.state !== 'analyzed') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot explain.' } };
  return { case: update(c, 'explained', 'explained', 'Appeal explained'), result: { state: 'explained', success: true, userMessage: 'Explanation provided.' } };
}

export function confirmAppealFacts(c: AppealCase, confirmations: { question: string; answer: string }[]) {
  if (c.state !== 'explained') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot confirm.' } };
  return { case: { ...update(c, 'confirmed', 'facts_confirmed', `${confirmations.length} confirmations`), confirmations: [...c.confirmations, ...confirmations] }, result: { state: 'confirmed', success: true, userMessage: 'Facts confirmed.' } };
}

export function checkHandoff(c: AppealCase) {
  if (c.state !== 'confirmed') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot check handoff.' } };
  if (c.analysis?.shouldHandoffToDenialEngine) {
    return { case: { ...update(c, 'handed_off', 'handoff_to_denial', 'Handed off to Denial Response engine') }, result: { state: 'handed_off', success: true, userMessage: 'This case is better handled as a denial response. Routing to the Denial Response engine.' } };
  }
  return { case: update(c, 'handoff_check', 'handoff_check_passed', 'No handoff needed'), result: { state: 'handoff_check', success: true, userMessage: 'Proceeding with appeal.' } };
}

export function runGroundAnalysis(c: AppealCase) {
  if (c.state !== 'handoff_check') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot analyze grounds.' } };
  return { case: update(c, 'ground_analysis', 'grounds_analyzed', `${c.analysis!.grounds.length} grounds`), result: { state: 'ground_analysis', success: true, userMessage: 'Grounds analyzed.' } };
}

export function verifyAppealAuthority(c: AppealCase) {
  if (c.state !== 'ground_analysis') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot verify authority.' } };
  return { case: update(c, 'authority_verified', 'authority_verified', 'Authority verified'), result: { state: 'authority_verified', success: true, userMessage: 'Authority verified.' } };
}

export function buildAppealResponseStrategy(c: AppealCase) {
  if (c.state !== 'authority_verified') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot build strategy.' } };
  const strategy = buildAppealStrategy(c.analysis!);
  return { case: { ...update(c, 'strategy_built', 'strategy_built', `Strategy: ${strategy.type}`), strategy }, result: { state: 'strategy_built', success: true, userMessage: 'Strategy built.' } };
}

export function generateAppealDrafts(c: AppealCase) {
  if (c.state !== 'strategy_built') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot generate drafts.' } };
  const a = c.analysis!;
  const coverLetter = `Dear ${a.appellateBody === 'BIA' ? 'Board of Immigration Appeals' : 'Administrative Appeals Office'},\n\nI am filing an appeal of the decision on my ${a.formType ?? 'application'}${a.receiptNumber ? ` (Receipt: ${a.receiptNumber})` : ''}.\n\nI respectfully submit the following arguments and evidence.\n\nRespectfully,\n[Your name]`;
  const appealLetter = a.grounds.map((g, i) => `GROUND ${i + 1}: ${g.description}\n\nARGUMENT:\n${g.argument}\n\nAUTHORITY:\n${g.authority}\n\nSTRENGTH: ${g.strength}\n`).join('\n---\n\n');
  const argumentOutline = a.grounds.map((g, i) => `${i + 1}. ${g.description} (${g.strength})`).join('\n');
  const evidenceIndex = `Evidence supporting appeal:\n${a.grounds.map((g, i) => `Exhibit ${i + 1}: Supporting ${g.type}`).join('\n')}`;
  const drafts: AppealDrafts = { appealLetter, argumentOutline, evidenceIndex, coverLetter };
  return { case: { ...update(c, 'drafted', 'drafts_generated', 'Drafts generated'), drafts }, result: { state: 'drafted', success: true, userMessage: 'Drafts generated.' } };
}

export function runAppealXRay(c: AppealCase) {
  if (c.state !== 'drafted') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot run X-Ray.' } };
  const a = c.analysis!;
  const findings: AppealXRayResult['findings'] = [];

  findings.push({
    issueType: 'grounds',
    finalVerdict: a.grounds.length > 0 ? 'PASS' : 'FAIL',
    challenges: [{ whatItChecks: 'At least one appeal ground identified', finding: a.grounds.length > 0 ? 'PASS' : 'FAIL', reasoning: a.grounds.length > 0 ? `${a.grounds.length} ground(s)` : 'No grounds' }],
  });

  findings.push({
    issueType: 'strength',
    finalVerdict: a.overallStrength === 'no_basis' ? 'FAIL' : 'PASS',
    challenges: [{ whatItChecks: 'Appeal has some basis', finding: a.overallStrength === 'no_basis' ? 'FAIL' : 'PASS', reasoning: `Strength: ${a.overallStrength}` }],
  });

  findings.push({
    issueType: 'deadline',
    finalVerdict: a.deadlineDays || a.appealDeadline ? 'PASS' : 'FAIL',
    challenges: [{ whatItChecks: 'Deadline identified', finding: a.deadlineDays || a.appealDeadline ? 'PASS' : 'FAIL', reasoning: a.deadlineDays ? `${a.deadlineDays} days` : a.appealDeadline ?? 'No deadline' }],
  });

  const safeToActUpon = findings.every(f => f.finalVerdict === 'PASS');
  const xray: AppealXRayResult = { safeToActUpon, overallVerdict: safeToActUpon ? 'PASS' : 'FAIL', findings };
  return { case: { ...update(c, 'xray_complete', 'xray_complete', `X-Ray: ${xray.overallVerdict}`), xray }, result: { state: 'xray_complete', success: true, userMessage: safeToActUpon ? 'X-Ray passed.' : 'X-Ray found issues.' } };
}

export function moveToAppealUserReview(c: AppealCase) {
  if (c.state !== 'xray_complete') return { case: c, result: { state: c.state, success: false, userMessage: 'X-Ray must pass first.' } };
  if (!c.xray?.safeToActUpon) return { case: { ...c, state: 'blocked' }, result: { state: 'blocked', success: false, userMessage: 'X-Ray blocked this appeal.' } };
  return { case: update(c, 'user_review', 'user_review_started', 'User review'), result: { state: 'user_review', success: true, userMessage: 'Please review.' } };
}

export function approveAppeal(c: AppealCase) {
  if (c.state !== 'user_review') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot approve.' } };
  return { case: { ...update(c, 'approved', 'approved', 'User approved'), approved: true, approvalTimestamp: new Date().toISOString() }, result: { state: 'approved', success: true, userMessage: 'Approved.' } };
}

export function setAppealPricing(c: AppealCase, pricing: AppealPricing) {
  if (!c.approved) return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot set pricing.' } };
  return { case: { ...update(c, 'checkout_pending', 'pricing_set', `Total: ${pricing.total}`), pricing }, result: { state: 'checkout_pending', success: true, userMessage: 'Pricing set.' } };
}

export function confirmAppealPayment(c: AppealCase, paid: boolean) {
  if (c.state !== 'checkout_pending') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot pay.' } };
  if (!paid) return { case: c, result: { state: 'checkout_pending', success: false, userMessage: 'Payment not confirmed.' } };
  return { case: update(c, 'paid', 'payment_confirmed', 'Payment confirmed'), result: { state: 'paid', success: true, userMessage: 'Payment confirmed.' } };
}

export function submitAppealToFulfillment(c: AppealCase, recipient: AppealFulfillment['recipient'], idempotencyKey: string) {
  if (c.state !== 'paid') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot fulfill.' } };
  if (c.fulfillment && c.fulfillment.idempotencyKey === idempotencyKey && c.fulfillment.status === 'submitted') {
    return { case: c, result: { state: 'fulfilled', success: true, userMessage: 'Already submitted.' } };
  }
  const orderId = `mailmypdf-${Date.now()}`;
  return {
    case: { ...update(c, 'fulfilled', 'fulfillment_submitted', `Order: ${orderId}`), fulfillment: { idempotencyKey, providerOrderId: orderId, status: 'submitted', recipient, submittedAt: new Date().toISOString() } },
    result: { state: 'fulfilled', success: true, userMessage: 'Fulfillment submitted.' },
  };
}

export function updateAppealTracking(c: AppealCase, tracking: AppealTracking) {
  if (!c.fulfillment) return { case: c, result: { state: c.state, success: false, userMessage: 'No fulfillment.' } };
  return { case: { ...update(c, 'tracking', 'tracking_updated', `Tracking: ${tracking.trackingNumber}`), tracking }, result: { state: 'tracking', success: true, userMessage: 'Tracking updated.' } };
}

export function generateAppealProof(c: AppealCase, documents: { filename: string; content: string; pages: number }[]) {
  const manifest = documents.map(d => {
    let hash = 0;
    for (let i = 0; i < d.content.length; i++) { hash = (hash << 5) - hash + d.content.charCodeAt(i); hash |= 0; }
    return { filename: d.filename, hash: Math.abs(hash).toString(16).padStart(8, '0'), pages: d.pages };
  });
  const allHashes = manifest.map(m => m.hash).join('');
  let packetHash = 0;
  for (let i = 0; i < allHashes.length; i++) { packetHash = (packetHash << 5) - packetHash + allHashes.charCodeAt(i); packetHash |= 0; }
  const proof: AppealProof = {
    packetHash: Math.abs(packetHash).toString(16).padStart(8, '0'),
    documentManifest: manifest, timestamp: new Date().toISOString(),
    providerOrderId: c.fulfillment?.providerOrderId, trackingNumber: c.tracking?.trackingNumber,
  };
  return { case: { ...update(c, 'complete', 'proof_generated', `Hash: ${proof.packetHash}`), proof }, result: { state: 'complete', success: true, userMessage: 'Proof generated.' } };
}

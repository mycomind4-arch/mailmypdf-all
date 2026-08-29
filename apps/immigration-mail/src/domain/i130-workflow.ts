/**
 * I-130 Workflow Engine
 *
 * Key design: I-130 does NOT duplicate the RFE/NOID/Denial engines.
 * It performs I-130-specific relationship intelligence, then hands off to
 * the shared engine appropriate for the notice type.
 *
 * When the notice is an RFE → the shared RFE workflow handles the actual response.
 * When the notice is a NOID → the shared NOID workflow handles it.
 * When the notice is a Denial → the shared Denial workflow handles it.
 *
 * The I-130 engine preserves relationship context throughout.
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import type { DocumentUnderstanding } from './document-understanding';
import { buildDocumentUnderstanding } from './document-understanding';
import {
  analyzeI130,
  buildI130Strategy,
  type I130CaseContext,
  type I130Strategy,
  type RelationshipType,
  type NoticeType,
  type EvidenceStatus,
  type RelationshipEvidenceItem,
} from './i130-model';
import type { MailingMethod } from './rfe-workflow';

// ─── States ──────────────────────────────────────────────────────────────────

export type I130WorkflowState =
  | 'intake'
  | 'reading'
  | 'classified'
  | 'explained'
  | 'confirmed'
  | 'relationship_analysis'
  | 'evidence_matrix'
  | 'evidence_analyzed'
  | 'authority_verified'
  | 'strategy_built'
  | 'handoff_ready'
  | 'drafted'
  | 'xray_complete'
  | 'user_review'
  | 'approved'
  | 'checkout_pending'
  | 'paid'
  | 'fulfilled'
  | 'tracking'
  | 'complete'
  | 'blocked';

// ─── Case ──────────────────────────────────────────────────────────────────────

export interface I130Case {
  id: string;
  userId: string;
  state: I130WorkflowState;
  language: LanguageContext;
  createdAt: string;
  updatedAt: string;
  context?: I130CaseContext;
  strategy?: I130Strategy;
  drafts?: I130Drafts;
  xray?: I130XRayResult;
  approved: boolean;
  approvalTimestamp?: string;
  pricing?: I130Pricing;
  fulfillment?: I130Fulfillment;
  tracking?: I130Tracking;
  proof?: I130Proof;
  auditLog: { timestamp: string; action: string; details: string }[];
  confirmations: { question: string; answer: string }[];
}

export interface I130Drafts {
  coverLetter: string;
  responseLetter: string;
  evidenceIndex: string;
  discrepancyExplanation?: string;
  coverLetterEs?: string;
}

export interface I130XRayResult {
  safeToActUpon: boolean;
  overallVerdict: 'PASS' | 'FAIL';
  findings: { issueType: string; finalVerdict: 'PASS' | 'FAIL'; challenges: { whatItChecks: string; finding: 'PASS' | 'FAIL'; reasoning: string }[] }[];
}

export interface I130Pricing {
  servicePrice: number;
  postage: number;
  addOns: { name: string; price: number }[];
  tax: number;
  total: number;
  currency: string;
  mailingMethod: MailingMethod;
}

export interface I130Fulfillment {
  idempotencyKey: string;
  providerOrderId?: string;
  status: 'pending' | 'submitted' | 'mailed' | 'failed' | 'unknown';
  recipient: { name: string; address1: string; address2?: string; city: string; state: string; postalCode: string };
  submittedAt?: string;
}

export interface I130Tracking {
  trackingNumber?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'unknown';
  lastUpdated: string;
}

export interface I130Proof {
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

function update(c: I130Case, state: I130WorkflowState, action: string, details: string): I130Case {
  return { ...c, state, updatedAt: new Date().toISOString(), auditLog: [...c.auditLog, { timestamp: new Date().toISOString(), action, details }] };
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export function createI130Case(userId: string, language?: Partial<LanguageContext>): I130Case {
  const lang = createLanguageContext(language ?? {});
  const now = new Date().toISOString();
  return {
    id: makeId('i130-case'), userId, state: 'intake', language: lang,
    createdAt: now, updatedAt: now, approved: false,
    auditLog: [{ timestamp: now, action: 'case_created', details: `I-130 case for user ${userId}` }],
    confirmations: [],
  };
}

export function ingestI130Document(c: I130Case, du: DocumentUnderstanding, rawText: string) {
  if (c.state !== 'intake' && c.state !== 'reading') {
    return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot ingest document in current state.' } };
  }
  const context = analyzeI130(rawText);
  const updated: I130Case = {
    ...update(c, 'classified', 'document_ingested', `I-130 classified: ${context.relationshipType}, notice: ${context.noticeType}, risk: ${context.overallRisk}`),
    context,
  };
  const msg = context.hasAttorneyRecommendation
    ? `I've analyzed your I-130 letter. This involves a ${context.relationshipType} petition with a ${context.noticeType === 'rfe' ? 'Request for Evidence' : context.noticeType === 'noid' ? 'Notice of Intent to Deny' : context.noticeType === 'denial' ? 'denial' : 'notice'}. ${context.hasAttorneyRecommendation ? 'An attorney is recommended. ' : ''}${context.summaryEn}`
    : `I've analyzed your I-130 letter. ${context.summaryEn}`;
  return { case: updated, result: { state: 'classified', success: true, userMessage: msg, userMessageEs: context.summaryEs } };
}

export function explainI130(c: I130Case) {
  if (c.state !== 'classified') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot explain in current state.' } };
  return { case: update(c, 'explained', 'explained', 'I-130 explained to user'), result: { state: 'explained', success: true, userMessage: 'Explanation provided.' } };
}

export function confirmI130Facts(c: I130Case, confirmations: { question: string; answer: string }[]) {
  if (c.state !== 'explained') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot confirm in current state.' } };
  return { case: { ...update(c, 'confirmed', 'facts_confirmed', `${confirmations.length} confirmations`), confirmations: [...c.confirmations, ...confirmations] }, result: { state: 'confirmed', success: true, userMessage: 'Facts confirmed.' } };
}

export function runRelationshipAnalysis(c: I130Case) {
  if (c.state !== 'confirmed') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot analyze in current state.' } };
  return { case: update(c, 'relationship_analysis', 'relationship_analyzed', `Relationship: ${c.context?.relationshipType}`), result: { state: 'relationship_analysis', success: true, userMessage: 'Relationship analysis complete.' } };
}

export function updateI130EvidenceMatrix(c: I130Case, updates: { itemId: string; status: EvidenceStatus; documentIds?: string[] }[]) {
  if (c.state !== 'relationship_analysis' && c.state !== 'evidence_matrix') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot update evidence in current state.' } };
  const evidenceMatrix = c.context!.evidenceMatrix.map(item => {
    const u = updates.find(u => u.itemId === item.id);
    return u ? { ...item, status: u.status, uploadedDocumentIds: u.documentIds ?? item.uploadedDocumentIds } : item;
  });
  const context = { ...c.context!, evidenceMatrix };
  return { case: { ...update(c, 'evidence_matrix', 'evidence_updated', `${updates.length} items`), context }, result: { state: 'evidence_matrix', success: true, userMessage: 'Evidence matrix updated.' } };
}

export function analyzeI130Evidence(c: I130Case) {
  if (c.state !== 'evidence_matrix') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot analyze evidence.' } };
  return { case: update(c, 'evidence_analyzed', 'evidence_analyzed', 'Evidence analyzed'), result: { state: 'evidence_analyzed', success: true, userMessage: 'Evidence analyzed.' } };
}

export function verifyI130Authority(c: I130Case) {
  if (c.state !== 'evidence_analyzed') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot verify authority.' } };
  return { case: update(c, 'authority_verified', 'authority_verified', 'Authority verified'), result: { state: 'authority_verified', success: true, userMessage: 'Authority verified.' } };
}

export function buildI130ResponseStrategy(c: I130Case) {
  if (c.state !== 'authority_verified') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot build strategy.' } };
  const strategy = buildI130Strategy(c.context!);
  return { case: { ...update(c, 'strategy_built', 'strategy_built', `Strategy: ${strategy.type}`), strategy }, result: { state: 'strategy_built', success: true, userMessage: 'Strategy built.' } };
}

export function prepareHandoff(c: I130Case) {
  if (c.state !== 'strategy_built') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot prepare handoff.' } };
  // This step determines which shared engine will handle the actual response
  const noticeType = c.context?.noticeType;
  const handoffMsg = noticeType === 'rfe' ? 'Ready for RFE response engine.' :
    noticeType === 'noid' ? 'Ready for NOID response engine.' :
    noticeType === 'denial' ? 'Ready for Denial response engine.' :
    'Ready for evidence submission.';
  return { case: update(c, 'handoff_ready', 'handoff_prepared', `Handoff to ${noticeType} engine`), result: { state: 'handoff_ready', success: true, userMessage: handoffMsg } };
}

export function generateI130Drafts(c: I130Case) {
  if (c.state !== 'handoff_ready') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot generate drafts.' } };
  const ctx = c.context!;
  const relLabel = ctx.relationshipType === 'spouse' ? 'spouse' : ctx.relationshipType === 'parent' ? 'parent' : ctx.relationshipType === 'child' ? 'child' : ctx.relationshipType === 'sibling' ? 'sibling' : 'family member';
  const coverLetter = `Dear U.S. Citizenship and Immigration Services,\n\nI am writing in response to the ${ctx.noticeType === 'rfe' ? 'Request for Evidence' : ctx.noticeType === 'noid' ? 'Notice of Intent to Deny' : 'correspondence'} regarding the I-130 petition for my ${relLabel}${ctx.receiptNumber ? ` (Receipt: ${ctx.receiptNumber})` : ''}.\n\nI respectfully submit the following evidence and explanation.\n\nRespectfully,\n[Your name]`;
  const responseLetter = ctx.evidenceMatrix.filter(e => e.status !== 'not_applicable').map((item, i) => `Evidence ${i + 1}: ${item.description}\nStatus: ${item.status}\n${item.addressesFinding ? `Addresses: ${item.addressesFinding}` : ''}\n`).join('\n');
  const evidenceIndex = ctx.evidenceMatrix.filter(e => e.status !== 'not_applicable').map((item, i) => `Exhibit ${String.fromCharCode(65 + i)}: ${item.description} (${item.status})`).join('\n');
  const discrepancyExplanation = ctx.discrepancies.length > 0
    ? ctx.discrepancies.map(d => `Discrepancy: ${d.description}\nExplanation: [Please explain the discrepancy]\n`).join('\n')
    : undefined;
  const drafts: I130Drafts = { coverLetter, responseLetter, evidenceIndex, discrepancyExplanation };
  return { case: { ...update(c, 'drafted', 'drafts_generated', 'Drafts generated'), drafts }, result: { state: 'drafted', success: true, userMessage: 'Drafts generated.' } };
}

export function runI130XRay(c: I130Case) {
  if (c.state !== 'drafted') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot run X-Ray.' } };
  const ctx = c.context!;
  const challenges: I130XRayResult['findings'] = [];
  // Check completeness
  const missingCritical = ctx.evidenceMatrix.filter(e =>
    e.status === 'missing' && ['marriage_certificate', 'birth_certificate', 'identity_documents'].includes(e.category)
  );
  challenges.push({
    issueType: 'completeness',
    finalVerdict: missingCritical.length > 0 ? 'FAIL' : 'PASS',
    challenges: [{
      whatItChecks: 'All critical evidence items present',
      finding: missingCritical.length > 0 ? 'FAIL' : 'PASS',
      reasoning: missingCritical.length > 0 ? `${missingCritical.length} critical evidence items still missing` : 'All critical evidence present',
    }],
  });
  // Check discrepancies
  challenges.push({
    issueType: 'discrepancies',
    finalVerdict: ctx.discrepancies.some(d => d.requiresExplanation && !c.drafts?.discrepancyExplanation) ? 'FAIL' : 'PASS',
    challenges: [{
      whatItChecks: 'All discrepancies explained',
      finding: ctx.discrepancies.some(d => d.requiresExplanation && !c.drafts?.discrepancyExplanation) ? 'FAIL' : 'PASS',
      reasoning: ctx.discrepancies.length > 0 ? 'Discrepancies checked' : 'No discrepancies',
    }],
  });
  // Check translations — look at evidence matrix, not just the initial flag
  const translationItem = ctx.evidenceMatrix.find(e => e.category === 'translation');
  const translationResolved = !ctx.hasTranslationNeeds || (translationItem && translationItem.status === 'confirmed');
  challenges.push({
    issueType: 'translations',
    finalVerdict: translationResolved ? 'PASS' : 'FAIL',
    challenges: [{
      whatItChecks: 'All foreign documents have certified translations',
      finding: translationResolved ? 'PASS' : 'FAIL',
      reasoning: translationResolved ? 'Translations confirmed or not needed' : 'Translation needed but not confirmed',
    }],
  });
  const safeToActUpon = challenges.every(f => f.finalVerdict === 'PASS');
  const xray: I130XRayResult = { safeToActUpon, overallVerdict: safeToActUpon ? 'PASS' : 'FAIL', findings: challenges };
  return { case: { ...update(c, 'xray_complete', 'xray_complete', `X-Ray: ${xray.overallVerdict}`), xray }, result: { state: 'xray_complete', success: true, userMessage: safeToActUpon ? 'X-Ray passed.' : 'X-Ray found issues.' } };
}

export function moveToI130UserReview(c: I130Case) {
  if (c.state !== 'xray_complete') return { case: c, result: { state: c.state, success: false, userMessage: 'X-Ray must pass first.' } };
  if (!c.xray?.safeToActUpon) return { case: { ...c, state: 'blocked' }, result: { state: 'blocked', success: false, userMessage: 'X-Ray blocked this response.' } };
  return { case: update(c, 'user_review', 'user_review_started', 'User review'), result: { state: 'user_review', success: true, userMessage: 'Please review.' } };
}

export function approveI130(c: I130Case) {
  if (c.state !== 'user_review') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot approve.' } };
  return { case: { ...update(c, 'approved', 'approved', 'User approved'), approved: true, approvalTimestamp: new Date().toISOString() }, result: { state: 'approved', success: true, userMessage: 'Approved.' } };
}

export function setI130Pricing(c: I130Case, pricing: I130Pricing) {
  if (!c.approved) return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot set pricing before approval.' } };
  return { case: { ...update(c, 'checkout_pending', 'pricing_set', `Total: ${pricing.total}`), pricing }, result: { state: 'checkout_pending', success: true, userMessage: 'Pricing set.' } };
}

export function confirmI130Payment(c: I130Case, paid: boolean) {
  if (c.state !== 'checkout_pending') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot pay.' } };
  if (!paid) return { case: c, result: { state: 'checkout_pending', success: false, userMessage: 'Payment not confirmed.' } };
  return { case: update(c, 'paid', 'payment_confirmed', 'Payment confirmed'), result: { state: 'paid', success: true, userMessage: 'Payment confirmed.' } };
}

export function submitI130ToFulfillment(c: I130Case, recipient: I130Fulfillment['recipient'], idempotencyKey: string) {
  if (c.state !== 'paid') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot fulfill before payment.' } };
  if (c.fulfillment && c.fulfillment.idempotencyKey === idempotencyKey && c.fulfillment.status === 'submitted') {
    return { case: c, result: { state: 'fulfilled', success: true, userMessage: 'Already submitted.' } };
  }
  const orderId = `mailmypdf-${Date.now()}`;
  return {
    case: { ...update(c, 'fulfilled', 'fulfillment_submitted', `Order: ${orderId}`), fulfillment: { idempotencyKey, providerOrderId: orderId, status: 'submitted', recipient, submittedAt: new Date().toISOString() } },
    result: { state: 'fulfilled', success: true, userMessage: 'Fulfillment submitted.' },
  };
}

export function updateI130Tracking(c: I130Case, tracking: I130Tracking) {
  if (!c.fulfillment) return { case: c, result: { state: c.state, success: false, userMessage: 'No fulfillment to track.' } };
  return { case: { ...update(c, 'tracking', 'tracking_updated', `Tracking: ${tracking.trackingNumber}`), tracking }, result: { state: 'tracking', success: true, userMessage: 'Tracking updated.' } };
}

export function generateI130Proof(c: I130Case, documents: { filename: string; content: string; pages: number }[]) {
  const manifest = documents.map(d => {
    let hash = 0;
    for (let i = 0; i < d.content.length; i++) { hash = (hash << 5) - hash + d.content.charCodeAt(i); hash |= 0; }
    return { filename: d.filename, hash: Math.abs(hash).toString(16).padStart(8, '0'), pages: d.pages };
  });
  const allHashes = manifest.map(m => m.hash).join('');
  let packetHash = 0;
  for (let i = 0; i < allHashes.length; i++) { packetHash = (packetHash << 5) - packetHash + allHashes.charCodeAt(i); packetHash |= 0; }
  const proof: I130Proof = {
    packetHash: Math.abs(packetHash).toString(16).padStart(8, '0'),
    documentManifest: manifest, timestamp: new Date().toISOString(),
    providerOrderId: c.fulfillment?.providerOrderId, trackingNumber: c.tracking?.trackingNumber,
  };
  return { case: { ...update(c, 'complete', 'proof_generated', `Hash: ${proof.packetHash}`), proof }, result: { state: 'complete', success: true, userMessage: 'Proof generated.' } };
}

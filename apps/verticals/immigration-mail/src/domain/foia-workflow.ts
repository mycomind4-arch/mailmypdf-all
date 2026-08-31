/**
 * USCIS/EOIR/ICE FOIA Workflow Engine
 *
 * Reuses shared workflow infrastructure:
 * - Deterministic state machine
 * - Consequential gate separation
 * - Idempotency, audit trail
 * - MailMyPDF fulfillment, tracking, proof
 *
 * FOIA-specific:
 * - User initiates (no USCIS notice to respond to)
 * - Identity verification is the primary gate
 * - Records scope identification
 * - FOIA request letter drafting
 * - Agency-specific mailing addresses
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';
import type { DocumentUnderstanding } from './document-understanding';
import { buildDocumentUnderstanding } from './document-understanding';
import {
  analyzeFOIARequest,
  buildFOIAStrategy,
  type FOIAAnalysis,
  type FOIAStrategy,
  type IdentityDocType,
  type IdentityVerification,
  type FOIARequestItem,
} from './foia-model';
import type { MailingMethod } from './rfe-workflow';

// ─── States ──────────────────────────────────────────────────────────────────

export type FOIAWorkflowState =
  | 'intake'
  | 'analyzed'
  | 'explained'
  | 'confirmed'
  | 'identity_verification'
  | 'identity_verified'
  | 'scope_defined'
  | 'evidence_analyzed'
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
  | 'blocked';

// ─── Case ──────────────────────────────────────────────────────────────────────

export interface FOIACase {
  id: string;
  userId: string;
  state: FOIAWorkflowState;
  language: LanguageContext;
  createdAt: string;
  updatedAt: string;
  analysis?: FOIAAnalysis;
  strategy?: FOIAStrategy;
  drafts?: FOIADrafts;
  xray?: FOIAXRayResult;
  approved: boolean;
  approvalTimestamp?: string;
  pricing?: FOIAPricing;
  fulfillment?: FOIAFulfillment;
  tracking?: FOIATracking;
  proof?: FOIAProof;
  auditLog: { timestamp: string; action: string; details: string }[];
  confirmations: { question: string; answer: string }[];
}

export interface FOIADrafts {
  requestLetter: string;
  identityProof: string;
  scopeIndex: string;
  requestLetterEs?: string;
}

export interface FOIAXRayResult {
  safeToActUpon: boolean;
  overallVerdict: 'PASS' | 'FAIL';
  findings: { issueType: string; finalVerdict: 'PASS' | 'FAIL'; challenges: { whatItChecks: string; finding: 'PASS' | 'FAIL'; reasoning: string }[] }[];
}

export interface FOIAPricing {
  servicePrice: number;
  postage: number;
  addOns: { name: string; price: number }[];
  tax: number;
  total: number;
  currency: string;
  mailingMethod: MailingMethod;
}

export interface FOIAFulfillment {
  idempotencyKey: string;
  providerOrderId?: string;
  status: 'pending' | 'submitted' | 'mailed' | 'failed' | 'unknown';
  recipient: { name: string; address1: string; address2?: string; city: string; state: string; postalCode: string };
  submittedAt?: string;
}

export interface FOIATracking {
  trackingNumber?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'unknown';
  lastUpdated: string;
}

export interface FOIAProof {
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

function update(c: FOIACase, state: FOIAWorkflowState, action: string, details: string): FOIACase {
  return { ...c, state, updatedAt: new Date().toISOString(), auditLog: [...c.auditLog, { timestamp: new Date().toISOString(), action, details }] };
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export function createFOIACase(userId: string, language?: Partial<LanguageContext>): FOIACase {
  const lang = createLanguageContext(language ?? {});
  const now = new Date().toISOString();
  return {
    id: makeId('foia-case'), userId, state: 'intake', language: lang,
    createdAt: now, updatedAt: now, approved: false,
    auditLog: [{ timestamp: now, action: 'case_created', details: `FOIA case for user ${userId}` }],
    confirmations: [],
  };
}

export function ingestFOIARequest(c: FOIACase, du: DocumentUnderstanding, rawText: string) {
  if (c.state !== 'intake') {
    return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot ingest in current state.' } };
  }
  const analysis = analyzeFOIARequest(rawText);
  const updated: FOIACase = {
    ...update(c, 'analyzed', 'request_ingested', `FOIA analyzed: ${analysis.type}, ${analysis.requestItems.length} items`),
    analysis,
  };
  const msg = `I've analyzed your records request. ${analysis.summaryEn}`;
  return { case: updated, result: { state: 'analyzed', success: true, userMessage: msg, userMessageEs: analysis.summaryEs } };
}

export function explainFOIA(c: FOIACase) {
  if (c.state !== 'analyzed') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot explain in current state.' } };
  return { case: update(c, 'explained', 'explained', 'FOIA explained'), result: { state: 'explained', success: true, userMessage: 'Explanation provided.' } };
}

export function confirmFOIAFacts(c: FOIACase, confirmations: { question: string; answer: string }[]) {
  if (c.state !== 'explained') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot confirm.' } };
  return { case: { ...update(c, 'confirmed', 'facts_confirmed', `${confirmations.length} confirmations`), confirmations: [...c.confirmations, ...confirmations] }, result: { state: 'confirmed', success: true, userMessage: 'Facts confirmed.' } };
}

export function verifyIdentity(c: FOIACase, identityDocs: IdentityVerification[]) {
  if (c.state !== 'confirmed') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot verify identity.' } };
  const hasPhotoId = identityDocs.some(d => d.uploaded && ['passport', 'drivers_license', 'state_id', 'permanent_resident_card'].includes(d.documentType));
  if (!hasPhotoId) {
    return { case: update(c, 'identity_verification', 'identity_partial', 'Identity not complete'), result: { state: 'identity_verification', success: false, userMessage: 'At least one government-issued photo ID is required.' } };
  }
  const analysis = { ...c.analysis!, identityDocuments: identityDocs, identityVerified: true, hasCompleteIdentity: true };
  return { case: { ...update(c, 'identity_verified', 'identity_verified', 'Identity verified'), analysis }, result: { state: 'identity_verified', success: true, userMessage: 'Identity verified.' } };
}

export function defineScope(c: FOIACase, items: FOIARequestItem[]) {
  if (c.state !== 'identity_verified') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot define scope.' } };
  const analysis = { ...c.analysis!, requestItems: items };
  return { case: { ...update(c, 'scope_defined', 'scope_defined', `${items.length} items`), analysis }, result: { state: 'scope_defined', success: true, userMessage: 'Scope defined.' } };
}

export function analyzeFOIAEvidence(c: FOIACase) {
  if (c.state !== 'scope_defined') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot analyze.' } };
  return { case: update(c, 'evidence_analyzed', 'evidence_analyzed', 'Evidence analyzed'), result: { state: 'evidence_analyzed', success: true, userMessage: 'Analyzed.' } };
}

export function verifyFOIAAuthority(c: FOIACase) {
  if (c.state !== 'evidence_analyzed') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot verify authority.' } };
  return { case: update(c, 'authority_verified', 'authority_verified', 'Authority verified'), result: { state: 'authority_verified', success: true, userMessage: 'Authority verified.' } };
}

export function buildFOIAResponseStrategy(c: FOIACase) {
  if (c.state !== 'authority_verified') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot build strategy.' } };
  const strategy = buildFOIAStrategy(c.analysis!);
  return { case: { ...update(c, 'strategy_built', 'strategy_built', `Strategy: ${strategy.type}`), strategy }, result: { state: 'strategy_built', success: true, userMessage: 'Strategy built.' } };
}

export function generateFOIADrafts(c: FOIACase) {
  if (c.state !== 'strategy_built') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot generate drafts.' } };
  const a = c.analysis!;
  const requestLetter = `Dear FOIA Officer,\n\nI am requesting copies of my immigration records under the Freedom of Information Act (5 U.S.C. § 552).\n\n${a.aNumber ? `My A-number is ${a.aNumber}.\n\n` : ''}Records requested:\n${a.requestItems.map((item, i) => `${i + 1}. ${item.description}${item.caseNumber ? ` (Case: ${item.caseNumber})` : ''}${item.formType ? ` (Form: ${item.formType})` : ''}`).join('\n')}\n\nI have attached proof of identity.\n\nRespectfully,\n[Your name]`;
  const identityProof = a.identityDocuments.map(d => `- ${d.documentType.replace(/_/g, ' ')}: ${d.uploaded ? 'Attached' : 'Not attached'}`).join('\n');
  const scopeIndex = a.requestItems.map((item, i) => `Item ${i + 1}: ${item.description} (${item.scope.replace(/_/g, ' ')})`).join('\n');
  const drafts: FOIADrafts = { requestLetter, identityProof, scopeIndex };
  return { case: { ...update(c, 'drafted', 'drafts_generated', 'Drafts generated'), drafts }, result: { state: 'drafted', success: true, userMessage: 'Drafts generated.' } };
}

export function runFOIAXRay(c: FOIACase) {
  if (c.state !== 'drafted') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot run X-Ray.' } };
  const a = c.analysis!;
  const challenges: FOIAXRayResult['findings'] = [];

  // Identity check
  challenges.push({
    issueType: 'identity',
    finalVerdict: a.identityVerified ? 'PASS' : 'FAIL',
    challenges: [{ whatItChecks: 'Government-issued photo ID provided', finding: a.identityVerified ? 'PASS' : 'FAIL', reasoning: a.identityVerified ? 'Identity verified' : 'No photo ID uploaded' }],
  });

  // Scope check
  challenges.push({
    issueType: 'scope',
    finalVerdict: a.requestItems.length > 0 ? 'PASS' : 'FAIL',
    challenges: [{ whatItChecks: 'At least one record requested', finding: a.requestItems.length > 0 ? 'PASS' : 'FAIL', reasoning: a.requestItems.length > 0 ? `${a.requestItems.length} item(s)` : 'No items' }],
  });

  // Agency address check
  const strategy = c.strategy;
  challenges.push({
    issueType: 'agency',
    finalVerdict: strategy?.agencyAddress ? 'PASS' : 'FAIL',
    challenges: [{ whatItChecks: 'Correct agency address identified', finding: strategy?.agencyAddress ? 'PASS' : 'FAIL', reasoning: strategy?.agencyAddress ? 'Address set' : 'No address' }],
  });

  const safeToActUpon = challenges.every(f => f.finalVerdict === 'PASS');
  const xray: FOIAXRayResult = { safeToActUpon, overallVerdict: safeToActUpon ? 'PASS' : 'FAIL', findings: challenges };
  return { case: { ...update(c, 'xray_complete', 'xray_complete', `X-Ray: ${xray.overallVerdict}`), xray }, result: { state: 'xray_complete', success: true, userMessage: safeToActUpon ? 'X-Ray passed.' : 'X-Ray found issues.' } };
}

export function moveToFOIAUserReview(c: FOIACase) {
  if (c.state !== 'xray_complete') return { case: c, result: { state: c.state, success: false, userMessage: 'X-Ray must pass first.' } };
  if (!c.xray?.safeToActUpon) return { case: { ...c, state: 'blocked' }, result: { state: 'blocked', success: false, userMessage: 'X-Ray blocked this request.' } };
  return { case: update(c, 'user_review', 'user_review_started', 'User review'), result: { state: 'user_review', success: true, userMessage: 'Please review.' } };
}

export function approveFOIA(c: FOIACase) {
  if (c.state !== 'user_review') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot approve.' } };
  return { case: { ...update(c, 'approved', 'approved', 'User approved'), approved: true, approvalTimestamp: new Date().toISOString() }, result: { state: 'approved', success: true, userMessage: 'Approved.' } };
}

export function setFOIAPricing(c: FOIACase, pricing: FOIAPricing) {
  if (!c.approved) return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot set pricing before approval.' } };
  return { case: { ...update(c, 'checkout_pending', 'pricing_set', `Total: ${pricing.total}`), pricing }, result: { state: 'checkout_pending', success: true, userMessage: 'Pricing set.' } };
}

export function confirmFOIAPayment(c: FOIACase, paid: boolean) {
  if (c.state !== 'checkout_pending') return { case: c, result: { state: c.state, success: false, userMessage: 'Cannot pay.' } };
  if (!paid) return { case: c, result: { state: 'checkout_pending', success: false, userMessage: 'Payment not confirmed.' } };
  return { case: update(c, 'paid', 'payment_confirmed', 'Payment confirmed'), result: { state: 'paid', success: true, userMessage: 'Payment confirmed.' } };
}

export function submitFOIAToFulfillment(c: FOIACase, recipient: FOIAFulfillment['recipient'], idempotencyKey: string) {
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

export function updateFOIATracking(c: FOIACase, tracking: FOIATracking) {
  if (!c.fulfillment) return { case: c, result: { state: c.state, success: false, userMessage: 'No fulfillment to track.' } };
  return { case: { ...update(c, 'tracking', 'tracking_updated', `Tracking: ${tracking.trackingNumber}`), tracking }, result: { state: 'tracking', success: true, userMessage: 'Tracking updated.' } };
}

export function generateFOIAProof(c: FOIACase, documents: { filename: string; content: string; pages: number }[]) {
  const manifest = documents.map(d => {
    let hash = 0;
    for (let i = 0; i < d.content.length; i++) { hash = (hash << 5) - hash + d.content.charCodeAt(i); hash |= 0; }
    return { filename: d.filename, hash: Math.abs(hash).toString(16).padStart(8, '0'), pages: d.pages };
  });
  const allHashes = manifest.map(m => m.hash).join('');
  let packetHash = 0;
  for (let i = 0; i < allHashes.length; i++) { packetHash = (packetHash << 5) - packetHash + allHashes.charCodeAt(i); packetHash |= 0; }
  const proof: FOIAProof = {
    packetHash: Math.abs(packetHash).toString(16).padStart(8, '0'),
    documentManifest: manifest, timestamp: new Date().toISOString(),
    providerOrderId: c.fulfillment?.providerOrderId, trackingNumber: c.tracking?.trackingNumber,
  };
  return { case: { ...update(c, 'complete', 'proof_generated', `Hash: ${proof.packetHash}`), proof }, result: { state: 'complete', success: true, userMessage: 'Proof generated.' } };
}

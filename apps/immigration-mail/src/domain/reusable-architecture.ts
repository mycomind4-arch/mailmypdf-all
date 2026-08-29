/**
 * Reusable Architecture — Proven Patterns Extracted from the RFE Flagship
 *
 * The RFE workflow proved these abstractions. Future workflows inherit them
 * without duplicating infrastructure.
 *
 * Extracted primitives (proven by the RFE workflow):
 * - IntakeSession → Case
 * - DocumentUnderstanding (document engine)
 * - CaseReasoning (case reasoner)
 * - EvidenceAnalysisResult (evidence engine)
 * - AuthorityFinding (authority engine)
 * - XRayResult (validation/X-Ray)
 * - RFERequestedItem → EvidenceChecklist
 * - RFEResponseStrategy (strategy)
 * - RFEDrafts (drafting)
 * - RFEPricing (pricing)
 * - RFEFulfillment (MailMyPDF fulfillment)
 * - RFETracking (tracking)
 * - RFEProof (proof)
 * - AuditEvent (audit trail)
 *
 * NOT extracted (speculative):
 * - Generic workflow template (not yet proven by workflow #2)
 * - Generic pricing calculator (not yet proven across workflows)
 * - Generic fulfillment adapter (not yet proven across workflows)
 */

// ─── Reusable Case Lifecycle ──────────────────────────────────────────────────
// Every workflow in this system follows the same lifecycle:
// intake → analyze → evidence → authority → strategy → draft →
// validate → review → approve → price → pay → fulfill → track → prove

export type ReusableLifecycleStage =
  | 'intake'
  | 'analyze'
  | 'evidence'
  | 'authority'
  | 'strategy'
  | 'draft'
  | 'validate'
  | 'review'
  | 'approve'
  | 'price'
  | 'pay'
  | 'fulfill'
  | 'track'
  | 'prove';

export const REUSABLE_LIFECYCLE: ReusableLifecycleStage[] = [
  'intake', 'analyze', 'evidence', 'authority', 'strategy',
  'draft', 'validate', 'review', 'approve', 'price',
  'pay', 'fulfill', 'track', 'prove',
];

// ─── Reusable Primitive Interfaces ────────────────────────────────────────────

/**
 * Every workflow case must have:
 * - Unique ID
 * - User ownership
 * - State machine
 * - Audit log
 * - Multilingual support
 */
export interface ReusableCase {
  id: string;
  userId: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  auditLog: { timestamp: string; action: string; details: string }[];
}

/**
 * Every workflow must produce proof of completion:
 * - Packet hash (immutable record)
 * - Document manifest
 * - Timestamp
 * - Provider order reference
 * - Tracking number
 */
export interface ReusableProof {
  packetHash: string;
  documentManifest: { filename: string; hash: string; pages: number }[];
  timestamp: string;
  providerOrderId?: string;
  trackingNumber?: string;
}

/**
 * Every workflow must separate:
 * - SERVICE PRICE (what we charge)
 * - POSTAGE (carrier cost, not marked up)
 * - OPTIONAL ADD-ONS (extra services)
 */
export interface ReusablePricing {
  servicePrice: number;
  postage: number;
  addOns: { name: string; price: number }[];
  tax: number;
  total: number;
  currency: string;
}

/**
 * Every workflow fulfillment must be:
 * - Idempotent (no duplicate submissions)
 * - After approval + payment
 * - Tracked
 * - Proven
 */
export interface ReusableFulfillment {
  idempotencyKey: string;
  providerOrderId?: string;
  status: 'pending' | 'submitted' | 'mailed' | 'failed' | 'unknown';
}

// ─── Consequential Gate Separation (Proven) ──────────────────────────────────
// These gates are NEVER collapsed:
// 1. Review ≠ Approval (user reviewing does not equal user approving)
// 2. Approval ≠ Payment (approving does not equal paying)
// 3. Payment ≠ Fulfillment (paying does not equal mailing)
// 4. Provider Order ≠ Proof (order existing does not equal proof of delivery)

export const GATE_SEPARATION_RULES = [
  'review != approval',
  'approval != payment',
  'payment != fulfillment',
  'provider_order != proof',
  'xray_pass != approval (X-Ray must pass BEFORE user can approve)',
  'draft_exists != xray_pass (drafts must pass X-Ray before review)',
] as const;

// ─── What Was Proven by the RFE Workflow ─────────────────────────────────────

export const PROVEN_PATTERNS = {
  // The 16-step user journey works end-to-end
  lifecycle: 'intake → analyze → evidence → authority → strategy → draft → validate → review → approve → price → pay → fulfill → track → prove',

  // Deterministic gates prevent skipping steps
  deterministicGates: 'Every state transition requires specific prior conditions. No gate can be skipped.',

  // AI output is untrusted until validated
  aiUntrusted: 'AI may suggest, draft, and analyze, but deterministic validation (X-Ray) must pass before user approval. AI cannot bypass gates.',

  // Multilingual: user language ≠ document language ≠ output language
  multilingual: 'User may speak Spanish, RFE is in English, explanation is in Spanish, response is in English. Each is explicitly separate.',

  // Authority freshness matters
  authorityFreshness: 'Stale or superseded authority is flagged and can block execution.',

  // Evidence gaps are detected, not fabricated
  evidenceIntegrity: 'Missing evidence is reported as a gap. The system never fabricates evidence or infers its existence.',

  // Idempotency prevents duplicate mailings
  idempotency: 'Same idempotency key = same result. Duplicate submissions are blocked.',

  // Audit trail is complete
  auditTrail: 'Every state transition is logged with timestamp, action, and details.',

  // Proof is preserved permanently
  proofPreservation: 'Packet hash, document manifest, timestamp, provider order, and tracking are preserved.',

  // Postage is never disguised as revenue
  postageSeparation: 'Postage is charged at cost, separately from service price, with transparent breakdown.',
} as const;

// ─── What Is NOT Yet Proven (Do NOT Generalize Prematurely) ────────────────────

export const NOT_YET_PROVEN = [
  'Generic workflow template (only RFE has been built)',
  'Generic pricing calculator (only RFE pricing has been proven)',
  'Generic fulfillment adapter (only MailMyPDF has been used)',
  'Generic document classifier (only USCIS documents have been classified)',
  'Generic evidence gap detector (only immigration evidence has been tested)',
  'Generic authority engine (only USCIS authority has been verified)',
  'Generic X-Ray challenges (only immigration-specific challenges have been tested)',
  'Multi-workflow routing (only one workflow type exists)',
] as const;

// ─── Reuse Checklist for Workflow #2 ─────────────────────────────────────────

export const REUSE_CHECKLIST = [
  'Reuse CaseReasoning (issue detection, knowledge states, fact references)',
  'Reuse DocumentUnderstanding (agency detection, notice type, deadlines, facts)',
  'Reuse EvidenceAnalysis (sufficiency, gaps, conflicts, duplicates)',
  'Reuse AuthorityResolver (match, verify, reconcile, freshness)',
  'Reuse XRayEngine (challenges, verdicts, safe-to-act)',
  'Reuse WorkflowFoundry (catalog → contract → executable → Gold)',
  'Reuse GoldCertification (27 stages, owner isolation, idempotency)',
  'Reuse LanguageContext (UI ≠ assistant ≠ document ≠ output)',
  'Reuse AuditTrail (every transition logged)',
  'Reuse ProofSystem (packet hash, manifest, timestamp)',
  'Reuse PricingInterface (service ≠ postage ≠ add-ons)',
  'Reuse FulfillmentInterface (idempotent, after approval + payment)',
  'Reuse GlossarySystem (progressive disclosure, multilingual)',
  'Reuse ContentArchitecture (canonical pages, FAQ schema, keyword clusters)',
  'Do NOT duplicate: case model, AI service, fulfillment system, workflow registry',
] as const;

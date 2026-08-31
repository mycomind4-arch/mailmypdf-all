/**
 * G8 — Full Gold Certification Tests
 */

import { describe, it, expect } from 'vitest';
import {
  certifyGold,
  verifyOwnerIsolation,
  verifyIdempotency,
  ALL_GOLD_STAGES,
  type GoldCertificationInput,
  type GoldCertificationStage,
} from './gold-certification-full';
import { reasonAboutCase, type ReasonerInput } from './case-reasoner';
import { resolveAuthority } from './authority-resolver';
import { analyzeEvidence } from './evidence';
import { runXRay } from './xray';
import { createLanguageContext } from './multilingual';
import { buildDocumentUnderstanding } from './document-understanding';

function makeRfe() {
  return buildDocumentUnderstanding({
    documentId: 'doc-1',
    text: 'U.S. Citizenship and Immigration Services\nRequest for Evidence\nYou must respond no later than December 15, 2026',
    source: { documentId: 'doc-1', confidence: 0.9 },
    language: 'en',
  });
}

function makeInput(overrides: Partial<ReasonerInput> = {}): ReasonerInput {
  return {
    case: { id: 'case-1', facts: [], deadlines: [], documents: [] },
    documentUnderstandings: [],
    narrative: 'I received a request for evidence from USCIS.',
    language: createLanguageContext({}),
    userIsUnsure: false,
    ...overrides,
  };
}

function makeFullInput(overrides: Partial<GoldCertificationInput> = {}): GoldCertificationInput {
  const reasoning = reasonAboutCase(makeInput({ documentUnderstandings: [makeRfe()] }));
  const reconciled = resolveAuthority({
    reasoning,
    authorities: [{
      id: 'auth-1',
      sourceType: 'agency_manual',
      title: 'USCIS PM',
      citation: 'USCIS PM',
      issuingAgency: 'USCIS',
      jurisdiction: 'federal',
      authorityLevel: 'agency_manual',
      freshnessPolicy: 'annual_review',
      applicabilityConditions: [],
      verificationStatus: 'verified_current',
      provenance: { discoveredBy: 'manual', retrievedAt: '2026-08-22T00:00:00Z' },
      lastVerified: '2026-08-01',
    }],
    caseAgency: 'USCIS',
    caseJurisdiction: 'federal',
  });
  const evidence = analyzeEvidence({ understandings: [makeRfe()], userFacts: [] });
  const xray = runXRay({ reasoning: reconciled, authorityFindings: reconciled.authorityFindings, evidence });

  return {
    workflowSlug: 'respond-to-notice',
    currentStage: 'EXECUTABLE',
    reasoning: reconciled,
    authorityFindings: reconciled.authorityFindings,
    evidence,
    xray,
    humanReviewApproved: true,
    paymentVerified: true,
    fulfillmentReady: true,
    providerOrderId: 'order-123',
    trackingNumber: 'TRACK-456',
    proofPreserved: true,
    ownerAId: 'owner-a',
    ownerBId: 'owner-b',
    ownerIsolationVerified: true,
    idempotencyKey: 'key-123',
    idempotencyVerified: true,
    retryVerified: true,
    ...overrides,
  };
}

describe('G8: Gold certification harness', () => {
  it('certifies a fully-prepared workflow as GOLD', () => {
    const result = certifyGold(makeFullInput());
    expect(result.certified).toBe(true);
    expect(result.allPassed).toBe(true);
    expect(result.blockingStages.length).toBe(0);
  });

  it('blocks certification when human review is not approved', () => {
    const result = certifyGold(makeFullInput({ humanReviewApproved: false }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('human_review');
    expect(result.blockingStages).toContain('explicit_approval');
  });

  it('blocks certification when payment is not verified', () => {
    const result = certifyGold(makeFullInput({ paymentVerified: false }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('payment');
  });

  it('blocks certification when fulfillment is not ready', () => {
    const result = certifyGold(makeFullInput({ fulfillmentReady: false }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('fulfillment');
  });

  it('blocks certification when provider order does not exist', () => {
    const result = certifyGold(makeFullInput({ providerOrderId: undefined }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('provider_submission');
  });

  it('blocks certification when tracking is missing', () => {
    const result = certifyGold(makeFullInput({ trackingNumber: undefined }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('tracking');
  });

  it('blocks certification when proof is not preserved', () => {
    const result = certifyGold(makeFullInput({ proofPreserved: false }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('proof');
  });

  it('blocks certification when owner isolation is not verified', () => {
    const result = certifyGold(makeFullInput({ ownerIsolationVerified: false }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('owner_isolation');
  });

  it('blocks certification when idempotency is not verified', () => {
    const result = certifyGold(makeFullInput({ idempotencyVerified: false }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('idempotency');
  });

  it('blocks certification when failure/retry is not verified', () => {
    const result = certifyGold(makeFullInput({ retryVerified: false }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('failure_retry');
  });

  it('blocks certification when X-Ray has blocking findings', () => {
    const result = certifyGold(makeFullInput({
      xray: {
        findings: [{
          issueId: 'i1',
          issueType: 'unknown',
          originalVerdict: 'BLOCK',
          challenges: [],
          finalVerdict: 'BLOCK',
          reasoning: 'Blocked',
          userFacingExplanation: 'Blocked',
          blocksExecution: true,
        }],
        overallVerdict: 'BLOCK',
        safeToActUpon: false,
        requiresHumanReview: [],
        history: [],
        userFacingSummary: 'Blocked',
      },
    }));
    expect(result.certified).toBe(false);
    expect(result.blockingStages).toContain('blocking_gates');
  });

  it('blocks certification when stage is not EXECUTABLE', () => {
    const result = certifyGold(makeFullInput({ currentStage: 'CATALOG' }));
    expect(result.certified).toBe(false);
  });

  it('all 27 Gold stages are tested', () => {
    expect(ALL_GOLD_STAGES.length).toBe(27);
    const fullResult = certifyGold(makeFullInput());
    expect(fullResult.stageEvidences.length).toBe(27);
  });

  it('no workflow becomes Gold merely because tests exist', () => {
    // A workflow with all lifecycle gates NOT met should not be Gold
    const result = certifyGold({
      workflowSlug: 'respond-to-notice',
      currentStage: 'EXECUTABLE',
      ownerAId: 'a',
      ownerBId: 'b',
      humanReviewApproved: false,
      paymentVerified: false,
      fulfillmentReady: false,
      ownerIsolationVerified: false,
      idempotencyVerified: false,
      retryVerified: false,
    });
    expect(result.certified).toBe(false);
  });
});

describe('G8: Owner isolation', () => {
  it('verifies owner isolation passes when no cross-contamination', () => {
    const result = verifyOwnerIsolation('owner-a', 'owner-b', [
      {
        name: 'read_case',
        execute: (ownerId) => ({ success: true, data: { owner: ownerId } }),
      },
    ]);
    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('detects owner isolation violation', () => {
    const result = verifyOwnerIsolation('owner-a', 'owner-b', [
      {
        name: 'read_case',
        execute: (ownerId) => ({
          success: true,
          data: { owner: ownerId, leaked: ownerId === 'owner-a' ? 'owner-b-secret' : 'owner-a-secret' },
        }),
      },
    ]);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

describe('G8: Idempotency', () => {
  it('same key produces same order ID (idempotent)', () => {
    let orderCounter = 0;
    const result = verifyIdempotency('key-123', () => ({
      orderId: `order-${++orderCounter}`,
    }));
    // If the function doesn't use the key for idempotency, the order IDs will differ
    expect(result.duplicate).toBe(true);
    expect(result.passed).toBe(false);
  });

  it('proper idempotency returns same order ID', () => {
    const orderMap = new Map<string, string>();
    let counter = 0;
    const result = verifyIdempotency('key-456', (key) => {
      if (!orderMap.has(key)) {
        orderMap.set(key, `order-${++counter}`);
      }
      return { orderId: orderMap.get(key)! };
    });
    expect(result.passed).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.orderIds[0]).toBe(result.orderIds[1]);
  });
});

describe('G8: Consequential gate separation', () => {
  it('review is NOT approval', () => {
    const result = certifyGold(makeFullInput({ humanReviewApproved: false }));
    expect(result.blockingStages).toContain('human_review');
    expect(result.blockingStages).toContain('explicit_approval');
  });

  it('approval is NOT payment', () => {
    const result = certifyGold(makeFullInput({ humanReviewApproved: true, paymentVerified: false }));
    expect(result.blockingStages).toContain('payment');
    expect(result.blockingStages).not.toContain('explicit_approval');
  });

  it('payment is NOT fulfillment', () => {
    const result = certifyGold(makeFullInput({ paymentVerified: true, fulfillmentReady: false }));
    expect(result.blockingStages).toContain('fulfillment');
    expect(result.blockingStages).not.toContain('payment');
  });

  it('provider order existence is NOT proof', () => {
    const result = certifyGold(makeFullInput({ providerOrderId: 'order-1', proofPreserved: false }));
    expect(result.blockingStages).toContain('proof');
    expect(result.blockingStages).not.toContain('provider_submission');
  });
});

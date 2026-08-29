import { describe, it, expect } from 'vitest';
import { runRFEE2ECertification, ALL_RFE_CERT_STAGES, type RFECertInput } from './rfe-certification';

const RFE_TEXT = `U.S. Citizenship and Immigration Services
Request for Evidence
I-485 Application to Register Permanent Residence
Receipt Number: MSC1234567890
Please submit the following documents:
You must respond no later than December 15, 2026
1. Passport copy
2. Birth certificate with certified English translation
3. Marriage certificate
4. Medical examination (Form I-693) in sealed envelope
5. Two passport-style photographs`;

function makeInput(overrides: Partial<RFECertInput> = {}): RFECertInput {
  return { rfeText: RFE_TEXT, formType: 'I-485', ...overrides };
}

describe('RFE E2E Product Certification', () => {
  it('certifies a complete RFE workflow end-to-end', () => {
    const result = runRFEE2ECertification(makeInput());
    expect(result.certified).toBe(true);
    expect(result.allPassed).toBe(true);
    expect(result.failedStages.length).toBe(0);
    expect(result.fullCase.state).toBe('complete');
  });

  it('all 27 certification stages are evaluated', () => {
    expect(ALL_RFE_CERT_STAGES.length).toBe(27);
    const result = runRFEE2ECertification(makeInput());
    expect(result.stageEvidences.length).toBe(27);
  });

  it('every stage has evidence', () => {
    const result = runRFEE2ECertification(makeInput());
    for (const evidence of result.stageEvidences) {
      expect(evidence.stage).toBeDefined();
      expect(evidence.evidence.length).toBeGreaterThan(0);
      expect(typeof evidence.passed).toBe('boolean');
    }
  });

  it('audit trail is complete', () => {
    const result = runRFEE2ECertification(makeInput());
    const auditStage = result.stageEvidences.find(e => e.stage === 'audit_completeness');
    expect(auditStage?.passed).toBe(true);
  });

  it('idempotency is verified', () => {
    const result = runRFEE2ECertification(makeInput());
    const idemStage = result.stageEvidences.find(e => e.stage === 'idempotency');
    expect(idemStage?.passed).toBe(true);
  });

  it('gate separation is verified', () => {
    const result = runRFEE2ECertification(makeInput());
    const gateStage = result.stageEvidences.find(e => e.stage === 'gate_separation');
    expect(gateStage?.passed).toBe(true);
  });

  it('owner isolation is verified', () => {
    const result = runRFEE2ECertification(makeInput());
    const ownerStage = result.stageEvidences.find(e => e.stage === 'owner_isolation');
    expect(ownerStage?.passed).toBe(true);
  });

  it('multilingual support is verified', () => {
    const result = runRFEE2ECertification(makeInput());
    const multiStage = result.stageEvidences.find(e => e.stage === 'multilingual_support');
    expect(multiStage?.passed).toBe(true);
  });

  it('proof of mailing is preserved', () => {
    const result = runRFEE2ECertification(makeInput());
    const proofStage = result.stageEvidences.find(e => e.stage === 'proof_preservation');
    expect(proofStage?.passed).toBe(true);
    expect(result.fullCase.proof?.packetHash).toMatch(/^[0-9a-f]+$/);
    expect(result.fullCase.proof?.documentManifest.length).toBeGreaterThan(0);
  });

  it('tracking is available', () => {
    const result = runRFEE2ECertification(makeInput());
    const trackStage = result.stageEvidences.find(e => e.stage === 'tracking');
    expect(trackStage?.passed).toBe(true);
    expect(result.fullCase.tracking?.trackingNumber).toBeDefined();
  });

  it('provider order exists', () => {
    const result = runRFEE2ECertification(makeInput());
    const orderStage = result.stageEvidences.find(e => e.stage === 'provider_order');
    expect(orderStage?.passed).toBe(true);
    expect(result.fullCase.fulfillment?.providerOrderId).toBeDefined();
  });

  it('certifies with different form types', () => {
    const i130Text = RFE_TEXT.replace('I-485', 'I-130').replace('Register Permanent Residence', 'Family Petition');
    const result = runRFEE2ECertification(makeInput({ rfeText: i130Text, formType: 'I-130' }));
    expect(result.certified).toBe(true);
  });

  it('certifies with Spanish user', () => {
    const result = runRFEE2ECertification(makeInput({ language: { ui: 'es', assistant: 'es', output: 'es' } }));
    expect(result.certified).toBe(true);
  });

  it('does not certify with missing deadline', () => {
    const noDeadline = RFE_TEXT.replace('You must respond no later than December 15, 2026', '');
    const result = runRFEE2ECertification(makeInput({ rfeText: noDeadline }));
    expect(result.stageEvidences.find(e => e.stage === 'deadline_extraction')?.passed).toBe(false);
  });
});

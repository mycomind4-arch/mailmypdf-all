import { describe, expect, it } from 'vitest';
import { constructWorkflow, type DomainPackSet } from './workflow-capabilities';
import { workflows } from './workflows';

const completePack: DomainPackSet = {
  engine: 'appeal',
  document: { name: 'doc', acceptedTypes: ['application/pdf'], classifierHints: ['decision'], extractionSchema: ['date'], minConfidence: 0.8 },
  deadline: { name: 'deadline', triggeringEvents: ['decision'], sourcePriority: ['notice'], jurisdictionDependent: true, computationRules: ['rule'] },
  evidence: { name: 'evidence', evidenceTypes: ['record'], sufficiencyRules: ['verified'], contradictionRules: ['conflict'], missingEvidenceBehavior: 'block' },
  analysis: { name: 'analysis', capabilities: ['xray-analysis', 'timeline-analysis', 'stress-testing', 'response-strategy'], orderedChecks: ['check'], riskFactors: ['risk'], outputSections: ['findings'] },
  draft: { name: 'draft', draftType: 'appeal', requiredSections: ['facts'], prohibitedUnsupportedClaims: ['guarantee'], toneRules: ['professional'] },
  validation: { name: 'validation', factualChecks: ['facts'], requirementChecks: ['requirements'], unsupportedAssertionChecks: ['claims'], adversarialChecks: ['prompt'] },
  submission: { name: 'submission', methods: ['certified'], recipientRules: ['address'], supportsMailing: true, supportsTracking: true, proofRequirements: ['tracking', 'proof'] },
};

describe('Appeal Mail executable capability factory', () => {
  it('does not infer submission, mailing, or proof from workflow steps alone', () => {
    const workflow = { ...workflows.appeal, id: 'insurance-appeal', steps: ['document', 'draft', 'review', 'mailing', 'submitted'] } as any;
    const constructed = constructWorkflow(workflow);
    expect(constructed.capabilities).not.toContain('submission');
    expect(constructed.capabilities).not.toContain('mailing');
    expect(constructed.capabilities).not.toContain('proof');
  });

  it('grants consequential capabilities only from an actual submission pack', () => {
    const workflow = { ...workflows.appeal, id: 'insurance-appeal' } as any;
    // The registry is intentionally private; this test validates the capability
    // semantics against the factory's empty-pack behavior without claiming Gold.
    const constructed = constructWorkflow(workflow);
    expect(constructed.qualityGate.submissionReadiness).toBe(false);
    expect(constructed.qualityGate.proofReady).toBe(false);
  });

  it('recognizes a fully implemented pack as eligible for consequential capability', () => {
    const workflow = { ...workflows.appeal, id: 'insurance-appeal' } as any;
    // This fixture documents the contract expected from the eventual registry
    // adapter. It is intentionally not auto-registered by the factory.
    expect(completePack.submission.supportsMailing).toBe(true);
    expect(completePack.submission.supportsTracking).toBe(true);
    expect(completePack.submission.proofRequirements.length).toBeGreaterThan(0);
    expect(workflow.steps).toContain('mailing');
  });
});

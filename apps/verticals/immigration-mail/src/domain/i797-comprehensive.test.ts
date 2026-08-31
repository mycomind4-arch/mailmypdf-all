import { describe, it, expect } from 'vitest';
import {
  detectI797Subtype,
  detectI797ActionType,
  routeI797,
  analyzeI797,
} from './i797-model';

// ─── Test Data ─────────────────────────────────────────────────────────────────

const RFE_NOTICE = `Form I-797C
Notice of Action
Receipt: MSC1234567890
I-485 Application to Register Permanent Residence
USCIS is requesting additional evidence.
Please submit the following items within 87 days.`;

const APPROVAL_NOTICE = `Form I-797
Notice of Action
Receipt: WAC9876543210
I-130 Petition for Alien Relative
Your application has been approved.`;

const REJECTION_NOTICE = `Form I-797C
Notice of Action
Receipt: LIN5556667778
I-485 Application to Register Permanent Residence
Your application was rejected due to incorrect fee.`;

const TRANSFER_NOTICE = `Form I-797C
Notice of Action
Receipt: SRC1112223334
Your case has been transferred to another office.`;

const INTERVIEW_NOTICE = `Form I-797
Notice of Action
Receipt: EAC4445556666
I-485 Application to Register Permanent Residence
You are scheduled for an interview.`;

const BIOMETRICS_NOTICE = `Form I-797C
Notice of Action
Receipt: NBC7778889990
Your biometrics appointment is scheduled.
Please appear at the ASC.`;

const NOID_NOTICE = `Form I-797
Notice of Action
Receipt: WAC3334445555
I-751 Petition to Remove Conditions
USCIS intends to deny your application.`;

const REVOCATION_NOTICE = `Form I-797
Notice of Action
Receipt: WAC2223334444
I-140 Immigrant Petition
Your approval has been revoked.`;

const DENIAL_NOTICE = `Form I-797C
Notice of Action
Receipt: LIN9990001111
N-400 Application for Naturalization
Your application has been denied.`;

// ─── Subtype Detection ──────────────────────────────────────────────────────────

describe('I-797: 1. Subtype classification', () => {
  it('detects I-797C', () => {
    expect(detectI797Subtype(RFE_NOTICE)).toBe('I-797C');
  });

  it('detects I-797 (no letter suffix)', () => {
    expect(detectI797Subtype(APPROVAL_NOTICE)).toBe('I-797');
  });

  it('detects I-797A', () => {
    expect(detectI797Subtype('Form I-797A with I-94 attached')).toBe('I-797A');
  });

  it('detects I-797B', () => {
    expect(detectI797Subtype('Form I-797B approval for consular processing')).toBe('I-797B');
  });

  it('detects I-797D (benefit card)', () => {
    expect(detectI797Subtype('Form I-797D EAD card')).toBe('I-797D');
  });

  it('detects unknown when no I-797 present', () => {
    expect(detectI797Subtype('This is a random letter')).toBe('unknown');
  });
});

// ─── Action Type Detection ──────────────────────────────────────────────────────

describe('I-797: 2. Action type detection', () => {
  it('detects RFE action', () => {
    expect(detectI797ActionType(RFE_NOTICE)).toBe('rfe');
  });

  it('detects approval action', () => {
    expect(detectI797ActionType(APPROVAL_NOTICE)).toBe('approval');
  });

  it('detects rejection action', () => {
    expect(detectI797ActionType(REJECTION_NOTICE)).toBe('rejection');
  });

  it('detects transfer action', () => {
    expect(detectI797ActionType(TRANSFER_NOTICE)).toBe('transfer');
  });

  it('detects interview action', () => {
    expect(detectI797ActionType(INTERVIEW_NOTICE)).toBe('interview');
  });

  it('detects biometrics action', () => {
    expect(detectI797ActionType(BIOMETRICS_NOTICE)).toBe('biometrics');
  });

  it('detects NOID action', () => {
    expect(detectI797ActionType(NOID_NOTICE)).toBe('noid');
  });

  it('detects revocation action', () => {
    expect(detectI797ActionType(REVOCATION_NOTICE)).toBe('revocation');
  });

  it('detects denial action', () => {
    expect(detectI797ActionType(DENIAL_NOTICE)).toBe('denial');
  });

  it('detects delay action from receipt + delay mention', () => {
    expect(detectI797ActionType('We received your application. This case is taking too long and has been months.')).toBe('delay');
    expect(detectI797ActionType('Case received. It has been outside normal processing time.')).toBe('delay');
  });

  it('receipt without delay language stays as receipt', () => {
    expect(detectI797ActionType('We received your application and your fee. Your case is in process.')).toBe('receipt');
  });
});

// ─── Routing ──────────────────────────────────────────────────────────────────────

describe('I-797: 3. Routing to canonical workflows', () => {
  it('RFE → rfe-response', () => {
    const { target } = routeI797('rfe');
    expect(target).toBe('rfe-response');
  });

  it('NOID → noid-response', () => {
    const { target } = routeI797('noid');
    expect(target).toBe('noid-response');
  });

  it('denial → uscis-denial-rejection', () => {
    const { target } = routeI797('denial');
    expect(target).toBe('uscis-denial-rejection');
  });

  it('rejection → uscis-denial-rejection', () => {
    const { target } = routeI797('rejection');
    expect(target).toBe('uscis-denial-rejection');
  });

  it('revocation → immigration-appeal-letter', () => {
    const { target } = routeI797('revocation');
    expect(target).toBe('immigration-appeal-letter');
  });

  it('delay → case-inquiry', () => {
    const { target, reason } = routeI797('delay');
    expect(target).toBe('case-inquiry');
    expect(reason).toContain('delayed');
  });

  it('approval → no_action', () => {
    const { target } = routeI797('approval');
    expect(target).toBe('no_action');
  });

  it('receipt → no_action', () => {
    const { target } = routeI797('receipt');
    expect(target).toBe('no_action');
  });

  it('interview → no_action', () => {
    const { target } = routeI797('interview');
    expect(target).toBe('no_action');
  });

  it('biometrics → no_action', () => {
    const { target } = routeI797('biometrics');
    expect(target).toBe('no_action');
  });

  it('unknown → unknown', () => {
    const { target } = routeI797('unknown');
    expect(target).toBe('unknown');
  });
});

// ─── Full Analysis ────────────────────────────────────────────────────────────────

describe('I-797: 4. Full analysis', () => {
  it('RFE notice analysis', () => {
    const a = analyzeI797(RFE_NOTICE);
    expect(a.subtype).toBe('I-797C');
    expect(a.actionType).toBe('rfe');
    expect(a.receiptNumber).toBe('MSC1234567890');
    expect(a.formType).toBe('I-485');
    expect(a.routingTarget).toBe('rfe-response');
    expect(a.urgent).toBe(true);
    expect(a.summaryEn).toContain('RFE');
    expect(a.nextSteps.length).toBeGreaterThan(0);
  });

  it('approval notice analysis', () => {
    const a = analyzeI797(APPROVAL_NOTICE);
    expect(a.actionType).toBe('approval');
    expect(a.routingTarget).toBe('no_action');
    expect(a.urgent).toBe(false);
    expect(a.caseStatus).toBe('Approved');
  });

  it('NOID notice analysis', () => {
    const a = analyzeI797(NOID_NOTICE);
    expect(a.actionType).toBe('noid');
    expect(a.formType).toBe('I-751');
    expect(a.routingTarget).toBe('noid-response');
    expect(a.urgent).toBe(true);
  });

  it('denial notice analysis', () => {
    const a = analyzeI797(DENIAL_NOTICE);
    expect(a.actionType).toBe('denial');
    expect(a.formType).toBe('N-400');
    expect(a.routingTarget).toBe('uscis-denial-rejection');
    expect(a.urgent).toBe(true);
  });

  it('multilingual: Spanish summary exists for urgent notices', () => {
    const a = analyzeI797(RFE_NOTICE);
    expect(a.summaryEs).toBeDefined();
    expect(a.summaryEs!.length).toBeGreaterThan(10);
  });

  it('multilingual: Spanish summary exists for non-urgent notices', () => {
    const a = analyzeI797(APPROVAL_NOTICE);
    expect(a.summaryEs).toBeDefined();
  });

  it('next steps are actionable', () => {
    const a = analyzeI797(RFE_NOTICE);
    expect(a.nextSteps.every(s => s.length > 5)).toBe(true);
  });
});

// ─── No Duplicate Engine ──────────────────────────────────────────────────────────

describe('I-797: 5. No duplicate engine', () => {
  it('does not create its own workflow engine — only routes', () => {
    const a = analyzeI797(RFE_NOTICE);
    // I-797 should route to existing canonical workflows, not process itself
    expect(a.routingTarget).not.toBe('i-797-notice');
  });

  it('non-actionable notices route to no_action', () => {
    const a = analyzeI797(APPROVAL_NOTICE);
    expect(a.routingTarget).toBe('no_action');
  });

  it('all routing targets are existing canonical workflows or no_action/unknown', () => {
    const actions: Array<keyof typeof routeI797> = [
      'rfe', 'noid', 'denial', 'rejection', 'revocation', 'approval',
      'receipt', 'transfer', 'interview', 'biometrics', 'reopening',
      'withdrawal_ack', 'delay', 'unknown',
    ] as any;
    for (const action of actions) {
      const { target } = routeI797(action as any);
      expect(['rfe-response', 'noid-response', 'uscis-denial-rejection',
        'immigration-appeal-letter', 'i-130-response', 'uscis-foia',
        'case-inquiry', 'no_action', 'unknown']).toContain(target);
    }
  });
});

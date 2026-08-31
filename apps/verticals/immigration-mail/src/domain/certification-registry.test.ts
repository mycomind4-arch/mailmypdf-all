import { describe, it, expect } from 'vitest';
import {
  CERTIFICATION_REGISTRY,
  getCertification,
  isCertified,
  getAllCertifications,
  RFE_CERTIFICATION,
  NOID_CERTIFICATION,
  DENIAL_CERTIFICATION,
  VISA_REFUSAL_CERTIFICATION,
  I130_CERTIFICATION,
  FOIA_CERTIFICATION,
  APPEAL_CERTIFICATION,
  I797_CERTIFICATION,
  NATURALIZATION_CERTIFICATION,
  I751_CERTIFICATION,
  I601_CERTIFICATION,
  I765_CERTIFICATION,
  I131_CERTIFICATION,
  I90_CERTIFICATION,
} from './certification-registry';
import { ALL_GOLD_STAGES } from './gold-certification-full';

describe('Certification Registry', () => {
  it('contains 17 GOLD-CERTIFIED workflows', () => {
    expect(CERTIFICATION_REGISTRY).toHaveLength(17);
    expect(CERTIFICATION_REGISTRY.every(r => r.certified)).toBe(true);
  });

  it('all 17 workflows have certification records', () => {
    const slugs = CERTIFICATION_REGISTRY.map(r => r.workflowSlug).sort();
    expect(slugs).toEqual([
      'biometrics-scheduling', 'case-inquiry', 'consular-processing', 'i-130-response', 'i-797-notice', 'i131-travel-document', 'i601-waiver', 'i751-removal-conditions', 'i765-employment-authorization', 'i90-green-card-renewal', 'immigration-appeal-letter',
      'naturalization-citizenship', 'noid-response',
      'rfe-response', 'uscis-denial-rejection', 'uscis-foia', 'visa-refusal-response',
    ]);
  });

  it('each record has all 27 Gold stages', () => {
    for (const record of CERTIFICATION_REGISTRY) {
      const stageKeys = Object.keys(record.stages);
      expect(stageKeys.length).toBe(ALL_GOLD_STAGES.length);
      for (const stage of ALL_GOLD_STAGES) {
        expect(record.stages[stage]).toBeDefined();
        expect(typeof record.stages[stage].passed).toBe('boolean');
        expect(typeof record.stages[stage].evidence).toBe('string');
      }
    }
  });

  // ── Enhanced field validation ──

  it('every record has a vertical', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(r.vertical).toBe('Immigration');
    }
  });

  it('every record has a valid pipeline archetype', () => {
    const validPipelines = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10', 'P11', 'P12', 'P13', 'P14'];
    for (const r of CERTIFICATION_REGISTRY) {
      const prefix = r.pipeline.split(' ')[0];
      expect(validPipelines).toContain(prefix);
    }
  });

  it('every record has a domain adapter', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(r.domainAdapter.length).toBeGreaterThan(0);
    }
  });

  it('every record has at least one specialist module', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(r.specialistModules.length).toBeGreaterThan(0);
    }
  });

  it('every record has maturity GOLD-CERTIFIED', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(r.maturity).toBe('GOLD-CERTIFIED');
    }
  });

  it('every record has build=true', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(r.build).toBe(true);
    }
  });

  it('every record has seoContent flag', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(typeof r.seoContent).toBe('boolean');
    }
  });

  it('every record has aiCoverage flag', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(typeof r.aiCoverage).toBe('boolean');
    }
  });

  // ── Per-workflow checks ──

  it('RFE has all stages passed', () => {
    expect(RFE_CERTIFICATION.certified).toBe(true);
    expect(RFE_CERTIFICATION.testCount).toBeGreaterThanOrEqual(70);
    expect(RFE_CERTIFICATION.pipeline).toContain('P02');
    expect(RFE_CERTIFICATION.domainAdapter).toContain('RFE');
    const failed = Object.entries(RFE_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });

  it('NOID has all stages passed', () => {
    expect(NOID_CERTIFICATION.certified).toBe(true);
    expect(NOID_CERTIFICATION.testCount).toBeGreaterThanOrEqual(67);
    expect(NOID_CERTIFICATION.pipeline).toContain('P02');
    expect(NOID_CERTIFICATION.domainAdapter).toContain('NOID');
    const failed = Object.entries(NOID_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });

  it('Denial has all stages passed', () => {
    expect(DENIAL_CERTIFICATION.certified).toBe(true);
    expect(DENIAL_CERTIFICATION.testCount).toBeGreaterThanOrEqual(34);
    expect(DENIAL_CERTIFICATION.pipeline).toContain('P03');
    expect(DENIAL_CERTIFICATION.domainAdapter).toContain('Denial');
    const failed = Object.entries(DENIAL_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });

  it('Visa Refusal has all stages passed', () => {
    expect(VISA_REFUSAL_CERTIFICATION.certified).toBe(true);
    expect(VISA_REFUSAL_CERTIFICATION.testCount).toBeGreaterThanOrEqual(52);
    expect(VISA_REFUSAL_CERTIFICATION.pipeline).toContain('P02');
    expect(VISA_REFUSAL_CERTIFICATION.domainAdapter).toContain('Visa');
    const failed = Object.entries(VISA_REFUSAL_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });

  it('I-130 has all stages passed', () => {
    expect(I130_CERTIFICATION.certified).toBe(true);
    expect(I130_CERTIFICATION.testCount).toBeGreaterThanOrEqual(71);
    expect(I130_CERTIFICATION.pipeline).toContain('P05');
    expect(I130_CERTIFICATION.domainAdapter).toContain('I-130');
    const failed = Object.entries(I130_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });

  it('FOIA has all stages passed', () => {
    expect(FOIA_CERTIFICATION.certified).toBe(true);
    expect(FOIA_CERTIFICATION.testCount).toBeGreaterThanOrEqual(49);
    expect(FOIA_CERTIFICATION.pipeline).toContain('P08');
    expect(FOIA_CERTIFICATION.domainAdapter).toContain('FOIA');
    const failed = Object.entries(FOIA_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });

  it('Appeal has all stages passed', () => {
    expect(APPEAL_CERTIFICATION.certified).toBe(true);
    expect(APPEAL_CERTIFICATION.testCount).toBeGreaterThanOrEqual(55);
    expect(APPEAL_CERTIFICATION.pipeline).toContain('P03');
    expect(APPEAL_CERTIFICATION.domainAdapter).toContain('Appeal');
    const failed = Object.entries(APPEAL_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });

  it('I-797 is certified as routing-only workflow', () => {
    expect(I797_CERTIFICATION.certified).toBe(true);
    expect(I797_CERTIFICATION.testCount).toBeGreaterThanOrEqual(35);
    expect(I797_CERTIFICATION.pipeline).toContain('P01');
    expect(I797_CERTIFICATION.domainAdapter).toContain('I-797');
    expect(I797_CERTIFICATION.stages.drafting.evidence).toBe('I797_NO_DRAFT_ROUTING');
    expect(I797_CERTIFICATION.stages.payment.evidence).toBe('NOT_APPLICABLE_ROUTING_ONLY');
    expect(I797_CERTIFICATION.stages.fulfillment.evidence).toBe('NOT_APPLICABLE_ROUTING_ONLY');
    expect(I797_CERTIFICATION.stages.tracking.evidence).toBe('NOT_APPLICABLE_ROUTING_ONLY');
    expect(I797_CERTIFICATION.stages.proof.evidence).toBe('NOT_APPLICABLE_ROUTING_ONLY');
  });


  it('I-751 has all stages passed', () => {
    expect(I751_CERTIFICATION.certified).toBe(true);
    expect(I751_CERTIFICATION.testCount).toBeGreaterThanOrEqual(182);
    expect(I751_CERTIFICATION.pipeline).toContain('P10');
    expect(I751_CERTIFICATION.domainAdapter).toContain('I-751');
    const failed = Object.entries(I751_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });


  it('I-601 has all stages passed', () => {
    expect(I601_CERTIFICATION.certified).toBe(true);
    expect(I601_CERTIFICATION.testCount).toBeGreaterThanOrEqual(203);
    expect(I601_CERTIFICATION.pipeline).toContain('P11');
    expect(I601_CERTIFICATION.domainAdapter).toContain('I-601');
    const failed = Object.entries(I601_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });


  it('I-765 has all stages passed', () => {
    expect(I765_CERTIFICATION.certified).toBe(true);
    expect(I765_CERTIFICATION.testCount).toBeGreaterThanOrEqual(223);
    expect(I765_CERTIFICATION.pipeline).toContain('P12');
    expect(I765_CERTIFICATION.domainAdapter).toContain('I-765');
    const failed = Object.entries(I765_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });


  it('I-131 has all stages passed', () => {
    expect(I131_CERTIFICATION.certified).toBe(true);
    expect(I131_CERTIFICATION.testCount).toBeGreaterThanOrEqual(210);
    expect(I131_CERTIFICATION.pipeline).toContain('P13');
    expect(I131_CERTIFICATION.domainAdapter).toContain('I-131');
    const failed = Object.entries(I131_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });


  it('I-90 has all stages passed', () => {
    expect(I90_CERTIFICATION.certified).toBe(true);
    expect(I90_CERTIFICATION.testCount).toBeGreaterThanOrEqual(171);
    expect(I90_CERTIFICATION.pipeline).toContain('P14');
    expect(I90_CERTIFICATION.domainAdapter).toContain('I-90');
    const failed = Object.entries(I90_CERTIFICATION.stages).filter(([, v]) => !v.passed);
    expect(failed).toHaveLength(0);
  });

  it('getCertification returns correct record', () => {
    expect(getCertification('rfe-response')?.workflowTitle).toBe('Respond to a USCIS RFE');
    expect(getCertification('noid-response')?.workflowTitle).toBe('Respond to a USCIS NOID');
    expect(getCertification('uscis-denial-rejection')?.workflowTitle).toBe('Respond to a USCIS Denial');
    expect(getCertification('visa-refusal-response')?.workflowTitle).toBe('Respond to a Visa Refusal');
    expect(getCertification('i-130-response')?.workflowTitle).toBe('Respond to an I-130 Request');
    expect(getCertification('uscis-foia')?.workflowTitle).toBe('Request USCIS Records by FOIA');
    expect(getCertification('immigration-appeal-letter')?.workflowTitle).toBe('Prepare an Immigration Appeal Letter');
    expect(getCertification('i-797-notice')?.workflowTitle).toBe('Understand an I-797 Notice');
    expect(getCertification('case-inquiry')?.workflowTitle).toBe('Submit a USCIS Case Inquiry');
    expect(getCertification('i751-removal-conditions')?.workflowTitle).toBe('Remove Conditions on Residence (I-751)');
    expect(getCertification('i601-waiver')?.workflowTitle).toBe('Inadmissibility Waiver (I-601 / I-601A)');
    expect(getCertification('i765-employment-authorization')?.workflowTitle).toBe('Employment Authorization Document (I-765 EAD / Work Permit)');
    expect(getCertification('i131-travel-document')?.workflowTitle).toBe('Advance Parole / Travel Document (I-131)');
    expect(getCertification('i90-green-card-renewal')?.workflowTitle).toBe('Green Card Renewal / Replacement (I-90)');
    expect(getCertification('nonexistent')).toBeUndefined();
  });

  it('isCertified returns true for all 17 workflows', () => {
    expect(isCertified('rfe-response')).toBe(true);
    expect(isCertified('noid-response')).toBe(true);
    expect(isCertified('uscis-denial-rejection')).toBe(true);
    expect(isCertified('visa-refusal-response')).toBe(true);
    expect(isCertified('i-130-response')).toBe(true);
    expect(isCertified('uscis-foia')).toBe(true);
    expect(isCertified('immigration-appeal-letter')).toBe(true);
    expect(isCertified('i-797-notice')).toBe(true);
    expect(isCertified('case-inquiry')).toBe(true);
    expect(isCertified('biometrics-scheduling')).toBe(true);
    expect(isCertified('naturalization-citizenship')).toBe(true);
    expect(isCertified('consular-processing')).toBe(true);
    expect(isCertified('i751-removal-conditions')).toBe(true);
    expect(isCertified('i601-waiver')).toBe(true);
    expect(isCertified('i765-employment-authorization')).toBe(true);
    expect(isCertified('i131-travel-document')).toBe(true);
    expect(isCertified('i90-green-card-renewal')).toBe(true);
    expect(isCertified('nonexistent')).toBe(false);
  });

  it('getAllCertifications returns all 17', () => {
    expect(getAllCertifications()).toHaveLength(17);
    expect(getAllCertifications()).toBe(CERTIFICATION_REGISTRY);
  });

  it('every record has a valid ISO date', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      const date = new Date(r.certifiedAt);
      expect(date.getTime()).not.toBeNaN();
    }
  });

  it('every record has a test file and positive test count', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(r.testFile.length).toBeGreaterThan(0);
      expect(r.testCount).toBeGreaterThan(0);
    }
  });

  it('pipeline distribution covers multiple archetypes', () => {
    const pipelines = new Set(CERTIFICATION_REGISTRY.map(r => r.pipeline.split(' ')[0]));
    expect(pipelines.size).toBeGreaterThanOrEqual(10); // P01, P02, P03, P05, P06, P08
  });

  it('specialist modules are unique per workflow', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(new Set(r.specialistModules).size).toBe(r.specialistModules.length);
    }
  });


  // ── New field validation: security, pricing, mailing, tracking, proof, gold ──

  it('every record has a security status', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(['verified', 'partial', 'planned', 'not_applicable']).toContain(r.security);
    }
  });

  it('every record has a pricing status', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(['verified', 'partial', 'planned', 'not_applicable']).toContain(r.pricing);
    }
  });

  it('every record has a mailing status', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(['verified', 'partial', 'planned', 'not_applicable']).toContain(r.mailing);
    }
  });

  it('every record has a tracking status', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(['verified', 'partial', 'planned', 'not_applicable']).toContain(r.tracking);
    }
  });

  it('every record has a proof status', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(['verified', 'partial', 'planned', 'not_applicable']).toContain(r.proof);
    }
  });

  it('every record has a gold status', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(['verified', 'partial', 'planned', 'not_applicable']).toContain(r.gold);
    }
  });

  it('mailing workflows have verified mailing/tracking/proof', () => {
    const mailingWorkflows = CERTIFICATION_REGISTRY.filter(r => r.mailing === 'verified');
    expect(mailingWorkflows.length).toBeGreaterThanOrEqual(8);
    for (const r of mailingWorkflows) {
      expect(r.tracking).toBe('verified');
      expect(r.proof).toBe('verified');
      expect(r.pricing).toBe('verified');
    }
  });

  it('I-797 has not_applicable for mailing/tracking/proof (routing only)', () => {
    expect(I797_CERTIFICATION.mailing).toBe('not_applicable');
    expect(I797_CERTIFICATION.tracking).toBe('not_applicable');
    expect(I797_CERTIFICATION.proof).toBe('not_applicable');
    expect(I797_CERTIFICATION.pricing).toBe('not_applicable');
  });

  it('every record has gold=verified', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(r.gold).toBe('verified');
    }
  });

  it('every record has security=verified', () => {
    for (const r of CERTIFICATION_REGISTRY) {
      expect(r.security).toBe('verified');
    }
  });

});

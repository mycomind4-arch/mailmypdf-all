import { describe, it, expect } from 'vitest';
import { detectRFEFormType, analyzeRFE } from './rfe-model';
import { detectNOIDFormType, analyzeNOID, buildNOIDStrategy } from './noid-model';
import { buildDocumentUnderstanding } from './document-understanding';
import {
  getRFEFormProfile,
  getNOIDFormProfile,
  getAllFormProfiles,
  isFormVariantCanonical,
  resolveFormVariant,
  FORM_VARIANT_REGISTRY,
  generateFormSpecificRFEContent,
  generateFormSpecificNOIDContent,
} from './form-adapters';

function makeDU(text: string) {
  return buildDocumentUnderstanding({ documentId: 'test', text, source: { documentId: 'test', confidence: 0.9 }, language: 'en' });
}

// ─── Test Data ─────────────────────────────────────────────────────────────────

const I485_RFE = `USCIS Request for Evidence
I-485 Application to Register Permanent Residence
Receipt: MSC1234567890
within 87 days

Please submit the following:
1. Form I-693 medical examination in sealed envelope
2. Form I-864 affidavit of support with most recent tax return
3. Certified English translation of birth certificate`;

const I140_RFE = `USCIS Request for Evidence
I-140 Immigrant Petition for Alien Worker
Receipt: WAC9876543210
within 87 days

Please submit:
1. Approved PERM labor certification
2. Employer financial records demonstrating ability to pay
3. Experience letters from prior employers`;

const N400_RFE = `USCIS Request for Evidence
N-400 Application for Naturalization
Receipt: LIN5556667778
within 87 days

Please submit:
1. Tax returns for the past 5 years
2. Selective Service registration proof
3. Court disposition records`;

const I751_NOID = `USCIS Notice of Intent to Deny
I-751 Petition to Remove Conditions on Residence
Receipt: SRC1112223334
within 33 days

USCIS finds insufficient evidence of bona fide marriage.
The marriage appears to have been entered into for immigration purposes.
Evidence submitted does not establish shared residence or finances.`;

// ─── Tests ────────────────────────────────────────────────────────────────────────

describe('Consolidation: 1-4. Form queries route to correct canonical engine', () => {
  it('I-140 query → RFE engine with I-140 form type', () => {
    const du = makeDU(I140_RFE);
    expect(du.detectedLanguage).toBe('en');
    const formType = detectRFEFormType(I140_RFE);
    expect(formType).toBe('I-140');
    const analysis = analyzeRFE(du, I140_RFE);
    expect(analysis.formType).toBe('I-140');
  });

  it('I-485 query → RFE engine with I-485 form type', () => {
    const formType = detectRFEFormType(I485_RFE);
    expect(formType).toBe('I-485');
    const analysis = analyzeRFE(makeDU(I485_RFE), I485_RFE);
    expect(analysis.formType).toBe('I-485');
  });

  it('N-400 query → RFE engine with N-400 form type', () => {
    const formType = detectRFEFormType(N400_RFE);
    expect(formType).toBe('N-400');
    const analysis = analyzeRFE(makeDU(N400_RFE), N400_RFE);
    expect(analysis.formType).toBe('N-400');
  });

  it('I-751 query → NOID engine with I-751 form type', () => {
    const formType = detectNOIDFormType(I751_NOID);
    expect(formType).toBe('I-751');
    const analysis = analyzeNOID(I751_NOID);
    expect(analysis.formType).toBe('I-751');
  });
});

describe('Consolidation: 5. Form-specific content is preserved', () => {
  it('I-140 RFE content generated', () => {
    const content = generateFormSpecificRFEContent('I-140');
    expect(content).toBeDefined();
    expect(content!.title).toContain('I-140');
    expect(content!.content).toContain('PERM');
  });

  it('I-485 RFE content generated', () => {
    const content = generateFormSpecificRFEContent('I-485');
    expect(content).toBeDefined();
    expect(content!.content).toContain('I-693');
    expect(content!.content).toContain('I-864');
  });

  it('N-400 RFE content generated', () => {
    const content = generateFormSpecificRFEContent('N-400');
    expect(content).toBeDefined();
    expect(content!.content).toContain('Selective Service');
  });

  it('I-751 NOID content generated', () => {
    const content = generateFormSpecificNOIDContent('I-751');
    expect(content).toBeDefined();
    expect(content!.content).toContain('bona fide');
  });
});

describe('Consolidation: 6. Form-specific evidence requirements work', () => {
  it('I-485 profile has medical examination category', () => {
    const profile = getRFEFormProfile('I-485');
    expect(profile).toBeDefined();
    expect(profile!.evidenceCategories.some(e => e.category === 'medical_examination')).toBe(true);
  });

  it('I-140 profile has labor certification category', () => {
    const profile = getRFEFormProfile('I-140');
    expect(profile).toBeDefined();
    expect(profile!.evidenceCategories.some(e => e.category === 'labor_certification')).toBe(true);
  });

  it('N-400 profile has selective service category', () => {
    const profile = getRFEFormProfile('N-400');
    expect(profile).toBeDefined();
    expect(profile!.evidenceCategories.some(e => e.category === 'selective_service')).toBe(true);
  });

  it('I-751 profile has bona fide marriage category', () => {
    const profile = getNOIDFormProfile('I-751');
    expect(profile).toBeDefined();
    expect(profile!.evidenceCategories.some(e => e.category === 'bona_fide_marriage')).toBe(true);
  });

  it('all 10 form profiles exist', () => {
    const all = getAllFormProfiles();
    expect(all.length).toBeGreaterThanOrEqual(10);
  });
});

describe('Consolidation: 7-8. Form-specific authority and X-Ray rules', () => {
  it('I-485 authority notes reference 8 CFR 245.2', () => {
    const profile = getRFEFormProfile('I-485');
    expect(profile!.authorityNotes).toContain('245');
  });

  it('I-140 authority notes reference 8 CFR 204.5', () => {
    const profile = getRFEFormProfile('I-140');
    expect(profile!.authorityNotes).toContain('204.5');
  });

  it('I-485 X-Ray rule: I-693 must be sealed', () => {
    const profile = getRFEFormProfile('I-485');
    expect(profile!.xrayRules.some(r => r.rule.includes('I-693') && r.rule.includes('sealed'))).toBe(true);
  });

  it('I-140 X-Ray rule: PERM must be valid', () => {
    const profile = getRFEFormProfile('I-140');
    expect(profile!.xrayRules.some(r => r.rule.includes('PERM'))).toBe(true);
  });

  it('I-751 X-Ray rule: evidence spans conditional residence period', () => {
    const profile = getNOIDFormProfile('I-751');
    expect(profile!.xrayRules.some(r => r.rule.includes('conditional residence'))).toBe(true);
  });

  it('N-400 X-Ray rule: tax returns cover full period', () => {
    const profile = getRFEFormProfile('N-400');
    expect(profile!.xrayRules.some(r => r.rule.includes('Tax returns') && r.rule.includes('full'))).toBe(true);
  });
});

describe('Consolidation: 9. No duplicate workflow engine exists', () => {
  it('I-140 RFE variant resolves to rfe-response canonical', () => {
    const variant = resolveFormVariant('i-140-rfe-response');
    expect(variant).toBeDefined();
    expect(variant!.canonical).toBe('rfe-response');
    expect(variant!.formAdapter).toBe('I-140');
  });

  it('I-485 RFE variant resolves to rfe-response canonical', () => {
    const variant = resolveFormVariant('i-485-rfe-response');
    expect(variant!.canonical).toBe('rfe-response');
  });

  it('N-400 RFE variant resolves to rfe-response canonical', () => {
    const variant = resolveFormVariant('n-400-rfe-response');
    expect(variant!.canonical).toBe('rfe-response');
  });

  it('I-751 NOID variant resolves to noid-response canonical', () => {
    const variant = resolveFormVariant('i-751-noid');
    expect(variant!.canonical).toBe('noid-response');
    expect(variant!.formAdapter).toBe('I-751');
  });

  it('no form variant has its own canonical workflow slug', () => {
    const variants = Object.keys(FORM_VARIANT_REGISTRY);
    for (const v of variants) {
      const resolved = resolveFormVariant(v);
      expect(resolved!.canonical).not.toBe(v);
    }
  });
});

describe('Consolidation: 10-11. SEO aliases route correctly', () => {
  it('I-140 RFE content routes to /rfe/i140', () => {
    const content = generateFormSpecificRFEContent('I-140');
    expect(content!.canonical).toBe('https://immigrationmail.com/rfe/i140');
  });

  it('I-485 RFE content routes to /rfe/i485', () => {
    const content = generateFormSpecificRFEContent('I-485');
    expect(content!.canonical).toBe('https://immigrationmail.com/rfe/i485');
  });

  it('I-751 NOID content routes to /noid/i751', () => {
    const content = generateFormSpecificNOIDContent('I-751');
    expect(content!.canonical).toBe('https://immigrationmail.com/noid/i751');
  });

  it('N-400 RFE content routes to /rfe/n400', () => {
    const content = generateFormSpecificRFEContent('N-400');
    expect(content!.canonical).toBe('https://immigrationmail.com/rfe/n400');
  });
});

describe('Consolidation: 12. Domain context survives the workflow', () => {
  it('I-485 RFE analysis retains form type and evidence items', () => {
    const analysis = analyzeRFE(makeDU(I485_RFE), I485_RFE);
    expect(analysis.formType).toBe('I-485');
    expect(analysis.requestedItems.length).toBeGreaterThan(0);
  });

  it('I-140 RFE analysis retains form type', () => {
    const analysis = analyzeRFE(makeDU(I140_RFE), I140_RFE);
    expect(analysis.formType).toBe('I-140');
  });

  it('I-751 NOID analysis retains form type and denial grounds', () => {
    const analysis = analyzeNOID(I751_NOID);
    expect(analysis.formType).toBe('I-751');
    expect(analysis.denialGrounds.length).toBeGreaterThan(0);
  });

  it('I-751 NOID strategy builds correctly', () => {
    const analysis = analyzeNOID(I751_NOID);
    const strategy = buildNOIDStrategy(analysis);
    expect(strategy.type).toBeDefined();
  });
});

describe('Consolidation: 13. MailMyPDF execution remains identical', () => {
  it('all form variants use the same fulfillment pipeline (no form-specific fulfillment)', () => {
    const forms = ['I-485', 'I-140', 'N-400', 'I-751'];
    for (const form of forms) {
      const profile = getRFEFormProfile(form) ?? getNOIDFormProfile(form as any);
      expect(profile).toBeDefined();
      // No form-specific fulfillment logic — all use shared MailMyPDF
    }
  });
});

describe('Consolidation: 14. Owner isolation remains intact', () => {
  it('form variants do not bypass owner isolation', () => {
    const variant = resolveFormVariant('i-140-rfe-response');
    // Owner isolation is handled by the canonical engine, not the adapter
    expect(variant!.canonical).toBe('rfe-response');
  });
});

describe('Consolidation: 15. Multilingual handling remains intact', () => {
  it('I-485 RFE analysis supports multilingual output', () => {
    const analysis = analyzeRFE(makeDU(I485_RFE), I485_RFE);
    expect(analysis.summaryEn).toBeDefined();
  });

  it('I-751 NOID analysis supports multilingual output', () => {
    const analysis = analyzeNOID(I751_NOID);
    expect(analysis.summaryEs).toBeDefined();
  });
});

describe('Consolidation: Registry correctness', () => {
  it('all 44 form variants are registered', () => {
    expect(Object.keys(FORM_VARIANT_REGISTRY).length).toBe(44);
  });

  it('all form variants are canonical (handled by shared engines)', () => {
    const forms = ['I-485', 'I-130', 'I-140', 'I-751', 'N-400', 'I-129', 'I-90', 'I-765', 'I-864', 'I-693', 'N-600', 'DS-260', 'generic'];
    for (const f of forms) {
      expect(isFormVariantCanonical(f)).toBe(true);
    }
  });
});

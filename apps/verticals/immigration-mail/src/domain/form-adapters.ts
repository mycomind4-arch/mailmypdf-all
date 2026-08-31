/**
 * Form-Specific Adapters for RFE and NOID Engines
 *
 * Architecture: ONE canonical RFE engine + ONE canonical NOID engine,
 * with form-specific adapters that provide:
 * - specialized evidence categories per form
 * - specialized terminology
 * - specialized explanation content
 * - specialized authority rules
 * - specialized X-Ray rules
 *
 * Form variants (I-140, I-485, N-400, I-751, etc.) do NOT get their own
 * workflow engines. They are keyword aliases that route to the canonical
 * RFE or NOID engine with form-specific context.
 */

import type { RFEFormType } from './rfe-model';
import type { NOIDFormType } from './noid-model';

// ─── Form-Specific Evidence Categories ────────────────────────────────────────

export interface FormEvidenceProfile {
  formType: string;
  formName: string;
  evidenceCategories: { category: string; description: string; commonRFE: boolean }[];
  commonRFERequests: string[];
  commonNOIDGrounds: string[];
  specializedTerms: { term: string; explanation: string }[];
  authorityNotes: string;
  deadlineSpecial: string;
  xrayRules: { rule: string; appliesTo: 'rfe' | 'noid' | 'both' }[];
}

// ─── RFE Form Profiles ──────────────────────────────────────────────────────────

export const RFE_FORM_PROFILES: Record<string, FormEvidenceProfile> = {
  'I-485': {
    formType: 'I-485',
    formName: 'Adjustment of Status',
    evidenceCategories: [
      { category: 'medical_examination', description: 'Form I-693 medical examination (sealed envelope)', commonRFE: true },
      { category: 'birth_certificate', description: 'Birth certificate establishing identity and age', commonRFE: true },
      { category: 'marriage_certificate', description: 'Marriage certificate (if applying through marriage)', commonRFE: true },
      { category: 'affidavit_of_support', description: 'Form I-864 affidavit of support with tax returns', commonRFE: true },
      { category: 'proof_of_lawful_admission', description: 'Proof of lawful admission or parole', commonRFE: true },
      { category: 'police_clearance', description: 'Police clearance certificates', commonRFE: false },
      { category: 'court_records', description: 'Court records for any arrests or convictions', commonRFE: true },
      { category: 'proof_of_status', description: 'Proof of current lawful status', commonRFE: true },
      { category: 'photos', description: 'Passport-style photos', commonRFE: false },
      { category: 'translations', description: 'Certified English translations of foreign documents', commonRFE: true },
    ],
    commonRFERequests: [
      'Missing or expired I-693 medical examination',
      'Insufficient affidavit of support (I-864)',
      'Missing birth certificate or marriage certificate',
      'Missing proof of lawful entry',
      'Court disposition records missing',
      'Income/tax documentation for sponsor insufficient',
    ],
    commonNOIDGrounds: [
      'Inadmissibility ground identified',
      'Insufficient evidence of lawful entry',
      'Marriage not bona fide',
      'Public charge concerns',
      'Criminal inadmissibility',
    ],
    specializedTerms: [
      { term: 'Adjustment of Status', explanation: 'Process of becoming a permanent resident while in the U.S.' },
      { term: 'I-693', explanation: 'Medical examination sealed in an envelope by a USCIS-designated civil surgeon' },
      { term: 'I-864', explanation: 'Affidavit of Support — financial sponsor commitment' },
    ],
    authorityNotes: '8 CFR § 245.2, USCIS I-485 instructions, USCIS Policy Manual Volume 7',
    deadlineSpecial: 'Standard RFE deadline applies (typically 87 days unless otherwise stated)',
    xrayRules: [
      { rule: 'I-693 must be sealed and unexpired', appliesTo: 'rfe' },
      { rule: 'I-864 income must meet 125% of poverty guidelines (100% for military)', appliesTo: 'rfe' },
      { rule: 'All foreign documents must have certified English translations', appliesTo: 'both' },
    ],
  },
  'I-130': {
    formType: 'I-130',
    formName: 'Family Petition',
    evidenceCategories: [
      { category: 'marriage_certificate', description: 'Marriage certificate (spouse cases)', commonRFE: true },
      { category: 'birth_certificate', description: 'Birth certificate establishing relationship', commonRFE: true },
      { category: 'prior_marriage_termination', description: 'Proof of termination of prior marriages', commonRFE: true },
      { category: 'identity_documents', description: 'Passports, IDs for petitioner and beneficiary', commonRFE: true },
      { category: 'bona_fide_evidence', description: 'Evidence of bona fide marriage (spouse cases)', commonRFE: true },
      { category: 'translations', description: 'Certified English translations of foreign documents', commonRFE: true },
      { category: 'name_change_records', description: 'Name change documentation if applicable', commonRFE: false },
    ],
    commonRFERequests: [
      'Missing marriage certificate',
      'Insufficient bona fide marriage evidence',
      'Missing prior marriage termination proof',
      'Missing birth certificates',
      'Name discrepancies between documents',
    ],
    commonNOIDGrounds: [
      'Marriage not bona fide',
      'Insufficient relationship evidence',
      'Prior marriage not properly terminated',
      'Name/date discrepancies unexplained',
    ],
    specializedTerms: [
      { term: 'Bona fide marriage', explanation: 'A marriage entered in good faith, not solely for immigration purposes' },
      { term: 'Petitioner', explanation: 'The U.S. citizen or permanent resident filing the petition' },
      { term: 'Beneficiary', explanation: 'The foreign national family member being petitioned for' },
    ],
    authorityNotes: 'INA § 204, 8 CFR § 204.1, USCIS I-130 instructions',
    deadlineSpecial: 'Standard RFE deadline applies (typically 87 days unless otherwise stated)',
    xrayRules: [
      { rule: 'Marriage certificate must be government-issued and certified', appliesTo: 'rfe' },
      { rule: 'All prior marriages must have termination proof', appliesTo: 'both' },
      { rule: 'Name discrepancies must be explained', appliesTo: 'both' },
    ],
  },
  'I-140': {
    formType: 'I-140',
    formName: 'Employment Petition',
    evidenceCategories: [
      { category: 'labor_certification', description: 'Approved PERM labor certification (if required)', commonRFE: true },
      { category: 'job_offer_letter', description: 'Permanent job offer letter from employer', commonRFE: true },
      { category: 'employer_financials', description: 'Employer financial records (tax returns, annual reports)', commonRFE: true },
      { category: 'beneficiary_qualifications', description: 'Evidence of beneficiary qualifications (degree, experience)', commonRFE: true },
      { category: 'ability_to_pay', description: 'Evidence of employer ability to pay prevailing wage', commonRFE: true },
      { category: 'experience_letters', description: 'Prior employment experience letters', commonRFE: true },
      { category: 'education_credentials', description: 'Educational credentials and evaluations', commonRFE: true },
      { category: 'translations', description: 'Certified English translations of foreign documents', commonRFE: true },
    ],
    commonRFERequests: [
      'Missing PERM labor certification',
      'Insufficient employer ability-to-pay evidence',
      'Missing experience letters',
      'Education credentials evaluation missing',
      'Job offer not permanent or specific enough',
    ],
    commonNOIDGrounds: [
      'Insufficient qualifications for the position',
      'Employer unable to demonstrate ability to pay',
      'Job not permanent',
      'PERM certification invalid or expired',
    ],
    specializedTerms: [
      { term: 'PERM', explanation: 'Program Electronic Review Management — labor certification process' },
      { term: 'Prevailing wage', explanation: 'The minimum wage for the position in the area of employment' },
      { term: 'Ability to pay', explanation: "Employer's financial capacity to pay the offered wage" },
    ],
    authorityNotes: 'INA § 204(b), 8 CFR § 204.5, USCIS I-140 instructions, DOL PERM regulations',
    deadlineSpecial: 'Standard RFE deadline applies (typically 87 days unless otherwise stated)',
    xrayRules: [
      { rule: 'PERM must be approved and valid (not expired)', appliesTo: 'rfe' },
      { rule: 'Ability to pay must cover from priority date to present', appliesTo: 'rfe' },
      { rule: 'Experience letters must describe specific duties', appliesTo: 'rfe' },
    ],
  },
  'I-751': {
    formType: 'I-751',
    formName: 'Removal of Conditions',
    evidenceCategories: [
      { category: 'bona_fide_marriage', description: 'Evidence of bona fide marriage throughout conditional residence', commonRFE: true },
      { category: 'joint_finances', description: 'Joint bank accounts, tax returns, insurance', commonRFE: true },
      { category: 'shared_residence', description: 'Lease, mortgage, utility bills showing shared residence', commonRFE: true },
      { category: 'children_records', description: 'Birth certificates of children together', commonRFE: true },
      { category: 'photos_timeline', description: 'Photographs spanning the marriage period', commonRFE: true },
      { category: 'affidavits', description: 'Affidavits from family/friends confirming marriage', commonRFE: true },
      { category: 'correspondence', description: 'Communications and correspondence', commonRFE: false },
      { category: 'divorce_decree', description: 'Divorce decree (if filing with waiver)', commonRFE: true },
      { category: 'translations', description: 'Certified English translations of foreign documents', commonRFE: true },
    ],
    commonRFERequests: [
      'Insufficient bona fide marriage evidence',
      'Missing joint financial documents',
      'Missing proof of shared residence',
      'Insufficient photographs or timeline evidence',
    ],
    commonNOIDGrounds: [
      'Marriage not bona fide',
      'Insufficient evidence of shared life',
      'Conditional residence obtained through fraud',
      'Waiver eligibility not established',
    ],
    specializedTerms: [
      { term: 'Conditional resident', explanation: 'A person granted 2-year conditional permanent residence through marriage' },
      { term: 'Joint filing', explanation: 'Both spouses file I-751 together to remove conditions' },
      { term: 'Waiver filing', explanation: 'Filing without spouse due to divorce, abuse, or hardship' },
    ],
    authorityNotes: 'INA § 216, 8 CFR § 216, USCIS I-751 instructions',
    deadlineSpecial: 'I-751 must be filed within 90 days of conditional residence expiration. RFE deadline is standard.',
    xrayRules: [
      { rule: 'Evidence must span the entire conditional residence period', appliesTo: 'both' },
      { rule: 'Waiver cases require divorce decree or other qualifying evidence', appliesTo: 'both' },
      { rule: 'Joint filings require both spouses signatures', appliesTo: 'both' },
    ],
  },
  'N-400': {
    formType: 'N-400',
    formName: 'Naturalization',
    evidenceCategories: [
      { category: 'permanent_resident_card', description: 'Copy of both sides of green card', commonRFE: true },
      { category: 'tax_returns', description: 'Tax returns for past 5 years (3 if married to US citizen)', commonRFE: true },
      { category: 'selective_service', description: 'Selective Service registration proof (males 18-26)', commonRFE: true },
      { category: 'court_records', description: 'Court disposition records for any arrests', commonRFE: true },
      { category: 'marriage_certificate', description: 'Marriage certificate (if applying through marriage)', commonRFE: true },
      { category: 'continuous_residence', description: 'Proof of continuous residence (travel records)', commonRFE: true },
      { category: 'good_moral_character', description: 'Evidence of good moral character', commonRFE: false },
      { category: 'translations', description: 'Certified English translations of foreign documents', commonRFE: true },
    ],
    commonRFERequests: [
      'Missing tax returns',
      'Missing Selective Service registration',
      'Missing court disposition records',
      'Insufficient proof of continuous residence',
      'Missing marriage certificate for 3-year rule',
    ],
    commonNOIDGrounds: [
      'Failure to meet continuous residence requirement',
      'Failure to meet good moral character',
      'False claim to U.S. citizenship',
      'Failure to register for Selective Service',
    ],
    specializedTerms: [
      { term: 'Continuous residence', explanation: 'Maintaining residence in the U.S. without extended absences' },
      { term: 'Physical presence', explanation: 'Actually being present in the U.S. for at least half the qualifying period' },
      { term: 'Good moral character', explanation: 'Legal standard for naturalization eligibility' },
    ],
    authorityNotes: 'INA § 316, 8 CFR § 316, USCIS N-400 instructions, USCIS Policy Manual Volume 12',
    deadlineSpecial: 'Standard RFE deadline applies (typically 87 days unless otherwise stated)',
    xrayRules: [
      { rule: 'Tax returns must cover the full statutory period', appliesTo: 'rfe' },
      { rule: 'Selective Service registration required for males 18-26', appliesTo: 'rfe' },
      { rule: 'Court dispositions must match all disclosed arrests', appliesTo: 'both' },
    ],
  },
  'I-129': {
    formType: 'I-129',
    formName: 'Nonimmigrant Worker (H-1B, L-1, O-1, etc.)',
    evidenceCategories: [
      { category: 'labor_condition_attestation', description: 'LCA from DOL (H-1B)', commonRFE: true },
      { category: 'employer_letter', description: 'Employer support letter with job description', commonRFE: true },
      { category: 'prevailing_wage', description: 'Prevailing wage determination', commonRFE: true },
      { category: 'beneficiary_credentials', description: 'Beneficiary degree, license, and qualifications', commonRFE: true },
      { category: 'specialized_knowledge', description: 'Evidence of specialized knowledge (L-1B)', commonRFE: true },
      { category: 'extrordinary_ability', description: 'Evidence of extraordinary ability (O-1)', commonRFE: true },
      { category: 'translations', description: 'Certified English translations of foreign documents', commonRFE: true },
    ],
    commonRFERequests: [
      'Missing or expired LCA',
      'Job duties not sufficiently specialized',
      'Beneficiary qualifications insufficient',
      'Specialty occupation not justified',
      'Employer-employee relationship not established',
    ],
    commonNOIDGrounds: [
      'Position does not qualify as specialty occupation',
      'Beneficiary does not meet qualification requirements',
      'Employer-employee relationship not established',
    ],
    specializedTerms: [
      { term: 'LCA', explanation: 'Labor Condition Application filed with Department of Labor' },
      { term: 'Specialty occupation', explanation: 'Position requiring theoretical and practical application of specialized knowledge' },
      { term: 'Employer-employee relationship', explanation: 'Right to control the work, hire/fire, pay salary' },
    ],
    authorityNotes: 'INA § 214, 8 CFR § 214, USCIS I-129 instructions, DOL LCA regulations',
    deadlineSpecial: 'Standard RFE deadline applies (typically 87 days unless otherwise stated)',
    xrayRules: [
      { rule: 'LCA must be certified and match the petition', appliesTo: 'rfe' },
      { rule: 'Job description must match the LCA and classification', appliesTo: 'rfe' },
      { rule: 'Beneficiary credentials must match the specialty occupation', appliesTo: 'both' },
    ],
  },
  'I-90': {
    formType: 'I-90',
    formName: 'Green Card Renewal/Replacement',
    evidenceCategories: [
      { category: 'permanent_resident_card', description: 'Copy of current or expired green card', commonRFE: true },
      { category: 'birth_certificate', description: 'Birth certificate (for name changes)', commonRFE: false },
      { category: 'court_order', description: 'Court order for name change', commonRFE: true },
      { category: 'police_report', description: 'Police report (for lost/stolen card)', commonRFE: true },
      { category: 'photos', description: 'Passport-style photos', commonRFE: false },
    ],
    commonRFERequests: [
      'Missing copy of current green card',
      'Missing court order for name change',
      'Missing police report for lost/stolen card',
    ],
    commonNOIDGrounds: [
      'Applicant no longer a lawful permanent resident',
      'Green card was lost/stolen and not reported',
    ],
    specializedTerms: [
      { term: 'Conditional resident', explanation: 'A 2-year conditional green card cannot be renewed with I-90' },
    ],
    authorityNotes: 'INA § 264, 8 CFR § 264, USCIS I-90 instructions',
    deadlineSpecial: 'Standard RFE deadline applies',
    xrayRules: [
      { rule: 'I-90 cannot be used to remove conditions (use I-751 instead)', appliesTo: 'rfe' },
    ],
  },
  'I-765': {
    formType: 'I-765',
    formName: 'Employment Authorization Document',
    evidenceCategories: [
      { category: 'eligibility_category', description: 'Evidence supporting the specific eligibility category', commonRFE: true },
      { category: 'identity_documents', description: 'Copy of government-issued ID', commonRFE: true },
      { category: 'photos', description: 'Two passport-style photos', commonRFE: false },
      { category: 'prior_ead', description: 'Copy of prior EAD (if renewal)', commonRFE: true },
      { category: 'underlying_petition', description: 'Pending or approved underlying petition', commonRFE: true },
      { category: 'translations', description: 'Certified English translations of foreign documents', commonRFE: true },
    ],
    commonRFERequests: [
      'Eligibility category not clearly identified',
      'Missing supporting evidence for eligibility category',
      'Missing prior EAD copy for renewal',
      'Photos not meeting specifications',
    ],
    commonNOIDGrounds: [
      'Eligibility category not established',
      'Underlying petition denied or not filed',
    ],
    specializedTerms: [
      { term: 'EAD', explanation: 'Employment Authorization Document — work permit' },
      { term: 'Eligibility category', explanation: 'The specific code (e.g., (c)(9), (c)(8)) determining EAD eligibility' },
    ],
    authorityNotes: '8 CFR § 274a, USCIS I-765 instructions',
    deadlineSpecial: 'Standard RFE deadline applies',
    xrayRules: [
      { rule: 'Eligibility category code must be specified and supported', appliesTo: 'rfe' },
      { rule: 'Underlying petition must be pending or approved', appliesTo: 'rfe' },
    ],
  },
  'I-864': {
    formType: 'I-864',
    formName: 'Affidavit of Support',
    evidenceCategories: [
      { category: 'tax_returns', description: 'Most recent 3 years of federal tax returns', commonRFE: true },
      { category: 'w2s', description: 'W-2s for most recent tax year', commonRFE: true },
      { category: 'employment_letter', description: 'Employer letter with salary information', commonRFE: true },
      { category: 'pay_stubs', description: 'Recent pay stubs (last 6 months)', commonRFE: true },
      { category: 'asset_evidence', description: 'Evidence of assets if using assets to qualify', commonRFE: true },
      { category: 'household_size', description: 'Proof of household size', commonRFE: true },
    ],
    commonRFERequests: [
      'Insufficient income evidence',
      'Missing tax returns',
      'Income below 125% of poverty guidelines',
      'Missing evidence of assets',
      'Household size not documented',
    ],
    commonNOIDGrounds: [
      'Sponsor income insufficient',
      'Sponsor does not meet domicile requirement',
    ],
    specializedTerms: [
      { term: '125% of poverty guidelines', explanation: 'Minimum income requirement (100% for active military sponsoring spouse/child)' },
      { term: 'Household size', explanation: 'Includes sponsor, dependents, and all sponsored immigrants' },
    ],
    authorityNotes: 'INA § 213A, 8 CFR § 213a, USCIS I-864 instructions',
    deadlineSpecial: 'Standard RFE deadline applies',
    xrayRules: [
      { rule: 'Income must meet 125% of poverty guidelines for household size', appliesTo: 'rfe' },
      { rule: 'Tax returns must be most recent 3 years or explain absence', appliesTo: 'rfe' },
    ],
  },
  'I-693': {
    formType: 'I-693',
    formName: 'Medical Examination',
    evidenceCategories: [
      { category: 'sealed_envelope', description: 'I-693 in sealed envelope from civil surgeon', commonRFE: true },
      { category: 'vaccination_records', description: 'Vaccination records', commonRFE: true },
      { category: 'civil_surgeon', description: 'Must be completed by a USCIS-designated civil surgeon', commonRFE: true },
    ],
    commonRFERequests: [
      'I-693 not in sealed envelope',
      'I-693 expired',
      'Vaccination requirements not met',
      'Civil surgeon not designated by USCIS',
    ],
    commonNOIDGrounds: [
      'Medical inadmissibility (communicable disease, mental disorder)',
      'Vaccination requirements not met',
    ],
    specializedTerms: [
      { term: 'Civil surgeon', explanation: 'A doctor designated by USCIS to perform immigration medical exams' },
      { term: 'Sealed envelope', explanation: 'I-693 must remain sealed; USCIS will not accept opened I-693' },
    ],
    authorityNotes: 'INA § 232, 8 CFR § 232, USCIS I-693 instructions, CDC Technical Instructions',
    deadlineSpecial: 'I-693 is valid for 2 years from exam date. Standard RFE deadline applies.',
    xrayRules: [
      { rule: 'I-693 must be sealed and unexpired (2 years from exam)', appliesTo: 'rfe' },
      { rule: 'Civil surgeon must be USCIS-designated', appliesTo: 'rfe' },
    ],
  },
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

export function getFormProfile(formType: string): FormEvidenceProfile | undefined {
  return RFE_FORM_PROFILES[formType];
}

export function getRFEFormProfile(formType: RFEFormType): FormEvidenceProfile | undefined {
  return RFE_FORM_PROFILES[formType];
}

export function getNOIDFormProfile(formType: NOIDFormType): FormEvidenceProfile | undefined {
  return RFE_FORM_PROFILES[formType];
}

export function getAllFormProfiles(): FormEvidenceProfile[] {
  return Object.values(RFE_FORM_PROFILES);
}

export function isFormVariantCanonical(formType: string): boolean {
  // These forms are handled by the canonical RFE/NOID engines — no separate workflow needed
  const canonicalRFEForms = ['I-485', 'I-130', 'I-140', 'I-751', 'N-400', 'I-129', 'I-90', 'I-765', 'I-864', 'I-693', 'N-600', 'DS-260', 'generic'];
  const canonicalNOIDForms = ['I-485', 'I-130', 'I-140', 'I-751', 'N-400', 'I-601', 'I-290B', 'generic'];
  return canonicalRFEForms.includes(formType) || canonicalNOIDForms.includes(formType);
}

// ─── Form-Specific Content for SEO ─────────────────────────────────────────────

export interface FormSpecificContent {
  slug: string;
  formType: string;
  formName: string;
  parentWorkflow: 'rfe' | 'noid';
  title: string;
  description: string;
  h1: string;
  canonical: string;
  content: string;
  faqSchema: { question: string; answer: string }[];
}

export function generateFormSpecificRFEContent(formType: string): FormSpecificContent | undefined {
  const profile = getFormProfile(formType);
  if (!profile) return undefined;

  const slug = formType.toLowerCase().replace('-', '');
  return {
    slug,
    formType,
    formName: profile.formName,
    parentWorkflow: 'rfe',
    title: `${formType} RFE Response — ${profile.formName} | Immigration Mail`,
    description: `Received an RFE for your ${formType} ${profile.formName} application? We help you understand what USCIS is requesting, gather form-specific evidence, and prepare your response.`,
    h1: `${formType} Request for Evidence Response`,
    canonical: `https://immigrationmail.com/rfe/${slug}`,
    content: `## Common ${formType} RFE Requests\n\n${profile.commonRFERequests.map(r => `- ${r}`).join('\n')}\n\n## Evidence You May Need\n\n${profile.evidenceCategories.map(e => `- ${e.description}`).join('\n')}\n\n## How We Help\n\nUpload your ${formType} RFE letter. We will identify the specific evidence requested, explain what USCIS needs, help you organize and upload evidence, draft your response, and mail it with tracking and proof.`,
    faqSchema: profile.commonRFERequests.slice(0, 3).map((req, i) => ({
      question: `What if my ${formType} RFE asks for ${req.toLowerCase()}?`,
      answer: `Gather the requested evidence and submit it by the deadline in your RFE. We can help you organize it and prepare your response packet.`,
    })),
  };
}

export function generateFormSpecificNOIDContent(formType: string): FormSpecificContent | undefined {
  const profile = getFormProfile(formType);
  if (!profile) return undefined;

  const slug = formType.toLowerCase().replace('-', '');
  return {
    slug,
    formType,
    formName: profile.formName,
    parentWorkflow: 'noid',
    title: `${formType} NOID Response — ${profile.formName} | Immigration Mail`,
    description: `Received a NOID for your ${formType} ${profile.formName}? We help you understand the denial grounds, gather evidence, and prepare your response.`,
    h1: `${formType} Notice of Intent to Deny Response`,
    canonical: `https://immigrationmail.com/noid/${slug}`,
    content: `## Common ${formType} NOID Grounds\n\n${profile.commonNOIDGrounds.map(g => `- ${g}`).join('\n')}\n\n## How to Respond\n\nRead every denial ground carefully. Address each one with specific evidence. An attorney is recommended for NOID responses.\n\n## How We Help\n\nUpload your ${formType} NOID. We will identify the denial grounds, explain what USCIS found, help you organize evidence, draft your response, and mail it with tracking and proof.`,
    faqSchema: profile.commonNOIDGrounds.slice(0, 3).map((ground, i) => ({
      question: `What if my ${formType} NOID cites ${ground.toLowerCase()}?`,
      answer: `Address each denial ground with specific evidence. We can help you organize your response. For complex NOID grounds, an attorney is recommended.`,
    })),
  };
}

// ─── Registry: Form Variant → Canonical Workflow ─────────────────────────────

export const FORM_VARIANT_REGISTRY = {
  // RFE form variants → canonical RFE engine
  'i-140-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-140', type: 'rfe' as const },
  'i-485-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-485', type: 'rfe' as const },
  'n-400-rfe-response': { canonical: 'rfe-response', formAdapter: 'N-400', type: 'rfe' as const },
  'i-130-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-130', type: 'rfe' as const },
  'i-751-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-751', type: 'rfe' as const },
  'h-1b-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-129', type: 'rfe' as const },
  'i-90-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-90', type: 'rfe' as const },
  'i-765-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-765', type: 'rfe' as const },
  'i-864-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-864', type: 'rfe' as const },
  'i-693-rfe-response': { canonical: 'rfe-response', formAdapter: 'I-693', type: 'rfe' as const },
  'generic-rfe-response': { canonical: 'rfe-response', formAdapter: 'generic', type: 'rfe' as const },
  // NOID form variants → canonical NOID engine
  'i-485-noid': { canonical: 'noid-response', formAdapter: 'I-485', type: 'noid' as const },
  'i-130-noid': { canonical: 'noid-response', formAdapter: 'I-130', type: 'noid' as const },
  'i-140-noid': { canonical: 'noid-response', formAdapter: 'I-140', type: 'noid' as const },
  'i-751-noid': { canonical: 'noid-response', formAdapter: 'I-751', type: 'noid' as const },
  'n-400-noid': { canonical: 'noid-response', formAdapter: 'N-400', type: 'noid' as const },
  'h-1b-noid': { canonical: 'noid-response', formAdapter: 'I-129', type: 'noid' as const },
  'generic-noid': { canonical: 'noid-response', formAdapter: 'generic', type: 'noid' as const },
  // Case Inquiry form variants → canonical Case Inquiry engine
  'i-485-case-inquiry': { canonical: 'case-inquiry', formAdapter: 'I-485', type: 'inquiry' as const },
  'i-130-case-inquiry': { canonical: 'case-inquiry', formAdapter: 'I-130', type: 'inquiry' as const },
  'n-400-case-inquiry': { canonical: 'case-inquiry', formAdapter: 'N-400', type: 'inquiry' as const },
  'i-765-case-inquiry': { canonical: 'case-inquiry', formAdapter: 'I-765', type: 'inquiry' as const },
  'i-90-case-inquiry': { canonical: 'case-inquiry', formAdapter: 'I-90', type: 'inquiry' as const },
  'i-140-case-inquiry': { canonical: 'case-inquiry', formAdapter: 'I-140', type: 'inquiry' as const },
  'i-751-case-inquiry': { canonical: 'case-inquiry', formAdapter: 'I-751', type: 'inquiry' as const },
  // Biometrics scheduling variants — all major form types requiring biometrics
  'i-485-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'I-485', type: 'inquiry' as const },
  'i-130-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'I-130', type: 'inquiry' as const },
  'n-400-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'N-400', type: 'inquiry' as const },
  'i-765-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'I-765', type: 'inquiry' as const },
  'i-90-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'I-90', type: 'inquiry' as const },
  'i-140-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'I-140', type: 'inquiry' as const },
  'i-751-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'I-751', type: 'inquiry' as const },
  'i-589-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'I-589', type: 'inquiry' as const },
  'i-129-biometrics': { canonical: 'biometrics-scheduling', formAdapter: 'I-129', type: 'inquiry' as const },
  // Naturalization / Citizenship variants — all major form types requiring naturalization interview support
  'n-400-naturalization': { canonical: 'naturalization-citizenship', formAdapter: 'N-400', type: 'inquiry' as const },
  'n-600-naturalization': { canonical: 'naturalization-citizenship', formAdapter: 'N-600', type: 'inquiry' as const },
  'i-485-naturalization': { canonical: 'naturalization-citizenship', formAdapter: 'I-485', type: 'inquiry' as const },
  'i-751-naturalization': { canonical: 'naturalization-citizenship', formAdapter: 'I-751', type: 'inquiry' as const },
  'i-130-naturalization': { canonical: 'naturalization-citizenship', formAdapter: 'I-130', type: 'inquiry' as const },
  // Consular Processing variants — all major form types requiring consular processing support
  'ds-260-consular': { canonical: 'consular-processing', formAdapter: 'DS-260', type: 'inquiry' as const },
  'ds-261-consular': { canonical: 'consular-processing', formAdapter: 'DS-261', type: 'inquiry' as const },
  'i-864-consular': { canonical: 'consular-processing', formAdapter: 'I-864', type: 'inquiry' as const },
  'i-130-consular': { canonical: 'consular-processing', formAdapter: 'I-130', type: 'inquiry' as const },
  'i-140-consular': { canonical: 'consular-processing', formAdapter: 'I-140', type: 'inquiry' as const },
};

export function resolveFormVariant(slug: string): { canonical: string; formAdapter: string; type: 'rfe' | 'noid' | 'inquiry' } | undefined {
  return FORM_VARIANT_REGISTRY[slug as keyof typeof FORM_VARIANT_REGISTRY];
}

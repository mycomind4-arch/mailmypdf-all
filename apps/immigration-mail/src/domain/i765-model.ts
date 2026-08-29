/**
 * I-765 Employment Authorization Document (EAD / Work Permit) Domain Model
 *
 * Distinct from all other workflows because:
 * - Centers on the affirmative employment-authorization lifecycle (initial, renewal, replacement)
 * - EAD eligibility category detection is the core — each category maps to a specific code under 8 CFR § 274a.12
 * - Automatic-extension rules changed materially on Oct. 30, 2025 — must encode temporal logic
 * - Renewal timing (90-180 days before expiration) is domain-specific, not a generic deadline
 * - Underlying-case dependency (pending I-485, pending asylum, TPS, etc.) gates eligibility
 * - Fee structure varies by category and filing method (paper $520, online $470, with I-485 $260, asylum free)
 * - Biometrics requirements vary by category
 * - Card production and delivery tracking is unique to EAD (physical card mailed to applicant)
 *
 * Authority:
 *   INA § 274A — employment authorization
 *   8 CFR § 274a.12 — categories of aliens authorized to accept employment
 *   8 CFR § 274a.13 — application for employment authorization
 *   USCIS Form I-765 instructions (edition 08/21/25)
 *
 * User journeys:
 *   "I need to apply for a work permit with my pending green card application." (c9)
 *   "I have a pending asylum case and need work authorization." (c8)
 *   "My EAD is expiring and I need to renew." (renewal)
 *   "I lost my work permit and need a replacement." (replacement)
 *   "My EAD expired — what do I do?" (expired)
 *   "I got an RFE on my I-765." (routes to RFE engine)
 *   "USCIS is taking too long on my EAD." (routes to case inquiry)
 *   "My underlying asylum case was denied — does my EAD go away?" (underlying case change)
 *
 * Reuses: Case, IntakeSession, DocumentUnderstanding, Authority, MailMyPDF, Tracking, Proof
 * Distinct from: RFE/NOID (evidence responses, not EAD lifecycle), Case Inquiry (delay checking, not filing),
 *   Biometrics (ASC scheduling, not EAD application), I-601 (inadmissibility waiver, not work authorization)
 */

import type { LanguageContext } from './multilingual';

// ─── Application Type ─────────────────────────────────────────────────────────

export type EADApplicationType = 'initial' | 'renewal' | 'replacement' | 'not_determined';

export function detectApplicationType(text: string): EADApplicationType {
  const lower = text.toLowerCase();
  if (/renew|renewal|extend|extension/i.test(lower)) return 'renewal';
  if (/replac|lost|stolen|damage|mutilat/i.test(lower)) return 'replacement';
  if (/initial|first.?time|new|apply|applying|file|filing/i.test(lower)) return 'initial';
  return 'not_determined';
}

// ─── EAD Eligibility Categories ────────────────────────────────────────────────

export type EADCategory =
  | 'a3'    // Refugee
  | 'a5'    // Asylee (granted asylum)
  | 'a7'    // N-8 or N-9 nonimmigrant
  | 'a8'    // Citizen of Micronesia/Marshall Islands/Palau (COFA)
  | 'a10'   // Withholding of removal / deferral of removal
  | 'a12'   // Deferred action (including DACA)
  | 'a17'   // E visa spouse
  | 'a18'   // L visa spouse
  | 'c8'    // Asylum applicant (pending)
  | 'c9'    // Adjustment of status (pending I-485)
  | 'c10'   // Suspension of deportation / cancellation of removal
  | 'c14'   // DACA — deferred action for childhood arrivals
  | 'c16'   // NACARA Section 203 applicant
  | 'c18'   // Removal proceedings applicant (pending before EOIR)
  | 'c19'   // TPS initial applicant
  | 'c20'   // Section 245 legalization applicant
  | 'c22'   // SALA (Legalization) applicant
  | 'c24'   // LIFE Act legalization applicant
  | 'c26'   // DV lottery selectee with pending I-485
  | 'c31'   // TPS re-registrant
  | 'unknown';

export const ALL_EAD_CATEGORIES: EADCategory[] = [
  'a3', 'a5', 'a7', 'a8', 'a10', 'a12', 'a17', 'a18',
  'c8', 'c9', 'c10', 'c14', 'c16', 'c18', 'c19', 'c20', 'c22', 'c24', 'c26', 'c31',
  'unknown',
];

export const SUPPORTED_CATEGORIES: EADCategory[] = [
  'a3', 'a5', 'a10', 'a12',
  'c8', 'c9', 'c10', 'c14', 'c16', 'c18', 'c19', 'c26', 'c31',
];

export const UNSUPPORTED_CATEGORIES: EADCategory[] = ['a7', 'a8', 'a17', 'a18', 'c20', 'c22', 'c24'];

// ─── Category Detection ──────────────────────────────────────────────────────

export function detectEADCategory(text: string): EADCategory {
  const lower = text.toLowerCase();

  // Explicit category code detection
  if (/\(a\)\(3\)|a3\b/i.test(lower)) return 'a3';
  if (/\(a\)\(5\)|a5\b/i.test(lower)) return 'a5';
  if (/\(a\)\(10\)|a10\b/i.test(lower)) return 'a10';
  if (/\(a\)\(12\)|a12\b/i.test(lower)) return 'a12';
  if (/\(c\)\(8\)|c8\b/i.test(lower)) return 'c8';
  if (/\(c\)\(9\)|c9\b/i.test(lower)) return 'c9';
  if (/\(c\)\(10\)|c10\b/i.test(lower)) return 'c10';
  if (/\(c\)\(14\)|c14\b/i.test(lower)) return 'c14';
  if (/\(c\)\(16\)|c16\b/i.test(lower)) return 'c16';
  if (/\(c\)\(18\)|c18\b/i.test(lower)) return 'c18';
  if (/\(c\)\(19\)|c19\b/i.test(lower)) return 'c19';
  if (/\(c\)\(26\)|c26\b/i.test(lower)) return 'c26';
  if (/\(c\)\(31\)|c31\b/i.test(lower)) return 'c31';

  // Contextual detection
  if (/adjustment of status|pending.{0,15}i.?485|green card.*pending|aOS\b/i.test(lower)) return 'c9';
  if (/pending asylum|asylum.*applicant|asylum.*pending|i.?589.*pending/i.test(lower)) return 'c8';
  if (/granted asylum|asylee|asylum.*grant/i.test(lower)) return 'a5';
  if (/refugee|refugee.*admit|admitted as refugee/i.test(lower)) return 'a3';
  if (/withholding of removal|deferral of removal|cat 10/i.test(lower)) return 'a10';
  if (/daca|deferred action for childhood arrivals|deferred action.*childhood/i.test(lower)) return 'c14';
  if (/NACARA|nacara/i.test(lower)) return 'c16';
  if (/removal proceeding|EOIR|immigration court|NTA|notice to appear/i.test(lower)) return 'c18';
  if (/temporary protected status|TPS\b/i.test(lower)) {
    if (/re-?regist|renewal|re-?new/i.test(lower)) return 'c31';
    return 'c19';
  }
  if (/diversity visa|DV lottery|diversity.*lottery/i.test(lower)) return 'c26';
  if (/suspension of deportation|cancellation of removal/i.test(lower)) return 'c10';
  if (/deferred action/i.test(lower)) return 'a12';

  return 'unknown';
}

// ─── Category Descriptions ──────────────────────────────────────────────────

export function getCategoryDescription(category: EADCategory): { code: string; name: string; authority: string } {
  const descriptions: Record<string, { code: string; name: string; authority: string }> = {
    a3: { code: '(a)(3)', name: 'Refugee', authority: 'INA § 207; 8 CFR § 274a.12(a)(3)' },
    a5: { code: '(a)(5)', name: 'Asylee (granted asylum)', authority: 'INA § 208; 8 CFR § 274a.12(a)(5)' },
    a7: { code: '(a)(7)', name: 'N-8 or N-9 nonimmigrant', authority: '8 CFR § 274a.12(a)(7)' },
    a8: { code: '(a)(8)', name: 'Citizen of Micronesia/Marshall Islands/Palau', authority: '8 CFR § 274a.12(a)(8)' },
    a10: { code: '(a)(10)', name: 'Withholding of removal / deferral of removal', authority: 'INA § 241(b)(3); 8 CFR § 274a.12(a)(10)' },
    a12: { code: '(a)(12)', name: 'Deferred action (including DACA)', authority: 'INA § 274A; 8 CFR § 274a.12(a)(12)' },
    a17: { code: '(a)(17)', name: 'E visa spouse', authority: '8 CFR § 274a.12(a)(17)' },
    a18: { code: '(a)(18)', name: 'L visa spouse', authority: '8 CFR § 274a.12(a)(18)' },
    c8: { code: '(c)(8)', name: 'Asylum applicant (pending)', authority: 'INA § 208(d); 8 CFR § 274a.12(c)(8)' },
    c9: { code: '(c)(9)', name: 'Adjustment of status (pending I-485)', authority: 'INA § 245; 8 CFR § 274a.12(c)(9)' },
    c10: { code: '(c)(10)', name: 'Suspension of deportation / cancellation of removal', authority: 'INA § 244; 8 CFR § 274a.12(c)(10)' },
    c14: { code: '(c)(14)', name: 'DACA — deferred action for childhood arrivals', authority: 'INA § 274A; 8 CFR § 274a.12(c)(14)' },
    c16: { code: '(c)(16)', name: 'NACARA Section 203 applicant', authority: 'NACARA § 203; 8 CFR § 274a.12(c)(16)' },
    c18: { code: '(c)(18)', name: 'Removal proceedings applicant (pending before EOIR)', authority: '8 CFR § 274a.12(c)(18)' },
    c19: { code: '(c)(19)', name: 'TPS initial applicant', authority: 'INA § 244; 8 CFR § 274a.12(c)(19)' },
    c20: { code: '(c)(20)', name: 'Section 245 legalization applicant', authority: '8 CFR § 274a.12(c)(20)' },
    c22: { code: '(c)(22)', name: 'SALA legalization applicant', authority: '8 CFR § 274a.12(c)(22)' },
    c24: { code: '(c)(24)', name: 'LIFE Act legalization applicant', authority: '8 CFR § 274a.12(c)(24)' },
    c26: { code: '(c)(26)', name: 'DV lottery selectee with pending I-485', authority: 'INA § 203(c); 8 CFR § 274a.12(c)(26)' },
    c31: { code: '(c)(31)', name: 'TPS re-registrant', authority: 'INA § 244; 8 CFR § 274a.12(c)(31)' },
    unknown: { code: '—', name: 'Unknown category', authority: 'INA § 274A; 8 CFR § 274a.12' },
  };
  return descriptions[category] || descriptions.unknown;
}

// ─── Category-Specific Evidence Requirements ──────────────────────────────────

export function getCategoryEvidence(category: EADCategory): string[] {
  switch (category) {
    case 'c9':
      return ['I-485 receipt notice (proof of pending adjustment application)', 'Government-issued ID', 'Two passport-style photos (if filing by paper)'];
    case 'c8':
      return ['I-589 asylum application receipt (or copy of filed asylum application)', 'Fingerprinting/biometrics notice', 'Government-issued ID'];
    case 'a5':
      return ['Asylum grant letter from USCIS', 'OR EOIR order granting asylum', 'Government-issued ID'];
    case 'a3':
      return ['I-94 showing refugee admission', 'Refugee processing documentation', 'Government-issued ID'];
    case 'a10':
      return ['EOIR order of withholding of removal', 'OR USCIS notice of deferral of removal', 'Government-issued ID'];
    case 'a12':
    case 'c14':
      return ['DACA approval notice (if renewal)', 'Evidence of deferred action eligibility', 'Government-issued ID', 'Two passport-style photos (if filing by paper)'];
    case 'c16':
      return ['NACARA Section 203 application receipt', 'Evidence of continuous residence', 'Government-issued ID'];
    case 'c18':
      return ['Notice to Appear (NTA) or hearing notice from EOIR', 'Proof of pending proceedings before immigration court', 'Government-issued ID'];
    case 'c19':
    case 'c31':
      return ['TPS application receipt or registration evidence', 'Evidence of nationality/identity', 'Evidence of continuous residence (if initial)', 'Two passport-style photos'];
    case 'c10':
      return ['Evidence of pending suspension of deportation or cancellation of removal application', 'Government-issued ID'];
    case 'c26':
      return ['DV lottery selection letter', 'I-485 receipt notice', 'Government-issued ID'];
    default:
      return ['Evidence supporting the specific eligibility category', 'Government-issued ID', 'Two passport-style photos (if filing by paper)'];
  }
}

// ─── Underlying Case Context ──────────────────────────────────────────────────

export type UnderlyingCase =
  | 'pending_i485'          // Pending adjustment of status
  | 'pending_asylum'         // Pending asylum application
  | 'granted_asylum'         // Granted asylum
  | 'refugee_status'         // Admitted as refugee
  | 'pending_removal'        // In removal proceedings
  | 'withholding_granted'    // Withholding of removal granted
  | 'deferred_action'        // Deferred action (DACA)
  | 'tps_status'             // Temporary Protected Status
  | 'nacara_application'     // NACARA application
  | 'pending_cancellation'    // Pending cancellation/suspension application
  | 'dv_lottery'              // DV lottery selectee
  | 'none'                    // No underlying case mentioned
  | 'unknown';

export function detectUnderlyingCase(text: string): UnderlyingCase {
  const lower = text.toLowerCase();

  if (/pending.{0,15}i.?485|adjustment of status.*pending|i.?485.*pending|green card.*pending/i.test(lower)) return 'pending_i485';
  if (/granted asylum|asylee|asylum.*grant/i.test(lower)) return 'granted_asylum';
  if (/pending asylum|asylum.*pending|asylum.*applicant/i.test(lower)) return 'pending_asylum';
  if (/refugee|admitted as refugee|refugee status/i.test(lower)) return 'refugee_status';
  if (/withholding of removal|deferral of removal/i.test(lower)) return 'withholding_granted';
  if (/removal proceeding|EOIR|immigration court|NTA|notice to appear/i.test(lower)) return 'pending_removal';
  if (/daca|deferred action/i.test(lower)) return 'deferred_action';
  if (/TPS|temporary protected status/i.test(lower)) return 'tps_status';
  if (/NACARA/i.test(lower)) return 'nacara_application';
  if (/suspension of deportation|cancellation of removal/i.test(lower)) return 'pending_cancellation';
  if (/diversity visa|DV lottery/i.test(lower)) return 'dv_lottery';

  return 'none';
}

// ─── Underlying Case Support for Category ─────────────────────────────────────

export function isUnderlyingCaseConsistent(category: EADCategory, underlyingCase: UnderlyingCase): boolean {
  const consistencyMap: Record<string, UnderlyingCase[]> = {
    c9: ['pending_i485'],
    c8: ['pending_asylum'],
    a5: ['granted_asylum'],
    a3: ['refugee_status'],
    a10: ['withholding_granted'],
    a12: ['deferred_action', 'none'],
    c14: ['deferred_action', 'none'],
    c16: ['nacara_application'],
    c18: ['pending_removal'],
    c19: ['tps_status'],
    c31: ['tps_status'],
    c10: ['pending_cancellation'],
    c26: ['dv_lottery', 'pending_i485'],
  };
  const supported = consistencyMap[category] || [];
  return supported.includes(underlyingCase);
}

// ─── Automatic Extension Logic ────────────────────────────────────────────────

export interface AutoExtensionResult {
  eligible: boolean;
  extensionDays: number;
  rule: string;
  effectiveDate: string;
  note: string;
}

// Categories eligible for automatic extension (when the program was active)
export const AUTO_EXTENSION_CATEGORIES: EADCategory[] = [
  'a3', 'a5', 'a7', 'a8', 'a10', 'a12', 'a17', 'a18',
  'c8', 'c9', 'c10', 'c16', 'c20', 'c22', 'c24', 'c26', 'c31', 'c19',
];

export function checkAutoExtension(
  category: EADCategory,
  filingDate: string,
  isRenewal: boolean,
): AutoExtensionResult {
  // The 540-day automatic extension ended on October 30, 2025
  // Applications filed on/after Oct 30, 2025 get NO automatic extension
  // Applications filed before Oct 30, 2025 may get up to 540 days

  const cutoffDate = new Date('2025-10-30');
  const filedDate = new Date(filingDate);

  // Only renewals in eligible categories can get automatic extension
  if (!isRenewal) {
    return {
      eligible: false,
      extensionDays: 0,
      rule: 'Automatic extension only applies to timely filed renewals',
      effectiveDate: 'N/A',
      note: 'Initial applications do not receive automatic extensions.',
    };
  }

  // Check if category is eligible for automatic extension
  if (!AUTO_EXTENSION_CATEGORIES.includes(category)) {
    return {
      eligible: false,
      extensionDays: 0,
      rule: 'Category not eligible for automatic extension',
      effectiveDate: 'N/A',
      note: `Category ${category} is not in the list of categories eligible for automatic extension.`,
    };
  }

  if (filedDate >= cutoffDate) {
    // Filed on or after Oct. 30, 2025 — no automatic extension
    return {
      eligible: false,
      extensionDays: 0,
      rule: 'DHS ended automatic EAD extensions effective Oct. 30, 2025',
      effectiveDate: '2025-10-30',
      note: 'Applications filed on or after Oct. 30, 2025 do not receive an automatic extension. Limited exceptions may apply for TPS (A12/C19).',
    };
  }

  // Filed before Oct. 30, 2025 — up to 540 days
  return {
    eligible: true,
    extensionDays: 540,
    rule: '540-day automatic extension (temporary rule, filed before Oct. 30, 2025)',
    effectiveDate: '2022-05-04',
    note: 'Up to 540-day automatic extension applies because the renewal was timely filed before Oct. 30, 2025. The extension begins the day after the EAD expires.',
  };
}

// ─── Expiration Analysis ─────────────────────────────────────────────────────

export type ExpirationStatus =
  | 'no_current_ead'     // No current EAD (initial filing)
  | 'renewal_window'     // Within 180 days before expiration (recommended filing window)
  | 'urgent'             // Within 30 days of expiration
  | 'expired'            // EAD already expired
  | 'not_expired'        // EAD valid, more than 180 days remaining
  | 'unknown';

export function analyzeExpiration(
  text: string,
  eadExpirationDate?: string,
): { status: ExpirationStatus; daysUntilExpiry: number | null; renewalRecommendation: string } {
  if (!eadExpirationDate) {
    // Try to extract date from text
    const dateMatch = text.match(/expir\w*\s*(?:on|date|by)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4})/i);
    if (dateMatch) {
      const extracted = new Date(dateMatch[1]);
      if (!isNaN(extracted.getTime())) {
        return analyzeExpiration(text, dateMatch[1]);
      }
    }
    return {
      status: 'no_current_ead',
      daysUntilExpiry: null,
      renewalRecommendation: 'No current EAD on file — this appears to be an initial application.',
    };
  }

  const expiry = new Date(eadExpirationDate);
  if (isNaN(expiry.getTime())) {
    return {
      status: 'unknown',
      daysUntilExpiry: null,
      renewalRecommendation: 'Unable to parse EAD expiration date.',
    };
  }

  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      status: 'expired',
      daysUntilExpiry,
      renewalRecommendation: `EAD expired ${Math.abs(daysUntilExpiry)} days ago. File a renewal immediately. Note: automatic extension may not apply if filed on or after Oct. 30, 2025.`,
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      status: 'urgent',
      daysUntilExpiry,
      renewalRecommendation: `EAD expires in ${daysUntilExpiry} days. File renewal immediately to minimize gap in work authorization.`,
    };
  }

  if (daysUntilExpiry <= 180) {
    return {
      status: 'renewal_window',
      daysUntilExpiry,
      renewalRecommendation: `EAD expires in ${daysUntilExpiry} days. USCIS recommends filing renewal 90-180 days before expiration.`,
    };
  }

  return {
    status: 'not_expired',
    daysUntilExpiry,
    renewalRecommendation: `EAD expires in ${daysUntilExpiry} days. No immediate action required, but plan to file renewal 90-180 days before expiration.`,
  };
}

// ─── Fee Analysis ────────────────────────────────────────────────────────────

export interface FeeResult {
  amount: number;
  method: 'paper' | 'online' | 'with_i485' | 'free';
  note: string;
}

export function analyzeFee(category: EADCategory, filingMethod: 'paper' | 'online', filedWithI485: boolean, isAsylumInitial: boolean): FeeResult {
  // Asylum initial applicants: no fee
  if (isAsylumInitial && category === 'c8') {
    return { amount: 0, method: 'free', note: 'Initial asylum applicants are not required to pay the I-765 filing fee.' };
  }

  // Filed with I-485: reduced fee
  if (filedWithI485 && category === 'c9') {
    return { amount: 260, method: 'with_i485', note: 'When filed concurrently with I-485 adjustment of status, the I-765 fee is reduced to $260.' };
  }

  // Standard fees (as of 2024 fee schedule)
  if (filingMethod === 'online') {
    return { amount: 470, method: 'online', note: 'Online filing fee for Form I-765.' };
  }

  return { amount: 520, method: 'paper', note: 'Paper filing fee for Form I-765. No separate biometrics fee for most categories.' };
}

// ─── Biometrics Requirement ──────────────────────────────────────────────────

export function requiresBiometrics(category: EADCategory, applicationType: EADApplicationType): boolean {
  // Most categories require biometrics, but some don't
  // Asylees (a5) and refugees (a3) generally don't need biometrics for EAD
  if (category === 'a3' || category === 'a5') return false;
  // Most others require biometrics
  if (applicationType === 'initial') return true;
  if (applicationType === 'renewal') {
    // Some renewals may reuse biometrics
    if (category === 'c9') return false; // I-485 biometrics already on file
  }
  if (applicationType === 'replacement') return false;
  return true;
}

// ─── Evidence Detection ──────────────────────────────────────────────────────

export type EADEvidenceType =
  | 'i485_receipt'
  | 'asylum_application_receipt'
  | 'asylum_grant_letter'
  | 'i94_refugee'
  | 'withholding_order'
  | 'daca_approval'
  | 'nacara_receipt'
  | 'nta_hearing_notice'
  | 'tps_receipt'
  | 'dv_lottery_letter'
  | 'prior_ead_copy'
  | 'identity_document'
  | 'passport_photos'
  | 'marriage_certificate'
  | 'translations'
  | 'unknown';

export function detectEvidenceTypes(text: string): EADEvidenceType[] {
  const lower = text.toLowerCase();
  const types: EADEvidenceType[] = [];

  if (/i.?485.*receipt|adjustment.*receipt/i.test(lower)) types.push('i485_receipt');
  if (/asylum.*application|i.?589.*receipt|asylum.*receipt/i.test(lower)) types.push('asylum_application_receipt');
  if (/asylum.*grant|asylum.*approval|asylum.*letter/i.test(lower)) types.push('asylum_grant_letter');
  if (/i.?94|refugee.*document/i.test(lower)) types.push('i94_refugee');
  if (/withholding.*order|deferral.*order|withholding.*removal/i.test(lower)) types.push('withholding_order');
  if (/daca.*approval|deferred action.*approval|daca.*notice/i.test(lower)) types.push('daca_approval');
  if (/NACARA.*receipt|NACARA.*application/i.test(lower)) types.push('nacara_receipt');
  if (/notice to appear|NTA|hearing notice|EOIR.*notice/i.test(lower)) types.push('nta_hearing_notice');
  if (/TPS.*receipt|TPS.*registration/i.test(lower)) types.push('tps_receipt');
  if (/diversity.*letter|DV.*lottery.*letter|DV.*select/i.test(lower)) types.push('dv_lottery_letter');
  if (/prior ead|previous ead|copy of.{0,10}ead|old work permit/i.test(lower)) types.push('prior_ead_copy');
  if (/passport|driver.?s license|government id|national id/i.test(lower)) types.push('identity_document');
  if (/passport photo|passport-style photo|two photos/i.test(lower)) types.push('passport_photos');
  if (/marriage certificate|marriage license/i.test(lower)) types.push('marriage_certificate');
  if (/translation|translated|certified.*English/i.test(lower)) types.push('translations');

  if (types.length === 0) return ['unknown'];
  return [...new Set(types)];
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export type I765EventType =
  | 'initial_filing'              // First-time EAD application
  | 'renewal_filing'              // Renewing existing EAD
  | 'replacement_filing'          // Lost/stolen/damaged EAD
  | 'expiration_warning'          // EAD expiring soon
  | 'expired_ead'                 // EAD already expired
  | 'evidence_deficiency'         // Missing evidence
  | 'rfe_response'                // USCIS issued RFE — routes to RFE engine
  | 'noid_response'               // USCIS issued NOID — routes to NOID engine
  | 'processing_delay'            // Application taking too long
  | 'card_issue'                   // Card production/delivery issue
  | 'denial_handling'              // EAD denied
  | 'approval_handling'            // EAD approved
  | 'underlying_case_change'      // Underlying case status changed
  | 'unknown';

export function detectI765Event(text: string): I765EventType {
  const lower = text.toLowerCase();

  // RFE / NOID — check first
  if (/rfe|request for evidence|additional evidence/i.test(lower)) return 'rfe_response';
  if (/noid|notice of intent to deny|intent to deny/i.test(lower)) return 'noid_response';

  // Underlying case change — check before denial (text contains "denied")
  if (/underlying.*denied|asylum.*denied|i.?485.*denied|case.*denied|case.*approved|underlying.*change/i.test(lower)) return 'underlying_case_change';

  // Denial
  if (/denied|denial|rejected/i.test(lower)) return 'denial_handling';

  // Card issue — check before approval (text may contain "received")
  if (/card.*not received|never received|lost in mail|card production|card delivered|mailed to wrong/i.test(lower)) return 'card_issue';

  // Approval
  if (/approved|approval|granted|received my.{0,10}(ead|work permit|card)/i.test(lower)) return 'approval_handling';

  // Processing delay
  if (/delay|stuck|pending|taking.*long|how long|waiting|no response|no decision|months.*waiting/i.test(lower)) return 'processing_delay';

  // Expired EAD
  if (/expired|expiration date.*pass|my.{0,10}ead.*expired|work permit.*expired/i.test(lower)) return 'expired_ead';

  // Expiration warning
  if (/expir|expiring|about to expire|soon.*expire/i.test(lower)) return 'expiration_warning';

  // Replacement
  if (/replac|lost|stolen|damage|mutilat/i.test(lower)) return 'replacement_filing';

  // Renewal
  if (/renew|renewal|extend|extension/i.test(lower)) return 'renewal_filing';

  // Initial filing
  if (/initial|first.?time|apply|applying|file|filing|new.{0,10}(ead|work permit)/i.test(lower)) return 'initial_filing';

  // Evidence deficiency
  if (/evidence|insufficient|not enough|missing.*document|need.*more.*proof/i.test(lower)) return 'evidence_deficiency';

  return 'unknown';
}

// ─── Urgency ──────────────────────────────────────────────────────────────────

export type I765Urgency = 'routine' | 'time_sensitive' | 'critical';

export function detectI765Urgency(
  text: string,
  expirationStatus?: ExpirationStatus,
): I765Urgency {
  const lower = text.toLowerCase();

  // Critical: EAD expired, denial, or imminent expiration
  if (/denied|denial|expired|expired.*ead|work permit.*expired/i.test(lower)) return 'critical';
  if (/asap|immediately|emergency|tomorrow|this week/i.test(lower)) return 'critical';
  if (expirationStatus === 'expired' || expirationStatus === 'urgent') return 'critical';

  // Time-sensitive: EAD expiring within 180 days, RFE deadline
  if (/expir|expiring|deadline|approaching/i.test(lower)) return 'time_sensitive';
  if (expirationStatus === 'renewal_window') return 'time_sensitive';

  return 'routine';
}

// ─── Risk Level ──────────────────────────────────────────────────────────────

export type I765RiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export function detectI765Risk(
  category: EADCategory,
  applicationType: EADApplicationType,
  underlyingConsistent: boolean,
  hasEvidence: boolean,
  expirationStatus: ExpirationStatus,
): I765RiskLevel {
  // High risk: expired EAD, unsupported category, inconsistent underlying case
  if (!SUPPORTED_CATEGORIES.includes(category) && category !== 'unknown') return 'high';
  if (!underlyingConsistent && category !== 'unknown') return 'high';
  if (expirationStatus === 'expired') return 'high';

  // Elevated risk: no evidence, unknown category
  if (!hasEvidence) return 'elevated';
  if (category === 'unknown') return 'elevated';

  // Moderate risk: replacement, urgency approaching
  if (applicationType === 'replacement') return 'moderate';
  if (expirationStatus === 'urgent') return 'moderate';

  // Low risk: supported category, consistent underlying, evidence available, not expired
  return 'low';
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface I765Analysis {
  eventType: I765EventType;
  applicationType: EADApplicationType;
  category: EADCategory;
  categoryDescription: { code: string; name: string; authority: string };
  underlyingCase: UnderlyingCase;
  underlyingConsistent: boolean;
  evidenceTypes: EADEvidenceType[];
  requiredEvidence: string[];
  missingEvidence: string[];
  urgency: I765Urgency;
  riskLevel: I765RiskLevel;
  expirationStatus: ExpirationStatus;
  daysUntilExpiry: number | null;
  renewalRecommendation: string;
  autoExtension: AutoExtensionResult;
  fee: FeeResult;
  biometricsRequired: boolean;
  filingMethod: 'paper' | 'online' | 'not_determined';
  filedWithI485: boolean;
  authority: string[];
  recommendedAction: string;
  processingTimeNote: string;
  downstreamRouting: string[];
}

export function analyzeI765(
  text: string,
  eadExpirationDate?: string,
  filingDate?: string,
  filingMethod?: 'paper' | 'online',
): I765Analysis {
  const eventType = detectI765Event(text);
  const applicationType = detectApplicationType(text);
  const category = detectEADCategory(text);
  const underlyingCase = detectUnderlyingCase(text);
  const underlyingConsistent = isUnderlyingCaseConsistent(category, underlyingCase);
  const evidenceTypes = detectEvidenceTypes(text);
  const requiredEvidence = getCategoryEvidence(category);
  const expirationAnalysis = analyzeExpiration(text, eadExpirationDate);
  const urgency = detectI765Urgency(text, expirationAnalysis.status);
  const isAsylumInitial = category === 'c8' && applicationType === 'initial';
  const filedWithI485 = category === 'c9' && underlyingCase === 'pending_i485';
  const method = filingMethod || (/online|file online|myUSCIS/i.test(text) ? 'online' : 'paper');
  const fee = analyzeFee(category, method === 'online' ? 'online' : 'paper', filedWithI485, isAsylumInitial);
  const biometricsRequired = requiresBiometrics(category, applicationType);
  const riskLevel = detectI765Risk(category, applicationType, underlyingConsistent, evidenceTypes.length > 0 && evidenceTypes[0] !== 'unknown', expirationAnalysis.status);

  // Auto extension check (only for renewals)
  const autoExtension = checkAutoExtension(
    category,
    filingDate || new Date().toISOString().split('T')[0],
    applicationType === 'renewal',
  );

  // Missing evidence
  const missingEvidence: string[] = [];
  const detectedEvidenceStrings = evidenceTypes.map(e => e.toString());
  if (requiredEvidence.some(e => e.includes('I-485')) && !detectedEvidenceStrings.includes('i485_receipt')) {
    missingEvidence.push('I-485 receipt notice');
  }
  if (requiredEvidence.some(e => e.includes('asylum') && e.includes('application')) && !detectedEvidenceStrings.includes('asylum_application_receipt')) {
    missingEvidence.push('Asylum application receipt (I-589)');
  }
  if (requiredEvidence.some(e => e.includes('asylum grant')) && !detectedEvidenceStrings.includes('asylum_grant_letter')) {
    missingEvidence.push('Asylum grant letter or EOIR order');
  }
  if (requiredEvidence.some(e => e.includes('I-94')) && !detectedEvidenceStrings.includes('i94_refugee')) {
    missingEvidence.push('I-94 showing refugee admission');
  }
  if (requiredEvidence.some(e => e.includes('DACA')) && !detectedEvidenceStrings.includes('daca_approval')) {
    missingEvidence.push('DACA approval notice (if renewal)');
  }
  if (requiredEvidence.some(e => e.includes('NACARA')) && !detectedEvidenceStrings.includes('nacara_receipt')) {
    missingEvidence.push('NACARA application receipt');
  }
  if (requiredEvidence.some(e => e.includes('Notice to Appear') || e.includes('hearing notice')) && !detectedEvidenceStrings.includes('nta_hearing_notice')) {
    missingEvidence.push('Notice to Appear or hearing notice from EOIR');
  }
  if (requiredEvidence.some(e => e.includes('TPS')) && !detectedEvidenceStrings.includes('tps_receipt')) {
    missingEvidence.push('TPS application receipt or registration evidence');
  }
  if (applicationType === 'renewal' && !detectedEvidenceStrings.includes('prior_ead_copy')) {
    missingEvidence.push('Copy of prior EAD (required for renewal)');
  }
  if (!detectedEvidenceStrings.includes('identity_document') && evidenceTypes[0] === 'unknown') {
    missingEvidence.push('Government-issued ID');
  }

  // Authority
  const authority: string[] = [
    category !== 'unknown' ? getCategoryDescription(category).authority : 'INA § 274A; 8 CFR § 274a.12',
    '8 CFR § 274a.13 — application procedures',
  ];

  // Recommended action
  let recommendedAction = '';
  if (category === 'unknown') {
    recommendedAction = 'Identify your EAD eligibility category. Your category depends on your current immigration status (pending I-485, pending asylum, TPS, etc.).';
  } else if (!underlyingConsistent && underlyingCase !== 'none') {
    recommendedAction = `Category ${getCategoryDescription(category).code} requires ${underlyingCase === 'pending_i485' ? 'a pending I-485' : 'a compatible underlying case'}. Verify your underlying case status before filing.`;
  } else if (expirationAnalysis.status === 'expired' && applicationType === 'renewal') {
    recommendedAction = 'Your EAD has expired. File a renewal immediately. Note: automatic extension may not apply if filed on or after Oct. 30, 2025.';
  } else if (expirationAnalysis.status === 'urgent') {
    recommendedAction = `Your EAD expires in ${expirationAnalysis.daysUntilExpiry} days. File renewal immediately to minimize gap in work authorization.`;
  } else if (expirationAnalysis.status === 'renewal_window') {
    recommendedAction = `Your EAD expires in ${expirationAnalysis.daysUntilExpiry} days. This is the recommended renewal filing window (90-180 days before expiration).`;
  } else if (missingEvidence.length > 0) {
    recommendedAction = `Missing ${missingEvidence.length} piece(s) of required evidence. Gather: ${missingEvidence.join(', ')}.`;
  } else if (applicationType === 'initial') {
    recommendedAction = `File Form I-765 under category ${getCategoryDescription(category).code} (${getCategoryDescription(category).name}). Filing fee: $${fee.amount}${fee.method === 'online' ? ' (online)' : fee.method === 'paper' ? ' (paper)' : fee.method === 'with_i485' ? ' (with I-485)' : ''}.`;
  } else if (applicationType === 'renewal') {
    recommendedAction = `File Form I-765 renewal under category ${getCategoryDescription(category).code}. File 90-180 days before expiration. ${autoExtension.eligible ? `Your renewal may receive a ${autoExtension.extensionDays}-day automatic extension.` : autoExtension.note}`;
  } else if (applicationType === 'replacement') {
    recommendedAction = 'File Form I-765 as a replacement. Provide details about the lost/stolen/damaged EAD and include a copy if available.';
  } else {
    recommendedAction = 'Determine your application type (initial, renewal, or replacement) and eligibility category, then file Form I-765.';
  }

  // Downstream routing
  const downstreamRouting: string[] = [];
  if (eventType === 'rfe_response') downstreamRouting.push('rfe-response (with I-765 form adapter)');
  if (eventType === 'noid_response') downstreamRouting.push('noid-response (with I-765 form adapter)');
  if (eventType === 'processing_delay') downstreamRouting.push('case-inquiry (with I-765 form adapter)');
  if (eventType === 'card_issue') downstreamRouting.push('case-inquiry (card production/delivery)');
  if (biometricsRequired) downstreamRouting.push('biometrics-scheduling (ASC appointment)');

  // Processing time note
  const processingTimeNote = 'I-765 processing times vary by service center and category, typically 2-8 months. Check current processing times at USCIS.gov.';

  return {
    eventType,
    applicationType,
    category,
    categoryDescription: getCategoryDescription(category),
    underlyingCase,
    underlyingConsistent,
    evidenceTypes,
    requiredEvidence,
    missingEvidence,
    urgency,
    riskLevel,
    expirationStatus: expirationAnalysis.status,
    daysUntilExpiry: expirationAnalysis.daysUntilExpiry,
    renewalRecommendation: expirationAnalysis.renewalRecommendation,
    autoExtension,
    fee,
    biometricsRequired,
    filingMethod: method,
    filedWithI485,
    authority,
    recommendedAction,
    processingTimeNote,
    downstreamRouting,
  };
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export interface I765Strategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string[];
  filingNote: string;
  expirationNote: string;
  autoExtensionNote: string;
  feeNote: string;
  biometricsNote: string;
  downstreamRouting: string[];
  readinessChecklist: string[];
}

export function buildI765Strategy(analysis: I765Analysis): I765Strategy {
  const a = analysis;
  const desc = a.categoryDescription;

  let approach = '';
  const keyArguments: string[] = [];
  const supportingEvidence: string[] = [];
  const authority = a.authority;
  let filingNote = '';
  let expirationNote = '';
  let autoExtensionNote = '';
  let feeNote = '';
  let biometricsNote = '';
  const downstreamRouting = a.downstreamRouting;
  const readinessChecklist: string[] = [];

  // Category-specific approach
  if (a.category === 'unknown') {
    approach = 'Identify your EAD eligibility category based on your current immigration status before filing Form I-765.';
    keyArguments.push('Category identification is the first step — it determines evidence requirements and filing procedures');
    return {
      approach, keyArguments, supportingEvidence: [], authority, filingNote: 'Cannot file without a valid eligibility category',
      expirationNote: '', autoExtensionNote: '', feeNote: '', biometricsNote: '', downstreamRouting, readinessChecklist: ['Identify your eligibility category'],
    };
  }

  // Application-type-specific approach
  if (a.applicationType === 'initial') {
    approach = `File initial Form I-765 under category ${desc.code} (${desc.name}) with category-specific evidence and the appropriate filing fee.`;
  } else if (a.applicationType === 'renewal') {
    approach = `File Form I-765 renewal under category ${desc.code} (${desc.name}). Include copy of prior EAD and file 90-180 days before expiration.`;
  } else if (a.applicationType === 'replacement') {
    approach = `File Form I-765 as a replacement under category ${desc.code}. Explain the circumstances (lost, stolen, or damaged) and include a copy of the prior EAD if available.`;
  } else {
    approach = `Determine application type (initial, renewal, or replacement) and file Form I-765 under category ${desc.code} (${desc.name}).`;
  }

  // Key arguments
  keyArguments.push(`Eligibility category: ${desc.code} (${desc.name}) — ${desc.authority}`);
  if (a.underlyingConsistent) {
    keyArguments.push(`Underlying case (${a.underlyingCase.replace(/_/g, ' ')}) is consistent with category ${desc.code}`);
  } else if (a.underlyingCase !== 'none' && a.underlyingCase !== 'unknown') {
    keyArguments.push(`WARNING: Underlying case (${a.underlyingCase.replace(/_/g, ' ')}) may not support category ${desc.code} — verify before filing`);
  }
  if (a.missingEvidence.length > 0) {
    keyArguments.push(`${a.missingEvidence.length} piece(s) of evidence missing: ${a.missingEvidence.join(', ')}`);
  }
  if (a.expirationStatus === 'expired') {
    keyArguments.push('EAD has expired — file renewal immediately to restore work authorization');
  }

  // Supporting evidence
  supportingEvidence.push(...a.requiredEvidence);

  // Filing note
  filingNote = `File Form I-765 ${a.filingMethod === 'online' ? 'online through myUSCIS' : 'by mail'}. Edition date: 08/21/25 (current). Check USCIS.gov for the latest accepted edition.`;

  // Expiration note
  if (a.daysUntilExpiry !== null) {
    if (a.expirationStatus === 'expired') {
      expirationNote = `EAD expired ${Math.abs(a.daysUntilExpiry)} days ago. Gap in work authorization — file renewal immediately.`;
    } else if (a.expirationStatus === 'urgent') {
      expirationNote = `EAD expires in ${a.daysUntilExpiry} days — file renewal immediately.`;
    } else if (a.expirationStatus === 'renewal_window') {
      expirationNote = `EAD expires in ${a.daysUntilExpiry} days — within recommended renewal window (90-180 days before expiration).`;
    } else {
      expirationNote = `EAD expires in ${a.daysUntilExpiry} days — no immediate action needed, but plan ahead.`;
    }
  } else {
    expirationNote = 'No current EAD on file — this is an initial application.';
  }

  // Auto extension note
  autoExtensionNote = a.autoExtension.note;

  // Fee note
  feeNote = `Filing fee: $${a.fee.amount} (${a.fee.method}). ${a.fee.note}`;

  // Biometrics note
  if (a.biometricsRequired) {
    biometricsNote = 'Biometrics (fingerprints and photo) may be required. You will receive an ASC appointment notice after filing.';
  } else {
    biometricsNote = 'Biometrics may not be required for this category/application type.';
  }

  // Readiness checklist
  readinessChecklist.push(`Eligibility category identified: ${desc.code}`);
  readinessChecklist.push(`Underlying case verified: ${a.underlyingConsistent ? 'Yes' : 'Needs verification'}`);
  readinessChecklist.push(`Required evidence gathered: ${a.missingEvidence.length === 0 ? 'Yes' : `Missing ${a.missingEvidence.length} item(s)`}`);
  readinessChecklist.push(`Filing fee prepared: $${a.fee.amount}`);
  readinessChecklist.push(`Filing method: ${a.filingMethod}`);
  if (a.biometricsRequired) readinessChecklist.push('Prepared for biometrics appointment');

  return {
    approach,
    keyArguments,
    supportingEvidence,
    authority,
    filingNote,
    expirationNote,
    autoExtensionNote,
    feeNote,
    biometricsNote,
    downstreamRouting,
    readinessChecklist,
  };
}

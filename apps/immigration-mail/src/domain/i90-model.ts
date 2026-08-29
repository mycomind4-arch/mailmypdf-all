/**
 * I-90 Application to Replace Permanent Resident Card — Domain Model
 *
 * Distinct from all other workflows because:
 * - Centers on green card renewal/replacement lifecycle for 10-year permanent residents
 * - Critical I-90 vs I-751 distinction: I-90 is for 10-year cards, I-751 is for 2-year conditional cards
 * - 36-month automatic extension of green card validity upon filing I-90 (since Sep 2024)
 * - 6-month filing window before expiration (180 days)
 * - N-400 naturalization alternative: if eligible, file N-400 instead of I-90
 * - Filing reasons: renewal, replacement (lost/stolen/damaged), correction (USCIS error, name change), special (commuter, turning 14)
 * - USCIS error filings are free
 * - Biometrics included in filing fee
 *
 * Authority:
 *   INA § 264 — registration of aliens
 *   8 CFR § 264.5 — replacement of alien registration documents
 *   USCIS Form I-90 instructions
 *
 * User journeys:
 *   "My green card is expiring in 3 months." (renewal)
 *   "I lost my green card." (replacement)
 *   "My green card was stolen." (replacement with police report)
 *   "USCIS misspelled my name on my green card." (USCIS error — free filing)
 *   "I legally changed my name." (correction — name change)
 *   "I have a 2-year conditional green card." (redirect to I-751)
 *   "Should I renew my green card or apply for citizenship?" (N-400 vs I-90)
 *   "My green card expired already." (renewal of expired card)
 *   "I never received my green card." (replacement — never received)
 *   "I'm turning 14 and my card expires before my 16th birthday." (special)
 */

import type { LanguageContext } from './multilingual';

// ─── Card Types ──────────────────────────────────────────────────────────────

export type GreenCardType =
  | 'permanent_10_year'    // Standard 10-year permanent resident card
  | 'conditional_2_year'  // 2-year conditional resident card (must file I-751, NOT I-90)
  | 'unknown';

export function detectCardType(text: string): GreenCardType {
  const lower = text.toLowerCase();

  // Conditional 2-year card
  if (/conditional.{0,15}resident|2.?year.{0,15}card|conditional.{0,15}green card|conditional.{0,15}permanent/i.test(lower)) {
    return 'conditional_2_year';
  }

  // Permanent 10-year card
  if (/10.?year.{0,15}card|permanent.{0,10}resident.{0,10}card|green card.*renew|green card.*expir|green card.*lost|green card.*stolen/i.test(lower)) {
    return 'permanent_10_year';
  }

  // Default: if they mention green card issues without specifying conditional, assume 10-year
  if (/green card|permanent resident card|i.?551/i.test(lower)) {
    return 'permanent_10_year';
  }

  return 'unknown';
}

// ─── Filing Reasons ──────────────────────────────────────────────────────────

export type I90FilingReason =
  | 'expiring_card'           // Card expiring within 6 months
  | 'expired_card'            // Card already expired
  | 'lost_stolen_destroyed'   // Card lost, stolen, or destroyed
  | 'never_received'          // Card never received
  | 'uscis_error'             // Card contains USCIS error (free filing)
  | 'name_change'             // Legal name change
  | 'biographic_change'       // Other biographic information change
  | 'commuter_status_change'  // Commuter/non-commuter status change
  | 'turning_14'              // Turning 14 and card expires before 16
  | 'not_determined';

export function detectFilingReason(text: string, cardExpirationDate?: string): I90FilingReason {
  const lower = text.toLowerCase();

  // USCIS error (free filing)
  if (/uscis.*error|typo|typographical|misspell|wrong.*name|incorrect.*name|wrong.*date|error.*on.*card/i.test(lower)) {
    return 'uscis_error';
  }

  // Lost/stolen/destroyed
  if (/lost|stolen|destroyed|damage|mutilat/i.test(lower)) {
    return 'lost_stolen_destroyed';
  }

  // Never received
  if (/never.{0,5}received|did not receive|not received/i.test(lower)) {
    return 'never_received';
  }

  // Name change
  if (/name.{0,5}change|changed.*name|legal.*name.*change|married.*new name|divorce.*name|update.*name|update my name/i.test(lower)) {
    return 'name_change';
  }

  // Biographic change
  if (/biographic.*change|date of birth.*change|gender.*change|address.*change/i.test(lower)) {
    return 'biographic_change';
  }

  // Commuter status change
  if (/commuter|non.?commuter|commuting status/i.test(lower)) {
    return 'commuter_status_change';
  }

  // Turning 14
  if (/turning 14|14th birthday|14 years old|turn 14/i.test(lower)) {
    return 'turning_14';
  }

  // Expiring or expired card
  if (cardExpirationDate) {
    const expiry = new Date(cardExpirationDate);
    const now = new Date();
    if (expiry.getTime() < now.getTime()) return 'expired_card';
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 180) return 'expiring_card';
  }

  // Text-based expiration detection
  if (/expired|expiration.*pass/i.test(lower)) return 'expired_card';
  if (/expir/i.test(lower)) return 'expiring_card';

  return 'not_determined';
}

// ─── Application Type ──────────────────────────────────────────────────────────

export type I90AppType = 'renewal' | 'replacement' | 'correction' | 'special' | 'not_determined';

export function classifyAppType(reason: I90FilingReason): I90AppType {
  switch (reason) {
    case 'expiring_card':
    case 'expired_card':
      return 'renewal';
    case 'lost_stolen_destroyed':
    case 'never_received':
      return 'replacement';
    case 'uscis_error':
    case 'name_change':
    case 'biographic_change':
      return 'correction';
    case 'commuter_status_change':
    case 'turning_14':
      return 'special';
    default:
      return 'not_determined';
  }
}

// ─── Filing Window Analysis ───────────────────────────────────────────────────

export type FilingWindowStatus =
  | 'too_early'       // More than 180 days before expiration
  | 'within_window'   // Within 180 days before expiration
  | 'expired'         // Card already expired
  | 'no_expiration'   // No expiration date (replacement, correction, etc.)
  | 'unknown';

export function analyzeFilingWindow(text: string, cardExpirationDate?: string): { status: FilingWindowStatus; daysUntilExpiry: number | null; note: string } {
  if (!cardExpirationDate) {
    const dateMatch = text.match(/expir\w*\s*(?:on|date|by)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4})/i);
    if (dateMatch) {
      return analyzeFilingWindow(text, dateMatch[1]);
    }
    // No expiration needed for replacement/correction
    if (/lost|stolen|destroyed|damage|never.{0,5}received|name.{0,5}change|uscis.*error/i.test(text.toLowerCase())) {
      return { status: 'no_expiration', daysUntilExpiry: null, note: 'No expiration analysis needed — this is a replacement or correction filing, not a renewal.' };
    }
    return { status: 'unknown', daysUntilExpiry: null, note: 'Unable to determine card expiration date. Provide your green card expiration date for filing window analysis.' };
  }

  const expiry = new Date(cardExpirationDate);
  if (isNaN(expiry.getTime())) {
    return { status: 'unknown', daysUntilExpiry: null, note: 'Unable to parse card expiration date.' };
  }

  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      status: 'expired',
      daysUntilExpiry,
      note: `Green card expired ${Math.abs(daysUntilExpiry)} days ago. File Form I-90 immediately. Your I-90 receipt notice will extend your green card validity for 36 months from the expiration date.`,
    };
  }

  if (daysUntilExpiry <= 180) {
    return {
      status: 'within_window',
      daysUntilExpiry,
      note: `Green card expires in ${daysUntilExpiry} days. You are within the 180-day filing window. File Form I-90 now.`,
    };
  }

  return {
    status: 'too_early',
    daysUntilExpiry,
    note: `Green card expires in ${daysUntilExpiry} days. You cannot file Form I-90 until you are within 180 days (approximately 6 months) of expiration. Wait until ${Math.ceil((daysUntilExpiry - 180))} days from now to file.`,
  };
}

// ─── Naturalization Alternative ───────────────────────────────────────────────

export interface NaturalizationCheck {
  recommendN400: boolean;
  reason: string;
  note: string;
}

export function checkNaturalizationAlternative(text: string): NaturalizationCheck {
  const lower = text.toLowerCase();

  // If already filed N-400 or mentioned naturalization
  if (/naturaliz|citizenship|N.?400/i.test(lower)) {
    if (/filed|applying.*for.*citizenship|submitted.*N.?400|pending.*N.?400/i.test(lower)) {
      return {
        recommendN400: true,
        reason: 'Applicant is already pursuing naturalization',
        note: 'If you have already filed or are eligible to file N-400 (Application for Naturalization), you may not need to renew your green card. However, if your card is lost or stolen, you must still file I-90 even if you have applied for naturalization.',
      };
    }
    return {
      recommendN400: true,
      reason: 'Applicant expressed interest in naturalization',
      note: 'Before filing I-90, consider whether you are eligible for naturalization (N-400). If eligible, filing N-400 instead of I-90 may be more cost-effective — you become a U.S. citizen and no longer need a green card. Check your eligibility at USCIS.gov.',
    };
  }

  // If green card is expiring, always mention naturalization as alternative
  if (/expir|renew/i.test(lower)) {
    return {
      recommendN400: true,
      reason: 'Green card renewal — naturalization may be a better alternative',
      note: 'Before renewing your green card with Form I-90, consider whether you are eligible for naturalization (N-400). If you have been a permanent resident for 5 years (or 3 years if married to a U.S. citizen), you may be eligible to become a U.S. citizen instead. Check eligibility at USCIS.gov.',
    };
  }

  return {
    recommendN400: false,
    reason: 'No naturalization interest indicated',
    note: '',
  };
}

// ─── I-90 vs I-751 Distinction ────────────────────────────────────────────────

export interface I90VsI751Check {
  isConditional: boolean;
  redirect: boolean;
  message: string;
}

export function checkI90VsI751(cardType: GreenCardType, text: string): I90VsI751Check {
  if (cardType === 'conditional_2_year') {
    return {
      isConditional: true,
      redirect: true,
      message: 'You have a 2-year conditional green card. You cannot use Form I-90 to renew it. You must file Form I-751 (Petition to Remove Conditions on Residence) during the 90-day period before your conditional card expires. Filing I-90 for a conditional card will result in rejection or denial.',
    };
  }

  return {
    isConditional: false,
    redirect: false,
    message: '',
  };
}

// ─── Evidence Requirements ──────────────────────────────────────────────────────

export type I90EvidenceType =
  | 'current_green_card'
  | 'expired_green_card'
  | 'police_report'
  | 'court_order'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'uscis_error_proof'
  | 'identity_document'
  | 'photos'
  | 'unknown';

export function detectEvidenceTypes(text: string): I90EvidenceType[] {
  const lower = text.toLowerCase();
  const types: I90EvidenceType[] = [];

  if (/green card.*copy|copy.*green card|current.*card|my.*green card/i.test(lower)) types.push('current_green_card');
  if (/expired.*green card|green card.*expired|old.*card/i.test(lower)) types.push('expired_green_card');
  if (/police report|stolen.*report|theft.*report/i.test(lower)) types.push('police_report');
  if (/court order|court.*decree|legal.*name.*change.*order/i.test(lower)) types.push('court_order');
  if (/birth certificate/i.test(lower)) types.push('birth_certificate');
  if (/marriage certificate|marriage.*license/i.test(lower)) types.push('marriage_certificate');
  if (/uscis.*error|wrong.*name|typo|misspell/i.test(lower)) types.push('uscis_error_proof');
  if (/passport|driver.?s license|state id|government id/i.test(lower)) types.push('identity_document');
  if (/passport.?style photo|two photos|passport photo/i.test(lower)) types.push('photos');

  if (types.length === 0) return ['unknown'];
  return [...new Set(types)];
}

export function getRequiredEvidence(reason: I90FilingReason): string[] {
  const evidence: string[] = [];

  // Common to all
  evidence.push('Government-issued photo ID');

  switch (reason) {
    case 'expiring_card':
    case 'expired_card':
      evidence.push('Copy of current or expired green card (Form I-551)');
      break;
    case 'lost_stolen_destroyed':
      evidence.push('Copy of green card if available');
      evidence.push('Police report (if stolen)');
      evidence.push('Explanation of how card was lost, stolen, or destroyed');
      break;
    case 'never_received':
      evidence.push('Proof that card was not received (USCIS delivery tracking if available)');
      break;
    case 'uscis_error':
      evidence.push('Original green card with the error');
      evidence.push('Proof of correct information (e.g., passport, birth certificate)');
      evidence.push('Explanation of the USCIS error');
      break;
    case 'name_change':
      evidence.push('Court order for name change');
      evidence.push('Marriage certificate (if name changed due to marriage)');
      evidence.push('Divorce decree (if name changed due to divorce)');
      break;
    case 'biographic_change':
      evidence.push('Documentation supporting the biographic change');
      break;
    case 'commuter_status_change':
      evidence.push('Proof of commuter or non-commuter status change');
      break;
    case 'turning_14':
      evidence.push('Copy of current green card');
      break;
  }

  return evidence;
}

// ─── Fee Analysis ────────────────────────────────────────────────────────────

export interface I90FeeResult {
  amount: number;
  method: 'paper' | 'online';
  note: string;
}

export function analyzeI90Fee(reason: I90FilingReason, filingMethod: 'paper' | 'online' | 'not_determined'): I90FeeResult {
  // USCIS error filings are FREE
  if (reason === 'uscis_error') {
    return { amount: 0, method: filingMethod === 'online' ? 'online' : 'paper', note: 'No filing fee required for USCIS error corrections. File Form I-90 with no fee.' };
  }

  const method: 'paper' | 'online' = filingMethod === 'online' ? 'online' : 'paper';
  const amount = method === 'online' ? 415 : 465;

  return {
    amount,
    method,
    note: `Filing fee: $${amount} (${method}). Biometrics fee is included. ${reason === 'expiring_card' || reason === 'expired_card' ? 'Upon filing, your I-90 receipt notice will automatically extend your green card validity for 36 months from the expiration date.' : ''}`,
  };
}

// ─── Biometrics ──────────────────────────────────────────────────────────────

export function requiresBiometrics(reason: I90FilingReason): boolean {
  // USCIS error may not require biometrics if no biographic change
  // All other filings require biometrics
  if (reason === 'uscis_error') return false;
  return true;
}

// ─── 36-Month Extension Info ───────────────────────────────────────────────────

export function getExtensionInfo(reason: I90FilingReason): { applies: boolean; note: string } {
  // 36-month automatic extension applies to renewal filings (expiring/expired card)
  if (reason === 'expiring_card' || reason === 'expired_card') {
    return {
      applies: true,
      note: 'As of September 10, 2024, USCIS automatically extends green card validity for 36 months from the expiration date when you properly file Form I-90. Your I-90 receipt notice (Form I-797) together with your expired green card serves as evidence of your lawful permanent resident status for 36 months.',
    };
  }

  return {
    applies: false,
    note: 'The 36-month automatic extension applies to renewal filings (expiring or expired cards). For replacement or correction filings, you will receive a new card upon approval.',
  };
}

// ─── Event Types ──────────────────────────────────────────────────────────────

export type I90EventType =
  | 'initial_filing'
  | 'rfe_response'
  | 'noid_response'
  | 'processing_delay'
  | 'card_delivery_issue'
  | 'denial_handling'
  | 'approval_handling'
  | 'conditional_redirect'
  | 'naturalization_inquiry'
  | 'unknown';

export function detectEventType(text: string): I90EventType {
  const lower = text.toLowerCase();

  if (/rfe|request for evidence|additional evidence/i.test(lower)) return 'rfe_response';
  if (/noid|notice of intent to deny/i.test(lower)) return 'noid_response';
  if (/denied|denial|rejected/i.test(lower)) return 'denial_handling';

  // Card delivery issue — check before approval (text may contain "received")
  if (/never received|not received|lost in mail|delivered to wrong/i.test(lower)) return 'card_delivery_issue';

  if (/approved|approval|received my.{0,15}(green card|card|i.?551)/i.test(lower)) return 'approval_handling';
  if (/delay|stuck|pending|taking.*long|how long|waiting|months.*waiting/i.test(lower)) return 'processing_delay';
  if (/conditional|2.?year.{0,10}card|i.?751/i.test(lower)) return 'conditional_redirect';
  if (/naturaliz|citizenship|N.?400/i.test(lower)) return 'naturalization_inquiry';

  if (/renew|replace|lost|stolen|expir|name change|uscis.*error|apply|filing|file/i.test(lower)) return 'initial_filing';

  return 'unknown';
}

// ─── Risk Level ────────────────────────────────────────────────────────────────

export type I90RiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export function detectRisk(
  cardType: GreenCardType,
  reason: I90FilingReason,
  filingWindow: FilingWindowStatus,
  hasEvidence: boolean,
): I90RiskLevel {
  // Conditional card → high risk (must use I-751)
  if (cardType === 'conditional_2_year') return 'high';

  // Filing too early → elevated risk (will be rejected)
  if (filingWindow === 'too_early') return 'elevated';

  // No evidence → elevated
  if (!hasEvidence) return 'elevated';

  // Lost/stolen without police report → moderate
  if (reason === 'lost_stolen_destroyed') return 'moderate';

  // Expired card → moderate (but still can file)
  if (reason === 'expired_card') return 'moderate';

  // Unknown reason → elevated
  if (reason === 'not_determined') return 'elevated';

  return 'low';
}

// ─── Authority ──────────────────────────────────────────────────────────────────

export function getAuthority(): string[] {
  return [
    'INA § 264 — registration of aliens',
    '8 CFR § 264.5 — replacement of alien registration documents',
    'USCIS Form I-90 instructions',
  ];
}

// ─── Analysis ────────────────────────────────────────────────────────────────────

export interface I90Analysis {
  eventType: I90EventType;
  cardType: GreenCardType;
  filingReason: I90FilingReason;
  appType: I90AppType;
  filingWindow: FilingWindowStatus;
  daysUntilExpiry: number | null;
  filingWindowNote: string;
  naturalizationCheck: NaturalizationCheck;
  i90vsI751: I90VsI751Check;
  evidenceTypes: I90EvidenceType[];
  requiredEvidence: string[];
  missingEvidence: string[];
  fee: I90FeeResult;
  biometricsRequired: boolean;
  extensionInfo: { applies: boolean; note: string };
  risk: I90RiskLevel;
  authority: string[];
  recommendedAction: string;
  processingTimeNote: string;
  downstreamRouting: string[];
}

export function analyzeI90(
  text: string,
  cardExpirationDate?: string,
  filingMethod?: 'paper' | 'online',
): I90Analysis {
  const eventType = detectEventType(text);
  const cardType = detectCardType(text);
  const filingReason = detectFilingReason(text, cardExpirationDate);
  const appType = classifyAppType(filingReason);
  const filingWindowAnalysis = analyzeFilingWindow(text, cardExpirationDate);
  const naturalizationCheck = checkNaturalizationAlternative(text);
  const i90vsI751 = checkI90VsI751(cardType, text);
  const evidenceTypes = detectEvidenceTypes(text);
  const requiredEvidence = getRequiredEvidence(filingReason);
  const method = filingMethod || (/online|file online|myUSCIS/i.test(text) ? 'online' : 'paper');
  const fee = analyzeI90Fee(filingReason, method);
  const biometricsRequired = requiresBiometrics(filingReason);
  const extensionInfo = getExtensionInfo(filingReason);
  const authority = getAuthority();
  const hasEvidence = evidenceTypes.length > 0 && evidenceTypes[0] !== 'unknown';

  // Detect missing evidence
  const missingEvidence: string[] = [];
  const detected = evidenceTypes.map(e => e.toString());

  if (requiredEvidence.some(e => e.includes('green card') || e.includes('I-551')) && !detected.includes('current_green_card') && !detected.includes('expired_green_card')) {
    missingEvidence.push('Copy of current or expired green card (Form I-551)');
  }
  if (requiredEvidence.some(e => e.includes('Police report')) && !detected.includes('police_report')) {
    missingEvidence.push('Police report (card reported stolen)');
  }
  if (requiredEvidence.some(e => e.includes('Court order')) && !detected.includes('court_order')) {
    missingEvidence.push('Court order for name change');
  }
  if (requiredEvidence.some(e => e.includes('Marriage certificate')) && !detected.includes('marriage_certificate')) {
    missingEvidence.push('Marriage certificate (if name changed due to marriage)');
  }

  const risk = detectRisk(cardType, filingReason, filingWindowAnalysis.status, hasEvidence);

  // Recommended action
  let recommendedAction = '';
  if (i90vsI751.redirect) {
    recommendedAction = i90vsI751.message;
  } else if (naturalizationCheck.recommendN400) {
    recommendedAction = naturalizationCheck.note;
  } else if (filingWindowAnalysis.status === 'too_early') {
    recommendedAction = filingWindowAnalysis.note;
  } else if (filingWindowAnalysis.status === 'expired') {
    recommendedAction = 'Your green card has expired. File Form I-90 immediately. ' + extensionInfo.note;
  } else if (filingWindowAnalysis.status === 'within_window') {
    recommendedAction = `File Form I-90 now. Filing fee: $${fee.amount}. ${extensionInfo.note}`;
  } else if (filingReason === 'not_determined') {
    recommendedAction = 'Identify your filing reason: renewal (expiring/expired card), replacement (lost/stolen/damaged), or correction (name change, USCIS error).';
  } else if (missingEvidence.length > 0) {
    recommendedAction = `Missing ${missingEvidence.length} piece(s) of evidence. Gather: ${missingEvidence.join(', ')}.`;
  } else {
    recommendedAction = `File Form I-90 (${appType}). Filing fee: $${fee.amount} (${fee.method}). ${extensionInfo.note}`;
  }

  // Downstream routing
  const downstreamRouting: string[] = [];
  if (eventType === 'rfe_response') downstreamRouting.push('rfe-response');
  if (eventType === 'noid_response') downstreamRouting.push('noid-response');
  if (eventType === 'processing_delay') downstreamRouting.push('case-inquiry');
  if (eventType === 'card_delivery_issue') downstreamRouting.push('case-inquiry');
  if (biometricsRequired) downstreamRouting.push('biometrics-scheduling');

  const processingTimeNote = 'I-90 processing time: approximately 8-14 months (median ~9 months as of 2026). Biometrics appointment typically within 2-4 weeks of filing. New card arrives 1-3 weeks after approval.';

  return {
    eventType,
    cardType,
    filingReason,
    appType,
    filingWindow: filingWindowAnalysis.status,
    daysUntilExpiry: filingWindowAnalysis.daysUntilExpiry,
    filingWindowNote: filingWindowAnalysis.note,
    naturalizationCheck,
    i90vsI751,
    evidenceTypes,
    requiredEvidence,
    missingEvidence,
    fee,
    biometricsRequired,
    extensionInfo,
    risk,
    authority,
    recommendedAction,
    processingTimeNote,
    downstreamRouting,
  };
}

// ─── Strategy ────────────────────────────────────────────────────────────────────

export interface I90Strategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string[];
  filingNote: string;
  extensionNote: string;
  naturalizationNote: string;
  i751Note: string;
  feeNote: string;
  biometricsNote: string;
  downstreamRouting: string[];
  readinessChecklist: string[];
}

export function buildI90Strategy(analysis: I90Analysis): I90Strategy {
  const a = analysis;

  // I-751 redirect
  if (a.i90vsI751.redirect) {
    return {
      approach: 'Redirect to I-751 workflow — conditional residents cannot use Form I-90',
      keyArguments: [a.i90vsI751.message],
      supportingEvidence: [],
      authority: a.authority,
      filingNote: 'Do NOT file Form I-90 for a 2-year conditional green card.',
      extensionNote: '',
      naturalizationNote: '',
      i751Note: a.i90vsI751.message,
      feeNote: '',
      biometricsNote: '',
      downstreamRouting: [],
      readinessChecklist: ['File Form I-751 instead of I-90'],
    };
  }

  let approach = '';
  const keyArguments: string[] = [];
  const supportingEvidence = a.requiredEvidence;
  const authority = a.authority;
  let filingNote = '';
  let extensionNote = '';
  let naturalizationNote = '';
  let i751Note = '';
  let feeNote = '';
  let biometricsNote = '';
  const downstreamRouting = a.downstreamRouting;
  const readinessChecklist: string[] = [];

  const reasonName = a.filingReason.replace(/_/g, ' ');

  if (a.filingReason === 'not_determined') {
    approach = 'Identify your filing reason before filing Form I-90: renewal (expiring/expired card), replacement (lost/stolen/damaged), or correction (name change, USCIS error).';
  } else if (a.appType === 'renewal') {
    approach = `File Form I-90 for green card renewal. ${a.filingWindowNote}`;
  } else if (a.appType === 'replacement') {
    approach = `File Form I-90 for green card replacement (${reasonName}). Include all required evidence.`;
  } else if (a.appType === 'correction') {
    approach = `File Form I-90 for correction (${reasonName}). ${a.filingReason === 'uscis_error' ? 'This filing is FREE.' : ''}`;
  } else {
    approach = `File Form I-90 for ${reasonName}.`;
  }

  keyArguments.push(`Card type: ${a.cardType === 'permanent_10_year' ? '10-year permanent resident' : a.cardType.replace(/_/g, ' ')}`);
  keyArguments.push(`Filing reason: ${reasonName}`);
  keyArguments.push(`Application type: ${a.appType}`);
  if (a.filingWindow !== 'no_expiration' && a.filingWindow !== 'unknown') {
    keyArguments.push(`Filing window: ${a.filingWindow.replace(/_/g, ' ')}`);
  }
  if (a.missingEvidence.length > 0) {
    keyArguments.push(`${a.missingEvidence.length} piece(s) of evidence missing: ${a.missingEvidence.join(', ')}`);
  }
  if (a.risk === 'high' || a.risk === 'elevated') {
    keyArguments.push(`Risk level: ${a.risk}`);
  }

  filingNote = `File Form I-90 ${a.fee.method === 'online' ? 'online through myUSCIS' : 'by mail'}. Check USCIS.gov for the current edition date.`;
  extensionNote = a.extensionInfo.note;
  naturalizationNote = a.naturalizationCheck.note;
  i751Note = a.i90vsI751.message;
  feeNote = `Filing fee: ${a.fee.amount === 0 ? 'FREE (USCIS error)' : `$${a.fee.amount} (${a.fee.method})`}. ${a.fee.note}`;
  biometricsNote = a.biometricsRequired
    ? 'Biometrics (fingerprints and photo) are required. You will receive an ASC appointment notice after filing. The biometrics fee is included in the filing fee.'
    : 'Biometrics may not be required for this filing type.';

  // Readiness checklist
  readinessChecklist.push(`Card type verified: ${a.cardType === 'permanent_10_year' ? '10-year permanent resident ✓' : 'Unknown — verify'}`);
  readinessChecklist.push(`Filing reason identified: ${a.filingReason !== 'not_determined' ? 'Yes' : 'No — identify reason'}`);
  readinessChecklist.push(`Filing window checked: ${a.filingWindow === 'within_window' || a.filingWindow === 'expired' || a.filingWindow === 'no_expiration' ? 'Yes' : a.filingWindow === 'too_early' ? 'Too early — wait' : 'Unknown'}`);
  readinessChecklist.push(`Evidence gathered: ${a.missingEvidence.length === 0 ? 'Yes' : `Missing ${a.missingEvidence.length} item(s)`}`);
  readinessChecklist.push(`Filing fee prepared: ${a.fee.amount === 0 ? 'Free' : `$${a.fee.amount}`}`);
  if (a.biometricsRequired) readinessChecklist.push('Prepared for biometrics appointment');
  if (a.naturalizationCheck.recommendN400) readinessChecklist.push('Naturalization alternative considered');

  return {
    approach,
    keyArguments,
    supportingEvidence,
    authority,
    filingNote,
    extensionNote,
    naturalizationNote,
    i751Note,
    feeNote,
    biometricsNote,
    downstreamRouting,
    readinessChecklist,
  };
}

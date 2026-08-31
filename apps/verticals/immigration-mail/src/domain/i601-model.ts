/**
 * I-601 / I-601A Inadmissibility Waiver Domain Model
 *
 * Distinct from all other workflows because:
 * - Centers on waiving grounds of inadmissibility under INA § 212(a)
 * - I-601 and I-601A are two genuinely different procedural pathways (not just different form numbers)
 * - I-601: filed AFTER being found inadmissible (usually at consular interview); covers ALL waivable grounds
 * - I-601A: filed BEFORE departing the US; ONLY unlawful presence; requires approved immigrant visa petition + DOS fee
 * - Extreme hardship analysis is the core evidentiary burden — distinct from I-751's "extreme hardship waiver" which is about waiving joint filing requirement
 * - Qualifying relative varies by ground: I-601 can include spouse, parent, son, daughter; I-601A is spouse or parent only
 * - I-601A has unique eligibility gates: no pending I-485, not in removal proceedings (unless admin closed), no final removal order
 * - Consular/NVC sequencing is integral to I-601A (must depart after approval for visa interview)
 * - Discretionary decision — USCIS weighs positive vs negative factors; approval is never guaranteed
 *
 * Authority:
 *   INA § 212(a)(9)(B)(v) — waiver for unlawful presence 3/10-year bar
 *   INA § 212(i) — waiver for fraud/willful misrepresentation
 *   INA § 212(h) — waiver for certain criminal grounds
 *   INA § 212(d)(3)(A) — nonimmigrant waiver (not covered by I-601, included for context)
 *   8 CFR § 212.7 — application procedures for waivers of inadmissibility
 *   USCIS Policy Manual, Volume 9, Part B, Chapters 1-6 — extreme hardship guidance
 *
 * User journeys:
 *   "I was found inadmissible at my visa interview for unlawful presence — can I get a waiver?"
 *   "I'm in the US and need to file I-601A before leaving for my visa interview."
 *   "I have a fraud/misrepresentation finding and need an I-601 waiver."
 *   "I was told I'm inadmissible for a criminal conviction — is a waiver available?"
 *   "How do I prove extreme hardship to my US citizen wife?"
 *   "My I-601A was approved — what happens next?"
 *   "My I-601 was denied — what are my options?"
 *   "USCIS sent an RFE on my I-601." (routes to RFE engine)
 *   "I got a NOID on my I-601A." (routes to NOID engine)
 *
 * Reuses: Case, IntakeSession, DocumentUnderstanding, Authority, MailMyPDF, Tracking, Proof
 * Distinct from: I-751 (removal of conditions, not inadmissibility waiver), Visa Refusal (consular refusal processing, not waiver filing), Consular Processing (visa lifecycle, not waiver adjudication)
 */

import type { LanguageContext } from './multilingual';

// ─── Waiver Pathway ───────────────────────────────────────────────────────────

export type WaiverPathway = 'I-601' | 'I-601A' | 'not_determined';

// ─── Inadmissibility Grounds ──────────────────────────────────────────────────

export type InadmissibilityGround =
  | 'unlawful_presence'               // INA § 212(a)(9)(B) — 3/10-year bar
  | 'fraud_misrepresentation'          // INA § 212(a)(6)(C)(i) — waivable under § 212(i)
  | 'criminal_ground'                 // INA § 212(a)(2) — CIMT, controlled substances
  | 'health_ground'                    // INA § 212(a)(1) — communicable disease, mental disorder
  | 'smuggling'                        // INA § 212(a)(6)(E)
  | 'unlawful_presence_after_removal'  // INA § 212(a)(9)(C) — permanent bar
  | 'prior_removal'                    // INA § 212(a)(9)(A) — 5/10/20-year bar
  | 'public_charge'                    // INA § 212(a)(4)
  | 'security_ground'                  // INA § 212(a)(3) — terrorism, espionage
  | 'misrepresentation'                // General misrepresentation (may overlap with fraud)
  | 'unknown';

export const ALL_INADMISSIBILITY_GROUNDS: InadmissibilityGround[] = [
  'unlawful_presence', 'fraud_misrepresentation', 'criminal_ground', 'health_ground',
  'smuggling', 'unlawful_presence_after_removal', 'prior_removal', 'public_charge',
  'security_ground', 'misrepresentation', 'unknown',
];

// Grounds waivable by I-601 (not all grounds are waivable)
export const I601_WAIVABLE_GROUNDS: InadmissibilityGround[] = [
  'unlawful_presence', 'fraud_misrepresentation', 'criminal_ground', 'health_ground',
  'smuggling', 'prior_removal', 'misrepresentation',
];

// Grounds NOT waivable by I-601
export const I601_NON_WAIVABLE_GROUNDS: InadmissibilityGround[] = [
  'security_ground',             // Terrorism, espionage — no waiver
  'unlawful_presence_after_removal', // Permanent bar — I-212 needed, not I-601
];

// I-601A ONLY waives unlawful presence
export const I601A_WAIVABLE_GROUNDS: InadmissibilityGround[] = ['unlawful_presence'];

// ─── Qualifying Relative ────────────────────────────────────────────────────

export type QualifyingRelativeType =
  | 'us_citizen_spouse'       // US citizen spouse
  | 'lpr_spouse'              // LPR spouse
  | 'us_citizen_parent'       // US citizen parent
  | 'lpr_parent'              // LPR parent
  | 'us_citizen_child'        // US citizen son or daughter
  | 'lpr_child'               // LPR son or daughter
  | 'no_qualifying_relative'  // No qualifying relative identified
  | 'unknown';

export function detectQualifyingRelative(text: string): QualifyingRelativeType {
  const lower = text.toLowerCase();
  // US citizen spouse
  if (/my.{0,15}u\.?s\.? citizen (wife|spouse|husband)/i.test(lower) || /u\.?s\.? citizen.{0,15}(wife|spouse|husband)/i.test(lower) || /my (wife|spouse|husband).{0,20}u\.?s\.? citizen/i.test(lower)) return 'us_citizen_spouse';
  // LPR spouse
  if (/my.{0,15}(green card|lpr|lawful permanent resident).{0,15}(wife|spouse|husband)/i.test(lower) || /my (wife|spouse|husband).{0,20}(green card|lpr|lawful permanent resident)/i.test(lower)) return 'lpr_spouse';
  // US citizen parent
  if (/my.{0,15}u\.?s\.? citizen (parent|mother|father|mom|dad)/i.test(lower) || /u\.?s\.? citizen.{0,15}(parent|mother|father|mom|dad)/i.test(lower) || /my (parent|mother|father|mom|dad).{0,20}u\.?s\.? citizen/i.test(lower)) return 'us_citizen_parent';
  // LPR parent
  if (/my.{0,15}(green card|lpr|lawful permanent resident).{0,15}(parent|mother|father|mom|dad)/i.test(lower) || /my (parent|mother|father|mom|dad).{0,20}(green card|lpr|lawful permanent resident)/i.test(lower)) return 'lpr_parent';
  // US citizen child
  if (/my.{0,15}(son|daughter|child).{0,15}u\.?s\.? citizen/i.test(lower) || /u\.?s\.? citizen.{0,15}(son|daughter|child)/i.test(lower) || /my (son|daughter|child).{0,20}u\.?s\.? citizen/i.test(lower)) return 'us_citizen_child';
  // LPR child
  if (/my.{0,15}(son|daughter|child).{0,15}(green card|lpr|permanent resident)/i.test(lower) || /my (son|daughter|child).{0,20}(green card|lpr|permanent resident)/i.test(lower)) return 'lpr_child';
  if (/spouse|wife|husband|parent|mother|father|son|daughter|child/i.test(lower)) return 'unknown';
  return 'no_qualifying_relative';
}

// ─── Statutory Authority per Ground ──────────────────────────────────────────

export function getWaiverAuthority(ground: InadmissibilityGround): { statute: string; regulation: string; description: string } {
  switch (ground) {
    case 'unlawful_presence':
      return { statute: 'INA § 212(a)(9)(B)(v)', regulation: '8 CFR § 212.7(a)', description: 'Waiver of 3/10-year unlawful presence bar — requires extreme hardship to USC or LPR spouse or parent' };
    case 'fraud_misrepresentation':
      return { statute: 'INA § 212(i)', regulation: '8 CFR § 212.7(d)', description: 'Waiver of fraud/willful misrepresentation — requires extreme hardship to USC or LPR spouse, parent, son, or daughter' };
    case 'criminal_ground':
      return { statute: 'INA § 212(h)', regulation: '8 CFR § 212.7(c)', description: 'Waiver of certain criminal grounds — conditions vary by offense type and conviction date' };
    case 'health_ground':
      return { statute: 'INA § 212(g)', regulation: '8 CFR § 212.7(b)', description: 'Waiver of health-related inadmissibility — available for certain health conditions with qualifying relative' };
    case 'smuggling':
      return { statute: 'INA § 212(d)(11)', regulation: '8 CFR § 212.7(e)', description: 'Waiver for smuggling — available if assistance was solely to spouse, parent, son, or daughter' };
    case 'prior_removal':
      return { statute: 'INA § 212(a)(9)(A)', regulation: '8 CFR § 212.2', description: 'Permission to reapply after removal — Form I-212 required in addition to or instead of I-601' };
    case 'public_charge':
      return { statute: 'INA § 212(a)(4)', regulation: '—', description: 'Public charge inadmissibility — typically addressed with affidavit of support, not I-601 waiver' };
    case 'security_ground':
      return { statute: 'INA § 212(a)(3)', regulation: '—', description: 'Security-related inadmissibility — generally no waiver available' };
    case 'unlawful_presence_after_removal':
      return { statute: 'INA § 212(a)(9)(C)', regulation: '8 CFR § 212.2', description: 'Permanent bar for unlawful presence after removal — requires I-212 permission to reapply after 10 years' };
    case 'misrepresentation':
      return { statute: 'INA § 212(a)(6)(C)', regulation: '8 CFR § 212.7(d)', description: 'Misrepresentation inadmissibility — waivable under INA § 212(i) if fraud/misrep' };
    default:
      return { statute: 'INA § 212', regulation: '8 CFR § 212.7', description: 'General inadmissibility waiver provisions' };
  }
}

// ─── Extreme Hardship Factors ────────────────────────────────────────────────

export type HardshipFactor =
  | 'health'                    // Medical conditions, access to care, quality of treatment
  | 'financial'                 // Loss of income, employment, standard of living
  | 'educational'               // Disruption of education, language barriers, school quality
  | 'family_caregiving'         // Separation from family, caregiving responsibilities
  | 'country_conditions'        // Safety, violence, political instability, environmental hazards
  | 'psychological_emotional'   // Mental health impact of separation or relocation
  | 'special_consideration'     // USCIS designated special consideration factors
  | 'other'                     // Any other relevant factors
  | 'none'                      // No hardship factors identified
  | 'unknown';

export const ALL_HARDSHIP_FACTORS: HardshipFactor[] = [
  'health', 'financial', 'educational', 'family_caregiving',
  'country_conditions', 'psychological_emotional', 'special_consideration', 'other',
  'none', 'unknown',
];

export function detectHardshipFactors(text: string): HardshipFactor[] {
  const lower = text.toLowerCase();
  const factors: HardshipFactor[] = [];

  if (/medical|health|illness|disease|condition|treatment|hospital|doctor|medication|disability|mental health|therapy|counseling|psychiatr/i.test(lower)) factors.push('health');
  if (/financial|income|employ|job|wage|salary|support|poverty|debt|mortgage|rent|living expense|can.?t afford|lost.{0,10}job/i.test(lower)) factors.push('financial');
  if (/school|education|university|college|studying|degree|academic|language barrier|ESL|special education/i.test(lower)) factors.push('educational');
  if (/child|children|care|caregiver|elderly parent|dependent|special needs|autism|disability|separation|family.*separat/i.test(lower)) factors.push('family_caregiving');
  if (/country condition|violence|cartel|gang|war|conflict|political|persecut|environment|natural disaster|earthquake|hurricane|safety|danger|instability/i.test(lower)) factors.push('country_conditions');
  if (/depression|anxiety|trauma|PTSD|emotional|psychological|grief|suffer|distress|mental anguish|suicid/i.test(lower)) factors.push('psychological_emotional');
  if (/special consideration|designated|TPS|asylum|refugee|VAWA|NACARA|HRIFA|Haitian|Cuban/i.test(lower)) factors.push('special_consideration');
  if (/community|church|religious|volunteer|charitable|ties to.{0,20}(community|neighborhood)/i.test(lower)) factors.push('other');

  if (factors.length === 0) {
    if (/no hardship|no evidence|nothing to show/i.test(lower)) return ['none'];
    return ['unknown'];
  }
  return factors;
}

// ─── Evidence Categories ────────────────────────────────────────────────────

export type WaiverEvidenceType =
  | 'qualifying_relative_evidence'   // Proof of relationship: marriage cert, birth cert
  | 'hardship_evidence'              // Medical, financial, country condition evidence
  | 'character_evidence'             // Rehabilitation, community ties, good moral character
  | 'discretionary_evidence'         // Letters of support, community involvement
  | 'country_condition_evidence'     // DOS country reports, news articles, expert testimony
  | 'medical_evidence'               // Medical records, physician letters
  | 'financial_evidence'             // Tax returns, pay stubs, bank statements
  | 'psychological_evidence'          // Mental health evaluations, counseling records
  | 'unknown';

export function detectWaiverEvidenceTypes(text: string): WaiverEvidenceType[] {
  const lower = text.toLowerCase();
  const types: WaiverEvidenceType[] = [];

  if (/marriage certificate|birth certificate|proof of (marriage|relationship|family)|marriage license/i.test(lower)) types.push('qualifying_relative_evidence');
  if (/medical record|doctor letter|physician|hospital record|treatment record|medication list/i.test(lower)) types.push('medical_evidence');
  if (/tax return|pay stub|bank statement|W-2|employment letter|financial record|income proof/i.test(lower)) types.push('financial_evidence');
  if (/country report|state department|human rights report|news article|country condition|expert witness|country expert/i.test(lower)) types.push('country_condition_evidence');
  if (/psychological evaluation|mental health evaluation|counseling record|therapy record|psychologist/i.test(lower)) types.push('psychological_evidence');
  if (/rehabilitation|good moral character|community service|volunteer|character letter/i.test(lower)) types.push('character_evidence');
  if (/letters? of support|community letter|reference letter|testimonial/i.test(lower)) types.push('discretionary_evidence');

  // If hardship evidence mentioned generically, add it
  if (/hardship evidence|evidence of hardship|proof of hardship/i.test(lower)) types.push('hardship_evidence');

  if (types.length === 0) {
    if (/no evidence|nothing|don.?t have/i.test(lower)) return ['unknown'];
    return ['unknown'];
  }
  return [...new Set(types)];
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export type I601EventType =
  | 'i601_filing_preparation'          // Preparing to file I-601 (found inadmissible, need waiver)
  | 'i601a_filing_preparation'         // Preparing to file I-601A (in US, unlawful presence only)
  | 'inadmissibility_ground_detection' // Applicant discovered they may be inadmissible
  | 'hardship_assessment'              // Evaluating extreme hardship
  | 'evidence_deficiency'              // Missing evidence for waiver
  | 'rfe_response'                     // USCIS issued RFE — routes to RFE engine
  | 'noid_response'                    // USCIS issued NOID — routes to NOID engine
  | 'processing_delay'                 // Waiver application taking too long
  | 'denial_handling'                  // Waiver denied
  | 'approval_handling'                // Waiver approved — next steps
  | 'consular_interaction'             // Interaction with consulate/NVC
  | 'unknown';

export function detectI601Event(text: string): I601EventType {
  const lower = text.toLowerCase();

  // RFE / NOID routing — check before other patterns
  if (/rfe|request for evidence|additional evidence/i.test(lower)) return 'rfe_response';
  if (/noid|notice of intent to deny|intent to deny/i.test(lower)) return 'noid_response';

  // Denial
  if (/denied|denial|rejected|my.{0,15}waiver.{0,15}denied/i.test(lower)) return 'denial_handling';

  // Approval
  if (/approved|approval|granted|my.{0,15}waiver.{0,15}approved/i.test(lower)) return 'approval_handling';

  // Processing delay
  if (/delay|stuck|pending|taking.*long|how long|waiting|no response|no decision|months.*waiting/i.test(lower)) return 'processing_delay';

  // I-601A specific — check before inadmissibility_ground_detection
  if (/i.?601a|provisional waiver|unlawful presence.*waiver/i.test(lower)) return 'i601a_filing_preparation';

  // I-601 specific — check before inadmissibility_ground_detection
  if (/i.?601\b|waiver of.{0,20}inadmissib/i.test(lower)) return 'i601_filing_preparation';

  // Inadmissibility ground detection
  if (/inadmissib|found inadmissible|212.{0,5}a|barred|excluded/i.test(lower)) return 'inadmissibility_ground_detection';

  // Consular interaction
  if (/consul|embassy|nvc|national visa center|visa interview|visa appointment/i.test(lower)) return 'consular_interaction';

  // Hardship assessment
  if (/extreme hardship|hardship|qualifying relative|hardship to my/i.test(lower)) return 'hardship_assessment';

  // Evidence deficiency
  if (/evidence|insufficient|not enough|missing.*document|need.*more.*proof/i.test(lower)) return 'evidence_deficiency';
  return 'unknown';
}

// ─── Urgency ──────────────────────────────────────────────────────────────────

export type I601Urgency = 'routine' | 'time_sensitive' | 'critical';

export function detectI601Urgency(
  text: string,
  filingDeadline?: string,
  interviewDate?: string,
): I601Urgency {
  const lower = text.toLowerCase();

  // Critical: denial, removal proceedings, imminent deadline
  if (/denied|denial|removal proceeding|deportation|order of removal|final order|nta|notice to appear/i.test(lower)) return 'critical';
  if (/tomorrow|this week|asap|immediately|emergency|expired|expiring/i.test(lower)) return 'critical';

  // Time-sensitive: filing deadline approaching
  if (filingDeadline) {
    const days = Math.ceil((new Date(filingDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 30) return 'time_sensitive';
  }

  // Time-sensitive: visa interview approaching
  if (interviewDate) {
    const days = Math.ceil((new Date(interviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 30 && days > 0) return 'time_sensitive';
    if (days <= 0) return 'critical';
  }

  // Routine: general inquiry
  if (/expir|expiring|approaching|soon|deadline/i.test(lower)) return 'time_sensitive';

  return 'routine';
}

// ─── Risk Level ──────────────────────────────────────────────────────────────

export type I601RiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export function detectI601Risk(
  ground: InadmissibilityGround,
  pathway: WaiverPathway,
  hardshipFactors: HardshipFactor[],
  hasQualifyingRelative: boolean,
): I601RiskLevel {
  // High risk: non-waivable grounds, no qualifying relative
  if (I601_NON_WAIVABLE_GROUNDS.includes(ground)) return 'high';
  if (!hasQualifyingRelative) return 'high';

  // Elevated risk: criminal, fraud, security-related
  if (ground === 'criminal_ground' || ground === 'fraud_misrepresentation') return 'elevated';

  // Moderate risk: single hardship factor or I-601A with minimal factors
  if (hardshipFactors.length <= 1 || (hardshipFactors.length === 1 && hardshipFactors[0] === 'unknown')) return 'moderate';

  // Low risk: unlawful presence with multiple hardship factors and qualifying relative
  if (ground === 'unlawful_presence' && hardshipFactors.length >= 3) return 'low';

  return 'moderate';
}

// ─── I-601A Eligibility Gates ─────────────────────────────────────────────────

export interface I601AEligibility {
  physicallyPresentInUS: boolean;
  atLeast17: boolean;
  hasApprovedImmigrantVisaPetition: boolean;
  hasPaidVisaProcessingFee: boolean;
  hasNoPendingI485: boolean;
  notInRemovalProceedings: boolean;
  noFinalRemovalOrder: boolean;
  noReinstatedRemovalOrder: boolean;
  onlyUnlawfulPresence: boolean;
  hasQualifyingRelative: boolean;
}

export function checkI601AEligibility(text: string, ground: InadmissibilityGround, qualifyingRelative: QualifyingRelativeType): I601AEligibility {
  const lower = text.toLowerCase();

  return {
    physicallyPresentInUS: !/outside the us|abroad|in my country|not in the us|overseas/i.test(lower) && /in the us|united states|here in america/i.test(lower) ? true : !/outside|abroad|overseas/i.test(lower),
    atLeast17: !/minor|child|under 17|16 years old|15 years old/i.test(lower),
    hasApprovedImmigrantVisaPetition: /approved.{0,20}(i.?130|i.?140|i.?360|petition|visa petition)|approved immigrant visa/i.test(lower) || /petition.*approved|priority date/i.test(lower),
    hasPaidVisaProcessingFee: /visa fee|processing fee|dos fee|paid.*fee|fee.*paid/i.test(lower),
    hasNoPendingI485: !/pending.{0,10}i.?485|adjustment of status.*pending|i.?485.*pending/i.test(lower),
    notInRemovalProceedings: !/removal proceeding|immigration court|in front of judge|see you in court|nta|notice to appear/i.test(lower) || /administratively closed|admin closed/i.test(lower),
    noFinalRemovalOrder: !/final order|order of removal|order of deportation|deportation order/i.test(lower),
    noReinstatedRemovalOrder: !/reinstated|reinstat.*removal/i.test(lower),
    onlyUnlawfulPresence: ground === 'unlawful_presence',
    hasQualifyingRelative: qualifyingRelative !== 'no_qualifying_relative' && qualifyingRelative !== 'unknown' &&
      (qualifyingRelative === 'us_citizen_spouse' || qualifyingRelative === 'lpr_spouse' ||
       qualifyingRelative === 'us_citizen_parent' || qualifyingRelative === 'lpr_parent'),
  };
}

export function getI601AEligibilityFailures(eligibility: I601AEligibility): string[] {
  const failures: string[] = [];
  if (!eligibility.physicallyPresentInUS) failures.push('Applicant must be physically present in the US when filing I-601A');
  if (!eligibility.atLeast17) failures.push('Applicant must be at least 17 years old');
  if (!eligibility.hasApprovedImmigrantVisaPetition) failures.push('Must have an approved immigrant visa petition (I-130, I-140, or I-360)');
  if (!eligibility.hasPaidVisaProcessingFee) failures.push('Must have paid the DOS visa processing fee');
  if (!eligibility.hasNoPendingI485) failures.push('Cannot have a pending Form I-485 adjustment of status application');
  if (!eligibility.notInRemovalProceedings) failures.push('Cannot be in removal proceedings unless they are administratively closed');
  if (!eligibility.noFinalRemovalOrder) failures.push('Cannot have a final order of removal or deportation');
  if (!eligibility.noReinstatedRemovalOrder) failures.push('Cannot be subject to a reinstated removal order');
  if (!eligibility.onlyUnlawfulPresence) failures.push('I-601A only waives unlawful presence — if other grounds exist, I-601 is required');
  if (!eligibility.hasQualifyingRelative) failures.push('Must have a USC or LPR spouse or parent as qualifying relative (I-601A does not include children)');
  return failures;
}

// ─── Pathway Determination ────────────────────────────────────────────────────

export function determinePathway(
  text: string,
  ground: InadmissibilityGround,
  eligibility: I601AEligibility | null,
): WaiverPathway {
  const lower = text.toLowerCase();

  // Explicit mention
  if (/i.?601a|provisional waiver/i.test(lower)) return 'I-601A';
  if (/i.?601\b|waiver of.{0,20}inadmissib/i.test(lower)) return 'I-601';

  // Infer from context
  if (ground === 'unlawful_presence' && eligibility) {
    const failures = getI601AEligibilityFailures(eligibility);
    if (failures.length === 0) return 'I-601A';
    // If I-601A not eligible and ground is unlawful presence, default to I-601
    if (failures.some(f => f.includes('physically present') || f.includes('removal proceeding') || f.includes('final order'))) return 'I-601';
  }

  // Multiple grounds → I-601 (I-601A only covers unlawful presence)
  if (ground !== 'unlawful_presence' && ground !== 'unknown') return 'I-601';

  return 'not_determined';
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface I601Analysis {
  eventType: I601EventType;
  pathway: WaiverPathway;
  inadmissibilityGround: InadmissibilityGround;
  qualifyingRelative: QualifyingRelativeType;
  hardshipFactors: HardshipFactor[];
  evidenceTypes: WaiverEvidenceType[];
  urgency: I601Urgency;
  riskLevel: I601RiskLevel;
  authority: string[];
  i601aEligibility: I601AEligibility | null;
  i601aEligibilityFailures: string[];
  waiverAvailable: boolean;
  recommendedAction: string;
  processingTimeNote: string;
  consularSequencingNote: string;
}

export function analyzeI601(
  text: string,
  formType?: string,
  receiptNumber?: string,
  filingDeadline?: string,
  interviewDate?: string,
): I601Analysis {
  const eventType = detectI601Event(text);
  const ground = detectInadmissibilityGround(text);
  const qualifyingRelative = detectQualifyingRelative(text);
  const hardshipFactors = detectHardshipFactors(text);
  const evidenceTypes = detectWaiverEvidenceTypes(text);
  const urgency = detectI601Urgency(text, filingDeadline, interviewDate);

  // Check I-601A eligibility if ground is unlawful presence
  const i601aMentioned = /i.?601a|provisional waiver/i.test(text);
  const i601aEligibility = (ground === 'unlawful_presence' || i601aMentioned) ? checkI601AEligibility(text, ground, qualifyingRelative) : null;
  const i601aEligibilityFailures = i601aEligibility ? getI601AEligibilityFailures(i601aEligibility) : [];

  const pathway = determinePathway(text, ground, i601aEligibility);
  const riskLevel = detectI601Risk(ground, pathway, hardshipFactors, qualifyingRelative !== 'no_qualifying_relative' && qualifyingRelative !== 'unknown');

  // Determine if waiver is available
  const waiverAvailable = I601_WAIVABLE_GROUNDS.includes(ground) ||
    (pathway === 'I-601A' && I601A_WAIVABLE_GROUNDS.includes(ground));

  // Authority citations
  const authority: string[] = [];
  if (waiverAvailable) {
    const waiverAuth = getWaiverAuthority(ground);
    authority.push(waiverAuth.statute);
    authority.push(waiverAuth.regulation);
    authority.push('USCIS Policy Manual, Vol. 9, Part B — Extreme Hardship');
  }

  // Recommended action
  let recommendedAction = '';
  if (!waiverAvailable && ground !== 'unknown') {
    recommendedAction = `This ground (${ground}) may not be waivable. Consult an immigration attorney to evaluate alternatives.`;
  } else if (pathway === 'I-601A' && i601aEligibilityFailures.length > 0) {
    recommendedAction = `I-601A eligibility issues detected: ${i601aEligibilityFailures.length} eligibility gate(s) not met. Address these before filing.`;
  } else if (pathway === 'I-601A') {
    recommendedAction = `File Form I-601A with evidence of extreme hardship to your qualifying relative. After approval, depart the US for consular visa interview.`;
  } else if (pathway === 'I-601') {
    recommendedAction = `File Form I-601 with evidence of extreme hardship to your qualifying relative and documentation addressing the inadmissibility ground.`;
  } else {
    recommendedAction = `Consult with an immigration attorney to determine whether I-601 or I-601A is appropriate for your situation.`;
  }

  // Processing time note
  const processingTimeNote = 'I-601/I-601A processing times typically range from 12 to 30+ months depending on the service center and case complexity.';

  // Consular sequencing note
  let consularSequencingNote = '';
  if (pathway === 'I-601A') {
    consularSequencingNote = 'After I-601A approval, you must depart the US to attend your consular visa interview abroad. The waiver only waives the unlawful presence bar — you still need the visa.';
  } else if (pathway === 'I-601') {
    consularSequencingNote = 'I-601 is typically filed after a consular officer finds you inadmissible at your visa interview. You remain abroad during adjudication.';
  } else {
    consularSequencingNote = 'Consular processing sequencing depends on whether you file I-601 (after inadmissibility finding) or I-601A (before departure).';
  }

  return {
    eventType,
    pathway,
    inadmissibilityGround: ground,
    qualifyingRelative,
    hardshipFactors,
    evidenceTypes,
    urgency,
    riskLevel,
    authority,
    i601aEligibility,
    i601aEligibilityFailures,
    waiverAvailable,
    recommendedAction,
    processingTimeNote,
    consularSequencingNote,
  };
}

// ─── Inadmissibility Ground Detection ──────────────────────────────────────────

export function detectInadmissibilityGround(text: string): InadmissibilityGround {
  const lower = text.toLowerCase();

  // Security grounds (check first — non-waivable, high stakes)
  if (/terroris|espionage|sabotage|genocide|nazi|national security|spy/i.test(lower)) return 'security_ground';

  // Unlawful presence after removal (permanent bar)
  if (/unlawful presence.*after.*remov|re[- ]?enter.*after.*remov|permanent bar/i.test(lower)) return 'unlawful_presence_after_removal';

  // Prior removal
  if (/removed|deported|order of removal|prior removal|previous removal|reenter.*after.*deport/i.test(lower)) return 'prior_removal';

  // Fraud / misrepresentation
  if (/fraud|willful.{0,10}misrepresent|misrepresent|lied on|false statement|fake document|fraudulent/i.test(lower)) return 'fraud_misrepresentation';

  // Criminal grounds
  if (/convict|criminal|crime of moral turpitude|cimt|controlled substance|drug offense|drug traffick|narcotic/i.test(lower)) return 'criminal_ground';

  // Health grounds
  if (/communicable disease|mental disorder|health ground|medical inadmissib|tuberculosis|syphilis|gonorrhea|harmful behavior/i.test(lower)) return 'health_ground';

  // Smuggling
  if (/smuggl|harbor|transport.*illegal|knowing.*assist.*entry/i.test(lower)) return 'smuggling';

  // Public charge
  if (/public charge|likely to become|financial burden|means tested|welfare/i.test(lower)) return 'public_charge';

  // Unlawful presence (3/10-year bar) — check after more specific patterns
  if (/unlawful presence|overstay|visa overstay|entered without inspection|ewi|3[- ]year bar|10[- ]year bar|180 days|unlawful/i.test(lower)) return 'unlawful_presence';

  // General misrepresentation
  if (/misrepresent|false|untrue statement/i.test(lower)) return 'misrepresentation';

  return 'unknown';
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export interface I601Strategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string[];
  pathwayNote: string;
  hardshipNote: string;
  discretionaryNote: string;
  consularNote: string;
  eligibilityGates: string[];
}

export function buildI601Strategy(analysis: I601Analysis): I601Strategy {
  const a = analysis;

  let approach = '';
  const keyArguments: string[] = [];
  const supportingEvidence: string[] = [];
  const authority = a.authority;
  let pathwayNote = '';
  let hardshipNote = '';
  let discretionaryNote = '';
  const consularNote = a.consularSequencingNote;
  const eligibilityGates: string[] = [];

  if (!a.waiverAvailable && a.inadmissibilityGround !== 'unknown') {
    approach = `Inadmissibility waiver may not be available for ground: ${a.inadmissibilityGround}. Consult an immigration attorney immediately.`;
    keyArguments.push('Ground may be non-waivable — legal consultation critical');
    keyArguments.push('Evaluate alternative forms of relief (I-212, asylum, cancellation of removal)');
    return {
      approach, keyArguments, supportingEvidence: [], authority, pathwayNote: 'Waiver availability uncertain',
      hardshipNote: 'Hardship analysis may be moot if ground is non-waivable',
      discretionaryNote: 'Discretionary factors irrelevant if waiver is not available',
      consularNote, eligibilityGates,
    };
  }

  // Pathway-specific approach
  if (a.pathway === 'I-601A') {
    approach = 'File Form I-601A Provisional Unlawful Presence Waiver from within the US, demonstrating extreme hardship to qualifying relative.';
    pathwayNote = 'I-601A: Provisional waiver filed before departure. Only waives unlawful presence (INA § 212(a)(9)(B)). Requires approved immigrant visa petition and DOS fee payment.';
    if (a.i601aEligibilityFailures.length > 0) {
      eligibilityGates.push(...a.i601aEligibilityFailures);
    }
  } else if (a.pathway === 'I-601') {
    approach = `File Form I-601 Application for Waiver of Grounds of Inadmissibility, addressing the ${a.inadmissibilityGround} ground with extreme hardship evidence.`;
    pathwayNote = `I-601: Filed after inadmissibility finding. Covers ${a.inadmissibilityGround} under ${getWaiverAuthority(a.inadmissibilityGround).statute}. Qualifying relative: ${a.qualifyingRelative}.`;
  } else {
    approach = 'Determine waiver pathway (I-601 vs I-601A) based on location, inadmissibility ground, and eligibility factors.';
    pathwayNote = 'Pathway not yet determined — I-601 (consular, all grounds) vs I-601A (in US, unlawful presence only)';
  }

  // Hardship arguments
  hardshipNote = 'Extreme hardship must be demonstrated to a qualifying relative. USCIS considers all factors cumulatively per Policy Manual Vol. 9, Part B, Ch. 5.';

  if (a.hardshipFactors.includes('health')) {
    keyArguments.push('Health hardship: Qualifying relative has medical conditions requiring treatment unavailable abroad');
    supportingEvidence.push('Medical records, physician letters, treatment plans');
  }
  if (a.hardshipFactors.includes('financial')) {
    keyArguments.push('Financial hardship: Loss of income, inability to maintain standard of living, economic impact on qualifying relative');
    supportingEvidence.push('Tax returns, pay stubs, bank statements, employment records');
  }
  if (a.hardshipFactors.includes('educational')) {
    keyArguments.push('Educational hardship: Disruption of education, language barriers, inferior educational opportunities abroad');
    supportingEvidence.push('School enrollment records, transcripts, language assessment');
  }
  if (a.hardshipFactors.includes('family_caregiving')) {
    keyArguments.push('Family/caregiving hardship: Caregiving responsibilities for children, elderly parents, or disabled family members');
    supportingEvidence.push('Caregiving documentation, school records, medical dependency records');
  }
  if (a.hardshipFactors.includes('country_conditions')) {
    keyArguments.push('Country conditions hardship: Violence, political instability, lack of safety in country of relocation');
    supportingEvidence.push('State Department country reports, human rights reports, news articles, expert testimony');
  }
  if (a.hardshipFactors.includes('psychological_emotional')) {
    keyArguments.push('Psychological/emotional hardship: Mental health impact of separation or forced relocation');
    supportingEvidence.push('Mental health evaluations, counseling records, psychologist letters');
  }
  if (a.hardshipFactors.includes('special_consideration')) {
    keyArguments.push('Special consideration factors apply — USCIS gives particular weight to these designated factors');
    supportingEvidence.push('Documentation of special consideration category eligibility');
  }

  // Always include qualifying relative evidence
  if (a.qualifyingRelative !== 'no_qualifying_relative' && a.qualifyingRelative !== 'unknown') {
    supportingEvidence.push('Proof of qualifying relative status (marriage certificate, birth certificate, proof of USC/LPR status)');
  } else {
    keyArguments.push('CRITICAL: No qualifying relative identified — waiver cannot be approved without one');
  }

  // Discretionary factors
  discretionaryNote = 'I-601/I-601A adjudication is discretionary. USCIS weighs positive factors (rehabilitation, family ties, community involvement) against negative factors (nature of inadmissibility, criminal history). Approval is never guaranteed.';

  // Ground-specific arguments
  if (a.inadmissibilityGround === 'fraud_misrepresentation') {
    keyArguments.push('Address fraud/misrepresentation under INA § 212(i) — qualifying relative must be USC or LPR spouse, parent, son, or daughter');
  }
  if (a.inadmissibilityGround === 'criminal_ground') {
    keyArguments.push('Address criminal ground under INA § 212(h) — eligibility depends on offense type, conviction date, and sentence');
  }
  if (a.inadmissibilityGround === 'unlawful_presence') {
    keyArguments.push('Address unlawful presence under INA § 212(a)(9)(B)(v) — qualifying relative must be USC or LPR spouse or parent');
  }

  return {
    approach,
    keyArguments,
    supportingEvidence,
    authority,
    pathwayNote,
    hardshipNote,
    discretionaryNote,
    consularNote,
    eligibilityGates,
  };
}

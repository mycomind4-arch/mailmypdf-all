/**
 * I-751 Removal of Conditions Domain Model
 *
 * Distinct from all other workflows because:
 * - Centers on the conditional permanent residence removal-of-conditions lifecycle
 * - 90-day filing window (can only file 90 days before conditional residence expires)
 * - Joint filing vs. waiver filing (good faith marriage, extreme hardship, abuse, death)
 * - Late filing requires good cause — different from missing any other deadline
 * - Bona fide marriage evidence is the core of I-751 (different from I-130 which is initial petition)
 * - USCIS field office interview (Stokes/fraud interview possible) — not ASC, not embassy
 * - Denial leads to NTA referral to immigration court — unique downstream consequence
 * - Conditional resident holds a 2-year green card, not 10-year
 * - Form I-751 is filed with USCIS, not NVC/DOS
 * - Authority: INA § 216, 8 CFR § 216
 *
 * User journeys:
 *   "I need to file my I-751 jointly with my spouse."
 *   "I'm divorced — can I file I-751 with a waiver?"
 *   "I missed the 90-day filing window for my I-751."
 *   "My conditional green card is expiring soon."
 *   "I have an I-751 interview coming up."
 *   "I need to reschedule my I-751 interview."
 *   "I missed my I-751 interview."
 *   "USCIS is taking too long on my I-751."
 *   "USCIS denied my I-751."
 *   "I got an RFE on my I-751." (routes to RFE engine with I-751 adapter)
 *   "I got a NOID on my I-751." (routes to NOID engine with I-751 adapter)
 *
 * Reuses: Case, IntakeSession, DocumentUnderstanding, Authority, MailMyPDF, Tracking, Proof
 */

import type { LanguageContext } from './multilingual';

// ─── I-751 Event Types ────────────────────────────────────────────────────────

export type I751EventType =
  | 'joint_filing_preparation'       // Preparing to file I-751 jointly with spouse
  | 'waiver_filing_preparation'      // Preparing to file I-751 with a waiver
  | 'late_filing'                    // Missed the 90-day filing window
  | 'filing_window_warning'         // Conditional residence expiring, filing window opening/closing
  | 'interview_preparation'          // Preparing for I-751 interview at field office
  | 'interview_rescheduling'        // Need to reschedule I-751 interview
  | 'missed_interview'              // Missed the I-751 interview
  | 'evidence_deficiency'           // Evidence insufficient or missing
  | 'delayed_processing'             // I-751 processing taking too long
  | 'denial_handling'               // I-751 denied — NTA referral risk
  | 'unknown';

export type I751Urgency =
  | 'routine'          // Filing window just opening, no deadline pressure
  | 'time_sensitive'   // Filing window closing or interview approaching
  | 'critical';        // Filing window expired, missed interview, or denial

export type I751FilingType =
  | 'joint_filing'                    // Both spouses file together
  | 'waiver_good_faith_marriage'       // Divorced but marriage was bona fide
  | 'waiver_extreme_hardship'          // Extreme hardship if removed
  | 'waiver_battery_extreme_cruelty'    // Battered spouse waiver (VAWA)
  | 'waiver_death_of_spouse'            // Spouse died
  | 'not_determined';                   // Not yet determined

export type I751WaiverGround =
  | 'good_faith_marriage'
  | 'extreme_hardship'
  | 'battery_extreme_cruelty'
  | 'death_of_spouse'
  | 'none';

export type I751FilingStatus =
  | 'not_filed'              // I-751 not yet filed
  | 'in_filing_window'       // Within 90-day window before expiration
  | 'filed_pending'           // I-751 filed, awaiting decision
  | 'rfe_issued'             // USCIS issued RFE
  | 'noid_issued'            // USCIS issued NOID
  | 'interview_scheduled'    // Interview scheduled at field office
  | 'interview_completed'    // Interview completed
  | 'approved'               // I-751 approved, conditions removed
  | 'denied'                  // I-751 denied
  | 'nta_issued'              // Notice to Appear — referred to immigration court
  | 'unknown';

export type I751EvidenceType =
  | 'joint_bank_accounts'         // Joint bank accounts
  | 'joint_tax_returns'           // Jointly filed tax returns
  | 'joint_insurance'             // Joint health, auto, life insurance
  | 'joint_lease_mortgage'         // Joint lease or mortgage
  | 'utility_bills'               // Utility bills showing shared residence
  | 'children_birth_certificates' // Birth certificates of children together
  | 'photos_timeline'             // Photographs spanning the marriage period
  | 'affidavits'                   // Affidavits from family/friends
  | 'correspondence'              // Communications and correspondence
  | 'divorce_decree'              // Divorce decree (for waiver filings)
  | 'abuse_evidence'              // Evidence of battery/extreme cruelty (VAWA)
  | 'hardship_evidence'           // Evidence of extreme hardship
  | 'death_certificate'           // Death certificate of spouse
  | 'translations'                 // Certified English translations
  | 'unknown';

export type FilingWindowStatus =
  | 'before_window'    // More than 90 days before expiration
  | 'in_window'        // Within the 90-day filing window
  | 'window_expired';  // Filing window has passed

export interface I751Analysis {
  eventType: I751EventType;
  urgency: I751Urgency;
  filingType: I751FilingType;
  waiverGround: I751WaiverGround;
  filingStatus: I751FilingStatus;
  formType: string;
  receiptNumber?: string;
  conditionalResidenceExpiryDate?: string;
  daysUntilExpiry?: number;
  filingWindowStatus: FilingWindowStatus;
  inFilingWindow: boolean;
  interviewDate?: string;
  daysUntilInterview?: number;
  daysSinceInterview?: number;
  canReschedule: boolean;
  missedInterviewConsequences: string;
  evidenceStatus: I751EvidenceType[];
  recommendedAction: string;
  authority: string;
  riskLevel: 'low' | 'moderate' | 'elevated';
}

export interface I751Strategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string;
  deadlineNote: string;
  filingTypeNote: string;
  interviewNote: string;
}

// ─── USCIS Field Offices (sample — for interview routing) ─────────────────────

const FIELD_OFFICES: Record<string, { city: string; state: string; address: string }> = {
  'LAX': { city: 'Los Angeles', state: 'CA', address: '24000 Avila Beach Dr, Los Angeles, CA' },
  'NYC': { city: 'New York', state: 'NY', address: '26 Federal Plaza, New York, NY' },
  'CHI': { city: 'Chicago', state: 'IL', address: '101 W Congress Pkwy, Chicago, IL' },
  'HOU': { city: 'Houston', state: 'TX', address: '1120 North Loop W, Houston, TX' },
  'MIA': { city: 'Miami', state: 'FL', address: '15201 NW 79th Ave, Miami, FL' },
  'SFO': { city: 'San Francisco', state: 'CA', address: '444 Washington St, San Francisco, CA' },
  'DAL': { city: 'Dallas', state: 'TX', address: '8101 N Stemmons Fwy, Dallas, TX' },
  'ATL': { city: 'Atlanta', state: 'GA', address: '2150 N Druid Hills Rd, Atlanta, GA' },
  'SEA': { city: 'Seattle', state: 'WA', address: '815 Airport Way S, Seattle, WA' },
  'NEW': { city: 'Newark', state: 'NJ', address: '970 Broad St, Newark, NJ' },
};

// ─── Detection Functions ──────────────────────────────────────────────────────

export function detectI751Event(text: string): I751EventType {
  const lower = text.toLowerCase();
  if (/missed.*interview|didn.{0,3}t (go to|attend).*interview|no show.*interview|failed to attend.*interview/i.test(lower)) return 'missed_interview';
  if (/reschedule|re-schedule|cannot make.*interview|can.{0,3}t make.*interview|need to change.*interview|postpone.*interview/i.test(lower)) return 'interview_rescheduling';
  if (/denied|denial|notice to appear|nta|referred to (immigration )?court|removal proceedings/i.test(lower)) return 'denial_handling';
  if (/late|missed.*filing|missed.*window|missed.*deadline|after.*expir|past.*expir|didn.{0,3}t file/i.test(lower)) return 'late_filing';
  if (/expir|expiring|conditional.*green card.*expir|2 year.*green card.*expir|green card.*expir|filing window/i.test(lower)) return 'filing_window_warning';
  if (/evidence|insufficient|not enough|missing.*document|need.*more.*proof|bona fide.*evidence/i.test(lower)) return 'evidence_deficiency';
  if (/delay|stuck|pending|taking.*long|how long|waiting|no response|no decision/i.test(lower)) return 'delayed_processing';
  if (/prepare|interview prep|what to expect|what to bring|nervous.*interview|stokes|fraud interview/i.test(lower)) return 'interview_preparation';
  if (/waiver|divorced|death of.*spouse|spouse.*died|spouse.*passed|widow|widower|abuse|battered|hardship|good faith.*marriage/i.test(lower)) return 'waiver_filing_preparation';
  if (/file|filing|joint|both.*spouse|together.*spouse|remove.*condition/i.test(lower)) return 'joint_filing_preparation';
  if (/interview/i.test(lower)) return 'interview_preparation';
  return 'unknown';
}

export function detectUrgency(
  text: string,
  conditionalResidenceExpiryDate?: string,
  interviewDate?: string,
): I751Urgency {
  if (interviewDate) {
    const now = new Date();
    const interview = new Date(interviewDate);
    const daysUntil = Math.floor((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'critical';
    if (daysUntil <= 3) return 'critical';
    if (daysUntil <= 14) return 'time_sensitive';
  }
  if (conditionalResidenceExpiryDate) {
    const now = new Date();
    const expiry = new Date(conditionalResidenceExpiryDate);
    const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'critical';
    if (daysUntil <= 30) return 'time_sensitive';
  }
  const lower = text.toLowerCase();
  if (/missed|didn.{0,3}t go|no show|denied|denial|notice to appear|nta|immigration court|removal proceeding|tomorrow|this week|asap|immediately|emergency|expired|expiring/i.test(lower)) return 'critical';
  if (/urgent|soon|approaching|deadline|expiring|waiting.*long|taking forever/i.test(lower)) return 'time_sensitive';
  return 'routine';
}

export function detectFilingType(text: string): I751FilingType {
  const lower = text.toLowerCase();
  if (/batter|abuse|extreme cruelty|vawa/i.test(lower)) return 'waiver_battery_extreme_cruelty';
  if (/death.*spouse|spouse.*died|spouse.*passed|widow|widower/i.test(lower)) return 'waiver_death_of_spouse';
  if (/extreme hardship|hardship if.*remov|hardship if.*deport/i.test(lower)) return 'waiver_extreme_hardship';
  if (/divorc|divorced|marriage.*end|no longer.*together|separated|good faith.*marriage/i.test(lower)) return 'waiver_good_faith_marriage';
  if (/joint|both.*spouse|together.*spouse|my spouse and i|both.*filing|filing.*together|both.*together/i.test(lower)) return 'joint_filing';
  return 'not_determined';
}

export function detectWaiverGround(text: string): I751WaiverGround {
  const lower = text.toLowerCase();
  if (/batter|abuse|extreme cruelty|vawa/i.test(lower)) return 'battery_extreme_cruelty';
  if (/death.*spouse|spouse.*died|spouse.*passed|widow|widower/i.test(lower)) return 'death_of_spouse';
  if (/extreme hardship|hardship if.*remov|hardship if.*deport/i.test(lower)) return 'extreme_hardship';
  if (/divorc|divorced|good faith.*marriage|marriage.*was.*real|marriage.*bona fide/i.test(lower)) return 'good_faith_marriage';
  return 'none';
}

export function detectFilingStatus(text: string): I751FilingStatus {
  const lower = text.toLowerCase();
  if (/notice to appear|nta|removal proceeding|immigration court/i.test(lower)) return 'nta_issued';
  if (/denied|denial/i.test(lower) && !/intent to deny/i.test(lower)) return 'denied';
  if (/approved|conditions.*removed|10[- ]year.*card/i.test(lower)) return 'approved';
  if (/interview.*completed|interview.*done|interview.*over|interview.*finished/i.test(lower)) return 'interview_completed';
  if (/interview.*schedul|interview.*appoint|interview.*notice|interview.*letter/i.test(lower)) return 'interview_scheduled';
  if (/noid|notice of intent to deny/i.test(lower)) return 'noid_issued';
  if (/rfe|request for evidence/i.test(lower)) return 'rfe_issued';
  if (/filed|submitted|sent.*in|already.*filed|pending/i.test(lower)) return 'filed_pending';
  if (/need to file|want to file|file.*i-751|prepare.*filing/i.test(lower)) return 'not_filed';
  return 'unknown';
}

export function detectEvidenceTypes(text: string): I751EvidenceType[] {
  const lower = text.toLowerCase();
  const docs: I751EvidenceType[] = [];
  if (/joint.*bank|bank account.*together|shared.*account/i.test(lower)) docs.push('joint_bank_accounts');
  if (/joint.*tax|tax.*together|tax.*return.*joint/i.test(lower)) docs.push('joint_tax_returns');
  if (/insurance|health insurance|auto insurance|life insurance/i.test(lower)) docs.push('joint_insurance');
  if (/lease|mortgage|rent.*together|property.*joint/i.test(lower)) docs.push('joint_lease_mortgage');
  if (/utility|electric bill|water bill|gas bill|cable.*bill/i.test(lower)) docs.push('utility_bills');
  if (/child|children|birth certificate.*child|son.*daughter|kids/i.test(lower)) docs.push('children_birth_certificates');
  if (/photo|photograph|picture|album/i.test(lower)) docs.push('photos_timeline');
  if (/affidavit|letter.*from.*friend|letter.*from.*family|sworn statement/i.test(lower)) docs.push('affidavits');
  if (/correspondence|email|text message|letter.*between/i.test(lower)) docs.push('correspondence');
  if (/divorce|divorce decree|dissolution/i.test(lower)) docs.push('divorce_decree');
  if (/abuse|batter|police report|protection order|restraining order/i.test(lower)) docs.push('abuse_evidence');
  if (/hardship|medical condition|financial.*hardship|country.*condition/i.test(lower)) docs.push('hardship_evidence');
  if (/death certificate|death.*spouse/i.test(lower)) docs.push('death_certificate');
  if (/translation|translate.*english|certified.*translation/i.test(lower)) docs.push('translations');
  if (docs.length === 0) docs.push('unknown');
  return docs;
}

export function extractReceiptNumber(text: string): string | undefined {
  const match = text.match(/\b([A-Z]{3})\d{7,12}\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

export function extractConditionalResidenceExpiryDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  const datePatterns = [
    /\b(?:expir|conditional|green card).{0,60}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i,
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}).{0,60}(?:expir|conditional|green card)\b/i,
    /\b(?:expir|conditional).{0,60}(\w+ \d{1,2},? \d{4})\b/i,
    /\b(\w+ \d{1,2},? \d{4}).{0,60}(?:expir|conditional)\b/i,
  ];
  for (const p of datePatterns) {
    const m = lower.match(p);
    if (m && m[1]) return m[1];
  }
  return undefined;
}

export function calculateDaysUntilExpiry(expiryDate: string, currentDate?: string): number {
  const expiry = new Date(expiryDate);
  const now = currentDate ? new Date(currentDate) : new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateDaysUntilInterview(interviewDate: string, currentDate?: string): number {
  const interview = new Date(interviewDate);
  const now = currentDate ? new Date(currentDate) : new Date();
  return Math.floor((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateDaysSinceInterview(interviewDate: string, currentDate?: string): number {
  const interview = new Date(interviewDate);
  const now = currentDate ? new Date(currentDate) : new Date();
  return Math.floor((now.getTime() - interview.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateFilingWindowStatus(expiryDate: string, currentDate?: string): FilingWindowStatus {
  const daysUntil = calculateDaysUntilExpiry(expiryDate, currentDate);
  if (daysUntil > 90) return 'before_window';
  if (daysUntil >= 0) return 'in_window';
  return 'window_expired';
}

export function isInFilingWindow(expiryDate: string, currentDate?: string): boolean {
  return calculateFilingWindowStatus(expiryDate, currentDate) === 'in_window';
}

export function getFieldOffice(code: string): { city: string; state: string; address: string } | undefined {
  const office = FIELD_OFFICES[code.toUpperCase()];
  return office ? { city: office.city, state: office.state, address: office.address } : undefined;
}

export function extractFieldOfficeCode(text: string): string | undefined {
  const match = text.match(/\b(?:field office|uscis office|office)\s+(?:in|at)?\s*([A-Z]{3})\b/i);
  return match && match[1] ? match[1].toUpperCase() : undefined;
}

// ─── Analysis ──────────────────────────────────────────────────────────────────

export function analyzeI751(
  text: string,
  formType?: string,
  receiptNumber?: string,
  conditionalResidenceExpiryDate?: string,
  interviewDate?: string,
): I751Analysis {
  const eventType = detectI751Event(text);
  const urgency = detectUrgency(text, conditionalResidenceExpiryDate, interviewDate);
  const filingType = detectFilingType(text);
  const waiverGround = detectWaiverGround(text);
  const filingStatus = detectFilingStatus(text);
  const evidenceStatus = detectEvidenceTypes(text);

  let daysUntilExpiry: number | undefined;
  let filingWindowStatus: FilingWindowStatus = 'before_window';
  let inFilingWindow = false;

  if (conditionalResidenceExpiryDate) {
    daysUntilExpiry = calculateDaysUntilExpiry(conditionalResidenceExpiryDate);
    filingWindowStatus = calculateFilingWindowStatus(conditionalResidenceExpiryDate);
    inFilingWindow = filingWindowStatus === 'in_window';
  }

  let daysUntilInterview: number | undefined;
  let daysSinceInterview: number | undefined;
  if (interviewDate) {
    daysUntilInterview = calculateDaysUntilInterview(interviewDate);
    if (daysUntilInterview < 0) {
      daysSinceInterview = Math.abs(daysUntilInterview);
    }
  }

  const canReschedule = daysUntilInterview !== undefined && daysUntilInterview > 0;

  let missedInterviewConsequences = 'None — interview not missed.';
  if (eventType === 'missed_interview') {
    missedInterviewConsequences = 'Missed I-751 interview may result in automatic denial and NTA referral to immigration court under 8 CFR § 216.4(b). Request reschedule immediately.';
  }

  let recommendedAction = 'File I-751 petition to remove conditions on residence.';
  if (eventType === 'joint_filing_preparation') {
    recommendedAction = 'Prepare and file Form I-751 jointly with your spouse within the 90-day filing window.';
  } else if (eventType === 'waiver_filing_preparation') {
    recommendedAction = 'Prepare and file Form I-751 with a waiver request — document the waiver ground (good faith marriage, hardship, abuse, or death of spouse).';
  } else if (eventType === 'late_filing') {
    recommendedAction = 'File I-751 with a good-cause explanation for late filing under 8 CFR § 216.4(a)(3). Include evidence of circumstances beyond your control.';
  } else if (eventType === 'filing_window_warning') {
    recommendedAction = inFilingWindow
      ? 'You are in the 90-day filing window — file Form I-751 immediately.'
      : filingWindowStatus === 'before_window'
        ? 'Filing window not yet open — wait until 90 days before your conditional residence expires.'
        : 'Filing window has expired — file with good-cause explanation for late filing.';
  } else if (eventType === 'interview_preparation') {
    recommendedAction = 'Prepare for the I-751 interview — gather bona fide marriage evidence, review your application, and be ready for a Stokes interview if requested.';
  } else if (eventType === 'interview_rescheduling') {
    recommendedAction = 'Submit a reschedule request to the USCIS field office before the interview date — cite a qualifying reason.';
  } else if (eventType === 'missed_interview') {
    recommendedAction = 'Contact the USCIS field office immediately to explain the missed interview and request rescheduling. Failure to act may result in denial and NTA.';
  } else if (eventType === 'evidence_deficiency') {
    recommendedAction = 'Gather additional bona fide marriage evidence — joint finances, shared residence, photos, affidavits, and other documentation spanning the entire marriage.';
  } else if (eventType === 'delayed_processing') {
    recommendedAction = 'File a case inquiry with USCIS if processing exceeds normal timeframes — or consider a writ of mandamus if unreasonably delayed.';
  } else if (eventType === 'denial_handling') {
    recommendedAction = 'Consult an immigration attorney immediately — I-751 denial may lead to NTA and removal proceedings. Evaluate appeal, motion to reopen, or refiling options.';
  }

  const authority = 'INA § 216, 8 CFR § 216, USCIS I-751 Instructions, USCIS Policy Manual Volume 12';

  let riskLevel: 'low' | 'moderate' | 'elevated' = 'low';
  if (eventType === 'missed_interview' || eventType === 'denial_handling' || eventType === 'late_filing') {
    riskLevel = 'elevated';
  } else if (eventType === 'interview_rescheduling' || eventType === 'filing_window_warning' || urgency === 'time_sensitive') {
    riskLevel = 'moderate';
  }

  return {
    eventType,
    urgency,
    filingType,
    waiverGround,
    filingStatus,
    formType: formType ?? 'I-751',
    receiptNumber,
    conditionalResidenceExpiryDate,
    daysUntilExpiry,
    filingWindowStatus,
    inFilingWindow,
    interviewDate,
    daysUntilInterview,
    daysSinceInterview,
    canReschedule,
    missedInterviewConsequences,
    evidenceStatus,
    recommendedAction,
    authority,
    riskLevel,
  };
}

// ─── Strategy Generation ────────────────────────────────────────────────────────

export function buildI751Strategy(analysis: I751Analysis): I751Strategy {
  const approach = analysis.filingType.startsWith('waiver')
    ? `File I-751 with a ${analysis.waiverGround.replace(/_/g, ' ')} waiver — document the waiver ground and bona fide marriage evidence.`
    : 'File I-751 jointly with your spouse — document the bona fide marriage with comprehensive evidence spanning the entire conditional residence period.';

  const keyArguments: string[] = [];
  const supportingEvidence: string[] = [];

  if (analysis.filingType === 'joint_filing') {
    keyArguments.push('The marriage was entered in good faith and remains bona fide.');
    keyArguments.push('Both spouses are jointly filing the I-751 petition.');
    keyArguments.push('The conditional resident has maintained lawful status throughout the conditional residence period.');
    supportingEvidence.push('Joint bank account statements');
    supportingEvidence.push('Jointly filed tax returns');
    supportingEvidence.push('Joint insurance policies (health, auto, life)');
    supportingEvidence.push('Joint lease or mortgage documents');
    supportingEvidence.push('Utility bills showing shared residence');
    supportingEvidence.push('Photographs spanning the marriage period');
    supportingEvidence.push('Affidavits from family and friends');
    if (analysis.evidenceStatus.includes('children_birth_certificates')) {
      supportingEvidence.push('Birth certificates of children born to the marriage');
    }
  } else if (analysis.filingType === 'waiver_good_faith_marriage') {
    keyArguments.push('The marriage was entered in good faith, notwithstanding its dissolution.');
    keyArguments.push('The conditional resident qualifies for a good faith marriage waiver under INA § 216(c)(4)(B).');
    keyArguments.push('Evidence demonstrates the marriage was bona fide throughout the conditional residence period.');
    supportingEvidence.push('Evidence of bona fide marriage during the relationship');
    supportingEvidence.push('Divorce decree or dissolution records');
    supportingEvidence.push('Joint financial records from the marriage period');
    supportingEvidence.push('Photographs and correspondence from the relationship');
    supportingEvidence.push('Affidavits from family and friends confirming the marriage was genuine');
  } else if (analysis.filingType === 'waiver_extreme_hardship') {
    keyArguments.push('Removal from the United States would cause extreme hardship to the conditional resident.');
    keyArguments.push('The conditional resident qualifies for an extreme hardship waiver under INA § 216(c)(4)(C).');
    keyArguments.push('Hardship factors are documented and exceed the ordinary hardship of deportation.');
    supportingEvidence.push('Medical records documenting health conditions');
    supportingEvidence.push('Financial records showing economic impact of removal');
    supportingEvidence.push('Evidence of country conditions in home country');
    supportingEvidence.push('Evidence of family ties in the United States');
  } else if (analysis.filingType === 'waiver_battery_extreme_cruelty') {
    keyArguments.push('The conditional resident was battered or subjected to extreme cruelty by the U.S. citizen or LPR spouse.');
    keyArguments.push('The conditional resident qualifies for a battery/extreme cruelty waiver under INA § 216(c)(4)(A).');
    keyArguments.push('The abuse is documented and the marriage was entered in good faith.');
    supportingEvidence.push('Police reports or protection orders');
    supportingEvidence.push('Medical records documenting injuries');
    supportingEvidence.push('Affidavits from witnesses');
    supportingEvidence.push('Evidence of bona fide marriage before the abuse');
  } else if (analysis.filingType === 'waiver_death_of_spouse') {
    keyArguments.push('The conditional resident\'s spouse has died.');
    keyArguments.push('The conditional resident qualifies for a death of spouse waiver under INA § 216(c)(4)(D).');
    keyArguments.push('The marriage was bona fide at the time of the spouse\'s death.');
    supportingEvidence.push('Death certificate of spouse');
    supportingEvidence.push('Evidence of bona fide marriage during the relationship');
    supportingEvidence.push('Joint financial records from the marriage period');
  }

  if (analysis.eventType === 'late_filing') {
    keyArguments.push('Good cause exists for the late filing under 8 CFR § 216.4(a)(3).');
    supportingEvidence.push('Documentation of circumstances beyond control that prevented timely filing');
  }

  if (analysis.eventType === 'interview_preparation' || analysis.eventType === 'interview_rescheduling') {
    keyArguments.push('The bona fide nature of the marriage is supported by extensive documentation.');
    keyArguments.push('All evidence is organized and ready for USCIS review.');
  }

  if (analysis.eventType === 'missed_interview') {
    keyArguments.push('The missed interview was due to circumstances beyond control.');
    keyArguments.push('Immediate action is needed to prevent denial and NTA referral.');
  }

  if (analysis.eventType === 'denial_handling') {
    keyArguments.push('The I-751 denial should be challenged through appeal, motion to reopen, or refiling.');
    keyArguments.push('NTA referral requires immediate legal representation.');
  }

  let deadlineNote = 'No specific deadline identified.';
  if (analysis.daysUntilExpiry !== undefined) {
    if (analysis.filingWindowStatus === 'before_window') {
      deadlineNote = `Conditional residence expires in ${analysis.daysUntilExpiry} days. Filing window opens 90 days before expiration.`;
    } else if (analysis.filingWindowStatus === 'in_window') {
      deadlineNote = `Conditional residence expires in ${analysis.daysUntilExpiry} days — you are in the 90-day filing window. File immediately.`;
    } else {
      deadlineNote = `Conditional residence expired ${Math.abs(analysis.daysUntilExpiry)} days ago — filing window has passed. File with good-cause explanation.`;
    }
  }
  if (analysis.daysUntilInterview !== undefined && analysis.daysUntilInterview > 0) {
    deadlineNote += ` Interview in ${analysis.daysUntilInterview} days.`;
  }

  const filingTypeNote = analysis.filingType === 'joint_filing'
    ? 'Joint filing — both spouses must sign the I-751 petition.'
    : analysis.filingType.startsWith('waiver')
      ? `Waiver filing — ${analysis.waiverGround.replace(/_/g, ' ')} waiver. Document the waiver ground thoroughly.`
      : 'Filing type not yet determined — assess whether joint filing or waiver filing applies.';

  let interviewNote = 'No interview scheduled.';
  if (analysis.interviewDate) {
    if (analysis.daysUntilInterview !== undefined && analysis.daysUntilInterview > 0) {
      interviewNote = `Interview scheduled in ${analysis.daysUntilInterview} days. Prepare bona fide marriage evidence. Stokes interview possible.`;
    } else if (analysis.daysSinceInterview !== undefined) {
      interviewNote = `Interview was ${analysis.daysSinceInterview} days ago. Awaiting decision.`;
    }
  }
  if (analysis.eventType === 'missed_interview') {
    interviewNote = 'Interview missed — contact USCIS field office immediately to request rescheduling.';
  }

  return {
    approach,
    keyArguments,
    supportingEvidence,
    authority: analysis.authority,
    deadlineNote,
    filingTypeNote,
    interviewNote,
  };
}

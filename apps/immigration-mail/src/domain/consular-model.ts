/**
 * Consular Processing Model
 *
 * Distinct from all other workflows because:
 * - Centers on the immigrant visa (IV) lifecycle at NVC and US embassies/consulates abroad
 * - DS-260 submission, IV fee payment, and civil document upload are unique to consular processing
 * - Consular interviews differ from USCIS interviews — conducted by a consular officer at an embassy
 * - Civil document requirements (police certificates from every country lived in, original translations)
 *   are unique to consular processing and not required for adjustment of status
 * - Priority date / visa bulletin retrogression creates waiting periods unknown to USCIS workflows
 * - Medical examination by a designated panel physician (not a USCIS doctor) is required
 * - Visa issuance has a 6-month validity window — must enter the US before expiration
 * - NVC (National Visa Center) stage has its own case numbers and processing pipeline
 * - Authority: INA § 222 (visas), 9 FAM (Foreign Affairs Manual), 22 CFR § 42
 *
 * User journeys:
 *   "I need help with my DS-260 and NVC processing."
 *   "I'm preparing for my consular interview at the embassy."
 *   "I need to reschedule my visa interview at the consulate."
 *   "I missed my consular interview."
 *   "I'm missing some civil documents for my visa application."
 *   "My priority date retrogressed — what do I do?"
 *   "NVC is taking too long / my case is stuck at NVC."
 *   "My medical exam expired / I can't find a panel physician."
 *   "My visa was approved but it's about to expire — I need to travel."
 *
 * Reuses: Case, IntakeSession, DocumentUnderstanding, Authority, MailMyPDF, Tracking, Proof
 */

import type { LanguageContext } from './multilingual';

// ─── Consular Processing Event Types ─────────────────────────────────────────

export type ConsularEventType =
  | 'nvc_processing'                // DS-260, fee payment, civil document upload at NVC
  | 'interview_preparation'         // Preparing for consular interview at embassy
  | 'interview_rescheduling'        // Need to reschedule consular interview
  | 'missed_interview'              // Missed the consular interview
  | 'document_deficiency'           // Civil documents missing/incorrect
  | 'priority_date_retrogression'   // PD retrogressed, visa unavailable
  | 'delayed_processing'             // NVC or post-interview delay
  | 'medical_exam_issue'             // Medical exam problems
  | 'visa_issuance_urgency'          // Visa approved but expiring — need to enter US
  | 'unknown';

export type ConsularUrgency =
  | 'routine'           // Standard processing, no deadline pressure
  | 'time_sensitive'    // Interview approaching or visa expiration approaching
  | 'critical';         // Interview missed or visa expiring very soon

export type NVCStage =
  | 'petition_approved'       // I-130/I-140 approved, case at NVC
  | 'ds_260_submitted'         // DS-260 immigrant visa application submitted
  | 'fees_paid'                // IV fee and AOS fee paid
  | 'documents_uploaded'       // Civil documents uploaded to NVC
  | 'case_complete'            // NVC has reviewed and accepted all documents
  | 'interview_scheduled'     // Embassy has scheduled the interview
  | 'interview_completed'     // Interview conducted
  | 'visa_issued'             // Visa approved and printed in passport
  | 'visa_refused'            // Visa refused by consular officer
  | 'administrative_processing' // Under 221(g) administrative processing
  | 'unknown';

export type VisaCategory =
  | 'IR'    // Immediate Relative (spouse, parent, child of USC)
  | 'CR'    // Conditional Resident (spouse < 2 years)
  | 'F1'    // Unmarried son/daughter of USC
  | 'F2A'   // Spouse/child of LPR
  | 'F2B'   // Unmarried son/daughter of LPR
  | 'F3'    // Married son/daughter of USC
  | 'F4'    // Brother/sister of USC
  | 'EB1'   // Employment-based 1st preference
  | 'EB2'   // Employment-based 2nd preference
  | 'EB3'   // Employment-based 3rd preference
  | 'DV'    // Diversity Visa
  | 'unknown';

export type DocumentType =
  | 'police_certificate'    // Police clearance from every country lived in
  | 'birth_certificate'     // Original or certified copy with translation
  | 'marriage_certificate'  // If applicable
  | 'divorce_decree'        // If applicable
  | 'military_record'       // If applicable
  | 'court_record'           // If applicable
  | 'passport_copy'          // Valid passport bio page
  | 'translations'           // Certified English translations
  | 'financial_evidence'    // I-864 affidavit of support + supporting docs
  | 'medical_report'         // DS-3025/DS-3026 from panel physician
  | 'photographs'            // Visa-compliant photos
  | 'unknown';

export interface ConsularAnalysis {
  eventType: ConsularEventType;
  urgency: ConsularUrgency;
  nvcStage: NVCStage;
  visaCategory: VisaCategory;
  formType: string;
  nvcCaseNumber?: string;
  invoiceId?: string;
  embassy?: string;
  interviewDate?: string;
  visaExpirationDate?: string;
  priorityDate?: string;
  daysUntilInterview?: number;
  daysSinceInterview?: number;
  daysUntilVisaExpiration?: number;
  rescheduleWindowDays?: number;
  canReschedule: boolean;
  missedInterviewConsequences: string;
  documentStatus: DocumentType[];
  recommendedAction: string;
  authority: string;
  riskLevel: 'low' | 'moderate' | 'elevated';
}

export interface ConsularStrategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string;
  deadlineNote: string;
  interviewNote: string;
}

// ─── US Embassies / Consulates ───────────────────────────────────────────────

const EMBASSIES: Record<string, { city: string; country: string; address: string }> = {
  'MTM': { city: 'Manila', country: 'Philippines', address: '1201 Roxas Blvd, Manila, Philippines 1002' },
  'CDM': { city: 'Ciudad de Mexico', country: 'Mexico', address: 'Paseo de la Reforma 305, Col. Cuauhtemoc, 06500 Mexico City' },
  'NDL': { city: 'New Delhi', country: 'India', address: 'Shantipath, Chanakyapuri, New Delhi 110021' },
  'BGW': { city: 'Baghdad', country: 'Iraq', address: 'Baghdad International Zone' },
  'LND': { city: 'London', country: 'United Kingdom', address: '24 Grosvenor Square, London W1A 1AE' },
  'SGP': { city: 'Sao Paulo', country: 'Brazil', address: 'Av. das Nacoes Unidas, 14005, Sao Paulo 04794-903' },
  'HNO': { city: 'Hanoi', country: 'Vietnam', address: '7 Lang Ha, Ba Dinh District, Hanoi' },
  'LGS': { city: 'Lagos', country: 'Nigeria', address: '10 Walter Carrington Crescent, Victoria Island, Lagos' },
  'BGT': { city: 'Bogota', country: 'Colombia', address: 'Carrera 45 No. 24B-27, Bogota' },
  'GUZ': { city: 'Guangzhou', country: 'China', address: '43 Hua Jiu Lu, Zhujiang New Town, Guangzhou 510623' },
  'KRT': { city: 'Karachi', country: 'Pakistan', address: 'Abdullah Haroon Rd, Karachi' },
  'KWT': { city: 'Kuwait City', country: 'Kuwait', address: 'Al-Masjid Al-Aqsa St, Kuwait City' },
};

// ─── Detection Functions ─────────────────────────────────────────────────────

export function detectConsularEvent(text: string): ConsularEventType {
  const lower = text.toLowerCase();
  if (/missed.*interview|didn.{0,3}t (go to|attend).*interview|no show.*interview|failed to attend.*interview/i.test(lower)) return 'missed_interview';
  if (/reschedule|re-schedule|cannot make.*interview|can.{0,3}t make.*interview|need to change.*interview|postpone.*interview/i.test(lower)) return 'interview_rescheduling';
  if (/retrogress|priority date.*retrogress|visa bulletin.*not current|pd.*retrogress|visa.*unavailable|priority date.*not current/i.test(lower)) return 'priority_date_retrogression';
  if (/medical|panel physician|ds-3025|ds-3026|vaccination.*expired|medical exam.*expired/i.test(lower)) return 'medical_exam_issue';
  if (/visa.*expir|expiring.*visa|visa.*about to expire|need to travel.*before|must enter.*before/i.test(lower)) return 'visa_issuance_urgency';
  if (/police certificate|birth certificate|marriage certificate|divorce|military record|court record|translation|missing.*document|document.*missing|civil document/i.test(lower)) return 'document_deficiency';
  if (/delay|stuck|pending|taking.*long|how long|nvc.*delay|embassy.*delay|waiting/i.test(lower)) return 'delayed_processing';
  if (/ds-260|nvc|fee.*pay|affidavit of support|i-864|case complete|document.*upload|civil.*document.*upload/i.test(lower)) return 'nvc_processing';
  if (/prepare|interview prep|what to expect|what to bring|nervous.*interview|embassy.*interview|consulate.*interview/i.test(lower)) return 'interview_preparation';
  if (/interview|consular|embassy|visa.*application/i.test(lower)) return 'interview_preparation';
  return 'unknown';
}

export function detectUrgency(text: string, interviewDate?: string, visaExpirationDate?: string): ConsularUrgency {
  if (interviewDate) {
    const now = new Date();
    const interview = new Date(interviewDate);
    const daysUntil = Math.floor((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'critical';
    if (daysUntil <= 3) return 'critical';
    if (daysUntil <= 14) return 'time_sensitive';
  }
  if (visaExpirationDate) {
    const now = new Date();
    const expiry = new Date(visaExpirationDate);
    const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return 'critical';
    if (daysUntil <= 30) return 'time_sensitive';
  }

  const lower = text.toLowerCase();
  if (/missed|didn.{0,3}t go|no show|tomorrow|this week|asap|immediately|emergency|expired|expiring/i.test(lower)) return 'critical';
  if (/urgent|soon|approaching|deadline|expiring|waiting.*long|taking forever/i.test(lower)) return 'time_sensitive';
  return 'routine';
}

export function detectNVCStage(text: string): NVCStage {
  const lower = text.toLowerCase();
  if (/visa.*issued|visa.*approved|visa.*stamped|passport.*stamped/i.test(lower)) return 'visa_issued';
  if (/administrative processing|221.*g/i.test(lower)) return 'administrative_processing';
  if (/visa.*refus|visa.*denied|visa.*denial/i.test(lower)) return 'visa_refused';
  if (/interview.*completed|interview.*done|interview.*over|interview.*finished/i.test(lower)) return 'interview_completed';
  if (/interview.*schedul|interview.*appoint|interview.*notice|interview.*letter/i.test(lower)) return 'interview_scheduled';
  if (/case.*complete|case.*qualified|case.*ready|all.*document.*accepted/i.test(lower)) return 'case_complete';
  if (/document.*upload|civil.*document.*submit|upload.*nvc/i.test(lower)) return 'documents_uploaded';
  if (/fee.*paid|payment.*complete|iv fee|aos fee/i.test(lower)) return 'fees_paid';
  if (/ds-260.*submit|submit.*ds-260|ds-260.*complete|ds-260.*fill|filled.*ds-260/i.test(lower)) return 'ds_260_submitted';
  if (/petition.*approved|i-130.*approved|i-140.*approved/i.test(lower)) return 'petition_approved';
  return 'unknown';
}

export function detectVisaCategory(text: string): VisaCategory {
  const lower = text.toLowerCase();
  if (/immediate relative|ir-?\d|spouse of.*citizen|parent of.*citizen|child of.*citizen/i.test(lower)) return 'IR';
  if (/conditional|cr-?\d|spouse.*less than.*2 year|marriage.*less than 2/i.test(lower)) return 'CR';
  if (/\bf1\b|unmarried.*son.*citizen|unmarried.*daughter.*citizen/i.test(lower)) return 'F1';
  if (/f2a|spouse.*lpr|child.*lpr/i.test(lower)) return 'F2A';
  if (/f2b|unmarried.*son.*daughter.*lpr/i.test(lower)) return 'F2B';
  if (/f3|married.*son.*daughter.*citizen/i.test(lower)) return 'F3';
  if (/f4|brother.*sister.*citizen|sibling.*citizen/i.test(lower)) return 'F4';
  if (/eb-?1|extraordinary ability|multinational.*manager|outstanding.*researcher/i.test(lower)) return 'EB1';
  if (/eb-?2|advanced degree|national interest waiver/i.test(lower)) return 'EB2';
  if (/eb-?3|skilled worker|professional|other worker/i.test(lower)) return 'EB3';
  if (/diversity.*visa|dv-?\d|green card.*lottery|lottery.*visa/i.test(lower)) return 'DV';
  return 'unknown';
}

export function detectDocumentTypes(text: string): DocumentType[] {
  const lower = text.toLowerCase();
  const docs: DocumentType[] = [];
  if (/police certificate|police clearance|police record/i.test(lower)) docs.push('police_certificate');
  if (/birth certificate|birth record/i.test(lower)) docs.push('birth_certificate');
  if (/marriage certificate|marriage record/i.test(lower)) docs.push('marriage_certificate');
  if (/divorce|divorce decree|annulment/i.test(lower)) docs.push('divorce_decree');
  if (/military record|military service/i.test(lower)) docs.push('military_record');
  if (/court record|court disposition|arrest record/i.test(lower)) docs.push('court_record');
  if (/passport.*copy|passport.*page|bio.*page/i.test(lower)) docs.push('passport_copy');
  if (/translation|translate.*english|certified.*translation/i.test(lower)) docs.push('translations');
  if (/affidavit of support|i-864|financial.*evidence|income.*tax.*return|w-2|1040/i.test(lower)) docs.push('financial_evidence');
  if (/medical|ds-3025|ds-3026|vaccination.*record|panel physician/i.test(lower)) docs.push('medical_report');
  if (/photo|photograph|picture/i.test(lower)) docs.push('photographs');
  if (docs.length === 0) docs.push('unknown');
  return docs;
}

export function extractNVCCaseNumber(text: string): string | undefined {
  const match = text.match(/\b([A-Z]{3})\d{8,12}\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

export function extractInvoiceId(text: string): string | undefined {
  const match = text.match(/invoice\s*(?:id|number|no\.?)\s*(?:is|[:\s])*\s*([A-Z0-9]{6,15})/i);
  return match ? match[1].toUpperCase() : undefined;
}

export function extractEmbassyCode(text: string): string | undefined {
  const match = text.match(/\b(embassy|consulate|consular)\s+(?:of|in)?\s*([A-Z]{3})\b/i);
  if (match && match[2]) return match[2].toUpperCase();
  const match2 = text.match(/\b(embassy|consulate)\s+([A-Z]{3})\b/i);
  if (match2) return match2[2].toUpperCase();
  return undefined;
}

export function getEmbassy(code: string): { city: string; country: string; address: string } | undefined {
  const embassy = EMBASSIES[code.toUpperCase()];
  return embassy ? { city: embassy.city, country: embassy.country, address: embassy.address } : undefined;
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

export function calculateDaysUntilVisaExpiration(expirationDate: string, currentDate?: string): number {
  const expiry = new Date(expirationDate);
  const now = currentDate ? new Date(currentDate) : new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function canReschedule(eventType: ConsularEventType, daysUntilInterview?: number): boolean {
  if (eventType === 'missed_interview') return true;
  if (eventType === 'interview_rescheduling' && daysUntilInterview !== undefined) {
    return daysUntilInterview > 0;
  }
  if (eventType === 'interview_preparation' && daysUntilInterview !== undefined) {
    return daysUntilInterview > 0;
  }
  return false;
}

export function getMissedInterviewConsequences(): string {
  return 'Missing a consular interview may result in your immigrant visa case being terminated. The embassy may allow you to request a new interview, but you must act quickly and provide a good cause. If the case is terminated, your petitioner may need to refile the petition and pay the fee again. Under 22 CFR 42.63, the consular officer may terminate a registration after one year from the date of the visa interview if the applicant fails to apply for a new interview within that year.';
}

function detectFormType(text: string): string | undefined {
  if (/ds-260/i.test(text)) return 'DS-260';
  if (/ds-261/i.test(text)) return 'DS-261';
  if (/i-864/i.test(text)) return 'I-864';
  if (/i-130/i.test(text)) return 'I-130';
  if (/i-140/i.test(text)) return 'I-140';
  const match = text.match(/\b(I-\d{3}|N-\d{3}|DS-\d{3})\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

function extractInterviewDate(text: string): string | undefined {
  const patterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i,
    /\b(\d{4}-\d{2}-\d{2})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const d = new Date(m[0]);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  return undefined;
}

function extractVisaExpirationDate(text: string): string | undefined {
  const patterns = [
    /(?:visa|entry|expire|expir|valid until|must enter by).*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:visa|entry|expire|expir|valid until|must enter by).*?(\d{4}-\d{2}-\d{2})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  return undefined;
}

function extractPriorityDate(text: string): string | undefined {
  const patterns = [
    /priority date\s*(?:is|[:\s])*\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /priority date\s*(?:is|[:\s])*\s*(\d{4}-\d{2}-\d{2})/i,
    /pd[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  return undefined;
}

// ─── Consular Analysis ──────────────────────────────────────────────────────

export function analyzeConsular(
  text: string,
  formType?: string,
  nvcCaseNumber?: string,
  interviewDate?: string,
  visaExpirationDate?: string,
  currentDate?: string,
): ConsularAnalysis {
  const eventType = detectConsularEvent(text);
  const urgency = detectUrgency(text, interviewDate, visaExpirationDate);
  const nvcStage = detectNVCStage(text);
  const visaCategory = detectVisaCategory(text);
  const documentStatus = detectDocumentTypes(text);
  const detectedFormType = (formType || detectFormType(text) || 'DS-260').toUpperCase();
   
  const detectedNVC = (nvcCaseNumber || extractNVCCaseNumber(text))?.toUpperCase();
  const detectedInvoiceId = extractInvoiceId(text);
  const detectedEmbassyCode = extractEmbassyCode(text);
  const embassy = detectedEmbassyCode ? getEmbassy(detectedEmbassyCode) : undefined;
  const detectedInterviewDate = interviewDate || extractInterviewDate(text);
  const detectedVisaExpiration = visaExpirationDate || extractVisaExpirationDate(text);
  const detectedPriorityDate = extractPriorityDate(text);

  let daysUntilInterview: number | undefined;
  if (detectedInterviewDate) {
    daysUntilInterview = calculateDaysUntilInterview(detectedInterviewDate, currentDate);
  }

  let daysSinceInterview: number | undefined;
  if (detectedInterviewDate && (eventType === 'delayed_processing' || eventType === 'visa_issuance_urgency')) {
    daysSinceInterview = calculateDaysSinceInterview(detectedInterviewDate, currentDate);
  }

  let daysUntilVisaExpiration: number | undefined;
  if (detectedVisaExpiration) {
    daysUntilVisaExpiration = calculateDaysUntilVisaExpiration(detectedVisaExpiration, currentDate);
  }

  const canResch = canReschedule(eventType, daysUntilInterview);
  const consequences = getMissedInterviewConsequences();
  const rescheduleWindow = 30;

  let recommendedAction: string;
  let riskLevel: 'low' | 'moderate' | 'elevated';

  switch (eventType) {
    case 'nvc_processing':
      recommendedAction = 'Complete your NVC processing steps: (1) Submit the DS-260 immigrant visa application, (2) Pay the IV fee and Affidavit of Support fee, (3) Upload all required civil documents to the NVC portal. Ensure all documents are original or certified copies with certified English translations. Your case cannot be scheduled for interview until NVC reviews and accepts all documents (case complete).';
      riskLevel = 'low';
      break;
    case 'interview_preparation':
      recommendedAction = 'Prepare for your consular interview at the US embassy/consulate. Review your DS-260 application, bring all original civil documents with certified English translations, your passport (valid for 6+ months beyond intended travel), medical exam results in a sealed envelope, and visa-compliant photographs. The consular officer will verify your identity, review documents, and assess eligibility under INA section 212.';
      riskLevel = 'low';
      break;
    case 'interview_rescheduling':
      recommendedAction = canResch
        ? 'Contact the embassy/consulate immediately to request a reschedule. Most embassies allow reschedule requests through their online scheduling portal. Provide your NVC case number and reason for rescheduling. Submit before the interview date.'
        : 'The interview date has passed. Contact the embassy immediately to request a new interview. Under 22 CFR 42.63, your visa registration may be terminated after one year if you do not request a new interview. Act quickly.';
      riskLevel = urgency === 'critical' ? 'elevated' : 'moderate';
      break;
    case 'missed_interview':
      recommendedAction = 'Act immediately. Contact the embassy/consulate to request a new interview. Provide documentation of the emergency that prevented attendance. Under 22 CFR 42.63, your visa registration may be terminated after one year from the interview date if you fail to apply for a new interview. Missing a consular interview can lead to case termination and require petition refiling.';
      riskLevel = 'elevated';
      break;
    case 'document_deficiency':
      recommendedAction = 'Identify the specific civil document(s) you are missing. For police certificates: obtain from every country you have lived in for 6+ months since age 16. For birth certificates: obtain original or certified copy with certified English translation. For marriage/divorce: obtain from the issuing authority. Upload all documents to the NVC portal. Missing or incorrect documents will prevent your case from being completed and scheduled for interview.';
      riskLevel = 'moderate';
      break;
    case 'priority_date_retrogression':
      recommendedAction = 'Your priority date has retrogressed and is no longer current in the Visa Bulletin. Your case will remain pending at NVC until your priority date becomes current again. Monitor the monthly Visa Bulletin at travel.state.gov. When your PD becomes current, NVC will schedule your interview. No action is needed from you until then, but keep your documents current (police certificates valid for 1 year, medical exam valid for 6 months).';
      riskLevel = 'moderate';
      break;
    case 'delayed_processing':
      recommendedAction = 'Prepare a case inquiry regarding the delayed processing. If your case is at NVC, submit an inquiry through the NVC Public Inquiry Form. If the case is at the embassy, contact the consular section directly. Check the NVC processing timeframes and the embassy estimated wait times. If significantly delayed beyond posted timeframes, consider contacting your congressional representative for assistance.';
      riskLevel = 'moderate';
      break;
    case 'medical_exam_issue':
      recommendedAction = 'Your medical examination must be conducted by a designated panel physician approved by the embassy. Medical exam results (DS-3025 vaccination worksheet and DS-3026 medical history) are valid for 6 months. If your exam has expired, you will need a new one before the visa can be issued. Contact the embassy for the list of approved panel physicians in your country. Do not open the sealed medical envelope — it must remain sealed for the consular officer.';
      riskLevel = 'moderate';
      break;
    case 'visa_issuance_urgency':
      recommendedAction = `Your immigrant visa has been issued but is about to expire. Immigrant visas are typically valid for 6 months from the date of issuance (or until the medical exam expires, whichever is shorter). You must enter the United States before the visa expiration date${daysUntilVisaExpiration !== undefined ? ` — you have approximately ${daysUntilVisaExpiration} days remaining` : ''}. If you cannot travel before expiration, contact the embassy immediately to request a visa reissuance. Do not let the visa expire — you will need to restart the entire process.`;
      riskLevel = 'elevated';
      break;
    default:
      recommendedAction = 'Upload your NVC correspondence or describe your consular processing situation. We will determine the appropriate action.';
      riskLevel = 'low';
  }

  const authority = 'INA section 222 — Issuance of visas; 9 FAM (Foreign Affairs Manual) — Consular processing procedures; 22 CFR 42 — Immigrant visas; 22 CFR 42.63 — Termination of registration and revocation of visas; INA section 203 — Allocation of immigrant visas and visa bulletin';

  return {
    eventType,
    urgency,
    nvcStage,
    visaCategory,
    formType: detectedFormType,
    nvcCaseNumber: detectedNVC,
    invoiceId: detectedInvoiceId,
    embassy: embassy?.city,
    interviewDate: detectedInterviewDate,
    visaExpirationDate: detectedVisaExpiration,
    priorityDate: detectedPriorityDate,
    daysUntilInterview,
    daysSinceInterview,
    daysUntilVisaExpiration,
    rescheduleWindowDays: rescheduleWindow,
    canReschedule: canResch,
    missedInterviewConsequences: consequences,
    documentStatus,
    recommendedAction,
    authority,
    riskLevel,
  };
}

// ─── Strategy Generation ──────────────────────────────────────────────────────

export function buildConsularStrategy(analysis: ConsularAnalysis): ConsularStrategy {
  const keyArguments: string[] = [];
  const supportingEvidence: string[] = [];
  let approach = '';
  let interviewNote = '';

  switch (analysis.eventType) {
    case 'nvc_processing':
      approach = 'NVC Processing Guidance';
      keyArguments.push(
        'I am working through the National Visa Center (NVC) processing steps for my immigrant visa application.',
        'I need guidance on completing the DS-260, paying fees, and uploading civil documents.',
        analysis.nvcCaseNumber ? `My NVC case number is ${analysis.nvcCaseNumber}.` : '',
        'I want to ensure my case is completed efficiently to avoid delays in interview scheduling.',
      );
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push(
        'DS-260 Immigrant Visa Application confirmation',
        'IV Fee and Affidavit of Support fee payment receipts',
        'Affidavit of Support (Form I-864) with supporting financial evidence',
        'Civil documents: birth certificate, marriage certificate (if applicable), police certificates',
        'Certified English translations for all non-English documents',
        'Visa-compliant photographs',
      );
      interviewNote = 'NVC processing requires three steps: (1) Submit DS-260 online, (2) Pay IV fee ($325) and AOS fee ($120), (3) Upload all civil documents to the NVC portal. Only after all documents are accepted will NVC schedule your interview.';
      break;

    case 'interview_preparation':
      approach = 'Consular Interview Preparation Guide';
      keyArguments.push(
        'I am preparing for my immigrant visa interview at the US embassy/consulate.',
        analysis.embassy ? `My interview is at the US Embassy/Consulate in ${analysis.embassy}.` : '',
        'I need to know what documents to bring and what to expect at the interview.',
        'I want to ensure I am fully prepared for the consular officer questions.',
      );
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push(
        'Valid passport (valid for 6+ months beyond intended travel date)',
        'Original civil documents with certified English translations',
        'Medical examination results in sealed envelope from panel physician',
        'Visa-compliant photographs',
        'Affidavit of Support (I-864) and financial evidence',
        'Police certificates from every country lived in (age 16+)',
        'Proof of relationship to petitioner (photos, correspondence, financial ties)',
      );
      interviewNote = 'The consular interview consists of: (1) Document verification, (2) Oath taking, (3) Questions about your application, background, and relationship to petitioner, (4) Review of financial support evidence. The officer will determine visa eligibility under INA section 212.';
      break;

    case 'interview_rescheduling':
      approach = 'Consular Interview Reschedule Request';
      keyArguments.push(
        'I am unable to attend my scheduled consular interview and request a reschedule.',
        analysis.interviewDate ? `My interview is scheduled for ${analysis.interviewDate}.` : '',
        analysis.embassy ? `The interview is at the US Embassy/Consulate in ${analysis.embassy}.` : '',
        'I have a legitimate reason for needing to reschedule.',
        'I am committed to completing the immigrant visa process and will attend the rescheduled interview.',
      );
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push(
        'Documentation supporting the reason for rescheduling',
        'NVC case number and appointment confirmation',
        'Copy of the interview appointment letter',
      );
      interviewNote = analysis.canReschedule
        ? 'Contact the embassy/consulate through their scheduling portal or email to request a reschedule. Most embassies require reschedule requests before the original appointment date.'
        : 'The interview date has passed. Contact the embassy immediately. Under 22 CFR 42.63, your visa registration may be terminated after one year if you do not request a new interview.';
      break;

    case 'missed_interview':
      approach = 'Missed Consular Interview Remedy';
      keyArguments.push(
        'I missed my scheduled consular interview due to circumstances beyond my control.',
        'I am requesting a new interview as soon as possible.',
        analysis.missedInterviewConsequences,
        'I have documentation explaining why I missed the interview.',
      );
      supportingEvidence.push(
        'Documentation of the emergency or circumstance that prevented attendance',
        'Copy of the interview appointment letter',
        'Medical records, travel documents, or other evidence of the conflict',
        'Proof of timely attempt to notify the embassy (if applicable)',
      );
      interviewNote = 'Act immediately. Under 22 CFR 42.63, a consular officer may terminate your visa registration after one year from the interview date if you fail to request a new interview. Missing an interview can lead to case termination and require petition refiling.';
      break;

    case 'document_deficiency':
      approach = 'Civil Document Remediation';
      keyArguments.push(
        'I am missing or have incorrect civil documents for my immigrant visa application.',
        `The specific document(s) I need are: ${analysis.documentStatus.join(', ')}.`,
        'I need guidance on how to obtain the required documents.',
        'I understand that missing documents will prevent my case from being completed and scheduled for interview.',
      );
      supportingEvidence.push(
        'List of missing or incorrect documents',
        'Guidance on obtaining police certificates from relevant countries',
        'Certified translation services for non-English documents',
        'Evidence of attempts to obtain documents (requests, fees paid, etc.)',
      );
      interviewNote = 'Civil document requirements: Police certificates from every country you lived in for 6+ months since age 16, birth certificate (original or certified copy), marriage/divorce certificates (if applicable), court/military records (if applicable), all with certified English translations. Upload to NVC portal after DS-260 and fee payment.';
      break;

    case 'priority_date_retrogression':
      approach = 'Priority Date Retrogression Advisory';
      keyArguments.push(
        'My priority date has retrogressed and is no longer current in the Visa Bulletin.',
        analysis.priorityDate ? `My priority date is ${analysis.priorityDate}.` : '',
        'I understand my case will remain pending at NVC until my priority date becomes current again.',
        'I need guidance on what to do during the waiting period and when to expect action.',
      );
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push(
        'Copy of the current Visa Bulletin showing your category',
        'NVC case number and correspondence',
        'Evidence of priority date (I-130/I-140 approval notice)',
        'Documentation of any expiring documents (police certificates, medical exam)',
      );
      interviewNote = 'Priority date retrogression means your visa category is oversubscribed. Monitor the monthly Visa Bulletin at travel.state.gov. When your PD becomes current, NVC will schedule your interview. Keep your documents current — police certificates expire after 1 year and medical exams after 6 months.';
      break;

    case 'delayed_processing':
      approach = 'Delayed Processing Inquiry';
      keyArguments.push(
        'My consular processing case is delayed beyond normal processing times.',
        analysis.nvcStage === 'petition_approved' || analysis.nvcStage === 'ds_260_submitted' || analysis.nvcStage === 'fees_paid' || analysis.nvcStage === 'documents_uploaded'
          ? 'My case appears to be stuck at the NVC stage.'
          : 'My case is delayed at the embassy/consulate stage.',
        analysis.daysSinceInterview !== undefined && analysis.daysSinceInterview > 120
          ? `It has been ${analysis.daysSinceInterview} days since my interview with no decision.`
          : 'The processing is taking longer than the posted timeframes.',
        'I am requesting a status update and guidance on next steps.',
      );
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push(
        'NVC case number and correspondence',
        'Evidence of submitted documents and fees',
        'Processing time evidence from NVC/embassy website',
        'Prior inquiry records (if any)',
      );
      interviewNote = 'If your case is at NVC, submit an inquiry through the NVC Public Inquiry Form. If at the embassy, contact the consular section directly. If significantly delayed, consider contacting your congressional representative. Administrative processing (221(g)) can take 60-180 days and is not uncommon.';
      break;

    case 'medical_exam_issue':
      approach = 'Medical Examination Remediation';
      keyArguments.push(
        'I have a problem with my medical examination for my immigrant visa application.',
        'The medical exam must be conducted by a designated panel physician approved by the embassy.',
        'I need guidance on finding a panel physician or resolving an expired exam.',
        'I understand the medical results must be delivered in a sealed envelope to the consular officer.',
      );
      supportingEvidence.push(
        'List of approved panel physicians from the embassy',
        'Medical examination records (DS-3025 vaccination worksheet, DS-3026 medical history)',
        'Evidence of vaccination records',
        'Copy of the embassy medical examination instructions',
      );
      interviewNote = 'The medical exam must be by a panel physician designated by the embassy. Results (DS-3025/DS-3026) are valid for 6 months. The sealed medical envelope must not be opened — it must be presented sealed to the consular officer at the interview or at visa issuance. If your exam expired, you need a new one before the visa can be issued.';
      break;

    case 'visa_issuance_urgency':
      approach = 'Visa Expiration Travel Advisory';
      keyArguments.push(
        'My immigrant visa has been approved and issued, but it is about to expire.',
        analysis.visaExpirationDate ? `My visa expires on ${analysis.visaExpirationDate}.` : '',
        analysis.daysUntilVisaExpiration !== undefined && analysis.daysUntilVisaExpiration <= 30
          ? `I have approximately ${analysis.daysUntilVisaExpiration} days to enter the United States.`
          : 'I need to travel to the United States before the visa expiration date.',
        'If I cannot travel before expiration, I may need the visa reissued, which requires contacting the embassy.',
      );
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push(
        'Immigrant visa in passport (with expiration date visible)',
        'Visa issuance notice from the embassy',
        'Travel itinerary (if booked)',
        'Evidence of intent to enter the US before expiration',
      );
      interviewNote = 'Immigrant visas are typically valid for 6 months from issuance (or until the medical exam expires, whichever is shorter). You must enter the US before the expiration date. If you cannot travel in time, contact the embassy immediately to request a visa reissuance. Do not let the visa expire — you would need to restart the entire process.';
      break;

    default:
      approach = 'Consular Processing Case Assessment';
      keyArguments.push(
        'I need assistance with my consular processing case.',
        'I would like guidance on the appropriate next steps.',
      );
      supportingEvidence.push('Upload any relevant NVC correspondence, embassy notices, or documents');
      interviewNote = 'Please provide more details about your consular processing situation so we can determine the appropriate action.';
  }

  const deadlineNote = analysis.interviewDate && analysis.daysUntilInterview !== undefined && analysis.daysUntilInterview > 0
    ? `Interview is in ${analysis.daysUntilInterview} days. Action needed before the interview date.`
    : analysis.visaExpirationDate && analysis.daysUntilVisaExpiration !== undefined && analysis.daysUntilVisaExpiration > 0
      ? `Visa expires in ${analysis.daysUntilVisaExpiration} days. Must enter the US before expiration.`
      : analysis.priorityDate
        ? 'Monitor the Visa Bulletin monthly. No deadline pressure until priority date becomes current.'
        : 'No specific deadline identified — standard processing timeframe applies.';

  return {
    approach,
    keyArguments,
    supportingEvidence,
    authority: analysis.authority,
    deadlineNote,
    interviewNote,
  };
}

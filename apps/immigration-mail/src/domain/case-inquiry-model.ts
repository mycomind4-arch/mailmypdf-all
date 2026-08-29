/**
 * Case Inquiry Model
 *
 * Distinct from all response workflows because:
 * - User is PROACTIVE (no notice received — case is delayed)
 * - No RFE/NOID to respond to
 * - Different authority: USCIS processing time guidelines, not a specific regulation
 * - Different deadline: none (user-initiated)
 * - Different risk: low urgency (case is pending, not under threat of denial)
 * - Different strategy: request status, expedition, or escalation
 *
 * User journey:
 *   "My case is taking too long."
 *   "I haven't heard back from USCIS."
 *   "It's been months and no response."
 *
 * Reuses: Case, IntakeSession, DocumentUnderstanding, Authority, MailMyPDF, Tracking, Proof
 */

import type { LanguageContext } from './multilingual';

// ─── Inquiry Types ────────────────────────────────────────────────────────────

export type InquiryType =
  | 'service_request'       // Standard USCIS service request (outside normal processing time)
  | 'expedite_request'      // Request to expedite adjudication
  | 'case_status_inquiry'   // General status inquiry
  | 'congressional_inquiry' // Inquiry through a congressional representative
  | 'liaison_inquiry'       // AILA liaison inquiry (through attorney)
  | 'unknown';

export type InquiryUrgency =
  | 'routine'     // Outside normal processing time, no urgency
  | 'expedited'  // Urgent humanitarian, financial, or medical reason
  | 'critical';  // Severe hardship, aging out, deadline approaching

export type FormCategory =
  | 'family_based'     // I-130, I-485 (family)
  | 'employment_based' // I-140, I-129 (employment)
  | 'humanitarian'     // I-589 (asylum), I-601 (waiver)
  | 'naturalization'   // N-400, N-600
  | 'other'            // Any other form type
  | 'unknown';

export interface CaseInquiryAnalysis {
  inquiryType: InquiryType;
  urgency: InquiryUrgency;
  formType: string;
  formCategory: FormCategory;
  receiptNumber?: string;
  serviceCenter?: string;
  filingDate?: string;
  daysPending?: number;
  outsideProcessingTime: boolean;
  processingTimeRange?: string;
  recommendedAction: string;
  escalationPath: string;
  authority: string;
  riskLevel: 'low' | 'moderate' | 'elevated';
}

export interface CaseInquiryStrategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string;
  deadlineNote: string;
  escalationNote: string;
}

// ─── Processing Time Reference (simplified) ──────────────────────────────────

const PROCESSING_TIME_RANGES: Record<string, string> = {
  'I-130': '13–54 months (varies by service center and relationship)',
  'I-485': '8–20 months (varies by field office)',
  'I-140': '3–15 months (varies by category)',
  'I-129': '2–8 months (varies by visa category)',
  'N-400': '6–18 months (varies by field office)',
  'I-589': '6 months–several years (asylum affirmative)',
  'I-751': '12–24 months',
  'I-90': '8–12 months',
  'I-765': '2–8 months',
  'I-601': '12–30 months',
  'generic': 'Varies by form type and service center',
};

const SERVICE_CENTERS: Record<string, string> = {
  'MSC': 'Missouri Service Center (National Benefits Center)',
  'NSC': 'Nebraska Service Center',
  'TSC': 'Texas Service Center',
  'VSC': 'Vermont Service Center',
  'CSC': 'California Service Center',
  'YSC': 'Potomac Service Center',
  'LCK': 'Lockbox (Chicago)',
  'WAC': 'California Service Center (legacy)',
  'LIN': 'Nebraska Service Center (legacy)',
  'EAC': 'Vermont Service Center (legacy)',
  'SRC': 'Texas Service Center (legacy)',
};

// ─── Analysis ─────────────────────────────────────────────────────────────────

export function detectInquiryType(text: string): InquiryType {
  const lower = text.toLowerCase();
  if (/expedite|urgent|emergency|humanitarian|medical|financial hardship/i.test(lower)) return 'expedite_request';
  if (/congressional|congressman|representative|senator/i.test(lower)) return 'congressional_inquiry';
  if (/aila|attorney|liaison|counsel/i.test(lower)) return 'liaison_inquiry';
  if (/service request|outside.{0,20}processing|normal.{0,20}processing|delayed|taking too long|haven.{0,5}t heard/i.test(lower)) return 'service_request';
  if (/status|update|where|how long|when/i.test(lower)) return 'case_status_inquiry';
  return 'unknown';
}

export function detectUrgency(text: string): InquiryUrgency {
  const lower = text.toLowerCase();
  if (/aging out|age.{0,10}out|deadline| deportation|removal|life.{0,5}threatening|terminal|severe hardship/i.test(lower)) return 'critical';
  if (/urgent|expedite|emergency|medical|financial hardship|job|employment|travel/i.test(lower)) return 'expedited';
  return 'routine';
}

export function detectFormCategory(formType: string): FormCategory {
  const upper = formType.toUpperCase();
  if (/I-130|I-485|I-751/i.test(upper)) return 'family_based';
  if (/I-140|I-129|I-360|I-526/i.test(upper)) return 'employment_based';
  if (/I-589|I-601|I-601A|I-730|U-Visa|T-Visa|VAWA|I-918|I-914/i.test(upper)) return 'humanitarian';
  if (/N-400|N-336|N-470|N-600/i.test(upper)) return 'naturalization';
  return 'other';
}

export function extractReceiptNumber(text: string): string | undefined {
  // USCIS receipt numbers: 3 letters + 10 digits (e.g., MSC2190123456)
  const match = text.match(/\b([A-Z]{3})\d{10}\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

export function extractServiceCenter(receiptNumber: string): string | undefined {
  const prefix = receiptNumber.substring(0, 3).toUpperCase();
  return SERVICE_CENTERS[prefix];
}

export function getProcessingTimeRange(formType: string): string {
  return PROCESSING_TIME_RANGES[formType.toUpperCase()] || PROCESSING_TIME_RANGES['generic'];
}

export function calculateDaysPending(filingDate: string, currentDate: string): number {
  const filed = new Date(filingDate);
  const now = new Date(currentDate);
  const diffMs = now.getTime() - filed.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function detectFormType(text: string): string | undefined {
  const match = text.match(/\b(I-\d{3}|N-\d{3}|I-\d{3}[A-Z]?|I-\d{3}[A-Z]\d?)\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

// ─── Inquiry Analysis ─────────────────────────────────────────────────────────

export function analyzeInquiry(text: string, formType?: string, receiptNumber?: string, filingDate?: string, currentDate?: string): CaseInquiryAnalysis {
  const inquiryType = detectInquiryType(text);
  const urgency = detectUrgency(text);
  const detectedFormType = formType || detectFormType(text) || 'unknown';
  const formCategory = detectFormCategory(detectedFormType);
  const detectedReceipt = receiptNumber || extractReceiptNumber(text);
  const serviceCenter = detectedReceipt ? extractServiceCenter(detectedReceipt) : undefined;
  const processingTimeRange = getProcessingTimeRange(detectedFormType);

  let daysPending: number | undefined;
  let outsideProcessingTime = false;

  if (filingDate) {
    const now = currentDate || new Date().toISOString();
    daysPending = calculateDaysPending(filingDate, now);
    // Rough heuristic: if pending more than the upper bound of typical processing time
    const upperMonths = parseInt(processingTimeRange.match(/(\d+)\s*months/)?.pop() || '12');
    const upperDays = upperMonths * 30;
    outsideProcessingTime = daysPending > upperDays;
  }

  let recommendedAction: string;
  let escalationPath: string;
  let riskLevel: 'low' | 'moderate' | 'elevated';

  switch (inquiryType) {
    case 'expedite_request':
      recommendedAction = 'Prepare an expedite request letter citing the qualifying criteria (severe financial loss, urgent humanitarian, USCIS error, or nonprofit/government interest).';
      escalationPath = 'Submit expedite request to the service center handling your case. If denied, consider congressional inquiry.';
      riskLevel = urgency === 'critical' ? 'elevated' : 'moderate';
      break;
    case 'congressional_inquiry':
      recommendedAction = 'Prepare a privacy release form and case summary for your congressional representative. They will submit the inquiry on your behalf.';
      escalationPath = 'Contact your representative or senator office. They handle USCIS inquiries directly.';
      riskLevel = 'moderate';
      break;
    case 'liaison_inquiry':
      recommendedAction = 'Prepare case summary for AILA liaison submission. This must be done through an AILA member attorney.';
      escalationPath = 'Attorney submits through AILA liaison channel.';
      riskLevel = 'low';
      break;
    case 'service_request':
      recommendedAction = outsideProcessingTime
        ? 'Prepare a service request inquiry. Your case appears to be outside normal processing time.'
        : 'Your case appears to be within normal processing time. Consider waiting or file an inquiry noting specific concerns.';
      escalationPath = 'Submit e-Request online or mail written inquiry to the service center. If unresolved, escalate to congressional inquiry.';
      riskLevel = 'low';
      break;
    case 'case_status_inquiry':
      recommendedAction = 'Prepare a written case status inquiry to the service center handling your case.';
      escalationPath = 'Mail inquiry or submit online. If no response in 30 days, consider congressional inquiry.';
      riskLevel = 'low';
      break;
    default:
      recommendedAction = 'Upload your receipt notice or describe your case. We will determine the appropriate inquiry type.';
      escalationPath = 'Depends on case specifics.';
      riskLevel = 'low';
  }

  const authority = 'USCIS Policy Manual — Case Inquiries and Service Requests; 8 CFR § 103.2(b)(18) — processing time inquiries; INA § 103 (USCIS authority)';

  return {
    inquiryType,
    urgency,
    formType: detectedFormType,
    formCategory,
    receiptNumber: detectedReceipt,
    serviceCenter,
    filingDate,
    daysPending,
    outsideProcessingTime,
    processingTimeRange,
    recommendedAction,
    escalationPath,
    authority,
    riskLevel,
  };
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export function buildInquiryStrategy(analysis: CaseInquiryAnalysis): CaseInquiryStrategy {
  const keyArguments: string[] = [];
  const supportingEvidence: string[] = [];

  if (analysis.outsideProcessingTime) {
    keyArguments.push(`Case has been pending ${analysis.daysPending} days, exceeding the typical ${analysis.processingTimeRange}`);
  }

  if (analysis.inquiryType === 'expedite_request') {
    keyArguments.push('Qualifying expedite criteria: severe financial loss, urgent humanitarian, or USCIS error');
    supportingEvidence.push('Documentation supporting expedite criteria (medical, financial, employment, humanitarian)');
    supportingEvidence.push('Proof of urgent circumstances');
  }

  if (analysis.receiptNumber) {
    keyArguments.push(`Receipt number: ${analysis.receiptNumber}${analysis.serviceCenter ? ` (${analysis.serviceCenter})` : ''}`);
    supportingEvidence.push('Copy of receipt notice (I-797C)');
  }

  if (analysis.filingDate) {
    keyArguments.push(`Filed on ${analysis.filingDate}`);
    supportingEvidence.push('Copy of filing confirmation');
  }

  if (analysis.urgency === 'critical') {
    keyArguments.push('Critical urgency: severe hardship or deadline approaching');
    supportingEvidence.push('Evidence of critical circumstances');
  }

  if (keyArguments.length === 0) {
    keyArguments.push('Case is pending and no communication received from USCIS');
  }

  const deadlineNote = 'No deadline — this is a user-initiated inquiry. However, USCIS typically responds to inquiries within 30 days.';

  const escalationNote = analysis.escalationPath;

  return {
    approach: analysis.inquiryType === 'expedite_request'
      ? 'Request expedition of adjudication based on qualifying criteria'
      : 'Request status update and action on pending case',
    keyArguments,
    supportingEvidence,
    authority: analysis.authority,
    deadlineNote,
    escalationNote,
  };
}

// ─── Multilingual ────────────────────────────────────────────────────────────

export function getInquiryHeadline(lang: LanguageContext): string {
  return lang.ui === 'es'
    ? '¿Cuánto tiempo lleva su caso?'
    : 'How long has your case been pending?';
}

export function getInquiryExamples(lang: LanguageContext): string[] {
  if (lang.ui === 'es') {
    return [
      'Mi caso está tardando demasiado.',
      'No he recibido respuesta de USCIS.',
      'Han pasado meses y nada.',
      'Necesito acelerar mi caso.',
    ];
  }
  return [
    'My case is taking too long.',
    "I haven't heard back from USCIS.",
    "It's been months and nothing.",
    'I need to expedite my case.',
  ];
}

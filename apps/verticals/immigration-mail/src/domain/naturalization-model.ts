/**
 * Naturalization / Citizenship Model
 *
 * Distinct from all other workflows because:
 * - Centers on the N-400 naturalization lifecycle: interview, civics/English test,
 *   oath ceremony, and decision
 * - Interview rescheduling has specific timing windows and consequences
 * - Civics/English test readiness involves 100 civics questions + English components
 * - Oath ceremony is the final step — scheduling issues or document problems block naturalization
 * - Post-interview RFEs are distinct from pre-filing RFEs (post-interview evidence requests)
 * - Delayed decisions require case inquiry / judicial review awareness
 * - Authority: INA § 316 (naturalization requirements), 8 CFR § 316, USCIS Policy Manual Vol 12
 *
 * User journeys:
 *   "I need to prepare for my N-400 interview."
 *   "I can't make my naturalization interview — I need to reschedule."
 *   "I missed my citizenship interview."
 *   "My interview notice has the wrong information."
 *   "USCIS sent me an RFE after my naturalization interview."
 *   "My oath ceremony is delayed / I have an oath ceremony problem."
 *   "My N-400 has been pending forever after the interview."
 *   "There's a problem with my oath ceremony documents."
 *
 * Reuses: Case, IntakeSession, DocumentUnderstanding, Authority, MailMyPDF, Tracking, Proof
 */

import type { LanguageContext } from './multilingual';

// ─── Naturalization Event Types ──────────────────────────────────────────────

export type NaturalizationEventType =
  | 'interview_preparation'         // User preparing for N-400 interview
  | 'civics_test_readiness'         // User needs civics/English test prep
  | 'interview_rescheduling'        // User needs to reschedule interview
  | 'missed_interview'              // User missed the interview
  | 'interview_notice_discrepancy'  // Wrong info on interview notice
  | 'oath_ceremony_scheduling'      // Oath ceremony delayed or needs scheduling
  | 'post_interview_rfe'            // RFE received after naturalization interview
  | 'delayed_decision'              // Decision pending long after interview
  | 'oath_document_issue'           // Problem with oath ceremony documents
  | 'unknown';

export type NaturalizationUrgency =
  | 'routine'           // Standard preparation, no deadline pressure
  | 'time_sensitive'    // Interview date approaching or oath ceremony pending
  | 'critical';         // Interview missed or oath ceremony imminent

export type InterviewStatus =
  | 'scheduled'            // Interview is set and confirmed
  | 'reschedule_requested' // User has requested a reschedule
  | 'missed'               // User missed the interview
  | 'completed'           // Interview conducted, awaiting decision
  | 'oath_scheduled'      // Oath ceremony scheduled
  | 'oath_completed'      // Oath ceremony done, naturalized
  | 'denied'              // Application denied
  | 'continued'           // Interview continued (more evidence needed)
  | 'cancelled'           // USCIS cancelled the interview
  | 'unknown';

export type CivicsTestComponent =
  | 'civics'        // 100 questions, 6 asked, 6/6 or up to 10 needed to pass
  | 'reading'       // Read one of three sentences correctly
  | 'writing'       // Write one of three sentences correctly
  | 'speaking'      // Interview officer assesses English speaking ability
  | 'all';

export interface NaturalizationAnalysis {
  eventType: NaturalizationEventType;
  urgency: NaturalizationUrgency;
  interviewStatus: InterviewStatus;
  formType: string;
  receiptNumber?: string;
  interviewDate?: string;
  interviewTime?: string;
  fieldOffice?: string;
  oathDate?: string;
  oathLocation?: string;
  daysUntilInterview?: number;
  daysSinceInterview?: number;
  daysUntilOath?: number;
  rescheduleWindowDays?: number;
  canReschedule: boolean;
  missedInterviewConsequences: string;
  recommendedAction: string;
  authority: string;
  riskLevel: 'low' | 'moderate' | 'elevated';
  civicsComponents: CivicsTestComponent[];
}

export interface NaturalizationStrategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string;
  deadlineNote: string;
  interviewNote: string;
}

// ─── USCIS Field Offices ──────────────────────────────────────────────────────

const FIELD_OFFICES: Record<string, { city: string; state: string; address: string }> = {
  'LOS': { city: 'Los Angeles', state: 'CA', address: '300 N Los Angeles St, Los Angeles, CA 90012' },
  'NYC': { city: 'New York', state: 'NY', address: '26 Federal Plaza, New York, NY 10278' },
  'CHI': { city: 'Chicago', state: 'IL', address: '101 W Congress Pkwy, Chicago, IL 60605' },
  'HOU': { city: 'Houston', state: 'TX', address: '1820 Gears Rd, Houston, TX 77067' },
  'MIA': { city: 'Miami', state: 'FL', address: '8100 NW 7th Ave, Miami, FL 33150' },
  'NEW': { city: 'Newark', state: 'NJ', address: '970 Broad St, Newark, NJ 07102' },
  'SFO': { city: 'San Francisco', state: 'CA', address: '444 Washington St, San Francisco, CA 94103' },
  'ATL': { city: 'Atlanta', state: 'GA', address: '2150 Park Lake Dr, Atlanta, GA 30345' },
  'DAL': { city: 'Dallas', state: 'TX', address: '6500 Cascade Rd, Dallas, TX 75216' },
  'SEA': { city: 'Seattle', state: 'WA', address: '815 Airport Way S, Seattle, WA 98108' },
  'BOS': { city: 'Boston', state: 'MA', address: '1700 JFK Federal Bldg, Boston, MA 02203' },
  'PHI': { city: 'Philadelphia', state: 'PA', address: '1600 Callowhill St, Philadelphia, PA 19130' },
};

// ─── Detection Functions ──────────────────────────────────────────────────────

export function detectNaturalizationEvent(text: string): NaturalizationEventType {
  const lower = text.toLowerCase();
  if (/missed.*interview|didn.{0,3}t (go to|attend).*interview|no show.*interview|failed to attend.*interview/i.test(lower)) return 'missed_interview';
  if (/reschedule|re-schedule|cannot make.*interview|can.{0,3}t make.*interview|need to change.*interview|postpone.*interview/i.test(lower)) return 'interview_rescheduling';
  if (/civics|english test|reading test|writing test|speaking test|test prep|study for.*test|100 questions|naturalization test/i.test(lower)) return 'civics_test_readiness';
  if (/oath|ceremony|naturalization ceremony|oath of allegiance/i.test(lower)) {
    if (/problem|issue|wrong|incorrect|document|name|certificate/i.test(lower)) return 'oath_document_issue';
    if (/delay|haven.{0,3}t received|no oath|when.*oath|waiting.*oath/i.test(lower)) return 'oath_ceremony_scheduling';
    return 'oath_ceremony_scheduling';
  }
  if (/wrong (name|date|address|time|location)|name is wrong|incorrect.*notice|discrepancy|typo|misspell|wrong info.*interview|interview notice.*wrong/i.test(lower)) return 'interview_notice_discrepancy';
  if (/rfe.*after|request for evidence.*after|post.*interview.*rfe|after.*interview.*evidence|more evidence.*interview/i.test(lower)) return 'post_interview_rfe';
  if (/delay|pending|waiting|no decision|haven.{0,3}t heard|long time|stuck|taking forever|how long/i.test(lower)) return 'delayed_decision';
  if (/prepare|interview prep|ready for.*interview|what to expect|what to bring|nervous.*interview/i.test(lower)) return 'interview_preparation';
  if (/interview|n-400|naturalization|citizenship/i.test(lower)) return 'interview_preparation';
  return 'unknown';
}

export function detectUrgency(text: string, interviewDate?: string, oathDate?: string): NaturalizationUrgency {
  if (interviewDate) {
    const now = new Date();
    const interview = new Date(interviewDate);
    const daysUntil = Math.floor((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'critical'; // interview already passed
    if (daysUntil <= 3) return 'critical';
    if (daysUntil <= 14) return 'time_sensitive';
  }
  if (oathDate) {
    const now = new Date();
    const oath = new Date(oathDate);
    const daysUntil = Math.floor((oath.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) return 'critical';
    if (daysUntil <= 14) return 'time_sensitive';
  }

  const lower = text.toLowerCase();
  if (/missed|didn.{0,3}t go|no show|tomorrow|this week|asap|immediately|emergency|denied/i.test(lower)) return 'critical';
  if (/urgent|soon|approaching|deadline|expiring|waiting.*long|taking forever/i.test(lower)) return 'time_sensitive';
  return 'routine';
}

export function detectInterviewStatus(eventType: NaturalizationEventType): InterviewStatus {
  switch (eventType) {
    case 'interview_preparation': return 'scheduled';
    case 'civics_test_readiness': return 'scheduled';
    case 'interview_rescheduling': return 'reschedule_requested';
    case 'missed_interview': return 'missed';
    case 'interview_notice_discrepancy': return 'scheduled';
    case 'oath_ceremony_scheduling': return 'oath_scheduled';
    case 'post_interview_rfe': return 'continued';
    case 'delayed_decision': return 'completed';
    case 'oath_document_issue': return 'oath_scheduled';
    default: return 'unknown';
  }
}

export function detectCivicsComponents(text: string): CivicsTestComponent[] {
  const lower = text.toLowerCase();
  const components: CivicsTestComponent[] = [];
  if (/civics|100 questions|government|history|constitution/i.test(lower)) components.push('civics');
  if (/reading|read.*sentence/i.test(lower)) components.push('reading');
  if (/writing|write.*sentence/i.test(lower)) components.push('writing');
  if (/speaking|speak.*english|conversation.*english/i.test(lower)) components.push('speaking');
  if (/english test|all.*components|full test|test readiness/i.test(lower)) components.push('all');
  if (components.length === 0) components.push('all');
  return components;
}

export function extractReceiptNumber(text: string): string | undefined {
  const match = text.match(/\b([A-Z]{3})\d{10}\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

export function extractFieldOfficeCode(text: string): string | undefined {
  const match = text.match(/\b(field office|FO|office)[:\s]*([A-Z]{3})\b/i);
  if (match && match[2]) return match[2].toUpperCase();
  // Also try standalone 3-letter codes near "field office" or USCIS
  const match2 = text.match(/\bUSCIS\s+([A-Z]{3})\b/i);
  if (match2) return match2[1].toUpperCase();
  return undefined;
}

export function getFieldOffice(code: string): { city: string; state: string; address: string } | undefined {
  const office = FIELD_OFFICES[code.toUpperCase()];
  return office ? { city: office.city, state: office.state, address: office.address } : undefined;
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

export function calculateDaysUntilOath(oathDate: string, currentDate?: string): number {
  const oath = new Date(oathDate);
  const now = currentDate ? new Date(currentDate) : new Date();
  return Math.floor((oath.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function canReschedule(eventType: NaturalizationEventType, daysUntilInterview?: number): boolean {
  if (eventType === 'missed_interview') return true; // can request reschedule after missing
  if (eventType === 'interview_rescheduling' && daysUntilInterview !== undefined) {
    return daysUntilInterview > 0; // can reschedule if interview hasn't passed
  }
  if (eventType === 'interview_preparation' && daysUntilInterview !== undefined) {
    return daysUntilInterview > 0;
  }
  if (eventType === 'interview_notice_discrepancy') return true;
  return false;
}

export function getMissedInterviewConsequences(): string {
  return 'Missing a naturalization interview may result in your N-400 application being denied. USCIS may allow you to request a reschedule, but you must act quickly and provide a good cause. If denied, you may need to refile and pay the fee again.';
}

function detectFormType(text: string): string | undefined {
  if (/n-400|n400/i.test(text)) return 'N-400';
  if (/n-600|n600/i.test(text)) return 'N-600';
  const match = text.match(/\b(I-\d{3}|N-\d{3}|I-\d{3}[A-Z]?|I-\d{3}[A-Z]\d?)\b/i);
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

function extractInterviewTime(text: string): string | undefined {
  const match = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM)?)\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

function extractOathDate(text: string): string | undefined {
  const patterns = [
    /oath.*?(?:date|on|scheduled).*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /oath.*?(?:date|on|scheduled).*?(\d{4}-\d{2}-\d{2})/i,
    /ceremony.*?(?:date|on|scheduled).*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
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

// ─── Naturalization Analysis ──────────────────────────────────────────────────

export function analyzeNaturalization(
  text: string,
  formType?: string,
  receiptNumber?: string,
  interviewDate?: string,
  oathDate?: string,
  currentDate?: string,
): NaturalizationAnalysis {
  const eventType = detectNaturalizationEvent(text);
  const urgency = detectUrgency(text, interviewDate, oathDate);
  const interviewStatus = detectInterviewStatus(eventType);
  const civicsComponents = detectCivicsComponents(text);
  const rawFormType = formType || detectFormType(text);
  const detectedFormType = rawFormType ? rawFormType.toUpperCase() : 'N-400';
  const detectedReceipt = (receiptNumber || extractReceiptNumber(text))?.toUpperCase();
  const detectedFieldOfficeCode = extractFieldOfficeCode(text);
  const fieldOffice = detectedFieldOfficeCode ? getFieldOffice(detectedFieldOfficeCode) : undefined;
  const detectedInterviewDate = interviewDate || extractInterviewDate(text);
  const detectedInterviewTime = extractInterviewTime(text);
  const detectedOathDate = oathDate || extractOathDate(text);
  const detectedOathLocation = fieldOffice?.city;

  let daysUntilInterview: number | undefined;
  if (detectedInterviewDate) {
    daysUntilInterview = calculateDaysUntilInterview(detectedInterviewDate, currentDate);
  }

  let daysSinceInterview: number | undefined;
  if (detectedInterviewDate && eventType === 'delayed_decision') {
    daysSinceInterview = calculateDaysSinceInterview(detectedInterviewDate, currentDate);
  }

  let daysUntilOath: number | undefined;
  if (detectedOathDate) {
    daysUntilOath = calculateDaysUntilOath(detectedOathDate, currentDate);
  }

  const canResch = canReschedule(eventType, daysUntilInterview);
  const consequences = getMissedInterviewConsequences();
  const rescheduleWindow = 30; // USCIS typically allows reschedule requests

  let recommendedAction: string;
  let riskLevel: 'low' | 'moderate' | 'elevated';

  switch (eventType) {
    case 'interview_preparation':
      recommendedAction = 'Prepare for your N-400 interview. Review your application, gather required documents (green card, passport, travel records, tax returns, child support evidence), and study for the civics and English tests. Bring all documents to the interview.';
      riskLevel = 'low';
      break;
    case 'civics_test_readiness':
      recommendedAction = 'Study for the naturalization test. The civics test covers 100 questions (USCIS will ask up to 10, you must answer 6 correctly). The English test has reading, writing, and speaking components. Use USCIS study materials and practice tests.';
      riskLevel = 'low';
      break;
    case 'interview_rescheduling':
      recommendedAction = canResch
        ? 'Prepare a reschedule request letter explaining the reason for rescheduling. Submit to the USCIS field office before the interview date. Include your receipt number and a proposed alternative date if possible.'
        : 'The interview date has passed. Prepare a request for a new interview explaining why you missed the original. Act quickly to avoid denial.';
      riskLevel = urgency === 'critical' ? 'elevated' : 'moderate';
      break;
    case 'missed_interview':
      recommendedAction = 'Act immediately. Prepare a letter to USCIS explaining the missed interview and requesting a new one. Include evidence of the reason (medical, emergency, etc.). Missing an interview can lead to N-400 denial.';
      riskLevel = 'elevated';
      break;
    case 'interview_notice_discrepancy':
      recommendedAction = 'Prepare a letter identifying the discrepancy on your interview notice (wrong name, date, time, location) and requesting a corrected notice. Do not attend the interview with incorrect information.';
      riskLevel = 'moderate';
      break;
    case 'oath_ceremony_scheduling':
      recommendedAction = 'Prepare a case inquiry regarding the delayed oath ceremony. If your interview was completed and approved, the oath ceremony should be scheduled within 1-3 months. Request status update from the field office.';
      riskLevel = 'moderate';
      break;
    case 'post_interview_rfe':
      recommendedAction = 'Respond to the post-interview RFE promptly. Gather the requested evidence and prepare a cover letter. The deadline is typically 30-90 days from the RFE notice.';
      riskLevel = 'moderate';
      break;
    case 'delayed_decision':
      recommendedAction = 'Prepare a case inquiry regarding the delayed decision. If it has been more than 120 days since the interview, you may be eligible to file a writ of mandamus. Check processing times and submit a service request first.';
      riskLevel = 'moderate';
      break;
    case 'oath_document_issue':
      recommendedAction = 'Prepare a letter addressing the oath ceremony document problem (wrong name on Naturalization Certificate, incorrect date of birth, missing certificate, damaged certificate). Request correction or replacement from USCIS.';
      riskLevel = 'moderate';
      break;
    default:
      recommendedAction = 'Upload your interview notice or describe your naturalization situation. We will determine the appropriate action.';
      riskLevel = 'low';
  }

  const authority = 'INA § 316 — Naturalization requirements; 8 CFR § 316 — Naturalization regulations; USCIS Policy Manual Volume 12 — Citizenship and Naturalization; INA § 336 — Judicial review of naturalization denials';

  return {
    eventType,
    urgency,
    interviewStatus,
    formType: detectedFormType,
    receiptNumber: detectedReceipt,
    interviewDate: detectedInterviewDate,
    interviewTime: detectedInterviewTime,
    fieldOffice: fieldOffice?.city,
    oathDate: detectedOathDate,
    oathLocation: detectedOathLocation,
    daysUntilInterview,
    daysSinceInterview,
    daysUntilOath,
    rescheduleWindowDays: rescheduleWindow,
    canReschedule: canResch,
    missedInterviewConsequences: consequences,
    recommendedAction,
    authority,
    riskLevel,
    civicsComponents,
  };
}

// ─── Strategy Generation ──────────────────────────────────────────────────────

export function buildNaturalizationStrategy(analysis: NaturalizationAnalysis): NaturalizationStrategy {
  const keyArguments: string[] = [];
  const supportingEvidence: string[] = [];
  let approach = '';
  let interviewNote = '';

  switch (analysis.eventType) {
    case 'interview_preparation':
      approach = 'Interview Preparation Guide';
      keyArguments.push(
        'I am preparing for my N-400 naturalization interview.',
        'I need to confirm what documents to bring and what to expect.',
        'I want to ensure I am ready for the civics and English test components.',
      );
      supportingEvidence.push(
        'Permanent Resident Card (Green Card)',
        'Valid passport and travel documents',
        'Tax returns for the past 5 years (or 3 years if married to US citizen)',
        'Evidence of continuous residence and physical presence',
        'Child support payment evidence (if applicable)',
        'Marriage certificate and spouse documents (if applying under 3-year rule)',
        'Selective Service registration evidence (if applicable)',
        'Arrest records / court dispositions (if applicable)',
      );
      interviewNote = 'The interview consists of: (1) review of your N-400 application, (2) English test (reading, writing, speaking), (3) civics test (up to 10 questions from 100, must answer 6 correctly).';
      break;

    case 'civics_test_readiness':
      approach = 'Civics and English Test Preparation';
      keyArguments.push(
        'I need to prepare for the naturalization civics and English tests.',
        `I need to study the ${analysis.civicsComponents.join(', ')} component(s).`,
        'I want to know what to study and how to prepare effectively.',
      );
      supportingEvidence.push(
        'USCIS Civics Test Study Materials (100 official questions)',
        'USCIS English reading and writing vocabulary lists',
        'Practice test resources',
        'English speaking practice materials',
      );
      interviewNote = 'The civics test: USCIS asks up to 10 questions from the 100-question list. You must answer 6 correctly to pass. The English test has three parts: reading (read one of three sentences), writing (write one of three sentences), and speaking (assessed during interview).';
      break;

    case 'interview_rescheduling':
      approach = 'Interview Reschedule Request';
      keyArguments.push(
        'I am unable to attend my scheduled naturalization interview and request a reschedule.',
        analysis.interviewDate ? `My interview is scheduled for ${analysis.interviewDate}.` : '',
        'I have a legitimate reason for needing to reschedule.',
        'I am committed to completing the naturalization process and will attend the rescheduled interview.',
      );
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push(
        'Documentation supporting the reason for rescheduling (medical, travel, emergency, etc.)',
        'Copy of the original interview notice (I-797C)',
        'Receipt number and application details',
      );
      interviewNote = analysis.canReschedule
        ? 'Submit the reschedule request before the interview date. USCIS typically allows reschedule requests for good cause.'
        : 'The interview date has passed. Request a new interview as soon as possible to avoid N-400 denial.';
      break;

    case 'missed_interview':
      approach = 'Missed Interview Remedy';
      keyArguments.push(
        'I missed my scheduled naturalization interview due to circumstances beyond my control.',
        'I am requesting a new interview as soon as possible.',
        analysis.missedInterviewConsequences,
        'I have documentation explaining why I missed the interview.',
      );
      supportingEvidence.push(
        'Documentation of the emergency or circumstance that prevented attendance',
        'Copy of the original interview notice (I-797C)',
        'Any medical records, travel documents, or other evidence of the conflict',
        'Proof of timely attempt to notify USCIS (if applicable)',
      );
      interviewNote = 'Act immediately. Missing a naturalization interview can lead to N-400 denial. USCIS may reschedule if good cause is shown.';
      break;

    case 'interview_notice_discrepancy':
      approach = 'Interview Notice Correction Request';
      keyArguments.push(
        'There is a discrepancy on my naturalization interview notice.',
        'The incorrect information needs to be corrected before I attend the interview.',
        'I want to ensure the interview proceeds smoothly with accurate information.',
      );
      supportingEvidence.push(
        'Copy of the interview notice with the discrepancy',
        'Evidence of the correct information (passport, green card, court documents)',
        'Receipt number and application details',
      );
      interviewNote = 'Do not attend the interview with incorrect information on the notice. Request a correction before the interview date.';
      break;

    case 'oath_ceremony_scheduling':
      approach = 'Oath Ceremony Inquiry';
      keyArguments.push(
        'My naturalization interview was completed, but I have not received an oath ceremony notice.',
        'I am requesting a status update on my oath ceremony scheduling.',
        analysis.daysSinceInterview !== undefined && analysis.daysSinceInterview > 120
          ? 'It has been over 120 days since my interview — I may need to consider a writ of mandamus.'
          : 'I would like to know when to expect the oath ceremony notice.',
      );
      supportingEvidence.push(
        'Copy of interview completion notice (if any)',
        'Interview approval confirmation (if received)',
        'Receipt number and application details',
        'Processing time evidence from USCIS website',
      );
      interviewNote = 'Oath ceremonies are typically scheduled 1-3 months after interview approval. If delayed significantly, file a case inquiry. After 120 days, consider a writ of mandamus.';
      break;

    case 'post_interview_rfe':
      approach = 'Post-Interview RFE Response';
      keyArguments.push(
        'I received a Request for Evidence after my naturalization interview.',
        'I am preparing a response with the requested documentation.',
        'I understand the deadline to respond and will submit before it expires.',
      );
      supportingEvidence.push(
        'The RFE notice from USCIS',
        'All documents specifically requested in the RFE',
        'Cover letter organizing and explaining the evidence',
        'Receipt number and application details',
      );
      interviewNote = 'Post-interview RFEs typically give 30-90 days to respond. Respond promptly and include all requested evidence. Missing the deadline may result in denial.';
      break;

    case 'delayed_decision':
      approach = 'Delayed Naturalization Decision Inquiry';
      keyArguments.push(
        'My naturalization interview was completed, but I have not received a decision.',
        analysis.daysSinceInterview !== undefined && analysis.daysSinceInterview > 120
          ? `It has been ${analysis.daysSinceInterview} days since my interview — exceeding the 120-day statutory period.`
          : 'The decision is taking longer than expected.',
        analysis.daysSinceInterview !== undefined && analysis.daysSinceInterview > 120
          ? 'I may be eligible to file a writ of mandamus under INA § 336(b) to compel a decision.'
          : 'I am requesting a status update from USCIS.',
      );
      supportingEvidence.push(
        'Interview completion documentation',
        'Receipt number and application details',
        'Processing time evidence from USCIS website',
        'Prior case inquiry records (if any)',
        analysis.daysSinceInterview !== undefined && analysis.daysSinceInterview > 120
          ? 'Documentation supporting mandamus eligibility'
          : '',
      );
      while (supportingEvidence[supportingEvidence.length - 1] === '') supportingEvidence.pop();
      interviewNote = 'Under INA § 336(b), if USCIS does not make a decision within 120 days after the interview, you may file a petition for a writ of mandamus in federal court. First exhaust administrative remedies with a service request.';
      break;

    case 'oath_document_issue':
      approach = 'Oath Ceremony Document Correction';
      keyArguments.push(
        'There is a problem with my oath ceremony document(s) or Naturalization Certificate.',
        'I need the incorrect information corrected or a replacement issued.',
        'The error is not my fault — it appears to be a USCIS processing error.',
      );
      supportingEvidence.push(
        'The Naturalization Certificate with the error',
        'Copy of the oath ceremony notice',
        'Evidence of the correct information (passport, green card, court documents)',
        'Form N-565 (Application for Replacement Naturalization/Citizenship Document) if replacement needed',
      );
      interviewNote = 'To correct a Naturalization Certificate, file Form N-565 with USCIS. If the error was USCIS\'s fault, there is no filing fee. If the error was your fault, the standard fee applies.';
      break;

    default:
      approach = 'Naturalization Case Assessment';
      keyArguments.push(
        'I need assistance with my naturalization case.',
        'I would like guidance on the appropriate next steps.',
      );
      supportingEvidence.push('Upload any relevant USCIS notices or documents');
      interviewNote = 'Please provide more details about your naturalization situation so we can determine the appropriate action.';
  }

  const deadlineNote = analysis.interviewDate && analysis.daysUntilInterview !== undefined && analysis.daysUntilInterview > 0
    ? `Interview is in ${analysis.daysUntilInterview} days. Action needed before the interview date.`
    : analysis.oathDate && analysis.daysUntilOath !== undefined && analysis.daysUntilOath > 0
    ? `Oath ceremony is in ${analysis.daysUntilOath} days. Ensure all documents are ready.`
    : 'No specific deadline identified, but prompt action is recommended.';

  return {
    approach,
    keyArguments,
    supportingEvidence,
    authority: analysis.authority,
    deadlineNote,
    interviewNote,
  };
}

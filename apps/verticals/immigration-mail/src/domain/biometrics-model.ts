/**
 * Biometrics Scheduling Model
 *
 * Distinct from all other workflows because:
 * - Triggered by an ASC appointment notice (I-797C Biometrics Appointment Notice)
 * - Involves physical appointment logistics (location, scheduling, attendance)
 * - Reschedule requests have strict timing windows (must reschedule before appointment)
 * - Missed appointments have consequences (potential denial, re-filing fees)
 * - Different authority: 8 CFR § 103.2(b)(9), USCIS biometrics regulations
 * - Different deadline: appointment date (not a response deadline from RFE/NOID)
 * - Different strategy: reschedule, attend, resolve location issues, or address missed appointment
 *
 * User journey:
 *   "I can't make my biometrics appointment."
 *   "I missed my fingerprint appointment — what do I do?"
 *   "My ASC is too far away."
 *   "My biometrics notice has the wrong information."
 *   "USCIS says my fingerprints were rejected."
 *
 * Reuses: Case, IntakeSession, DocumentUnderstanding, Authority, MailMyPDF, Tracking, Proof
 */

import type { LanguageContext } from './multilingual';

// ─── Biometrics Event Types ───────────────────────────────────────────────────

export type BiometricsEventType =
  | 'appointment_scheduled'   // I-797C received, appointment is set
  | 'reschedule_request'     // User needs to reschedule
  | 'missed_appointment'     // User missed the appointment
  | 'asc_location_problem'   // ASC is too far, inaccessible, or closed
  | 'notice_discrepancy'      // Name, DOB, or other info wrong on the notice
  | 'biometrics_rejected'     // USCIS rejected fingerprints/photos
  | 'biometrics_reuse'        // USCIS reusing prior biometrics
  | 'no_notice_received'      // Case filed but no biometrics notice received
  | 'unknown';

export type BiometricsUrgency =
  | 'routine'     // Standard reschedule, no deadline pressure
  | 'time_sensitive' // Appointment date is approaching
  | 'critical';    // Appointment is imminent or already missed

export type AppointmentStatus =
  | 'scheduled'           // Appointment is set and confirmed
  | 'reschedule_requested' // User has requested a reschedule
  | 'missed'               // User missed the appointment
  | 'completed'             // Biometrics were taken successfully
  | 'rejected'              // Biometrics were taken but rejected by FBI/USCIS
  | 'reused'                // Prior biometrics reused, no appointment needed
  | 'cancelled'             // USCIS cancelled the appointment
  | 'unknown';

export interface BiometricsAnalysis {
  eventType: BiometricsEventType;
  urgency: BiometricsUrgency;
  appointmentStatus: AppointmentStatus;
  formType: string;
  receiptNumber?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  ascLocation?: string;
  ascCode?: string;
  daysUntilAppointment?: number;
  rescheduleWindowDays?: number;
  canReschedule: boolean;
  missedAppointmentConsequences: string;
  recommendedAction: string;
  authority: string;
  riskLevel: 'low' | 'moderate' | 'elevated';
}

export interface BiometricsStrategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string;
  deadlineNote: string;
  rescheduleNote: string;
}

// ─── ASC Location Reference ─────────────────────────────────────────────────

const ASC_LOCATIONS: Record<string, { code: string; city: string; state: string; address: string }> = {
  'ASC01': { code: 'ASC01', city: 'New York', state: 'NY', address: '201 Varick St, New York, NY 10014' },
  'ASC02': { code: 'ASC02', city: 'Los Angeles', state: 'CA', address: '300 N Los Angeles St, Los Angeles, CA 90012' },
  'ASC03': { code: 'ASC03', city: 'Chicago', state: 'IL', address: '101 W Congress Pkwy, Chicago, IL 60605' },
  'ASC04': { code: 'ASC04', city: 'Houston', state: 'TX', address: '2505 S Gessner Rd, Houston, TX 77063' },
  'ASC05': { code: 'ASC05', city: 'Miami', state: 'FL', address: '6901 NW 77th Ct, Miami, FL 33166' },
  'ASC06': { code: 'ASC06', city: 'Newark', state: 'NJ', address: '970 Broad St, Newark, NJ 07102' },
  'ASC07': { code: 'ASC07', city: 'San Francisco', state: 'CA', address: '444 Washington St, San Francisco, CA 94103' },
  'ASC08': { code: 'ASC08', city: 'Atlanta', state: 'GA', address: '2150 Park Lake Dr, Atlanta, GA 30345' },
  'ASC09': { code: 'ASC09', city: 'Dallas', state: 'TX', address: '8101 N Stemmons Fwy, Dallas, TX 75247' },
  'ASC10': { code: 'ASC10', city: 'Seattle', state: 'WA', address: '815 Airport Way S, Seattle, WA 98108' },
};

// ─── Detection Functions ──────────────────────────────────────────────────────

export function detectBiometricsEvent(text: string): BiometricsEventType {
  const lower = text.toLowerCase();
  // Check specific event types before the generic appointment pattern
  if (/missed|didn.{0,3}t go|didn.{0,3}t show|failed to attend|no show/i.test(lower)) return 'missed_appointment';
  if (/reschedule|re-schedule|cannot make|can.{0,3}t make|need to change|change my appointment/i.test(lower)) return 'reschedule_request';
  if (/wrong (name|date of birth|address)|name is wrong|incorrect|discrepancy|typo|misspell|wrong info/i.test(lower)) return 'notice_discrepancy';
  if (/reject|poor quality|smudged|unreadable|couldn.{0,3}t take|failed fingerprint/i.test(lower)) return 'biometrics_rejected';
  if (/reuse|re-use|already taken|prior biometrics|previous fingerprint/i.test(lower)) return 'biometrics_reuse';
  if (/no notice|haven.{0,3}t received|no biometrics|no appointment|no fingerprint/i.test(lower)) return 'no_notice_received';
  if (/too far|different location|closer|wrong location|accessib|ADA|disability|closed|moved/i.test(lower)) return 'asc_location_problem';
  if (/appointment|biometrics|fingerprint|ASC/i.test(lower)) return 'appointment_scheduled';
  return 'unknown';
}

export function detectUrgency(text: string, appointmentDate?: string): BiometricsUrgency {
  if (appointmentDate) {
    const now = new Date();
    const appt = new Date(appointmentDate);
    const daysUntil = Math.floor((appt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'critical'; // already missed
    if (daysUntil <= 3) return 'critical'; // imminent
    if (daysUntil <= 14) return 'time_sensitive';
  }

  const lower = text.toLowerCase();
  if (/missed|didn.{0,3}t go|no show|tomorrow|this week|asap|immediately|emergency/i.test(lower)) return 'critical';
  if (/urgent|soon|approaching|deadline|expiring/i.test(lower)) return 'time_sensitive';
  return 'routine';
}

export function detectAppointmentStatus(eventType: BiometricsEventType): AppointmentStatus {
  switch (eventType) {
    case 'appointment_scheduled': return 'scheduled';
    case 'reschedule_request': return 'reschedule_requested';
    case 'missed_appointment': return 'missed';
    case 'biometrics_rejected': return 'rejected';
    case 'biometrics_reuse': return 'reused';
    case 'asc_location_problem': return 'scheduled';
    case 'notice_discrepancy': return 'scheduled';
    case 'no_notice_received': return 'unknown';
    default: return 'unknown';
  }
}

export function extractReceiptNumber(text: string): string | undefined {
  const match = text.match(/\b([A-Z]{3})\d{10}\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

export function extractAscCode(text: string): string | undefined {
  const match = text.match(/\bASC\s*(\d{2,3})\b/i);
  return match ? `ASC${match[1].padStart(2, '0')}` : undefined;
}

export function getAscLocation(code: string): { city: string; state: string; address: string } | undefined {
  const loc = ASC_LOCATIONS[code.toUpperCase()];
  return loc ? { city: loc.city, state: loc.state, address: loc.address } : undefined;
}

export function calculateDaysUntilAppointment(appointmentDate: string, currentDate?: string): number {
  const appt = new Date(appointmentDate);
  const now = currentDate ? new Date(currentDate) : new Date();
  return Math.floor((appt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function canReschedule(eventType: BiometricsEventType, daysUntilAppointment?: number): boolean {
  if (eventType === 'missed_appointment') return true; // can request reschedule after missing
  if (eventType === 'appointment_scheduled' && daysUntilAppointment !== undefined) {
    return daysUntilAppointment > 0; // can reschedule if appointment hasn't passed
  }
  if (eventType === 'reschedule_request') return true;
  if (eventType === 'asc_location_problem') return true;
  return false;
}

export function getMissedAppointmentConsequences(formType: string): string {
  const lower = formType.toLowerCase();
  if (/i-485|i-751|n-400|n-600/i.test(lower)) {
    return 'Missing a biometrics appointment may result in your application being deemed abandoned and denied. You must act quickly to request a reschedule or walk-in.';
  }
  if (/i-130|i-129/i.test(lower)) {
    return 'Missing a biometrics appointment may delay processing of the petition. USCIS may send a new notice, but delays of weeks or months are common.';
  }
  if (/i-90|i-765/i.test(lower)) {
    return 'Missing a biometrics appointment may result in application denial. You may need to refile and pay the fee again.';
  }
  return 'Missing a biometrics appointment may result in application abandonment or denial. Contact USCIS immediately to request a reschedule.';
}

function detectFormType(text: string): string | undefined {
  const match = text.match(/\b(I-\d{3}|N-\d{3}|I-\d{3}[A-Z]?|I-\d{3}[A-Z]\d?)\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

function extractAppointmentDate(text: string): string | undefined {
  // Try various date formats: MM/DD/YYYY, Month DD, YYYY, YYYY-MM-DD
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

function extractAppointmentTime(text: string): string | undefined {
  const match = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM)?)\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

// ─── Biometrics Analysis ──────────────────────────────────────────────────────

export function analyzeBiometrics(
  text: string,
  formType?: string,
  receiptNumber?: string,
  appointmentDate?: string,
  currentDate?: string,
): BiometricsAnalysis {
  const eventType = detectBiometricsEvent(text);
  const urgency = detectUrgency(text, appointmentDate);
  const appointmentStatus = detectAppointmentStatus(eventType);
  const rawFormType = formType || detectFormType(text);
  const detectedFormType = rawFormType ? rawFormType.toUpperCase() : 'unknown';
  const detectedReceipt = (receiptNumber || extractReceiptNumber(text))?.toUpperCase();
  const detectedAscCode = extractAscCode(text);
  const ascLocation = detectedAscCode ? getAscLocation(detectedAscCode) : undefined;
  const detectedAppointmentDate = appointmentDate || extractAppointmentDate(text);
  const detectedAppointmentTime = extractAppointmentTime(text);

  let daysUntilAppointment: number | undefined;
  if (detectedAppointmentDate) {
    daysUntilAppointment = calculateDaysUntilAppointment(detectedAppointmentDate, currentDate);
  }

  const canResch = canReschedule(eventType, daysUntilAppointment);
  const consequences = getMissedAppointmentConsequences(detectedFormType);
  const rescheduleWindow = 14; // USCIS typically allows reschedule requests within 14 days

  let recommendedAction: string;
  let riskLevel: 'low' | 'moderate' | 'elevated';

  switch (eventType) {
    case 'reschedule_request':
      recommendedAction = canResch
        ? 'Prepare a biometrics reschedule request letter explaining the reason for rescheduling. Submit to the ASC or USCIS contact center before the appointment date.'
        : 'The appointment date has passed. Prepare a request for a new appointment explaining why you missed the original.';
      riskLevel = urgency === 'critical' ? 'elevated' : 'moderate';
      break;
    case 'missed_appointment':
      recommendedAction = 'Act immediately. Prepare a letter to USCIS explaining the missed appointment and requesting a new one. Include evidence of the reason (medical, emergency, etc.).';
      riskLevel = 'elevated';
      break;
    case 'asc_location_problem':
      recommendedAction = 'Prepare a request to transfer your biometrics appointment to a different ASC. Include the reason (distance, accessibility, closure) and the preferred ASC location.';
      riskLevel = 'moderate';
      break;
    case 'notice_discrepancy':
      recommendedAction = 'Prepare a letter identifying the discrepancy on your biometrics notice (wrong name, DOB, etc.) and requesting a corrected notice. Do not attend the appointment with incorrect information.';
      riskLevel = 'moderate';
      break;
    case 'biometrics_rejected':
      recommendedAction = 'Prepare a response to the biometrics rejection notice. USCIS will typically schedule a new appointment. Request expedited reappointment if possible.';
      riskLevel = 'moderate';
      break;
    case 'biometrics_reuse':
      recommendedAction = 'No action needed if USCIS has confirmed biometrics reuse. Document the reuse confirmation for your records.';
      riskLevel = 'low';
      break;
    case 'no_notice_received':
      recommendedAction = 'Prepare a case inquiry noting that biometrics notice has not been received despite case being filed. Request USCIS to verify biometrics scheduling status.';
      riskLevel = 'moderate';
      break;
    case 'appointment_scheduled':
      recommendedAction = 'Appointment is scheduled. Ensure you attend on the correct date, time, and location. Bring proper identification and the appointment notice.';
      riskLevel = 'low';
      break;
    default:
      recommendedAction = 'Upload your biometrics appointment notice or describe your situation. We will determine the appropriate action.';
      riskLevel = 'low';
  }

  const authority = '8 CFR § 103.2(b)(9) — Biometric collection; USCIS Policy Manual Volume 1, Chapter 4 — Biometrics; INA § 103(a) — USCIS authority to require biometrics';

  return {
    eventType,
    urgency,
    appointmentStatus,
    formType: detectedFormType,
    receiptNumber: detectedReceipt,
    appointmentDate: detectedAppointmentDate,
    appointmentTime: detectedAppointmentTime,
    ascLocation: ascLocation?.city,
    ascCode: detectedAscCode,
    daysUntilAppointment,
    rescheduleWindowDays: rescheduleWindow,
    canReschedule: canResch,
    missedAppointmentConsequences: consequences,
    recommendedAction,
    authority,
    riskLevel,
  };
}

// ─── Strategy Generation ──────────────────────────────────────────────────────

export function buildBiometricsStrategy(analysis: BiometricsAnalysis): BiometricsStrategy {
  const keyArguments: string[] = [];
  const supportingEvidence: string[] = [];
  let approach = '';
  let rescheduleNote = '';

  switch (analysis.eventType) {
    case 'reschedule_request':
      approach = 'Reschedule Request';
      keyArguments.push(
        'I am unable to attend my scheduled biometrics appointment and request a reschedule.',
        analysis.appointmentDate ? `My appointment is scheduled for ${analysis.appointmentDate}.` : '',
        'I have a legitimate reason for needing to reschedule.',
        'I am committed to completing the biometrics requirement and will attend the rescheduled appointment.',
      );
      // Remove empty strings from optional fields
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push(
        'Documentation supporting the reason for rescheduling (medical, travel, emergency, etc.)',
        'Copy of the original biometrics appointment notice (I-797C)',
      );
      rescheduleNote = analysis.canReschedule
        ? 'Submit the reschedule request before the appointment date. USCIS typically allows reschedule requests.'
        : 'The appointment date has passed. Request a new appointment as soon as possible.';
      break;

    case 'missed_appointment':
      approach = 'Missed Appointment Remedy';
      keyArguments.push(
        'I missed my scheduled biometrics appointment due to circumstances beyond my control.',
        'I am requesting a new appointment as soon as possible.',
        analysis.missedAppointmentConsequences,
        'I have documentation explaining why I missed the appointment.',
      );
      supportingEvidence.push(
        'Documentation of the emergency or circumstance that prevented attendance',
        'Copy of the original biometrics appointment notice (I-797C)',
        'Any medical records, travel documents, or other evidence of the conflict',
      );
      rescheduleNote = 'Act immediately. Missing a biometrics appointment can lead to application denial.';
      break;

    case 'asc_location_problem':
      approach = 'ASC Location Transfer Request';
      keyArguments.push(
        'The assigned ASC location presents a hardship or is inaccessible.',
        analysis.ascLocation ? `My assigned ASC is in ${analysis.ascLocation}.` : 'My assigned ASC is not accessible.',
        'I request transfer to a different ASC location that I can reasonably attend.',
        'I am committed to completing the biometrics requirement promptly.',
      );
      supportingEvidence.push(
        'Documentation of distance, travel time, or accessibility issues',
        'Evidence of disability or ADA accommodation needs (if applicable)',
        'Copy of the original biometrics appointment notice (I-797C)',
      );
      rescheduleNote = 'Submit the transfer request with evidence of the hardship. USCIS may accommodate reasonable requests.';
      break;

    case 'notice_discrepancy':
      approach = 'Notice Correction Request';
      keyArguments.push(
        'The biometrics appointment notice contains incorrect information.',
        'I request a corrected notice with accurate information before attending the appointment.',
        'Attending with incorrect information on the notice may cause delays or rejection at the ASC.',
      );
      supportingEvidence.push(
        'Copy of the biometrics appointment notice showing the error',
        'Supporting documentation of the correct information (passport, birth certificate, etc.)',
      );
      rescheduleNote = 'Do not attend the appointment with incorrect information. Request correction first.';
      break;

    case 'biometrics_rejected':
      approach = 'Biometrics Rejection Response';
      keyArguments.push(
        'I received notice that my biometrics were rejected due to quality issues.',
        'I request a new appointment to retake the biometrics.',
        'I understand the importance of clear fingerprints and photos and will cooperate fully.',
      );
      supportingEvidence.push(
        'Copy of the biometrics rejection notice',
        'Any documentation of conditions that may affect fingerprint quality (skin condition, age, etc.)',
      );
      rescheduleNote = 'USCIS will typically schedule a new appointment automatically. Confirm the new appointment date.';
      break;

    case 'biometrics_reuse':
      approach = 'Biometrics Reuse Documentation';
      keyArguments.push(
        'USCIS has confirmed that prior biometrics will be reused for my current application.',
        'No new appointment is needed.',
        'I request confirmation that the biometrics reuse has been processed.',
      );
      supportingEvidence.push(
        'USCIS notification confirming biometrics reuse',
        'Prior biometrics appointment record (if available)',
      );
      rescheduleNote = 'No action needed beyond documenting the reuse confirmation.';
      break;

    case 'no_notice_received':
      approach = 'Biometrics Notice Inquiry';
      keyArguments.push(
        'My application has been filed but I have not received a biometrics appointment notice.',
        'I am concerned about processing delays due to the missing biometrics.',
        'I request USCIS to verify the biometrics scheduling status and send the appointment notice.',
      );
      supportingEvidence.push(
        'Receipt notice (I-797C) for the underlying application',
        'Proof of filing date and fee payment',
      );
      rescheduleNote = 'Submit the inquiry promptly. Delayed biometrics scheduling may indicate a processing issue.';
      break;

    case 'appointment_scheduled':
      approach = 'Appointment Confirmation';
      keyArguments.push(
        'My biometrics appointment is scheduled and I plan to attend.',
        analysis.appointmentDate ? `Appointment date: ${analysis.appointmentDate}` : '',
        analysis.ascLocation ? `ASC location: ${analysis.ascLocation}` : '',
        'I will bring the appointment notice and proper identification.',
      );
      // Remove empty strings from optional fields
      while (keyArguments[keyArguments.length - 1] === '') keyArguments.pop();
      supportingEvidence.push('Copy of the biometrics appointment notice (I-797C)');
      rescheduleNote = 'Attend the appointment as scheduled. Arrive early and bring required documents.';
      break;

    default:
      approach = 'General Biometrics Inquiry';
      keyArguments.push(
        'I have a question or concern about my biometrics appointment.',
        'I need guidance on the appropriate action to take.',
      );
      supportingEvidence.push('Any USCIS notices received');
      rescheduleNote = 'Upload your notice or describe your situation for analysis.';
  }

  const deadlineNote = analysis.appointmentDate
    ? analysis.daysUntilAppointment !== undefined && analysis.daysUntilAppointment < 0
      ? `Appointment date ${analysis.appointmentDate} has passed (${Math.abs(analysis.daysUntilAppointment)} days ago).`
      : `Appointment date: ${analysis.appointmentDate}. ${analysis.daysUntilAppointment} days remaining.`
    : 'No appointment date specified.';

  return {
    approach,
    keyArguments,
    supportingEvidence,
    authority: analysis.authority,
    deadlineNote,
    rescheduleNote,
  };
}

// ─── Multilingual ────────────────────────────────────────────────────────────

export function getBiometricsHeadline(lang: LanguageContext): string {
  return lang.ui === 'es'
    ? '¿Tiene una cita de biometría?'
    : 'Do you have a biometrics appointment?';
}

export function getBiometricsExamples(lang: LanguageContext): string[] {
  if (lang.ui === 'es') {
    return [
      'No puedo asistir a mi cita de huellas.',
      'Perdí mi cita de biometría.',
      'Mi centro de ASC está demasiado lejos.',
      'Mi notificación tiene información incorrecta.',
    ];
  }
  return [
    "I can't make my biometrics appointment.",
    'I missed my fingerprint appointment.',
    'My ASC is too far away.',
    'My biometrics notice has the wrong information.',
  ];
}

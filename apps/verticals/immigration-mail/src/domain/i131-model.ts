/**
 * I-131 Advance Parole / Travel Document Domain Model
 *
 * Distinct from all other workflows because:
 * - Centers on obtaining and managing travel authorization/documentation
 * - Four distinct document types: Advance Parole, Re-entry Permit, Refugee Travel Document, TPS Travel Authorization
 * - Emergency advance parole is a distinct pathway with its own evidence and process
 * - Travel-risk analysis is domain-specific: abandonment of I-485, dual-intent exceptions,
 *   document validity vs return date, travel to country of persecution
 * - Recent BIA decision (Aug 13, 2026): AP departure may count as "departure" for unlawful presence bars
 * - Underlying-status dependency varies by document type (I-485 for AP, LPR for re-entry permit, etc.)
 * - Replacement pathway for lost/stolen/damaged documents
 * - Fee structure: $630 paper, $580 online
 * - Biometrics requirements vary by document type
 * - Document validity periods differ (AP ~1 year, re-entry permit up to 2 years, refugee travel doc 1 year)
 * - Combo card (EAD + AP) when I-765 and I-131 filed concurrently with I-485
 *
 * Authority:
 *   INA § 212(d)(5) — humanitarian parole
 *   INA § 223 — refugee travel documents
 *   8 CFR § 223 — refugee travel documents
 *   8 CFR § 212.5 — parole
 *   INA § 245 — adjustment of status (travel abandonment)
 *   8 CFR § 245.2(a)(4)(ii)(C) — advance parole for AOS applicants
 *   USCIS Form I-131 instructions (edition 01/20/25)
 *
 * User journeys:
 *   "I need to travel while my green card application is pending." (advance parole)
 *   "My grandmother is sick — I need emergency advance parole." (emergency AP)
 *   "I'm a green card holder and need to travel abroad for over a year." (re-entry permit)
 *   "I'm a refugee and need to travel outside the US." (refugee travel document)
 *   "I lost my advance parole document." (replacement)
 *   "I have H-1B and pending I-485 — do I need advance parole?" (dual-intent analysis)
 *   "My advance parole expires next month but I need to travel." (expiration urgency)
 *   "I got an RFE on my I-131." (routes to RFE engine)
 *   "My I-131 has been pending for 6 months." (routes to case inquiry)
 *
 * Reuses: Case, IntakeSession, DocumentUnderstanding, Authority, MailMyPDF, Tracking, Proof
 * Distinct from: I-765 (employment authorization, not travel authorization),
 *   Consular Processing (visa lifecycle, not travel document),
 *   Case Inquiry (delay checking, not affirmative filing),
 *   RFE/NOID (evidence responses, not travel document lifecycle)
 */

import type { LanguageContext } from './multilingual';

// ─── Document Types ───────────────────────────────────────────────────────────

export type TravelDocType =
  | 'advance_parole'             // For pending I-485 applicants
  | 'reentry_permit'             // For LPRs needing extended travel
  | 'refugee_travel_document'   // For refugees and asylees
  | 'tps_travel_authorization'  // For TPS beneficiaries
  | 'humanitarian_parole'        // For urgent humanitarian reasons
  | 'replacement'               // Replacing lost/stolen/damaged document
  | 'not_determined';

export function detectDocType(text: string): TravelDocType {
  const lower = text.toLowerCase();

  // Replacement check first
  if (/replac|lost|stolen|damage|mutilat/i.test(lower)) return 'replacement';

  // Humanitarian parole — check before emergency (which also matches "humanitarian")
  if (/humanitarian parole|parole.*humanitarian/i.test(lower)) return 'humanitarian_parole';

  // Emergency advance parole
  if (/emergency|urgent.*travel|humanitarian|medical emergency|death|funeral|dying/i.test(lower)) {
    if (/advance parole|parole|travel.*document|travel.*permit/i.test(lower) || /i.?485.*pending|pending.{0,15}i.?485|adjustment|green card.*pending/i.test(lower)) {
      return 'advance_parole'; // emergency advance parole is still advance parole
    }
    return 'humanitarian_parole';
  }

  if (/re-?entry permit|reentry permit/i.test(lower)) return 'reentry_permit';
  if (/refugee travel document|refugee.*travel/i.test(lower)) return 'refugee_travel_document';
  if (/TPS.*travel|temporary protected status.*travel/i.test(lower)) return 'tps_travel_authorization';

  // Context-based detection
  if (/i.?485.*pending|pending.{0,15}i.?485|pending.*adjustment|adjustment.*pending|green card.*pending|AOS\b/i.test(lower)) return 'advance_parole';
  if (/lawful permanent resident|green card holder|LPR\b/i.test(lower)) return 'reentry_permit';
  if (/refugee|asylee|granted asylum|asylum status/i.test(lower)) return 'refugee_travel_document';
  if (/TPS\b|temporary protected status/i.test(lower)) return 'tps_travel_authorization';

  return 'not_determined';
}

// ─── Application Type ─────────────────────────────────────────────────────────

export type TravelAppType = 'initial' | 'renewal' | 'replacement' | 'emergency' | 'not_determined';

export function detectAppType(text: string): TravelAppType {
  const lower = text.toLowerCase();

  if (/emergency|urgent.*travel|humanitarian/i.test(lower)) return 'emergency';
  if (/replac|lost|stolen|damage|mutilat/i.test(lower)) return 'replacement';
  if (/renew|renewal|extend|extension/i.test(lower)) return 'renewal';
  if (/initial|first.?time|new|apply|applying|file|filing/i.test(lower)) return 'initial';
  return 'not_determined';
}

// ─── Underlying Status ────────────────────────────────────────────────────────

export type UnderlyingStatus =
  | 'pending_i485'
  | 'lawful_permanent_resident'
  | 'refugee_status'
  | 'asylee'
  | 'tps_beneficiary'
  | 'deferred_action'
  | 'h1b_status'
  | 'l1_status'
  | 'none'
  | 'unknown';

export function detectUnderlyingStatus(text: string): UnderlyingStatus {
  const lower = text.toLowerCase();

  if (/H-?1B\b|h1b/i.test(lower)) return 'h1b_status';
  if (/L-?1\b|l1\b|L-?1A|L-?1B/i.test(lower)) return 'l1_status';
  if (/pending.{0,15}i.?485|pending.*adjustment|adjustment.*pending|i.?485.*pending|green card.*pending/i.test(lower)) return 'pending_i485';
  if (/lawful permanent resident|green card holder|LPR\b/i.test(lower)) return 'lawful_permanent_resident';
  if (/granted asylum|asylee|asylum.*grant/i.test(lower)) return 'asylee';
  if (/refugee|admitted as refugee|refugee status/i.test(lower)) return 'refugee_status';
  if (/TPS\b|temporary protected status/i.test(lower)) return 'tps_beneficiary';
  if (/deferred action|DACA/i.test(lower)) return 'deferred_action';

  return 'none';
}

// ─── Underlying Status Consistency ───────────────────────────────────────────

export function isStatusConsistentWithDocType(docType: TravelDocType, status: UnderlyingStatus): boolean {
  const consistencyMap: Record<string, UnderlyingStatus[]> = {
    advance_parole: ['pending_i485', 'deferred_action', 'h1b_status', 'l1_status', 'none'],
    reentry_permit: ['lawful_permanent_resident'],
    refugee_travel_document: ['refugee_status', 'asylee'],
    tps_travel_authorization: ['tps_beneficiary'],
    humanitarian_parole: ['none', 'unknown'],
    replacement: ['pending_i485', 'lawful_permanent_resident', 'refugee_status', 'asylee', 'tps_beneficiary', 'deferred_action', 'h1b_status', 'l1_status', 'none'],
  };
  const supported = consistencyMap[docType] || [];
  return supported.includes(status);
}

// ─── Travel Urgency ──────────────────────────────────────────────────────────

export type TravelUrgency = 'routine' | 'time_sensitive' | 'urgent' | 'critical';

export function detectTravelUrgency(text: string, travelDate?: string): TravelUrgency {
  const lower = text.toLowerCase();

  // Critical: emergency keywords or travel within 7 days
  if (/emergency|dying|death|funeral|life.?threatening|critical condition/i.test(lower)) return 'critical';
  if (/asap|immediately|this week|tomorrow|today/i.test(lower)) return 'critical';

  if (travelDate) {
    const travel = new Date(travelDate);
    const now = new Date();
    const daysUntilTravel = Math.ceil((travel.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilTravel <= 7) return 'critical';
    if (daysUntilTravel <= 30) return 'urgent';
    if (daysUntilTravel <= 90) return 'time_sensitive';
  }

  // Try to extract date from text
  const dateMatch = text.match(/travel\w*\s*(?:on|date|by)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4})/i);
  if (dateMatch) {
    const extracted = new Date(dateMatch[1]);
    if (!isNaN(extracted.getTime())) {
      const daysUntilTravel = Math.ceil((extracted.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilTravel <= 7) return 'critical';
      if (daysUntilTravel <= 30) return 'urgent';
      if (daysUntilTravel <= 90) return 'time_sensitive';
    }
  }

  if (/soon|upcoming|need to travel|planning to travel|planning a trip/i.test(lower)) return 'time_sensitive';

  return 'routine';
}

// ─── Document Expiration Analysis ─────────────────────────────────────────────

export type DocExpirationStatus =
  | 'no_document'           // No current document (initial filing)
  | 'expired'               // Document already expired
  | 'near_expiry'           // Expires within 30 days
  | 'valid_short'           // Valid but < 90 days remaining
  | 'valid'                 // Valid with sufficient time remaining
  | 'unknown';

export function analyzeDocExpiration(text: string, docExpirationDate?: string): { status: DocExpirationStatus; daysUntilExpiry: number | null; note: string } {
  if (!docExpirationDate) {
    const dateMatch = text.match(/expir\w*\s*(?:on|date|by)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4})/i);
    if (dateMatch) {
      const extracted = new Date(dateMatch[1]);
      if (!isNaN(extracted.getTime())) {
        return analyzeDocExpiration(text, dateMatch[1]);
      }
    }
    return {
      status: 'no_document',
      daysUntilExpiry: null,
      note: 'No current travel document on file — this appears to be an initial application.',
    };
  }

  const expiry = new Date(docExpirationDate);
  if (isNaN(expiry.getTime())) {
    return { status: 'unknown', daysUntilExpiry: null, note: 'Unable to parse document expiration date.' };
  }

  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      status: 'expired',
      daysUntilExpiry,
      note: `Travel document expired ${Math.abs(daysUntilExpiry)} days ago. File renewal immediately if you need to travel.`,
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      status: 'near_expiry',
      daysUntilExpiry,
      note: `Travel document expires in ${daysUntilExpiry} days. Do not travel if it will expire before your return. File renewal immediately.`,
    };
  }

  if (daysUntilExpiry <= 90) {
    return {
      status: 'valid_short',
      daysUntilExpiry,
      note: `Travel document expires in ${daysUntilExpiry} days. Plan renewal if future travel is expected.`,
    };
  }

  return {
    status: 'valid',
    daysUntilExpiry,
    note: `Travel document expires in ${daysUntilExpiry} days. Document is valid for travel (verify return date is before expiration).`,
  };
}

// ─── Travel Risk Analysis ────────────────────────────────────────────────────

export type TravelRiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

export interface TravelRiskResult {
  level: TravelRiskLevel;
  factors: string[];
  recommendation: string;
}

export function analyzeTravelRisk(
  text: string,
  docType: TravelDocType,
  status: UnderlyingStatus,
  docExpiration: DocExpirationStatus,
  hasDocument: boolean,
): TravelRiskResult {
  const factors: string[] = [];
  let level: TravelRiskLevel = 'low';
  const lower = text.toLowerCase();

  // Travel without AP with pending I-485 → abandonment (high risk)
  if (status === 'pending_i485' && !hasDocument && docType === 'advance_parole') {
    factors.push('Travel without advance parole while I-485 is pending will result in abandonment of your adjustment application');
    level = 'high';
  }

  // Dual-intent exception (H-1B, L-1)
  if ((status === 'h1b_status' || status === 'l1_status') && !hasDocument) {
    factors.push('H-1B and L-1 visa holders may travel on their valid visa without advance parole (dual-intent exception), provided they are not in exclusion, deportation, or removal proceedings');
    level = 'low';
  }

  // Document expiring before return
  if (docExpiration === 'expired') {
    factors.push('Travel document has expired — cannot travel on an expired document');
    level = level === 'low' ? 'high' : 'critical';
  }
  if (docExpiration === 'near_expiry') {
    factors.push('Travel document expires soon — verify it will be valid on your return date');
    level = level === 'low' ? 'elevated' : level;
  }

  // Travel to country of persecution (asylees/refugees)
  if ((status === 'asylee' || status === 'refugee_status') && docType === 'refugee_travel_document') {
    if (/travel to.*country|visit.*home country|return to.*country|travel.*persecution/i.test(lower)) {
      factors.push('Travel to the country of claimed persecution may jeopardize your refugee/asylee status');
      level = level === 'low' ? 'elevated' : level;
    }
  }

  // Criminal history
  if (/criminal|arrest|convict|felony|misdemeanor/i.test(lower)) {
    factors.push('Criminal history may result in denial of entry at the border, even with a valid travel document');
    level = level === 'low' ? 'elevated' : level;
  }

  // Prior immigration violations
  if (/overstay|violation|unlawful presence| deportation|removal/i.test(lower)) {
    factors.push('Prior immigration violations may affect admissibility upon return');
    level = level === 'low' ? 'elevated' : level;
  }

  // BIA Aug 2026: AP departure may count as departure for unlawful presence
  if (docType === 'advance_parole' && /unlawful presence|3\/10 year bar|10 year bar|3 year bar/i.test(lower)) {
    factors.push('As of Aug. 13, 2026, departing the US with advance parole may count as a departure for purposes of inadmissibility under unlawful presence bars. Consult an attorney.');
    level = level === 'low' ? 'elevated' : level;
  }

  // No risk factors identified
  if (factors.length === 0) {
    factors.push('No specific risk factors identified based on available information');
    level = 'low';
  }

  let recommendation = '';
  if (level === 'critical') {
    recommendation = 'Critical risk identified. Do not travel without consulting an immigration attorney. Your case may be severely jeopardized.';
  } else if (level === 'high') {
    recommendation = 'High risk identified. Strongly recommend consulting an immigration attorney before traveling.';
  } else if (level === 'elevated') {
    recommendation = 'Elevated risk identified. Consider consulting an immigration attorney to review your travel plans.';
  } else if (level === 'moderate') {
    recommendation = 'Moderate risk. Verify your document validity and return date before traveling.';
  } else {
    recommendation = 'No significant risk factors identified. Verify your document is valid for your entire trip.';
  }

  return { level, factors, recommendation };
}

// ─── Evidence Requirements ────────────────────────────────────────────────────

export type TravelEvidenceType =
  | 'i485_receipt'
  | 'green_card_copy'
  | 'refugee_status_proof'
  | 'asylee_status_proof'
  | 'tps_evidence'
  | 'emergency_evidence'
  | 'identity_document'
  | 'passport_photos'
  | 'prior_travel_doc'
  | 'police_report'
  | 'travel_itinerary'
  | 'translations'
  | 'unknown';

export function detectEvidenceTypes(text: string): TravelEvidenceType[] {
  const lower = text.toLowerCase();
  const types: TravelEvidenceType[] = [];

  if (/i.?485.*receipt|adjustment.*receipt/i.test(lower)) types.push('i485_receipt');
  if (/green card|permanent resident card|i.?551/i.test(lower)) types.push('green_card_copy');
  if (/refugee.*status|refugee.*approval|i.?94.*refugee/i.test(lower)) types.push('refugee_status_proof');
  if (/asylum.*grant|asylum.*approval|asylee.*proof/i.test(lower)) types.push('asylee_status_proof');
  if (/TPS.*evidence|TPS.*approval|TPS.*registration/i.test(lower)) types.push('tps_evidence');
  if (/medical.*record|death certificate|doctor.*note|hospital|funeral|dying|hospitaliz/i.test(lower)) types.push('emergency_evidence');
  if (/passport|driver.?s license|government id|national id/i.test(lower)) types.push('identity_document');
  if (/passport photo|passport-style photo|two photos/i.test(lower)) types.push('passport_photos');
  if (/prior.*travel.*doc|old.*advance parole|previous.*document/i.test(lower)) types.push('prior_travel_doc');
  if (/police report|stolen.*report|theft.*report/i.test(lower)) types.push('police_report');
  if (/itinerary|flight.*ticket|travel.*plan|round trip/i.test(lower)) types.push('travel_itinerary');
  if (/translation|translated|certified.*English/i.test(lower)) types.push('translations');

  if (types.length === 0) return ['unknown'];
  return [...new Set(types)];
}

export function getRequiredEvidence(docType: TravelDocType, appType: TravelAppType, status: UnderlyingStatus): string[] {
  const evidence: string[] = [];

  // Common to all
  evidence.push('Government-issued photo ID');
  evidence.push('Two passport-style photos');

  switch (docType) {
    case 'advance_parole':
      if (status === 'pending_i485') evidence.push('I-485 receipt notice (proof of pending adjustment application)');
      if (status === 'deferred_action') evidence.push('Proof of deferred action status (e.g., DACA approval notice)');
      break;
    case 'reentry_permit':
      evidence.push('Copy of Permanent Resident Card (Form I-551 / green card)');
      break;
    case 'refugee_travel_document':
      if (status === 'refugee_status') evidence.push('Proof of refugee status (I-94 or refugee approval letter)');
      if (status === 'asylee') evidence.push('Proof of asylum grant (asylum grant letter or EOIR order)');
      break;
    case 'tps_travel_authorization':
      evidence.push('Proof of TPS registration/approval');
      break;
    case 'humanitarian_parole':
      evidence.push('Evidence supporting humanitarian parole request');
      break;
  }

  // Emergency-specific evidence
  if (appType === 'emergency') {
    evidence.push('Evidence of emergency (medical records, death certificate, doctor\'s note, hospital records)');
    evidence.push('Proof of relationship to affected family member (if applicable)');
  }

  // Replacement-specific evidence
  if (appType === 'replacement') {
    evidence.push('Copy of lost/stolen/damaged document (if available)');
    evidence.push('Police report (if stolen)');
    evidence.push('Explanation of how the document was lost, stolen, or damaged');
  }

  return evidence;
}

// ─── Fee Analysis ────────────────────────────────────────────────────────────

export interface FeeResult {
  amount: number;
  method: 'paper' | 'online';
  note: string;
}

export function analyzeFee(filingMethod: 'paper' | 'online' | 'not_determined'): FeeResult {
  if (filingMethod === 'online') {
    return { amount: 580, method: 'online', note: 'Online filing fee for Form I-131.' };
  }
  return { amount: 630, method: 'paper', note: 'Paper filing fee for Form I-131. Some categories (e.g., asylees filing for refugee travel document) may be eligible for fee waivers.' };
}

// ─── Biometrics Requirement ──────────────────────────────────────────────────

export function requiresBiometrics(docType: TravelDocType, appType: TravelAppType): boolean {
  // Replacement may not require new biometrics
  if (appType === 'replacement') return false;
  // Re-entry permit and refugee travel document always require biometrics
  if (docType === 'reentry_permit') return true;
  if (docType === 'refugee_travel_document') return true;
  // Advance parole may reuse I-485 biometrics
  if (docType === 'advance_parole') {
    // For emergency, biometrics may be expedited but still required
    if (appType === 'emergency') return true;
    return true; // Generally required for initial, may be reused for renewal
  }
  if (docType === 'tps_travel_authorization') return true;
  return true;
}

// ─── Document Validity Periods ──────────────────────────────────────────────

export function getDocValidityPeriod(docType: TravelDocType): { years: number; note: string } {
  switch (docType) {
    case 'advance_parole':
      return { years: 1, note: 'Advance parole documents are generally valid for approximately 1 year from the date of issuance. Can be used for multiple trips while valid.' };
    case 'reentry_permit':
      return { years: 2, note: 'Re-entry permits are valid for up to 2 years from the date of issuance. If you have been outside the US for more than 1 year, you may need a Returning Resident (SB-1) visa instead.' };
    case 'refugee_travel_document':
      return { years: 1, note: 'Refugee travel documents are valid for 1 year from the date of issuance.' };
    case 'tps_travel_authorization':
      return { years: 1, note: 'TPS travel authorization is generally valid for the TPS registration period.' };
    case 'humanitarian_parole':
      return { years: 1, note: 'Humanitarian parole duration is determined by USCIS based on the specific circumstances.' };
    default:
      return { years: 0, note: 'Document validity period not determined.' };
  }
}

// ─── Event Types ──────────────────────────────────────────────────────────────

export type I131EventType =
  | 'initial_filing'
  | 'renewal_filing'
  | 'replacement_filing'
  | 'emergency_request'
  | 'expiration_warning'
  | 'expired_document'
  | 'rfe_response'
  | 'noid_response'
  | 'processing_delay'
  | 'document_delivery_issue'
  | 'denial_handling'
  | 'approval_handling'
  | 'travel_risk_inquiry'
  | 'unknown';

export function detectEventType(text: string): I131EventType {
  const lower = text.toLowerCase();

  // RFE / NOID
  if (/rfe|request for evidence|additional evidence/i.test(lower)) return 'rfe_response';
  if (/noid|notice of intent to deny|intent to deny/i.test(lower)) return 'noid_response';

  // Denial
  if (/denied|denial|rejected/i.test(lower)) return 'denial_handling';

  // Document delivery issue — check before approval (text may contain "received")
  if (/never received|not received|lost in mail|delivered to wrong/i.test(lower)) return 'document_delivery_issue';

  // Approval
  if (/approved|approval|granted|received my.{0,15}(travel.*doc|advance parole|parole.*doc|re.?entry)/i.test(lower)) return 'approval_handling';

  // Processing delay
  if (/delay|stuck|pending|taking.*long|how long|waiting|no response|no decision|months.*waiting/i.test(lower)) return 'processing_delay';

  // Expired document
  if (/expired|expiration.*pass|my.*travel.*doc.*expired|advance parole.*expired/i.test(lower)) return 'expired_document';

  // Expiration warning
  if (/expir|expiring|about to expire|soon.*expire/i.test(lower)) return 'expiration_warning';

  // Emergency request
  if (/emergency|urgent.*travel|humanitarian|medical.*emergency|death|funeral|dying/i.test(lower)) return 'emergency_request';

  // Travel risk inquiry
  if (/safe to travel|can i travel|travel.*without|travel.*risk|abandon/i.test(lower)) return 'travel_risk_inquiry';

  // Replacement
  if (/replac|lost|stolen|damage|mutilat/i.test(lower)) return 'replacement_filing';

  // Renewal
  if (/renew|renewal|extend|extension/i.test(lower)) return 'renewal_filing';

  // Initial filing
  if (/initial|first.?time|apply|applying|file|filing|need.*travel.*doc|need.*advance.*parole/i.test(lower)) return 'initial_filing';

  return 'unknown';
}

// ─── Risk Level (for filing, not travel) ──────────────────────────────────────

export type FilingRiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export function detectFilingRisk(
  docType: TravelDocType,
  status: UnderlyingStatus,
  statusConsistent: boolean,
  hasEvidence: boolean,
  urgency: TravelUrgency,
  appType: TravelAppType,
): FilingRiskLevel {
  // High risk: inconsistent status, unknown doc type
  if (!statusConsistent && status !== 'none' && docType !== 'not_determined' && docType !== 'replacement') return 'high';
  if (docType === 'not_determined') return 'elevated';
  if (urgency === 'critical' && appType !== 'emergency') return 'high';
  if (!hasEvidence) return 'elevated';
  if (appType === 'emergency') return 'moderate';
  if (urgency === 'urgent') return 'moderate';
  return 'low';
}

// ─── Emergency Evidence Analysis ─────────────────────────────────────────────

export interface EmergencyAnalysis {
  isEmergency: boolean;
  emergencyType: string | null;
  hasEvidence: boolean;
  evidenceDescription: string;
  recommendation: string;
}

export function analyzeEmergency(text: string): EmergencyAnalysis {
  const lower = text.toLowerCase();

  let emergencyType: string | null = null;
  let hasEvidence = false;
  let evidenceDescription = '';

  if (/medical.*emergency|hospital|surgery|illness|sick/i.test(lower)) {
    emergencyType = 'Medical emergency';
    hasEvidence = /medical.*record|doctor.*note|hospital.*record|diagnosis|treatment/i.test(lower);
    evidenceDescription = 'Medical records, doctor\'s note, hospital records, or treatment documentation';
  } else if (/death|funeral|passing|died|dying/i.test(lower)) {
    emergencyType = 'Death of family member';
    hasEvidence = /death certificate|obituary|funeral.*notice|medical.*record|doctor.*note|hospital.*record/i.test(lower);
    evidenceDescription = 'Death certificate, obituary, funeral notice, or medical records if applicable';
  } else if (/business.*emergency|urgent.*business|meeting/i.test(lower)) {
    emergencyType = 'Urgent business';
    hasEvidence = /business.*letter|employer.*letter|contract/i.test(lower);
    evidenceDescription = 'Business letter, employer letter, or contract';
  }

  const isEmergency = emergencyType !== null;

  let recommendation = '';
  if (isEmergency && hasEvidence) {
    recommendation = `Emergency evidence detected (${emergencyType}). Bring completed Form I-131, filing fee, and supporting evidence to your local USCIS field office for emergency advance parole processing.`;
  } else if (isEmergency && !hasEvidence) {
    recommendation = `Emergency travel detected (${emergencyType}) but no supporting evidence found. Gather: ${evidenceDescription}. Emergency advance parole requires evidence of the emergency.`;
  } else {
    recommendation = 'No emergency travel detected. File Form I-131 through the standard process.';
  }

  return { isEmergency, emergencyType, hasEvidence, evidenceDescription, recommendation };
}

// ─── Authority ──────────────────────────────────────────────────────────────

export function getAuthority(docType: TravelDocType): string[] {
  const authorityMap: Record<string, string[]> = {
    advance_parole: [
      'INA § 245 — adjustment of status (travel abandonment)',
      '8 CFR § 245.2(a)(4)(ii)(C) — advance parole for AOS applicants',
      'INA § 212(d)(5) — parole authority',
    ],
    reentry_permit: [
      'INA § 223 — travel documents',
      '8 CFR § 223 — re-entry permits',
    ],
    refugee_travel_document: [
      'INA § 223 — refugee travel documents',
      '8 CFR § 223 — refugee travel documents',
      '8 CFR § 223.2 — application procedures',
    ],
    tps_travel_authorization: [
      'INA § 244 — temporary protected status',
      '8 CFR § 244 — TPS regulations',
    ],
    humanitarian_parole: [
      'INA § 212(d)(5) — humanitarian parole',
      '8 CFR § 212.5 — parole',
    ],
    replacement: [
      'INA § 223 — travel documents',
      '8 CFR § 223 — travel document regulations',
    ],
    not_determined: [
      'INA § 223 — travel documents',
      'INA § 212(d)(5) — parole authority',
      '8 CFR § 223 — travel document regulations',
    ],
  };
  return authorityMap[docType] || authorityMap.not_determined;
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface I131Analysis {
  eventType: I131EventType;
  docType: TravelDocType;
  appType: TravelAppType;
  underlyingStatus: UnderlyingStatus;
  statusConsistent: boolean;
  travelUrgency: TravelUrgency;
  docExpiration: DocExpirationStatus;
  daysUntilExpiry: number | null;
  expirationNote: string;
  travelRisk: TravelRiskResult;
  emergencyAnalysis: EmergencyAnalysis;
  evidenceTypes: TravelEvidenceType[];
  requiredEvidence: string[];
  missingEvidence: string[];
  filingRisk: FilingRiskLevel;
  fee: FeeResult;
  biometricsRequired: boolean;
  docValidityPeriod: { years: number; note: string };
  filingMethod: 'paper' | 'online' | 'not_determined';
  authority: string[];
  hasDocument: boolean;
  recommendedAction: string;
  processingTimeNote: string;
  downstreamRouting: string[];
}

export function analyzeI131(
  text: string,
  docExpirationDate?: string,
  travelDate?: string,
  filingMethod?: 'paper' | 'online',
): I131Analysis {
  const eventType = detectEventType(text);
  const docType = detectDocType(text);
  const appType = detectAppType(text);
  const underlyingStatus = detectUnderlyingStatus(text);
  const statusConsistent = isStatusConsistentWithDocType(docType, underlyingStatus);
  const travelUrgency = detectTravelUrgency(text, travelDate);
  const docExpirationAnalysis = analyzeDocExpiration(text, docExpirationDate);
  const evidenceTypes = detectEvidenceTypes(text);
  const hasDocument = docExpirationAnalysis.status !== 'no_document';
  const travelRisk = analyzeTravelRisk(text, docType, underlyingStatus, docExpirationAnalysis.status, hasDocument);
  const emergencyAnalysis = analyzeEmergency(text);
  const method = filingMethod || (/online|file online|myUSCIS/i.test(text) ? 'online' : 'paper');
  const fee = analyzeFee(method === 'online' ? 'online' : 'paper');
  const biometricsRequired = requiresBiometrics(docType, appType);
  const docValidityPeriod = getDocValidityPeriod(docType);
  const requiredEvidence = getRequiredEvidence(docType, appType, underlyingStatus);
  const filingRisk = detectFilingRisk(docType, underlyingStatus, statusConsistent, evidenceTypes.length > 0 && evidenceTypes[0] !== 'unknown', travelUrgency, appType);

  // Detect missing evidence
  const missingEvidence: string[] = [];
  const detectedStr = evidenceTypes.map(e => e.toString());
  if (requiredEvidence.some(e => e.includes('I-485')) && !detectedStr.includes('i485_receipt')) {
    missingEvidence.push('I-485 receipt notice');
  }
  if (requiredEvidence.some(e => e.includes('Permanent Resident Card') || e.includes('green card')) && !detectedStr.includes('green_card_copy')) {
    missingEvidence.push('Copy of Permanent Resident Card (green card)');
  }
  if (requiredEvidence.some(e => e.includes('refugee status')) && !detectedStr.includes('refugee_status_proof')) {
    missingEvidence.push('Proof of refugee status');
  }
  if (requiredEvidence.some(e => e.includes('asylum grant') || e.includes('asylee')) && !detectedStr.includes('asylee_status_proof')) {
    missingEvidence.push('Proof of asylum grant');
  }
  if (requiredEvidence.some(e => e.includes('TPS')) && !detectedStr.includes('tps_evidence')) {
    missingEvidence.push('Proof of TPS registration');
  }
  if (appType === 'emergency' && !detectedStr.includes('emergency_evidence')) {
    missingEvidence.push('Evidence of emergency (medical records, death certificate, etc.)');
  }
  if (appType === 'replacement' && !detectedStr.includes('police_report') && /stolen/i.test(text)) {
    missingEvidence.push('Police report (document was reported stolen)');
  }

  const authority = getAuthority(docType);

  // Recommended action
  let recommendedAction = '';
  if (docType === 'not_determined') {
    recommendedAction = 'Identify your travel document type: Advance Parole (pending I-485), Re-entry Permit (green card holder), or Refugee Travel Document (refugee/asylee).';
  } else if (!statusConsistent && underlyingStatus !== 'none') {
    recommendedAction = `Your underlying status (${underlyingStatus.replace(/_/g, ' ')}) may not be consistent with ${docType.replace(/_/g, ' ')}. Verify eligibility before filing.`;
  } else if (travelRisk.level === 'high' || travelRisk.level === 'critical') {
    recommendedAction = `${travelRisk.recommendation} Consult an immigration attorney before traveling.`;
  } else if (appType === 'emergency' && emergencyAnalysis.isEmergency) {
    recommendedAction = emergencyAnalysis.recommendation;
  } else if (docExpirationAnalysis.status === 'expired') {
    recommendedAction = 'Your travel document has expired. File a renewal immediately if you need to travel.';
  } else if (docExpirationAnalysis.status === 'near_expiry') {
    recommendedAction = `Your travel document expires in ${docExpirationAnalysis.daysUntilExpiry} days. Do not travel if it will expire before your return. File renewal immediately.`;
  } else if (missingEvidence.length > 0) {
    recommendedAction = `Missing ${missingEvidence.length} piece(s) of required evidence. Gather: ${missingEvidence.join(', ')}.`;
  } else if (travelUrgency === 'critical') {
    recommendedAction = 'Urgent travel detected. Request emergency advance parole at your local USCIS field office with completed Form I-131, filing fee, and evidence of emergency.';
  } else if (appType === 'initial') {
    recommendedAction = `File Form I-131 for ${docType.replace(/_/g, ' ')}. Filing fee: $${fee.amount}. ${docValidityPeriod.note}`;
  } else if (appType === 'renewal') {
    recommendedAction = `File Form I-131 renewal for ${docType.replace(/_/g, ' ')}. File well before your current document expires.`;
  } else if (appType === 'replacement') {
    recommendedAction = 'File Form I-131 as a replacement. Include explanation of how the document was lost, stolen, or damaged.';
  } else {
    recommendedAction = `Determine your application type and file Form I-131 for ${docType.replace(/_/g, ' ')}.`;
  }

  // Downstream routing
  const downstreamRouting: string[] = [];
  if (eventType === 'rfe_response') downstreamRouting.push('rfe-response');
  if (eventType === 'noid_response') downstreamRouting.push('noid-response');
  if (eventType === 'processing_delay') downstreamRouting.push('case-inquiry');
  if (eventType === 'document_delivery_issue') downstreamRouting.push('case-inquiry');
  if (biometricsRequired) downstreamRouting.push('biometrics-scheduling');

  const processingTimeNote = 'I-131 processing times vary by document type and service center. Advance parole: typically 3-8 months. Re-entry permit: 2-6 months. Refugee travel document: 2-6 months. Check current processing times at USCIS.gov.';

  return {
    eventType,
    docType,
    appType,
    underlyingStatus,
    statusConsistent,
    travelUrgency,
    docExpiration: docExpirationAnalysis.status,
    daysUntilExpiry: docExpirationAnalysis.daysUntilExpiry,
    expirationNote: docExpirationAnalysis.note,
    travelRisk,
    emergencyAnalysis,
    evidenceTypes,
    requiredEvidence,
    missingEvidence,
    filingRisk,
    fee,
    biometricsRequired,
    docValidityPeriod,
    filingMethod: method,
    authority,
    hasDocument,
    recommendedAction,
    processingTimeNote,
    downstreamRouting,
  };
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export interface I131Strategy {
  approach: string;
  keyArguments: string[];
  supportingEvidence: string[];
  authority: string[];
  filingNote: string;
  travelRiskNote: string;
  expirationNote: string;
  emergencyNote: string;
  feeNote: string;
  biometricsNote: string;
  validityNote: string;
  downstreamRouting: string[];
  readinessChecklist: string[];
}

export function buildI131Strategy(analysis: I131Analysis): I131Strategy {
  const a = analysis;

  let approach = '';
  const keyArguments: string[] = [];
  const supportingEvidence = a.requiredEvidence;
  const authority = a.authority;
  let filingNote = '';
  let travelRiskNote = '';
  let expirationNote = '';
  let emergencyNote = '';
  let feeNote = '';
  let biometricsNote = '';
  let validityNote = '';
  const downstreamRouting = a.downstreamRouting;
  const readinessChecklist: string[] = [];

  if (a.docType === 'not_determined') {
    approach = 'Identify your travel document type based on your current immigration status before filing Form I-131.';
    keyArguments.push('Document type identification is the first step — it determines evidence requirements, filing procedures, and validity period');
    return {
      approach, keyArguments, supportingEvidence: [], authority, filingNote: 'Cannot file without a valid document type',
      travelRiskNote: '', expirationNote: '', emergencyNote: '', feeNote: '', biometricsNote: '', validityNote: '',
      downstreamRouting, readinessChecklist: ['Identify your document type'],
    };
  }

  // Application-type-specific approach
  const docTypeName = a.docType.replace(/_/g, ' ');

  if (a.appType === 'emergency') {
    approach = `Request emergency advance parole at your local USCIS field office. Bring completed Form I-131, filing fee ($${a.fee.amount}), and evidence of the emergency. ${a.emergencyAnalysis.recommendation}`;
  } else if (a.appType === 'replacement') {
    approach = `File Form I-131 as a replacement for your lost/stolen/damaged ${docTypeName}. Include explanation and, if stolen, a police report.`;
  } else if (a.appType === 'renewal') {
    approach = `File Form I-131 renewal for ${docTypeName}. File well before your current document expires.`;
  } else {
    approach = `File Form I-131 for ${docTypeName} with required evidence and filing fee.`;
  }

  // Key arguments
  keyArguments.push(`Document type: ${docTypeName}`);
  keyArguments.push(`Validity period: ${a.docValidityPeriod.note}`);
  if (a.statusConsistent) {
    keyArguments.push(`Underlying status (${a.underlyingStatus.replace(/_/g, ' ')}) is consistent with ${docTypeName}`);
  } else if (a.underlyingStatus !== 'none' && a.underlyingStatus !== 'unknown') {
    keyArguments.push(`WARNING: Underlying status (${a.underlyingStatus.replace(/_/g, ' ')}) may not support ${docTypeName}`);
  }
  if (a.missingEvidence.length > 0) {
    keyArguments.push(`${a.missingEvidence.length} piece(s) of evidence missing: ${a.missingEvidence.join(', ')}`);
  }
  if (a.travelRisk.level !== 'low') {
    keyArguments.push(`Travel risk: ${a.travelRisk.level} — ${a.travelRisk.factors.join('; ')}`);
  }

  filingNote = `File Form I-131 ${a.filingMethod === 'online' ? 'online through myUSCIS (if available for your document type)' : 'by mail'}. Edition date: 01/20/25 (current). Check USCIS.gov for the latest accepted edition.`;

  travelRiskNote = a.travelRisk.recommendation;
  expirationNote = a.expirationNote;
  emergencyNote = a.emergencyAnalysis.recommendation;
  feeNote = `Filing fee: $${a.fee.amount} (${a.fee.method}). ${a.fee.note}`;

  if (a.biometricsRequired) {
    biometricsNote = 'Biometrics (fingerprints and photo) are required. You will receive an ASC appointment notice after filing. For re-entry permits, you must remain in the US until you are fingerprinted.';
  } else {
    biometricsNote = 'Biometrics may not be required for this application type.';
  }

  validityNote = a.docValidityPeriod.note;

  // Readiness checklist
  readinessChecklist.push(`Document type identified: ${docTypeName}`);
  readinessChecklist.push(`Underlying status verified: ${a.statusConsistent ? 'Yes' : 'Needs verification'}`);
  readinessChecklist.push(`Required evidence gathered: ${a.missingEvidence.length === 0 ? 'Yes' : `Missing ${a.missingEvidence.length} item(s)`}`);
  readinessChecklist.push(`Filing fee prepared: $${a.fee.amount}`);
  if (a.biometricsRequired) readinessChecklist.push('Prepared for biometrics appointment');
  if (a.travelRisk.level !== 'low') readinessChecklist.push(`Travel risk assessed: ${a.travelRisk.level}`);
  if (a.appType === 'emergency') readinessChecklist.push('Emergency evidence gathered');

  return {
    approach,
    keyArguments,
    supportingEvidence,
    authority,
    filingNote,
    travelRiskNote,
    expirationNote,
    emergencyNote,
    feeNote,
    biometricsNote,
    validityNote,
    downstreamRouting,
    readinessChecklist,
  };
}

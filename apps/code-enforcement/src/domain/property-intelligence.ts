/**
 * Property Intelligence
 *
 * Resolves: address, APN, parcel, zoning, permits, prior cases, property history.
 * Reconciles the notice against property records.
 * Flags: address mismatch, APN mismatch, owner mismatch, case mismatch, parcel mismatch.
 */

import type { ExtractedField } from './notice-extraction';
import type { ClassifiedFact } from './fact-taxonomy';

// ─── Property Types ───────────────────────────────────────────────────────────

export interface PropertyRecord {
  address: string;
  apn: string;
  parcelNumber?: string;
  county: string;
  state: string;
  zoning?: string;
  acreage?: number;
  ownerOfRecord?: string;
  ownerAddress?: string;
  legalDescription?: string;
  source: string;
  sourceUrl?: string;
  retrievedAt: string;
  confidence: number;
}

export interface PropertyReconciliation {
  noticeAddress?: string;
  recordAddress?: string;
  addressMatch: 'match' | 'mismatch' | 'unknown';
  noticeApn?: string;
  recordApn?: string;
  apnMatch: 'match' | 'mismatch' | 'unknown';
  noticeRecipient?: string;
  recordOwner?: string;
  ownerMatch: 'match' | 'mismatch' | 'unknown';
  discrepancies: PropertyDiscrepancy[];
  confidence: number;
}

export interface PropertyDiscrepancy {
  type: 'address_mismatch' | 'apn_mismatch' | 'owner_mismatch' | 'parcel_mismatch';
  noticeValue: string;
  recordValue: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

// ─── McKinleyville / Humboldt County Context ──────────────────────────────────

/**
 * McKinleyville is an unincorporated community in Humboldt County, California.
 * It does NOT have its own municipal government — code enforcement is handled by
 * Humboldt County, not a city.
 */
export const MCKINLEYVILLE_CONTEXT = {
  community: 'McKinleyville',
  county: 'Humboldt',
  state: 'California',
  isIncorporated: false,
  governingJurisdiction: 'Humboldt County',
  codeEnforcementAgency: 'Humboldt County Code Enforcement',
  note: 'McKinleyville is unincorporated. Code enforcement is under Humboldt County jurisdiction, not a city.',
};

// ─── Property Intelligence Engine ────────────────────────────────────────────

export function reconcileProperty(
  notice: {
    propertyAddress: ExtractedField;
    apn: ExtractedField;
    recipient: ExtractedField;
  },
  records?: PropertyRecord[],
): PropertyReconciliation {
  const discrepancies: PropertyDiscrepancy[] = [];

  const noticeAddress = notice.propertyAddress.value;
  const recordAddress = records?.[0]?.address;
  const addressMatch: PropertyReconciliation['addressMatch'] =
    !noticeAddress || !recordAddress ? 'unknown' :
    normalizeAddress(noticeAddress) === normalizeAddress(recordAddress) ? 'match' : 'mismatch';

  if (addressMatch === 'mismatch') {
    discrepancies.push({
      type: 'address_mismatch',
      noticeValue: noticeAddress!,
      recordValue: recordAddress!,
      severity: 'high',
      description: 'The property address in the notice does not match the address in property records.',
    });
  }

  const noticeApn = notice.apn.value;
  const recordApn = records?.[0]?.apn;
  const apnMatch: PropertyReconciliation['apnMatch'] =
    !noticeApn || !recordApn ? 'unknown' :
    normalizeApn(noticeApn) === normalizeApn(recordApn) ? 'match' : 'mismatch';

  if (apnMatch === 'mismatch') {
    discrepancies.push({
      type: 'apn_mismatch',
      noticeValue: noticeApn!,
      recordValue: recordApn!,
      severity: 'high',
      description: 'The APN in the notice does not match the APN in property records.',
    });
  }

  const noticeRecipient = notice.recipient.value;
  const recordOwner = records?.[0]?.ownerOfRecord;
  const ownerMatch: PropertyReconciliation['ownerMatch'] =
    !noticeRecipient || !recordOwner ? 'unknown' :
    normalizeName(noticeRecipient) === normalizeName(recordOwner) ? 'match' : 'mismatch';

  if (ownerMatch === 'mismatch') {
    discrepancies.push({
      type: 'owner_mismatch',
      noticeValue: noticeRecipient!,
      recordValue: recordOwner!,
      severity: 'high',
      description: 'The notice recipient does not match the current owner of record.',
    });
  }

  const confidence = discrepancies.length === 0 ? 0.9 : Math.max(0.3, 0.9 - discrepancies.length * 0.2);

  return {
    noticeAddress,
    recordAddress,
    addressMatch,
    noticeApn,
    recordApn,
    apnMatch,
    noticeRecipient,
    recordOwner,
    ownerMatch,
    discrepancies,
    confidence,
  };
}

// ─── Normalization Helpers ────────────────────────────────────────────────────

function normalizeAddress(addr: string): string {
  return addr.toLowerCase().replace(/[#,]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/\bstreet\b/g, 'st').replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr').replace(/\blane\b/g, 'ln')
    .replace(/\bboulevard\b/g, 'blvd').replace(/\broad\b/g, 'rd');
}

function normalizeApn(apn: string): string {
  return apn.replace(/[-\s]/g, '');
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[,\s]+/g, ' ').trim();
}

// ─── Deceased Recipient Discrepancy ────────────────────────────────────────────

export interface DeceasedRecipientFinding {
  type: 'RECIPIENT_IDENTITY_DISCREPANCY';
  namedRecipient: string;
  reportedDeceased: boolean;
  reportedDateOfDeath?: string;
  recordOwner?: string;
  questionsToInvestigate: string[];
  conclusion: string;
  severity: 'high' | 'medium';
}

export function detectDeceasedRecipientDiscrepancy(
  namedRecipient: string,
  reportedDeceased: boolean,
  reportedDateOfDeath?: string,
  recordOwner?: string,
): DeceasedRecipientFinding {
  const questions: string[] = [];

  if (reportedDeceased) {
    questions.push('Why is the deceased person named as the recipient of this notice?');
    questions.push('Who does the agency currently recognize as the responsible party for this property?');
    questions.push('Is the notice tied to an older case or ownership record?');
    questions.push('Is there an estate, probate, or ownership transition issue?');
    questions.push('Is the agency communicating with the wrong person?');
  }

  if (recordOwner && namedRecipient && normalizeName(recordOwner) !== normalizeName(namedRecipient)) {
    questions.push('The named recipient does not match the current owner of record. Has ownership been formally transferred?');
  }

  return {
    type: 'RECIPIENT_IDENTITY_DISCREPANCY',
    namedRecipient,
    reportedDeceased,
    reportedDateOfDeath,
    recordOwner,
    questionsToInvestigate: questions,
    conclusion: reportedDeceased
      ? 'Potential recipient/ownership discrepancy identified. The notice is addressed to a reportedly deceased person. This does not invalidate the notice, but it requires investigation.'
      : 'No deceased recipient indicator detected.',
    severity: reportedDeceased ? 'high' : 'medium',
  };
}

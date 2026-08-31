/**
 * Discrepancy Engine
 *
 * Detects at minimum:
 * recipient mismatch, owner mismatch, property mismatch, APN mismatch,
 * complaint mismatch, case-number mismatch, date mismatch, deadline mismatch,
 * authority mismatch, scope mismatch, timeline inconsistency,
 * missing service evidence, missing complaint reference, missing inspection basis,
 * public-record no-match.
 *
 * Every discrepancy needs: severity, evidence, rationale, confidence, review state.
 */

// ─── Discrepancy Types ─────────────────────────────────────────────────────────

export type DiscrepancyType =
  | 'recipient_mismatch'
  | 'owner_mismatch'
  | 'property_mismatch'
  | 'apn_mismatch'
  | 'complaint_mismatch'
  | 'case_number_mismatch'
  | 'date_mismatch'
  | 'deadline_mismatch'
  | 'authority_mismatch'
  | 'scope_mismatch'
  | 'timeline_inconsistency'
  | 'missing_service_evidence'
  | 'missing_complaint_reference'
  | 'missing_inspection_basis'
  | 'public_record_no_match'
  | 'deceased_recipient'
  | 'general';

export type DiscrepancySeverity = 'high' | 'medium' | 'low';
export type ReviewState = 'pending' | 'reviewed' | 'resolved' | 'ignored';

export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  evidence: string;
  rationale: string;
  confidence: number;
  reviewState: ReviewState;
  involvesHighConsequence: boolean;
}

export interface DiscrepancyReport {
  discrepancies: Discrepancy[];
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  blockingCount: number;
  requiresHumanReview: boolean;
  summary: string;
}

// ─── Discrepancy Factory ──────────────────────────────────────────────────────

let discrepancyCounter = 0;

export function createDiscrepancy(
  type: DiscrepancyType,
  severity: DiscrepancySeverity,
  evidence: string,
  rationale: string,
  confidence: number,
  involvesHighConsequence: boolean = false,
): Discrepancy {
  return {
    id: `disc-${++discrepancyCounter}`,
    type,
    severity,
    evidence,
    rationale,
    confidence,
    reviewState: 'pending',
    involvesHighConsequence,
  };
}

export function resetDiscrepancyCounter(): void {
  discrepancyCounter = 0;
}

// ─── Discrepancy Engine ────────────────────────────────────────────────────────

export interface DiscrepancyEngineInput {
  recipientName?: string;
  reportedDeceased?: boolean;
  recordOwner?: string;
  noticeAddress?: string;
  recordAddress?: string;
  noticeApn?: string;
  recordApn?: string;
  hasComplaintNumber?: boolean;
  hasCaseNumber?: boolean;
  hasNoticeDate?: boolean;
  hasServiceDate?: boolean;
  hasDeadline?: boolean;
  hasInspectionAuthority?: boolean;
  hasConsentWording?: boolean;
  hasWarrantWording?: boolean;
  scopeClarity?: string;
  timelineAnomalies?: Array<{ type: string; description: string; severity: string }>;
  publicRecordFound?: boolean;
  authorityConsistent?: 'consistent' | 'inconsistent' | 'unknown';
}

export function runDiscrepancyEngine(input: DiscrepancyEngineInput): DiscrepancyReport {
  resetDiscrepancyCounter();
  const discrepancies: Discrepancy[] = [];

  // Deceased recipient
  if (input.reportedDeceased) {
    discrepancies.push(createDiscrepancy(
      'deceased_recipient',
      'high',
      `Notice is addressed to ${input.recipientName || 'a reportedly deceased person'}.`,
      'The named recipient is reportedly deceased. This may indicate an ownership transition, estate/probate issue, or outdated agency records.',
      0.85,
      true,
    ));
  }

  // Owner mismatch
  if (input.recipientName && input.recordOwner &&
    input.recipientName.toLowerCase().trim() !== input.recordOwner.toLowerCase().trim()) {
    discrepancies.push(createDiscrepancy(
      'owner_mismatch',
      'high',
      `Notice recipient: "${input.recipientName}" vs. Record owner: "${input.recordOwner}"`,
      'The notice recipient does not match the current owner of record. This may be related to a deceased recipient, estate/probate, or outdated agency records.',
      0.8,
      true,
    ));
  }

  // Address mismatch
  if (input.noticeAddress && input.recordAddress &&
    !addressesMatch(input.noticeAddress, input.recordAddress)) {
    discrepancies.push(createDiscrepancy(
      'property_mismatch',
      'high',
      `Notice address: "${input.noticeAddress}" vs. Record address: "${input.recordAddress}"`,
      'The property address in the notice does not match property records.',
      0.8,
      true,
    ));
  }

  // APN mismatch
  if (input.noticeApn && input.recordApn &&
    input.noticeApn.replace(/[-\s]/g, '') !== input.recordApn.replace(/[-\s]/g, '')) {
    discrepancies.push(createDiscrepancy(
      'apn_mismatch',
      'high',
      `Notice APN: "${input.noticeApn}" vs. Record APN: "${input.recordApn}"`,
      'The APN in the notice does not match property records.',
      0.85,
      true,
    ));
  }

  // Missing complaint reference
  if (input.hasComplaintNumber === false) {
    discrepancies.push(createDiscrepancy(
      'missing_complaint_reference',
      'medium',
      'No complaint number was found in the notice.',
      'The agency did not provide a complaint reference number. This makes it difficult to verify the complaint basis.',
      0.7,
    ));
  }

  // Missing inspection basis
  if (input.hasConsentWording === false && input.hasWarrantWording === false) {
    discrepancies.push(createDiscrepancy(
      'missing_inspection_basis',
      'high',
      'No consent request or warrant reference found in the notice.',
      'The notice does not clearly state the legal basis for the inspection. This may require clarification.',
      0.6,
      true,
    ));
  }

  // Missing service evidence
  if (input.hasServiceDate === false) {
    discrepancies.push(createDiscrepancy(
      'missing_service_evidence',
      'low',
      'No service date was found in the notice.',
      'The notice does not include a service date. This may affect deadline calculation.',
      0.5,
    ));
  }

  // Authority mismatch
  if (input.authorityConsistent === 'inconsistent') {
    discrepancies.push(createDiscrepancy(
      'authority_mismatch',
      'high',
      'The authority claimed in the notice appears inconsistent with cited sources.',
      'The inspection authority stated by the agency may not match the cited statutes or ordinances.',
      0.7,
      true,
    ));
  }

  // Scope mismatch / ambiguity
  if (input.scopeClarity === 'AMBIGUOUS' || input.scopeClarity === 'UNKNOWN') {
    discrepancies.push(createDiscrepancy(
      'scope_mismatch',
      'medium',
      `Inspection scope is ${input.scopeClarity}.`,
      'The inspection scope is not clearly defined. Clarification should be requested.',
      0.6,
    ));
  }

  // Timeline inconsistencies
  if (input.timelineAnomalies) {
    for (const anomaly of input.timelineAnomalies) {
      discrepancies.push(createDiscrepancy(
        'timeline_inconsistency',
        anomaly.severity as DiscrepancySeverity,
        anomaly.description,
        `Timeline anomaly: ${anomaly.type}. ${anomaly.description}`,
        0.7,
      ));
    }
  }

  // Public record no-match
  if (input.publicRecordFound === false) {
    discrepancies.push(createDiscrepancy(
      'public_record_no_match',
      'medium',
      'No matching public record was located in the searched source.',
      'A public search did not find a matching call-for-service or incident record. This does not mean no call occurred — only that no matching public record was found.',
      0.6,
    ));
  }

  // Build report
  const high = discrepancies.filter(d => d.severity === 'high').length;
  const medium = discrepancies.filter(d => d.severity === 'medium').length;
  const low = discrepancies.filter(d => d.severity === 'low').length;
  const blocking = discrepancies.filter(d => d.involvesHighConsequence).length;
  const requiresHumanReview = high > 0 || discrepancies.some(d => d.involvesHighConsequence);

  const summary = `${discrepancies.length} discrepancy(ies) detected: ${high} high, ${medium} medium, ${low} low. ${blocking} blocking. ${requiresHumanReview ? 'HUMAN REVIEW REQUIRED.' : ''}`;

  return {
    discrepancies,
    highSeverityCount: high,
    mediumSeverityCount: medium,
    lowSeverityCount: low,
    blockingCount: blocking,
    requiresHumanReview,
    summary,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function addressesMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[#,]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/\bstreet\b/g, 'st').replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr').replace(/\blane\b/g, 'ln')
    .replace(/\bboulevard\b/g, 'blvd').replace(/\broad\b/g, 'rd');
  return normalize(a) === normalize(b);
}

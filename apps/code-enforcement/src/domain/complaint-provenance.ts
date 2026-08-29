/**
 * Complaint Provenance
 *
 * Determines whether the agency provided:
 * complaint number, complaint date, complaint source, alleged condition,
 * location, referral, inspection reason.
 *
 * Distinguishes COMPLAINT ALLEGATION from VERIFIED PROPERTY CONDITION.
 * A complaint is not proof of a violation.
 */

import type { ExtractedField } from './notice-extraction';
import type { ClassifiedFact } from './fact-taxonomy';
import { asUserAssertion, asVerifiedFact, asUnknown } from './fact-taxonomy';

// ─── Provenance Types ─────────────────────────────────────────────────────────

export interface ComplaintProvenance {
  hasComplaintNumber: boolean;
  complaintNumber: string | undefined;
  hasComplaintDate: boolean;
  complaintDate: string | undefined;
  complaintSource: string | undefined;
  allegedConditions: string[];
  referralSource: string | undefined;
  inspectionReason: string | undefined;
  allegationsVsConditions: AllegationAssessment[];
  findings: ClassifiedFact[];
  summary: string;
  warnings: string[];
}

export interface AllegationAssessment {
  allegation: string;
  category: 'COMPLAINT_ALLEGATION' | 'VERIFIED_CONDITION' | 'UNKNOWN';
  evidence: string;
  notes: string;
}

// ─── Analysis Function ────────────────────────────────────────────────────────

export function analyzeComplaintProvenance(extraction: {
  complaintNumber: ExtractedField;
  allegedViolations: ExtractedField<string[]>;
  complaintBasis: ExtractedField<string[]>;
  noticeText?: string;
}): ComplaintProvenance {
  const findings: ClassifiedFact[] = [];
  const warnings: string[] = [];
  const allegations: string[] = extraction.allegedViolations.value || [];

  // Check for complaint number
  const hasComplaintNumber = !!extraction.complaintNumber.value;
  if (!hasComplaintNumber) {
    warnings.push('No complaint number was provided by the agency. Request the complaint/case reference.');
    findings.push(asUnknown('No complaint number was identified in the notice.', 'notice-extraction'));
  } else {
    findings.push(asVerifiedFact(
      `The notice references complaint number: ${extraction.complaintNumber.value}`,
      { source: 'notice-extraction', excerpt: extraction.complaintNumber.rawText, confidence: 0.9 },
    ));
  }

  // Assess each allegation
  const allegationAssessments: AllegationAssessment[] = allegations.map(allegation => ({
    allegation,
    category: 'COMPLAINT_ALLEGATION' as const,
    evidence: 'The allegation appears in the notice but has not been independently verified as a property condition.',
    notes: 'A complaint is an allegation, not proof of a violation. The condition must be independently verified.',
  }));

  // Key distinction
  findings.push(asUserAssertion(
    'The notice contains complaint allegations. These are allegations, not verified property conditions.',
    'notice-extraction',
  ));

  // Build summary
  const summary = allegations.length > 0
    ? `${allegations.length} complaint allegation(s) identified: ${allegations.join(', ')}. These are allegations, not verified conditions.`
    : 'No specific complaint allegations could be extracted from the notice.';

  if (allegations.length === 0) {
    warnings.push('No specific alleged violations could be extracted from the notice.');
  }

  return {
    hasComplaintNumber,
    complaintNumber: extraction.complaintNumber.value,
    hasComplaintDate: false,
    complaintDate: undefined,
    complaintSource: undefined,
    allegedConditions: allegations,
    referralSource: undefined,
    inspectionReason: undefined,
    allegationsVsConditions: allegationAssessments,
    findings,
    summary,
    warnings,
  };
}

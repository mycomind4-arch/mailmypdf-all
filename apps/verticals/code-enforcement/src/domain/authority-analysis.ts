/**
 * Authority / Consent / Warrant Analysis
 *
 * Analyzes what authority the agency claims for inspection.
 * Extracts consent wording, warrant references, and consequences.
 *
 * Constitutional awareness: Administrative inspections of private premises can
 * implicate the Fourth Amendment. Relevant foundational authority:
 * Camara v. Municipal Court (1967), See v. City of Seattle (1967).
 *
 * Do NOT turn those cases into a universal answer.
 * Jurisdiction-specific statutes, ordinances, property classification,
 * inspection authority, and circumstances must be analyzed.
 */

import type { ExtractedField } from './notice-extraction';
import type { ClassifiedFact } from './fact-taxonomy';
import { asRule, asUnknown, asInference, asUserAssertion } from './fact-taxonomy';

// ─── Analysis Types ───────────────────────────────────────────────────────────

export type AuthorityType =
  | 'consent_request'
  | 'administrative_warrant_reference'
  | 'judicial_warrant_reference'
  | 'statutory_authority'
  | 'ordinance_authority'
  | 'emergency_authority'
  | 'no_authority_stated'
  | 'ambiguous';

export type ConsentStatus =
  | 'consent_requested'
  | 'no_consent_request'
  | 'ambiguous';

export type WarrantThreatLevel =
  | 'explicit_warrant_threat'
  | 'warrant_referenced'
  | 'no_warrant_reference'
  | 'ambiguous';

export interface AuthorityAnalysis {
  authorityType: AuthorityType;
  consentStatus: ConsentStatus;
  consentWording: string | undefined;
  warrantThreatLevel: WarrantThreatLevel;
  warrantWording: string | undefined;
  warrantType: 'administrative' | 'judicial' | 'unspecified' | 'none';
  consequencesOfNonResponse: string | undefined;
  consequencesOfRefusal: string | undefined;
  noticeStatedConsequence: string | undefined;
  silenceEqualsDenial: boolean;
  authorityCited: string | undefined;
  authorityConsistent: 'consistent' | 'inconsistent' | 'unknown';
  unresolved: string[];
  findings: ClassifiedFact[];
  // High-consequence flags
  requiresIndependentReview: boolean;
}

// ─── Authority Analysis Function ──────────────────────────────────────────────

export function analyzeAuthority(extraction: {
  consentWording: ExtractedField;
  warrantWording: ExtractedField;
  consequencesOfNonResponse: ExtractedField;
  consequencesOfRefusal: ExtractedField;
  inspectionAuthority: ExtractedField;
  codeReferences: ExtractedField<string[]>;
  statutoryReferences: ExtractedField<string[]>;
}): AuthorityAnalysis {
  const findings: ClassifiedFact[] = [];
  const unresolved: string[] = [];

  // Determine consent status
  const consentWording = extraction.consentWording.value;
  let consentStatus: ConsentStatus = 'no_consent_request';
  if (consentWording) {
    if (/permission|consent|allow|permit/i.test(consentWording)) {
      consentStatus = 'consent_requested';
      findings.push(asUserAssertion(
        'The notice requests permission/consent to inspect the property.',
        'notice-extraction',
      ));
    } else {
      consentStatus = 'ambiguous';
      unresolved.push('The notice language around consent is ambiguous.');
    }
  }

  // Determine warrant threat level
  const warrantWording = extraction.warrantWording.value;
  let warrantThreatLevel: WarrantThreatLevel = 'no_warrant_reference';
  let warrantType: AuthorityAnalysis['warrantType'] = 'none';

  if (warrantWording) {
    if (/may\s+(?:seek|obtain|request|apply\s+for)|will\s+seek|shall\s+seek/i.test(warrantWording)) {
      warrantThreatLevel = 'explicit_warrant_threat';
    } else if (/warrant/i.test(warrantWording)) {
      warrantThreatLevel = 'warrant_referenced';
    }

    if (/administrative/i.test(warrantWording)) {
      warrantType = 'administrative';
    } else if (/judicial|search\s+warrant/i.test(warrantWording)) {
      warrantType = 'judicial';
    } else if (warrantThreatLevel !== 'no_warrant_reference') {
      warrantType = 'unspecified';
      unresolved.push('The type of warrant referenced (administrative vs. judicial) is not clearly specified.');
    }

    findings.push(asUserAssertion(
      `The notice references or threatens a warrant: "${warrantWording.slice(0, 200)}"`,
      'notice-extraction',
    ));
  }

  // Determine consequences
  const consequencesOfNonResponse = extraction.consequencesOfNonResponse.value;
  const consequencesOfRefusal = extraction.consequencesOfRefusal.value;
  let silenceEqualsDenial = false;
  let noticeStatedConsequence: string | undefined;

  if (consequencesOfNonResponse) {
    if (/denial|denied|treat(?:ed)?\s+as\s+(?:a\s+)?denial|deemed\s+denied|considered\s+(?:a\s+)?denial/i.test(consequencesOfNonResponse)) {
      silenceEqualsDenial = true;
      noticeStatedConsequence = consequencesOfNonResponse;
      findings.push(asUserAssertion(
        `The notice states that failure to respond will be treated as a denial: "${consequencesOfNonResponse.slice(0, 200)}"`,
        'notice-extraction',
      ));
    }
  }

  // Determine authority type
  const authorityCited = extraction.inspectionAuthority.value;
  let authorityType: AuthorityType = 'no_authority_stated';

  if (consentStatus === 'consent_requested' && warrantThreatLevel === 'explicit_warrant_threat') {
    authorityType = 'consent_request';
  } else if (consentStatus === 'consent_requested') {
    authorityType = 'consent_request';
  } else if (warrantThreatLevel !== 'no_warrant_reference') {
    if (warrantType === 'administrative') {
      authorityType = 'administrative_warrant_reference';
    } else if (warrantType === 'judicial') {
      authorityType = 'judicial_warrant_reference';
    } else {
      authorityType = 'ambiguous';
    }
  }

  // Check for statutory/ordinance authority
  if (extraction.statutoryReferences.value && extraction.statutoryReferences.value.length > 0) {
    authorityType = 'statutory_authority';
    findings.push(asRule(
      `The notice cites statutory references: ${extraction.statutoryReferences.value.join(', ')}`,
      { source: 'notice-extraction', confidence: 0.85, excerpt: extraction.statutoryReferences.rawText },
    ));
  }
  if (extraction.codeReferences.value && extraction.codeReferences.value.length > 0) {
    authorityType = authorityType === 'no_authority_stated' ? 'ordinance_authority' : authorityType;
    findings.push(asRule(
      `The notice cites code/ordinance references: ${extraction.codeReferences.value.join(', ')}`,
      { source: 'notice-extraction', confidence: 0.85, excerpt: extraction.codeReferences.rawText },
    ));
  }

  // Check consistency
  let authorityConsistent: AuthorityAnalysis['authorityConsistent'] = 'unknown';
  if (authorityCited && (extraction.codeReferences.value || extraction.statutoryReferences.value)) {
    authorityConsistent = 'consistent';
  } else if (!authorityCited && !consentWording && !warrantWording) {
    authorityConsistent = 'unknown';
    unresolved.push('No inspection authority is stated in the notice. This may require clarification.');
  }

  // High-consequence determination
  const requiresIndependentReview =
    consentStatus === 'consent_requested' ||
    warrantThreatLevel !== 'no_warrant_reference' ||
    silenceEqualsDenial;

  return {
    authorityType,
    consentStatus,
    consentWording,
    warrantThreatLevel,
    warrantWording,
    warrantType,
    consequencesOfNonResponse,
    consequencesOfRefusal,
    noticeStatedConsequence,
    silenceEqualsDenial,
    authorityCited,
    authorityConsistent,
    unresolved,
    findings,
    requiresIndependentReview,
  };
}

// ─── Constitutional Awareness (Reference Only) ────────────────────────────────

export const CONSTITUTIONAL_REFERENCE = {
  amendment: 'Fourth Amendment, U.S. Constitution',
  principle: 'Administrative inspections of private premises can implicate Fourth Amendment protections against unreasonable searches.',
  foundationalCases: [
    {
      case: 'Camara v. Municipal Court (1967)',
      holding: 'Administrative inspection programs are searches subject to Fourth Amendment constraints, but area inspections may be conducted under an administrative warrant upon a showing of probable cause less stringent than in criminal contexts.',
      caution: 'This case does not create a universal rule. Its applicability depends on jurisdiction, property classification, inspection authority, and circumstances.',
    },
    {
      case: 'See v. City of Seattle (1967)',
      holding: 'Commercial premises are subject to administrative inspections, but the Fourth Amendment applies; consent or an administrative warrant is generally required for non-emergency inspections of areas not open to the public.',
      caution: 'This case addresses commercial premises. Residential premises may be treated differently. Jurisdiction-specific analysis is required.',
    },
  ],
  disclaimer: 'These cases are provided as reference only. They do not determine the legal position in any specific case. Jurisdiction-specific statutes, ordinances, property classification, inspection authority, and circumstances must be analyzed by the system and reviewed by the user.',
} as const;

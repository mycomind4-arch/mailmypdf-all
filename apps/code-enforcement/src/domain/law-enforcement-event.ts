/**
 * Prior Law Enforcement Event
 *
 * Represents the prior police incident as USER_ASSERTION unless independently verified.
 * Allows evidence inputs: incident report, CAD record, call-for-service record, bodycam,
 * citation, witness statement, photographs/video, records request response.
 *
 * If no matching public record is found: create PUBLIC_SEARCH_NO_MATCH.
 * Never say: "There was no call."
 * Say: "No matching public record was located in the searched source."
 */

import type { ClassifiedFact } from './fact-taxonomy';
import { asUserAssertion, asUnknown, asVerifiedFact } from './fact-taxonomy';

// ─── Event Types ──────────────────────────────────────────────────────────────

export type LawEnforcementEventStatus =
  | 'user_assertion'
  | 'partially_verified'
  | 'verified'
  | 'contradicted'
  | 'unknown';

export type EvidenceInputType =
  | 'incident_report'
  | 'cad_record'
  | 'call_for_service_record'
  | 'bodycam'
  | 'citation'
  | 'witness_statement'
  | 'photographs_video'
  | 'records_request_response'
  | 'public_search_no_match';

export interface EvidenceInput {
  type: EvidenceInputType;
  source: string;
  result: string;
  date?: string;
  url?: string;
  searchDate?: string;
  searchScope?: string;
  searchTerms?: string[];
}

export interface LawEnforcementEvent {
  status: LawEnforcementEventStatus;
  userAccount: string;
  evidenceInputs: EvidenceInput[];
  findings: ClassifiedFact[];
  summary: string;
  warnings: string[];
}

// ─── Event Builder ────────────────────────────────────────────────────────────

export function buildLawEnforcementEvent(input: {
  userAccount: string;
  stolenPropertyClaim?: string;
  searchConducted?: boolean;
  anythingFound?: boolean;
  enteredHome?: boolean;
  openCaseMentioned?: boolean;
  evidenceInputs?: EvidenceInput[];
}): LawEnforcementEvent {
  const findings: ClassifiedFact[] = [];
  const warnings: string[] = [];

  // Everything starts as USER_ASSERTION
  findings.push(asUserAssertion(
    `User reports: ${input.userAccount}`,
    'user-account',
  ));

  if (input.stolenPropertyClaim) {
    findings.push(asUserAssertion(
      `User reports officers claimed stolen property investigation: "${input.stolenPropertyClaim}"`,
      'user-account',
    ));
    findings.push(asUserAssertion(
      'User states the stolen-property allegation was false.',
      'user-account',
    ));
  }

  if (input.searchConducted !== undefined) {
    findings.push(asUserAssertion(
      `User ${input.searchConducted ? 'reports' : 'states'} officers ${input.searchConducted ? 'asked for permission to search' : 'did not ask for permission to search'}.`,
      'user-account',
    ));
  }

  if (input.anythingFound !== undefined) {
    findings.push(asUserAssertion(
      `User reports ${input.anythingFound ? 'something was found' : 'nothing was found'}.`,
      'user-account',
    ));
  }

  if (input.enteredHome !== undefined) {
    findings.push(asUserAssertion(
      `User reports officers ${input.enteredHome ? 'entered the home' : 'did not enter the home'}.`,
      'user-account',
    ));
  }

  if (input.openCaseMentioned) {
    findings.push(asUserAssertion(
      'User recalls an officer saying there was an open Code Enforcement case on the property.',
      'user-account',
    ));
  }

  // Process evidence inputs
  const evidenceInputs = input.evidenceInputs || [];
  let hasNoMatch = false;
  let hasMatch = false;

  for (const evidence of evidenceInputs) {
    if (evidence.type === 'public_search_no_match') {
      hasNoMatch = true;
      findings.push(asUnknown(
        `No matching public record was located in ${evidence.source}. Search date: ${evidence.searchDate || 'unknown'}. Search scope: ${evidence.searchScope || 'unspecified'}.`,
        'public-search',
      ));
      warnings.push('No matching public record was located. This does not mean no call occurred — only that no matching public record was found in the searched source.');
    } else {
      hasMatch = true;
      findings.push(asVerifiedFact(
        `Evidence found: ${evidence.result} (source: ${evidence.source})`,
        { source: evidence.source, confidence: 0.85, url: evidence.url, excerpt: evidence.result },
      ));
    }
  }

  // Determine status
  let status: LawEnforcementEventStatus = 'user_assertion';
  if (hasMatch && hasNoMatch) {
    status = 'partially_verified';
  } else if (hasMatch) {
    status = 'verified';
  } else if (hasNoMatch) {
    status = 'unknown';
  }

  const summary = `Prior law enforcement event: ${status}. All user-supplied events are treated as USER_ASSERTION until independently verified. ${hasNoMatch ? 'No matching public record was located in the searched source.' : ''}`;

  return {
    status,
    userAccount: input.userAccount,
    evidenceInputs,
    findings,
    summary,
    warnings,
  };
}

// ─── McKinleyville Scenario ───────────────────────────────────────────────────

export function buildMcKinleyvillePoliceEvent(): LawEnforcementEvent {
  return buildLawEnforcementEvent({
    userAccount: 'Multiple law-enforcement officers came to the property approximately two weeks before the code enforcement notice. Officers claimed they were investigating stolen property. The stolen-property allegation was false. Officers later asked for permission to search. Nothing was found. Officers did not enter the home. An officer said there was an open Code Enforcement case on the property.',
    stolenPropertyClaim: 'investigating stolen property',
    searchConducted: true,
    anythingFound: false,
    enteredHome: false,
    openCaseMentioned: true,
    evidenceInputs: [
      {
        type: 'public_search_no_match',
        source: 'public online call-for-service system',
        result: 'No matching public record was located in the searched source.',
        searchDate: new Date().toISOString(),
        searchScope: 'public online call-for-service / incident system',
        searchTerms: ['property address', 'date range'],
      },
    ],
  });
}

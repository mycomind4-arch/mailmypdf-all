/**
 * Strategy Engine
 *
 * Possible strategies: REQUEST_CLARIFICATION, REQUEST_COMPLAINT_INFORMATION,
 * REQUEST_CASE_RECORDS, REQUEST_AUTHORITY, REQUEST_INSPECTION_SCOPE,
 * REQUEST_DEADLINE_CLARIFICATION, REQUEST_PROCEDURAL_BASIS,
 * COORDINATE_INSPECTION, SEEK_EXTENSION, PREPARE_RESPONSE,
 * REQUEST_REVIEW, SEEK_PROFESSIONAL_REVIEW.
 *
 * Never silently choose a legally consequential strategy.
 * For each strategy display: what it does, why it is suggested, supporting evidence,
 * supporting source, unknowns, potential consequences, human-review flag.
 */

import type { Discrepancy } from './discrepancy-engine';
import type { ClassifiedFact } from './fact-taxonomy';
import { asRecommendation } from './fact-taxonomy';

// ─── Strategy Types ───────────────────────────────────────────────────────────

export type StrategyType =
  | 'REQUEST_CLARIFICATION'
  | 'REQUEST_COMPLAINT_INFORMATION'
  | 'REQUEST_CASE_RECORDS'
  | 'REQUEST_AUTHORITY'
  | 'REQUEST_INSPECTION_SCOPE'
  | 'REQUEST_DEADLINE_CLARIFICATION'
  | 'REQUEST_PROCEDURAL_BASIS'
  | 'COORDINATE_INSPECTION'
  | 'SEEK_EXTENSION'
  | 'PREPARE_RESPONSE'
  | 'REQUEST_REVIEW'
  | 'SEEK_PROFESSIONAL_REVIEW';

export interface Strategy {
  type: StrategyType;
  title: string;
  whatItDoes: string;
  whySuggested: string;
  supportingEvidence: string[];
  supportingSource: string;
  unknowns: string[];
  potentialConsequences: string;
  humanReviewFlag: boolean;
  legallyConsequential: boolean;
}

export interface StrategyReport {
  strategies: Strategy[];
  findings: ClassifiedFact[];
  summary: string;
}

// ─── Strategy Engine ──────────────────────────────────────────────────────────

export function generateStrategies(input: {
  discrepancies: Discrepancy[];
  hasComplaintNumber: boolean;
  hasCaseNumber: boolean;
  scopeClarity?: string;
  consentRequested: boolean;
  warrantReferenced: boolean;
  silenceEqualsDenial: boolean;
  hasDeadline: boolean;
  deadlineDate?: string;
  reportedDeceased: boolean;
  jurisdictionResolved: boolean;
  hasInspectionAuthority: boolean;
}): StrategyReport {
  const strategies: Strategy[] = [];
  const findings: ClassifiedFact[] = [];

  // REQUEST_COMPLAINT_INFORMATION — if no complaint number
  if (!input.hasComplaintNumber) {
    strategies.push({
      type: 'REQUEST_COMPLAINT_INFORMATION',
      title: 'Request Complaint Information',
      whatItDoes: 'Ask the agency to provide the complaint number, date, source, and specific allegations.',
      whySuggested: 'No complaint number was found in the notice. Without this reference, the complaint basis cannot be verified.',
      supportingEvidence: ['No complaint number extracted from the notice.'],
      supportingSource: 'notice-extraction',
      unknowns: ['The identity of the complainant', 'The date the complaint was filed', 'The specific allegations made'],
      potentialConsequences: 'The agency may or may not provide this information. A records request (CPRA/PRA) may be needed.',
      humanReviewFlag: true,
      legallyConsequential: false,
    });
  }

  // REQUEST_CASE_RECORDS — if no case number
  if (!input.hasCaseNumber) {
    strategies.push({
      type: 'REQUEST_CASE_RECORDS',
      title: 'Request Case Records',
      whatItDoes: 'Request the case file, including all documents, correspondence, and inspection history.',
      whySuggested: 'No case number was found in the notice. Without a case reference, the enforcement history cannot be reviewed.',
      supportingEvidence: ['No case number extracted from the notice.'],
      supportingSource: 'notice-extraction',
      unknowns: ['Whether a case file exists', 'The history of enforcement actions on this property'],
      potentialConsequences: 'The agency may provide redacted records or may require a formal records request.',
      humanReviewFlag: true,
      legallyConsequential: false,
    });
  }

  // REQUEST_INSPECTION_SCOPE — if scope is ambiguous
  if (input.scopeClarity === 'AMBIGUOUS' || input.scopeClarity === 'UNKNOWN' || input.scopeClarity === 'PARTIAL') {
    strategies.push({
      type: 'REQUEST_INSPECTION_SCOPE',
      title: 'Request Inspection Scope Clarification',
      whatItDoes: 'Ask the agency to specify exactly what areas of the property they seek to inspect.',
      whySuggested: `The inspection scope is ${input.scopeClarity}. Without clear scope, informed consent cannot be given.`,
      supportingEvidence: [`Scope clarity: ${input.scopeClarity}`],
      supportingSource: 'scope-analysis',
      unknowns: ['Whether the inspection includes interior, exterior, outbuildings, or vehicle areas'],
      potentialConsequences: 'Clarifying scope does not constitute consent or refusal. It is a reasonable request for information.',
      humanReviewFlag: true,
      legallyConsequential: false,
    });
  }

  // REQUEST_PROCEDURAL_BASIS — if no inspection authority
  if (!input.hasInspectionAuthority) {
    strategies.push({
      type: 'REQUEST_PROCEDURAL_BASIS',
      title: 'Request Procedural Basis',
      whatItDoes: 'Ask the agency to identify the specific statute, ordinance, or regulation that authorizes the inspection.',
      whySuggested: 'The notice does not clearly state the legal authority for the inspection.',
      supportingEvidence: ['No inspection authority was extracted from the notice.'],
      supportingSource: 'authority-analysis',
      unknowns: ['The specific legal authority claimed', 'Whether the authority is administrative, statutory, or other'],
      potentialConsequences: 'Requesting the procedural basis does not constitute consent or refusal. It is a standard request for information.',
      humanReviewFlag: true,
      legallyConsequential: false,
    });
  }

  // REQUEST_DEADLINE_CLARIFICATION — if deadline exists
  if (input.hasDeadline && input.deadlineDate) {
    strategies.push({
      type: 'REQUEST_DEADLINE_CLARIFICATION',
      title: 'Confirm Response Deadline',
      whatItDoes: 'Confirm the exact response deadline and how it was calculated (from service date, notice date, etc.).',
      whySuggested: `The notice states a deadline of ${input.deadlineDate}. Confirming the calculation basis ensures adequate response time.`,
      supportingEvidence: [`Deadline extracted: ${input.deadlineDate}`],
      supportingSource: 'notice-extraction',
      unknowns: ['Whether the deadline is calculated from the notice date or service date', 'Whether weekends/holidays affect the deadline'],
      potentialConsequences: 'Confirming the deadline does not constitute consent or refusal.',
      humanReviewFlag: true,
      legallyConsequential: false,
    });
  }

  // SEEK_EXTENSION — if deadline is approaching
  if (input.hasDeadline) {
    strategies.push({
      type: 'SEEK_EXTENSION',
      title: 'Seek Deadline Extension',
      whatItDoes: 'Request an extension of the response deadline to allow time for information gathering and professional review.',
      whySuggested: 'Given the complexity of the situation, additional time may be needed to properly respond.',
      supportingEvidence: ['Complex situation involving multiple allegations, potential deceased recipient discrepancy, and prior law enforcement contact.'],
      supportingSource: 'case-analysis',
      unknowns: ['Whether the agency will grant an extension', 'How much additional time may be available'],
      potentialConsequences: 'An extension request does not constitute consent or refusal. The agency may or may not grant it.',
      humanReviewFlag: true,
      legallyConsequential: false,
    });
  }

  // SEEK_PROFESSIONAL_REVIEW — always suggest for high-consequence situations
  if (input.consentRequested || input.warrantReferenced || input.silenceEqualsDenial || input.reportedDeceased) {
    strategies.push({
      type: 'SEEK_PROFESSIONAL_REVIEW',
      title: 'Seek Professional Review',
      whatItDoes: 'Consult with a qualified attorney or legal professional before responding to the notice.',
      whySuggested: 'This situation involves legally consequential elements (consent request, warrant reference, silence-equals-denial language, deceased recipient).',
      supportingEvidence: [
        input.consentRequested ? 'Consent is being requested.' : '',
        input.warrantReferenced ? 'Warrant is referenced.' : '',
        input.silenceEqualsDenial ? 'Silence equals denial per the notice.' : '',
        input.reportedDeceased ? 'Notice is addressed to a reportedly deceased person.' : '',
      ].filter(Boolean),
      supportingSource: 'authority-analysis',
      unknowns: ['Whether an attorney will take the case', 'The cost of legal representation'],
      potentialConsequences: 'Professional legal review may affect the response strategy and timeline.',
      humanReviewFlag: true,
      legallyConsequential: true,
    });
  }

  // PREPARE_RESPONSE — always available
  strategies.push({
    type: 'PREPARE_RESPONSE',
    title: 'Prepare a Response',
    whatItDoes: 'Draft a factual, professional response that acknowledges the notice, requests clarification, and preserves rights.',
    whySuggested: 'A well-prepared response demonstrates good faith and creates a record of communication.',
    supportingEvidence: ['The notice requires a response by the stated deadline.'],
    supportingSource: 'workflow-definition',
    unknowns: ['The exact content depends on which clarifications are requested'],
    potentialConsequences: 'A response creates a formal record. Its content should be carefully reviewed before sending.',
    humanReviewFlag: true,
    legallyConsequential: true,
  });

  // Generate findings
  findings.push(asRecommendation(
    `${strategies.length} response strategies have been identified. Each requires human review before action.`,
    'strategy-engine',
  ));

  const summary = `${strategies.length} strategies generated. ${strategies.filter(s => s.legallyConsequential).length} are legally consequential and require explicit human approval.`;

  return { strategies, findings, summary };
}

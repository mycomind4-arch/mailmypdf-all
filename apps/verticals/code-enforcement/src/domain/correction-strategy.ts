/**
 * Correction Strategy Engine
 *
 * Strategies: CORRECT_RECIPIENT, CORRECT_PROPERTY, CORRECT_OWNER, CORRECT_CASE_INFORMATION,
 * CORRECT_COMPLAINT_REFERENCE, CORRECT_DEADLINE, CLARIFY_SCOPE, CLARIFY_AUTHORITY,
 * CLARIFY_PURPOSE, REQUEST_RECORDS, REQUEST_AMENDED_NOTICE, REQUEST_SUPPLEMENTAL_INFORMATION,
 * REQUEST_FORMAL_CONFIRMATION, REQUEST_PROFESSIONAL_REVIEW.
 *
 * Follows the minimal-effective-correction principle:
 * Prefer the narrowest request that fixes the identified issue.
 * Do not generate an enormous records request if only the recipient is wrong.
 * Do not accuse the agency of unlawful conduct if only the scope is unclear.
 *
 * Never silently choose a legally consequential strategy.
 * For each strategy display: what, why, evidence, source, unknowns, consequences, review flag.
 */

import type { CorrectionIssue, CorrectionCategory } from './correction-issue-engine';
import type { ClassifiedFact } from './fact-taxonomy';
import { asRecommendation } from './fact-taxonomy';

// ─── Strategy Types ──────────────────────────────────────────────────────────

export type CorrectionStrategyType =
  | 'CORRECT_RECIPIENT'
  | 'CORRECT_PROPERTY'
  | 'CORRECT_OWNER'
  | 'CORRECT_CASE_INFORMATION'
  | 'CORRECT_COMPLAINT_REFERENCE'
  | 'CORRECT_DEADLINE'
  | 'CLARIFY_SCOPE'
  | 'CLARIFY_AUTHORITY'
  | 'CLARIFY_PURPOSE'
  | 'REQUEST_RECORDS'
  | 'REQUEST_AMENDED_NOTICE'
  | 'REQUEST_SUPPLEMENTAL_INFORMATION'
  | 'REQUEST_FORMAL_CONFIRMATION'
  | 'REQUEST_PROFESSIONAL_REVIEW';

export interface CorrectionStrategy {
  type: CorrectionStrategyType;
  title: string;
  whatItDoes: string;
  whySuggested: string;
  supportingEvidence: string[];
  supportingSource: string;
  unknowns: string[];
  potentialConsequences: string;
  humanReviewFlag: boolean;
  legallyConsequential: boolean;
  relatedIssues: CorrectionCategory[];
}

export interface CorrectionStrategyReport {
  strategies: CorrectionStrategy[];
  findings: ClassifiedFact[];
  minimalEffectiveApplied: boolean;
  summary: string;
}

// ─── Strategy Definitions ──────────────────────────────────────────────────────

const STRATEGY_DEFINITIONS: Record<CorrectionStrategyType, Omit<CorrectionStrategy, 'whatItDoes' | 'whySuggested' | 'supportingEvidence' | 'supportingSource' | 'unknowns' | 'potentialConsequences' | 'relatedIssues'>> = {
  CORRECT_RECIPIENT: {
    type: 'CORRECT_RECIPIENT',
    title: 'Request Correction of Recipient',
    humanReviewFlag: true,
    legallyConsequential: false,
  },
  CORRECT_PROPERTY: {
    type: 'CORRECT_PROPERTY',
    title: 'Request Correction of Property Information',
    humanReviewFlag: true,
    legallyConsequential: false,
  },
  CORRECT_OWNER: {
    type: 'CORRECT_OWNER',
    title: 'Request Correction of Ownership Information',
    humanReviewFlag: true,
    legallyConsequential: false,
  },
  CORRECT_CASE_INFORMATION: {
    type: 'CORRECT_CASE_INFORMATION',
    title: 'Request Correction of Case Information',
    humanReviewFlag: false,
    legallyConsequential: false,
  },
  CORRECT_COMPLAINT_REFERENCE: {
    type: 'CORRECT_COMPLAINT_REFERENCE',
    title: 'Request Complaint Reference Information',
    humanReviewFlag: false,
    legallyConsequential: false,
  },
  CORRECT_DEADLINE: {
    type: 'CORRECT_DEADLINE',
    title: 'Request Deadline Clarification or Correction',
    humanReviewFlag: true,
    legallyConsequential: true,
  },
  CLARIFY_SCOPE: {
    type: 'CLARIFY_SCOPE',
    title: 'Request Inspection Scope Clarification',
    humanReviewFlag: false,
    legallyConsequential: false,
  },
  CLARIFY_AUTHORITY: {
    type: 'CLARIFY_AUTHORITY',
    title: 'Request Authority Identification',
    humanReviewFlag: true,
    legallyConsequential: false,
  },
  CLARIFY_PURPOSE: {
    type: 'CLARIFY_PURPOSE',
    title: 'Request Purpose Clarification',
    humanReviewFlag: false,
    legallyConsequential: false,
  },
  REQUEST_RECORDS: {
    type: 'REQUEST_RECORDS',
    title: 'Request Case/Complaint Records',
    humanReviewFlag: false,
    legallyConsequential: false,
  },
  REQUEST_AMENDED_NOTICE: {
    type: 'REQUEST_AMENDED_NOTICE',
    title: 'Request Amended Notice',
    humanReviewFlag: true,
    legallyConsequential: false,
  },
  REQUEST_SUPPLEMENTAL_INFORMATION: {
    type: 'REQUEST_SUPPLEMENTAL_INFORMATION',
    title: 'Request Supplemental Information',
    humanReviewFlag: false,
    legallyConsequential: false,
  },
  REQUEST_FORMAL_CONFIRMATION: {
    type: 'REQUEST_FORMAL_CONFIRMATION',
    title: 'Request Formal Confirmation',
    humanReviewFlag: false,
    legallyConsequential: false,
  },
  REQUEST_PROFESSIONAL_REVIEW: {
    type: 'REQUEST_PROFESSIONAL_REVIEW',
    title: 'Recommend Professional Legal Review',
    humanReviewFlag: true,
    legallyConsequential: true,
  },
};

// ─── Issue → Strategy Mapping ────────────────────────────────────────────────

const ISSUE_TO_STRATEGY: Record<CorrectionCategory, CorrectionStrategyType> = {
  WRONG_RECIPIENT: 'CORRECT_RECIPIENT',
  DECEASED_RECIPIENT: 'CORRECT_RECIPIENT',
  WRONG_OWNER: 'CORRECT_OWNER',
  WRONG_OCCUPANT: 'CORRECT_RECIPIENT',
  WRONG_PROPERTY: 'CORRECT_PROPERTY',
  WRONG_APN: 'CORRECT_PROPERTY',
  WRONG_ADDRESS: 'CORRECT_PROPERTY',
  WRONG_CASE_NUMBER: 'CORRECT_CASE_INFORMATION',
  WRONG_COMPLAINT_NUMBER: 'CORRECT_COMPLAINT_REFERENCE',
  WRONG_AGENCY: 'CORRECT_CASE_INFORMATION',
  WRONG_DEPARTMENT: 'CORRECT_CASE_INFORMATION',
  WRONG_DATE: 'CORRECT_DEADLINE',
  WRONG_DEADLINE: 'CORRECT_DEADLINE',
  INCORRECT_INSPECTION_TIME: 'CLARIFY_SCOPE',
  AMBIGUOUS_SCOPE: 'CLARIFY_SCOPE',
  OVERBROAD_SCOPE: 'CLARIFY_SCOPE',
  MISSING_SCOPE: 'CLARIFY_SCOPE',
  MISSING_AUTHORITY: 'CLARIFY_AUTHORITY',
  AMBIGUOUS_AUTHORITY: 'CLARIFY_AUTHORITY',
  MISSING_COMPLAINT_BASIS: 'CORRECT_COMPLAINT_REFERENCE',
  MISSING_REFERENCE: 'CORRECT_COMPLAINT_REFERENCE',
  CONTRADICTORY_NOTICE: 'REQUEST_AMENDED_NOTICE',
  INCORRECT_FACTUAL_ASSERTION: 'REQUEST_AMENDED_NOTICE',
  MISSING_CONTACT: 'REQUEST_SUPPLEMENTAL_INFORMATION',
  MISSING_INSTRUCTIONS: 'REQUEST_SUPPLEMENTAL_INFORMATION',
  OTHER: 'REQUEST_SUPPLEMENTAL_INFORMATION',
};

// ─── Strategy Builder ────────────────────────────────────────────────────────

function buildStrategy(
  type: CorrectionStrategyType,
  issues: CorrectionIssue[],
): CorrectionStrategy {
  const def = STRATEGY_DEFINITIONS[type];
  const relatedIssues = issues
    .filter((i) => ISSUE_TO_STRATEGY[i.category] === type)
    .map((i) => i.category);

  const whatItDoes = strategyDescriptions(type);
  const whySuggested = `Triggered by ${relatedIssues.length} correction issue(s): ${relatedIssues.join(', ')}.`;
  const supportingEvidence = issues
    .filter((i) => ISSUE_TO_STRATEGY[i.category] === type)
    .map((i) => i.description);
  const unknowns = strategyUnknowns(type, issues);

  return {
    ...def,
    whatItDoes,
    whySuggested,
    supportingEvidence,
    supportingSource: 'Correction issue engine analysis',
    unknowns,
    potentialConsequences: strategyConsequences(type),
    relatedIssues,
  };
}

function strategyDescriptions(type: CorrectionStrategyType): string {
  const descriptions: Record<CorrectionStrategyType, string> = {
    CORRECT_RECIPIENT: 'Request the agency to update the responsible-party/recipient information for this matter. Identify the current legal owner or responsible party and confirm whether an amended notice should be issued.',
    CORRECT_PROPERTY: 'Request the agency to correct the property address, APN, or parcel information on the notice to match authoritative property records.',
    CORRECT_OWNER: 'Request the agency to update ownership information to reflect current property records.',
    CORRECT_CASE_INFORMATION: 'Request the agency to correct the case number, agency name, or department information.',
    CORRECT_COMPLAINT_REFERENCE: 'Request the agency to provide the complaint number, complaint date, and complaint basis.',
    CORRECT_DEADLINE: 'Request the agency to clarify or correct the response deadline. Identify the statutory or regulatory basis for the deadline.',
    CLARIFY_SCOPE: 'Request the agency to specify the exact inspection scope: what areas, what activities, what alleged conditions, expected duration.',
    CLARIFY_AUTHORITY: 'Request the agency to identify the specific ordinance, statute, regulation, or order under which the inspection is being sought.',
    CLARIFY_PURPOSE: 'Request the agency to clarify the stated purpose of the inspection and what conditions are being investigated.',
    REQUEST_RECORDS: 'Request case records, complaint records, and prior correspondence related to this matter.',
    REQUEST_AMENDED_NOTICE: 'Request the agency to issue an amended notice correcting the identified issues.',
    REQUEST_SUPPLEMENTAL_INFORMATION: 'Request the agency to provide missing contact information, submission instructions, or other required details.',
    REQUEST_FORMAL_CONFIRMATION: 'Request the agency to formally confirm the corrected information in writing.',
    REQUEST_PROFESSIONAL_REVIEW: 'Recommend the user consult with a qualified attorney before responding.',
  };
  return descriptions[type];
}

function strategyUnknowns(type: CorrectionStrategyType, _issues: CorrectionIssue[]): string[] {
  const base: Record<CorrectionStrategyType, string[]> = {
    CORRECT_RECIPIENT: ['Whether the agency has updated ownership records', 'Whether an estate or probate proceeding affects ownership', 'Whether the agency will issue an amended notice'],
    CORRECT_PROPERTY: ['Whether the APN discrepancy is a clerical error or a different property', 'Whether the agency has the correct parcel data'],
    CORRECT_OWNER: ['Whether ownership has been formally transferred', 'Whether the agency has access to current county records'],
    CORRECT_CASE_INFORMATION: ['Whether the case number is correct but misidentified', 'Whether the case has been consolidated'],
    CORRECT_COMPLAINT_REFERENCE: ['Whether a complaint number exists', 'Whether the complaint is anonymous', 'Whether the complaint basis has been recorded'],
    CORRECT_DEADLINE: ['Whether the deadline is statutory or administrative', 'Whether the agency has discretion to extend', 'Whether the deadline has been correctly calculated'],
    CLARIFY_SCOPE: ['Whether the scope includes interior inspection', 'Whether testing or sampling is contemplated', 'Whether the scope can be narrowed'],
    CLARIFY_AUTHORITY: ['Whether specific authority exists for this type of inspection', 'Whether the authority is statutory or administrative'],
    CLARIFY_PURPOSE: ['What specific conditions triggered the inspection request', 'Whether the purpose is limited to the alleged violations'],
    REQUEST_RECORDS: ['What records exist', 'Whether records are subject to public records request', 'Whether records are exempt'],
    REQUEST_AMENDED_NOTICE: ['Whether the agency will agree to amend', 'Whether the original notice remains in effect pending amendment'],
    REQUEST_SUPPLEMENTAL_INFORMATION: ['Whether the missing information is required for response', 'Whether the agency has a standard form'],
    REQUEST_FORMAL_CONFIRMATION: ['Whether the agency will provide written confirmation', 'Whether verbal confirmation would suffice'],
    REQUEST_PROFESSIONAL_REVIEW: ['Whether an attorney is available', 'Whether the user qualifies for legal aid'],
  };
  return base[type] ?? [];
}

function strategyConsequences(type: CorrectionStrategyType): string {
  const consequences: Record<CorrectionStrategyType, string> = {
    CORRECT_RECIPIENT: 'The agency may issue an amended notice to the correct party. The response deadline may be reset. The case may be updated.',
    CORRECT_PROPERTY: 'The agency may correct the property information. If a different property is involved, the case may be transferred.',
    CORRECT_OWNER: 'The agency may update ownership records. An amended notice may be issued.',
    CORRECT_CASE_INFORMATION: 'The agency may provide the correct case number. No substantive change to the inspection request.',
    CORRECT_COMPLAINT_REFERENCE: 'The agency may provide complaint details. The user may gain insight into the basis of the inspection.',
    CORRECT_DEADLINE: 'The agency may extend or clarify the deadline. The user may gain additional response time. The deadline may be confirmed.',
    CLARIFY_SCOPE: 'The agency may specify the inspection scope. The user may be able to limit consent to specific areas.',
    CLARIFY_AUTHORITY: 'The agency may identify the legal authority. The user may be able to assess the legal basis.',
    CLARIFY_PURPOSE: 'The agency may clarify the inspection purpose. The user may better understand what is being investigated.',
    REQUEST_RECORDS: 'The agency may provide records. The user may gain additional context. Some records may be withheld.',
    REQUEST_AMENDED_NOTICE: 'The agency may issue an amended notice. The original notice may be withdrawn or supplemented.',
    REQUEST_SUPPLEMENTAL_INFORMATION: 'The agency may provide missing details. The user may be better positioned to respond.',
    REQUEST_FORMAL_CONFIRMATION: 'The agency may provide written confirmation. The user may have a documented record of corrections.',
    REQUEST_PROFESSIONAL_REVIEW: 'The user may obtain legal advice. An attorney may recommend a different course of action.',
  };
  return consequences[type] ?? '';
}

// ─── Main Strategy Generator ──────────────────────────────────────────────────

export function generateCorrectionStrategies(issues: CorrectionIssue[]): CorrectionStrategyReport {
  // Apply minimal-effective-correction principle
  // Group issues by their mapped strategy type
  const strategyTypes = new Set<CorrectionStrategyType>();
  for (const issue of issues) {
    strategyTypes.add(ISSUE_TO_STRATEGY[issue.category]);
  }

  // If there are high-severity issues, also suggest professional review
  const hasCritical = issues.some((i) => i.severity === 'critical');
  if (hasCritical) {
    strategyTypes.add('REQUEST_PROFESSIONAL_REVIEW');
  }

  const strategies = Array.from(strategyTypes).map((type) => buildStrategy(type, issues));

  // Create findings as recommendations
  const findings: ClassifiedFact[] = issues.map((i) =>
    asRecommendation(
      `Correction needed: ${i.category}. ${i.description}`,
      `correction_issue_engine (confidence: ${i.confidence})`,
    ),
  );

  const summary = `${strategies.length} strategy/stategies identified for ${issues.length} correction issue(s). Minimal-effective-correction principle applied.`;

  return {
    strategies,
    findings,
    minimalEffectiveApplied: true,
    summary,
  };
}

// ─── Contradiction Detection ──────────────────────────────────────────────────

export function detectContradictions(issues: CorrectionIssue[]): {
  contradictions: { issue1: CorrectionIssue; issue2: CorrectionIssue; description: string }[];
} {
  const contradictions: { issue1: CorrectionIssue; issue2: CorrectionIssue; description: string }[] = [];

  // Check for conflicting issues on the same category
  const byCategory = new Map<CorrectionCategory, CorrectionIssue[]>();
  for (const issue of issues) {
    if (!byCategory.has(issue.category)) byCategory.set(issue.category, []);
    byCategory.get(issue.category)!.push(issue);
  }

  for (const [, categoryIssues] of byCategory) {
    if (categoryIssues.length > 1) {
      // Multiple issues of same category — check if they conflict
      for (let i = 0; i < categoryIssues.length - 1; i++) {
        for (let j = i + 1; j < categoryIssues.length; j++) {
          if (categoryIssues[i].expectedValue !== categoryIssues[j].expectedValue) {
            contradictions.push({
              issue1: categoryIssues[i],
              issue2: categoryIssues[j],
              description: `Conflicting expected values for ${categoryIssues[i].category}: "${categoryIssues[i].expectedValue}" vs "${categoryIssues[j].expectedValue}".`,
            });
          }
        }
      }
    }
  }

  return { contradictions };
}

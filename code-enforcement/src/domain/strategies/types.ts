/**
 * Correction Strategy Types and Interfaces
 *
 * Strategies: CORRECT_RECIPIENT, CORRECT_PROPERTY, CORRECT_OWNER, CORRECT_CASE_INFORMATION,
 * CORRECT_COMPLAINT_REFERENCE, CORRECT_DEADLINE, CLARIFY_SCOPE, CLARIFY_AUTHORITY,
 * CLARIFY_PURPOSE, REQUEST_RECORDS, REQUEST_AMENDED_NOTICE, REQUEST_SUPPLEMENTAL_INFORMATION,
 * REQUEST_FORMAL_CONFIRMATION, REQUEST_PROFESSIONAL_REVIEW.
 */

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

// Placeholder types for dependencies (these should be imported from their real modules once available)
export type CorrectionCategory = string;

export interface ClassifiedFact {
  type: string;
  description: string;
  source?: string;
}

export interface CorrectionIssue {
  category: CorrectionCategory;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  expectedValue?: string;
}

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

/**
 * Correction Issue Engine
 *
 * Reusable issue type for identifying what is wrong/incomplete about an inspection request.
 *
 * Categories: WRONG_RECIPIENT, DECEASED_RECIPIENT, WRONG_OWNER, WRONG_OCCUPANT,
 * WRONG_PROPERTY, WRONG_APN, WRONG_ADDRESS, WRONG_CASE_NUMBER, WRONG_COMPLAINT_NUMBER,
 * WRONG_AGENCY, WRONG_DEPARTMENT, WRONG_DATE, WRONG_DEADLINE, INCORRECT_INSPECTION_TIME,
 * AMBIGUOUS_SCOPE, OVERBROAD_SCOPE, MISSING_SCOPE, MISSING_AUTHORITY, AMBIGUOUS_AUTHORITY,
 * MISSING_COMPLAINT_BASIS, MISSING_REFERENCE, CONTRADICTORY_NOTICE,
 * INCORRECT_FACTUAL_ASSERTION, MISSING_CONTACT, MISSING_INSTRUCTIONS, OTHER.
 *
 * Every issue has: id, category, severity, status, description, expectedValue,
 * observedValue, evidenceIds, sourceIds, confidence, jurisdictionImpact, requiresHumanReview.
 */

import type { Discrepancy, DiscrepancyType } from './discrepancy-engine';
import type { ClassifiedFact, FactStatus } from './fact-taxonomy';

// ─── Correction Issue Types ───────────────────────────────────────────────────

export type CorrectionCategory =
  | 'WRONG_RECIPIENT'
  | 'DECEASED_RECIPIENT'
  | 'WRONG_OWNER'
  | 'WRONG_OCCUPANT'
  | 'WRONG_PROPERTY'
  | 'WRONG_APN'
  | 'WRONG_ADDRESS'
  | 'WRONG_CASE_NUMBER'
  | 'WRONG_COMPLAINT_NUMBER'
  | 'WRONG_AGENCY'
  | 'WRONG_DEPARTMENT'
  | 'WRONG_DATE'
  | 'WRONG_DEADLINE'
  | 'INCORRECT_INSPECTION_TIME'
  | 'AMBIGUOUS_SCOPE'
  | 'OVERBROAD_SCOPE'
  | 'MISSING_SCOPE'
  | 'MISSING_AUTHORITY'
  | 'AMBIGUOUS_AUTHORITY'
  | 'MISSING_COMPLAINT_BASIS'
  | 'MISSING_REFERENCE'
  | 'CONTRADICTORY_NOTICE'
  | 'INCORRECT_FACTUAL_ASSERTION'
  | 'MISSING_CONTACT'
  | 'MISSING_INSTRUCTIONS'
  | 'OTHER';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueStatus = 'open' | 'investigating' | 'confirmed' | 'resolved' | 'rejected';

export interface CorrectionIssue {
  id: string;
  category: CorrectionCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  description: string;
  expectedValue?: string;
  observedValue?: string;
  evidenceIds: string[];
  sourceIds: string[];
  confidence: number;
  jurisdictionImpact: boolean;
  requiresHumanReview: boolean;
  factStatus: FactStatus;
  createdAt: string;
}

export interface CorrectionIssueReport {
  issues: CorrectionIssue[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  confirmedCount: number;
  openCount: number;
  requiresHumanReview: boolean;
  summary: string;
  categories: CorrectionCategory[];
}

// ─── Severity Rules ──────────────────────────────────────────────────────────

const HIGH_CONSEQUENCE_CATEGORIES: Set<CorrectionCategory> = new Set([
  'DECEASED_RECIPIENT',
  'WRONG_RECIPIENT',
  'WRONG_OWNER',
  'WRONG_PROPERTY',
  'WRONG_APN',
  'WRONG_CASE_NUMBER',
  'WRONG_DEADLINE',
  'AMBIGUOUS_AUTHORITY',
  'MISSING_AUTHORITY',
  'CONTRADICTORY_NOTICE',
]);

function severityForCategory(category: CorrectionCategory): IssueSeverity {
  if (category === 'DECEASED_RECIPIENT' || category === 'WRONG_RECIPIENT' || category === 'WRONG_PROPERTY') {
    return 'critical';
  }
  if (HIGH_CONSEQUENCE_CATEGORIES.has(category)) {
    return 'high';
  }
  if (
    category === 'AMBIGUOUS_SCOPE' ||
    category === 'MISSING_SCOPE' ||
    category === 'MISSING_COMPLAINT_BASIS' ||
    category === 'MISSING_REFERENCE' ||
    category === 'MISSING_CONTACT' ||
    category === 'MISSING_INSTRUCTIONS'
  ) {
    return 'medium';
  }
  return 'low';
}

// ─── Issue Factory ────────────────────────────────────────────────────────────

let issueCounter = 0;

export function createCorrectionIssue(input: {
  category: CorrectionCategory;
  description: string;
  expectedValue?: string;
  observedValue?: string;
  evidenceIds?: string[];
  sourceIds?: string[];
  confidence?: number;
  factStatus?: FactStatus;
}): CorrectionIssue {
  issueCounter++;
  const severity = severityForCategory(input.category);
  return {
    id: `correction-issue-${issueCounter}`,
    category: input.category,
    severity,
    status: 'open',
    description: input.description,
    expectedValue: input.expectedValue,
    observedValue: input.observedValue,
    evidenceIds: input.evidenceIds ?? [],
    sourceIds: input.sourceIds ?? [],
    confidence: input.confidence ?? 0.8,
    jurisdictionImpact: false,
    requiresHumanReview: HIGH_CONSEQUENCE_CATEGORIES.has(input.category),
    factStatus: input.factStatus ?? 'user_assertion',
    createdAt: new Date().toISOString(),
  };
}

// ─── Discrepancy → Correction Issue Mapping ───────────────────────────────────

const DISCREPANCY_TO_CATEGORY: Record<DiscrepancyType, CorrectionCategory> = {
  recipient_mismatch: 'WRONG_RECIPIENT',
  owner_mismatch: 'WRONG_OWNER',
  property_mismatch: 'WRONG_PROPERTY',
  apn_mismatch: 'WRONG_APN',
  complaint_mismatch: 'MISSING_COMPLAINT_BASIS',
  case_number_mismatch: 'WRONG_CASE_NUMBER',
  date_mismatch: 'WRONG_DATE',
  deadline_mismatch: 'WRONG_DEADLINE',
  authority_mismatch: 'MISSING_AUTHORITY',
  scope_mismatch: 'AMBIGUOUS_SCOPE',
  timeline_inconsistency: 'CONTRADICTORY_NOTICE',
  missing_service_evidence: 'MISSING_REFERENCE',
  missing_complaint_reference: 'MISSING_COMPLAINT_BASIS',
  missing_inspection_basis: 'MISSING_REFERENCE',
  public_record_no_match: 'OTHER',
  deceased_recipient: 'DECEASED_RECIPIENT',
  general: 'OTHER',
};

export function issueFromDiscrepancy(discrepancy: Discrepancy): CorrectionIssue {
  const category = DISCREPANCY_TO_CATEGORY[discrepancy.type] ?? 'OTHER';
  return {
    id: `correction-issue-from-${discrepancy.id}`,
    category,
    severity: discrepancy.severity === 'high' ? 'critical' : discrepancy.severity === 'medium' ? 'high' : 'medium',
    status: 'open',
    description: discrepancy.evidence,
    evidenceIds: [discrepancy.id],
    sourceIds: [],
    confidence: discrepancy.confidence,
    jurisdictionImpact: false,
    requiresHumanReview: discrepancy.involvesHighConsequence,
    factStatus: 'conflict',
    createdAt: new Date().toISOString(),
  };
}

// ─── Deceased Recipient Issue ────────────────────────────────────────────────

export function createDeceasedRecipientIssue(input: {
  deceasedName: string;
  noticeRecipientName: string;
  evidenceIds?: string[];
  confidence?: number;
}): CorrectionIssue {
  return createCorrectionIssue({
    category: 'DECEASED_RECIPIENT',
    description: `The notice is addressed to ${input.deceasedName}, who is reported to be deceased. The current responsible party for this property has not been established. The notice may be based on stale ownership or case data.`,
    expectedValue: 'Current legal owner or responsible party',
    observedValue: input.noticeRecipientName,
    evidenceIds: input.evidenceIds,
    confidence: input.confidence ?? 0.7,
    factStatus: 'user_assertion',
  });
}

// ─── Issue Report Builder ─────────────────────────────────────────────────────

export function buildCorrectionIssueReport(issues: CorrectionIssue[]): CorrectionIssueReport {
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;
  const confirmedCount = issues.filter((i) => i.status === 'confirmed').length;
  const openCount = issues.filter((i) => i.status === 'open').length;
  const categories = [...new Set(issues.map((i) => i.category))];
  const requiresHumanReview = issues.some((i) => i.requiresHumanReview);
  const summary = `${issues.length} correction issue(s) identified: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low. Categories: ${categories.join(', ')}.`;

  return {
    issues,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    confirmedCount,
    openCount,
    requiresHumanReview,
    summary,
    categories,
  };
}

// ─── Minimal-Effective-Correction Filter ──────────────────────────────────────

/**
 * Prefer the narrowest set of issues that fix the identified problems.
 * Do not escalate or inflate beyond what evidence supports.
 */
export function filterMinimalEffective(issues: CorrectionIssue[]): CorrectionIssue[] {
  // Group by category — if multiple issues of same category, keep highest confidence
  const byCategory = new Map<CorrectionCategory, CorrectionIssue>();
  for (const issue of issues) {
    const existing = byCategory.get(issue.category);
    if (!existing || issue.confidence > existing.confidence) {
      byCategory.set(issue.category, issue);
    }
  }
  // Only include issues with confidence >= 0.5
  return Array.from(byCategory.values()).filter((i) => i.confidence >= 0.5);
}

// ─── Issue → Strategy Suggestion ──────────────────────────────────────────────

export function suggestStrategyForIssue(category: CorrectionCategory): string {
  const strategyMap: Record<CorrectionCategory, string> = {
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
  return strategyMap[category] ?? 'REQUEST_SUPPLEMENTAL_INFORMATION';
}

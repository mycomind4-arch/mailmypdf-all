/**
 * Reconciliation Engine for Correction Workflow
 *
 * Compares notice values against authoritative records.
 * Reuses existing property intelligence, jurisdiction, and discrepancy types.
 *
 * Reconciliation results: CONSISTENT, INCONSISTENT, PARTIALLY_MATCHED, UNVERIFIED.
 *
 * Never silently overwrite notice data. Preserve both document value and verified/current value.
 */

import type { NoticeExtraction } from './notice-extraction';
import type { CorrectionIssue } from './correction-issue-engine';
import { createCorrectionIssue } from './correction-issue-engine';
import type { PropertyRecord } from './property-intelligence';
import type { Discrepancy } from './discrepancy-engine';

// ─── Reconciliation Result Types ──────────────────────────────────────────────

export type ReconciliationResult = 'CONSISTENT' | 'INCONSISTENT' | 'PARTIALLY_MATCHED' | 'UNVERIFIED';

export interface FieldReconciliation {
  field: string;
  noticeValue: string | undefined;
  recordValue: string | undefined;
  result: ReconciliationResult;
  evidenceId: string;
}

export interface ReconciliationReport {
  fields: FieldReconciliation[];
  overall: ReconciliationResult;
  issues: CorrectionIssue[];
  summary: string;
}

// ─── Helper: Compare Two Values ──────────────────────────────────────────────

function compareValues(
  noticeVal: string | undefined,
  recordVal: string | undefined,
  field: string,
): { result: ReconciliationResult; issue?: CorrectionIssue } {
  // Both missing
  if (!noticeVal && !recordVal) {
    return { result: 'UNVERIFIED' };
  }
  // Notice has value, record does not
  if (noticeVal && !recordVal) {
    return { result: 'UNVERIFIED' };
  }
  // Record has value, notice does not — missing from notice
  if (!noticeVal && recordVal) {
    return {
      result: 'UNVERIFIED',
      issue: createCorrectionIssue({
        category: 'MISSING_REFERENCE',
        description: `Notice does not include ${field}. Record value: ${recordVal}.`,
        expectedValue: recordVal,
        observedValue: '(missing from notice)',
        confidence: 0.6,
      }),
    };
  }
  // Both present — compare
  const normalizedNotice = noticeVal!.toLowerCase().trim();
  const normalizedRecord = recordVal!.toLowerCase().trim();
  if (normalizedNotice === normalizedRecord) {
    return { result: 'CONSISTENT' };
  }
  // Partial match check — e.g., address contains same street
  if (
    normalizedNotice.length > 5 &&
    normalizedRecord.length > 5 &&
    (normalizedNotice.includes(normalizedRecord) || normalizedRecord.includes(normalizedNotice))
  ) {
    return { result: 'PARTIALLY_MATCHED' };
  }
  // Inconsistent
  return { result: 'INCONSISTENT' };
}

// ─── Recipient Reconciliation ─────────────────────────────────────────────────

export function reconcileRecipient(input: {
  noticeRecipient: string | undefined;
  reportedDeceased?: boolean;
  deceasedName?: string;
  currentOwner?: string;
  propertyRecord?: PropertyRecord;
}): ReconciliationReport {
  const fields: FieldReconciliation[] = [];
  const issues: CorrectionIssue[] = [];

  // Check for deceased recipient first
  if (input.reportedDeceased && input.deceasedName) {
    issues.push(
      createCorrectionIssue({
        category: 'DECEASED_RECIPIENT',
        description: `The notice is addressed to ${input.deceasedName}, who is reported to be deceased. The current responsible party for this property has not been established.`,
        expectedValue: 'Current legal owner or responsible party',
        observedValue: input.deceasedName,
        confidence: 0.7,
        factStatus: 'user_assertion',
      }),
    );
  }

  // Compare notice recipient to property record owner
  const ownerComparison = compareValues(
    input.noticeRecipient,
    input.currentOwner ?? input.propertyRecord?.ownerOfRecord,
    'property owner',
  );

  fields.push({
    field: 'recipient_vs_owner',
    noticeValue: input.noticeRecipient,
    recordValue: input.currentOwner ?? input.propertyRecord?.ownerOfRecord,
    result: ownerComparison.result,
    evidenceId: `recipient-recon-${Date.now()}`,
  });

  if (ownerComparison.result === 'INCONSISTENT') {
    issues.push(
      createCorrectionIssue({
        category: 'WRONG_RECIPIENT',
        description: `Notice recipient (${input.noticeRecipient}) does not match current property owner (${input.currentOwner ?? input.propertyRecord?.ownerOfRecord}).`,
        expectedValue: input.currentOwner ?? input.propertyRecord?.ownerOfRecord,
        observedValue: input.noticeRecipient,
        confidence: 0.75,
        factStatus: 'conflict',
      }),
    );
  }

  if (ownerComparison.issue) issues.push(ownerComparison.issue);

  return {
    fields,
    overall: issues.length > 0 ? 'INCONSISTENT' : ownerComparison.result,
    issues,
    summary: `Recipient reconciliation: ${issues.length > 0 ? `${issues.length} issue(s) found` : ownerComparison.result.toLowerCase()}.`,
  };
}

// ─── Property Reconciliation ──────────────────────────────────────────────────

export function reconcileProperty(input: {
  extraction: NoticeExtraction;
  propertyRecord?: PropertyRecord;
}): ReconciliationReport {
  const fields: FieldReconciliation[] = [];
  const issues: CorrectionIssue[] = [];

  const checks: { field: string; noticeVal: string | undefined; recordVal: string | undefined; issueCategory: CorrectionIssue['category'] }[] = [
    {
      field: 'address',
      noticeVal: input.extraction.propertyAddress.value,
      recordVal: input.propertyRecord?.address,
      issueCategory: 'WRONG_ADDRESS',
    },
    {
      field: 'apn',
      noticeVal: input.extraction.apn.value,
      recordVal: input.propertyRecord?.apn,
      issueCategory: 'WRONG_APN',
    },
    {
      field: 'parcel_number',
      noticeVal: input.extraction.parcelNumber.value,
      recordVal: input.propertyRecord?.parcelNumber,
      issueCategory: 'WRONG_APN',
    },
  ];

  for (const check of checks) {
    const comparison = compareValues(check.noticeVal, check.recordVal, check.field);
    fields.push({
      field: check.field,
      noticeValue: check.noticeVal,
      recordValue: check.recordVal,
      result: comparison.result,
      evidenceId: `property-recon-${check.field}-${Date.now()}`,
    });
    if (comparison.result === 'INCONSISTENT') {
      issues.push(
        createCorrectionIssue({
          category: check.issueCategory,
          description: `Notice ${check.field} (${check.noticeVal}) does not match property record (${check.recordVal}).`,
          expectedValue: check.recordVal,
          observedValue: check.noticeVal,
          confidence: 0.8,
          factStatus: 'conflict',
        }),
      );
    }
    if (comparison.issue) issues.push(comparison.issue);
  }

  const hasInconsistent = fields.some((f) => f.result === 'INCONSISTENT');
  const allConsistent = fields.every((f) => f.result === 'CONSISTENT');

  return {
    fields,
    overall: hasInconsistent ? 'INCONSISTENT' : allConsistent ? 'CONSISTENT' : 'PARTIALLY_MATCHED',
    issues,
    summary: `Property reconciliation: ${issues.length} issue(s), overall ${hasInconsistent ? 'INCONSISTENT' : allConsistent ? 'CONSISTENT' : 'PARTIALLY_MATCHED'}.`,
  };
}

// ─── Case Identifier Reconciliation ───────────────────────────────────────────

export function reconcileCaseIdentifier(input: {
  noticeCaseNumber: string | undefined;
  noticeComplaintNumber: string | undefined;
  recordCaseNumber?: string;
  recordComplaintNumber?: string;
}): ReconciliationReport {
  const fields: FieldReconciliation[] = [];
  const issues: CorrectionIssue[] = [];

  // Case number
  const caseComparison = compareValues(input.noticeCaseNumber, input.recordCaseNumber, 'case_number');
  fields.push({
    field: 'case_number',
    noticeValue: input.noticeCaseNumber,
    recordValue: input.recordCaseNumber,
    result: caseComparison.result,
    evidenceId: `case-recon-${Date.now()}`,
  });
  if (caseComparison.result === 'INCONSISTENT') {
    issues.push(
      createCorrectionIssue({
        category: 'WRONG_CASE_NUMBER',
        description: `Case number on notice (${input.noticeCaseNumber}) does not match record (${input.recordCaseNumber}).`,
        expectedValue: input.recordCaseNumber,
        observedValue: input.noticeCaseNumber,
        confidence: 0.8,
      }),
    );
  }

  // Complaint number — if missing from notice
  if (!input.noticeComplaintNumber) {
    issues.push(
      createCorrectionIssue({
        category: 'WRONG_COMPLAINT_NUMBER',
        description: 'Notice does not include a complaint number. The complaint reference should be identified.',
        confidence: 0.7,
        factStatus: 'unknown',
      }),
    );
    fields.push({
      field: 'complaint_number',
      noticeValue: undefined,
      recordValue: input.recordComplaintNumber,
      result: 'UNVERIFIED',
      evidenceId: `complaint-recon-${Date.now()}`,
    });
  }

  return {
    fields,
    overall: issues.length > 0 ? 'INCONSISTENT' : caseComparison.result,
    issues,
    summary: `Case reconciliation: ${issues.length} issue(s) found.`,
  };
}

// ─── Scope Reconciliation ─────────────────────────────────────────────────────

export function reconcileScope(input: {
  requestedScope: string[] | undefined;
  allegedViolations: string[] | undefined;
}): ReconciliationReport {
  const fields: FieldReconciliation[] = [];
  const issues: CorrectionIssue[] = [];

  const scope = input.requestedScope;
  if (!scope || scope.length === 0) {
    issues.push(
      createCorrectionIssue({
        category: 'MISSING_SCOPE',
        description: 'The notice does not clearly identify the scope of the requested inspection. It is unclear what areas or activities are contemplated.',
        confidence: 0.75,
        factStatus: 'unknown',
      }),
    );
    fields.push({
      field: 'inspection_scope',
      noticeValue: undefined,
      recordValue: undefined,
      result: 'UNVERIFIED',
      evidenceId: `scope-recon-${Date.now()}`,
    });
  } else {
    // Check if scope is overly broad — "entire property" or "all structures" without specificity
    const broadTerms = ['entire', 'all', 'every', 'whole', 'complete'];
    const isBroad = scope.some((s) => broadTerms.some((t) => s.toLowerCase().includes(t)));
    if (isBroad && scope.length <= 2) {
      issues.push(
        createCorrectionIssue({
          category: 'OVERBROAD_SCOPE',
          description: 'The requested inspection scope appears broad without specific areas identified. Clarification of the specific inspection areas is recommended.',
          observedValue: scope.join(', '),
          confidence: 0.65,
          factStatus: 'inference',
        }),
      );
    }
    // Check if scope mentions interior without explicit consent language
    const mentionsInterior = scope.some((s) => s.toLowerCase().includes('interior') || s.toLowerCase().includes('inside'));
    if (mentionsInterior) {
      fields.push({
        field: 'interior_scope',
        noticeValue: scope.filter((s) => s.toLowerCase().includes('interior') || s.toLowerCase().includes('inside')).join(', '),
        recordValue: undefined,
        result: 'PARTIALLY_MATCHED',
        evidenceId: `scope-interior-${Date.now()}`,
      });
    }
    fields.push({
      field: 'inspection_scope',
      noticeValue: scope.join(', '),
      recordValue: undefined,
      result: issues.length > 0 ? 'PARTIALLY_MATCHED' : 'CONSISTENT',
      evidenceId: `scope-recon-${Date.now()}`,
    });
  }

  return {
    fields,
    overall: issues.length > 0 ? (issues.some((i) => i.category === 'MISSING_SCOPE') ? 'UNVERIFIED' : 'PARTIALLY_MATCHED') : 'CONSISTENT',
    issues,
    summary: `Scope reconciliation: ${issues.length} issue(s) found.`,
  };
}

// ─── Deadline Reconciliation ─────────────────────────────────────────────────

export function reconcileDeadline(input: {
  noticeDeadline: string | undefined;
  noticeDate: string | undefined;
  statutoryDeadlineDays?: number;
}): ReconciliationReport {
  const fields: FieldReconciliation[] = [];
  const issues: CorrectionIssue[] = [];

  if (!input.noticeDeadline) {
    issues.push(
      createCorrectionIssue({
        category: 'WRONG_DEADLINE',
        description: 'No response deadline is stated in the notice. The deadline should be clarified.',
        confidence: 0.7,
        factStatus: 'unknown',
      }),
    );
    fields.push({
      field: 'response_deadline',
      noticeValue: undefined,
      recordValue: undefined,
      result: 'UNVERIFIED',
      evidenceId: `deadline-recon-${Date.now()}`,
    });
    return {
      fields,
      overall: 'UNVERIFIED',
      issues,
      summary: 'Deadline reconciliation: no deadline found in notice.',
    };
  }

  // If statutory deadline days provided, check if notice deadline is reasonable
  if (input.statutoryDeadlineDays && input.noticeDate) {
    try {
      const noticeDateObj = new Date(input.noticeDate);
      const deadlineObj = new Date(input.noticeDeadline);
      const diffDays = (deadlineObj.getTime() - noticeDateObj.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < input.statutoryDeadlineDays * 0.5) {
        issues.push(
          createCorrectionIssue({
            category: 'WRONG_DEADLINE',
            description: `The response window (${Math.round(diffDays)} days) appears shorter than the typical statutory period (${input.statutoryDeadlineDays} days). This may warrant clarification.`,
            expectedValue: `~${input.statutoryDeadlineDays} days from notice`,
            observedValue: `${Math.round(diffDays)} days`,
            confidence: 0.6,
            factStatus: 'inference',
          }),
        );
      }
    } catch {
      // Date parsing failed — not actionable
    }
  }

  fields.push({
    field: 'response_deadline',
    noticeValue: input.noticeDeadline,
    recordValue: input.statutoryDeadlineDays ? `~${input.statutoryDeadlineDays} days from notice` : undefined,
    result: issues.length > 0 ? 'PARTIALLY_MATCHED' : 'CONSISTENT',
    evidenceId: `deadline-recon-${Date.now()}`,
  });

  return {
    fields,
    overall: issues.length > 0 ? 'PARTIALLY_MATCHED' : 'CONSISTENT',
    issues,
    summary: `Deadline reconciliation: ${issues.length} issue(s) found.`,
  };
}

// ─── Authority Reconciliation ────────────────────────────────────────────────

export function reconcileAuthority(input: {
  citedAuthority: string | undefined;
  statutoryReferences: string[] | undefined;
  codeReferences: string[] | undefined;
}): ReconciliationReport {
  const fields: FieldReconciliation[] = [];
  const issues: CorrectionIssue[] = [];

  const hasAuthority = input.citedAuthority || (input.statutoryReferences && input.statutoryReferences.length > 0) || (input.codeReferences && input.codeReferences.length > 0);

  if (!hasAuthority) {
    issues.push(
      createCorrectionIssue({
        category: 'MISSING_AUTHORITY',
        description: 'The notice does not cite specific statutory authority, ordinance, or regulation for the requested inspection. The legal authority should be identified.',
        confidence: 0.75,
        factStatus: 'unknown',
      }),
    );
    fields.push({
      field: 'inspection_authority',
      noticeValue: undefined,
      recordValue: undefined,
      result: 'UNVERIFIED',
      evidenceId: `auth-recon-${Date.now()}`,
    });
  } else {
    // Check if authority is ambiguous — generic references without specific section
    const isGeneric = input.citedAuthority && input.citedAuthority.length < 20 && !input.citedAuthority.includes('§');
    if (isGeneric) {
      issues.push(
        createCorrectionIssue({
          category: 'AMBIGUOUS_AUTHORITY',
          description: 'The cited authority appears general or incomplete. Specific ordinance, statute, or regulation section should be identified.',
          observedValue: input.citedAuthority,
          confidence: 0.6,
          factStatus: 'inference',
        }),
      );
    }
    fields.push({
      field: 'inspection_authority',
      noticeValue: input.citedAuthority ?? input.codeReferences?.join(', ') ?? input.statutoryReferences?.join(', '),
      recordValue: undefined,
      result: issues.length > 0 ? 'PARTIALLY_MATCHED' : 'CONSISTENT',
      evidenceId: `auth-recon-${Date.now()}`,
    });
  }

  return {
    fields,
    overall: issues.length > 0 ? (issues.some((i) => i.category === 'MISSING_AUTHORITY') ? 'UNVERIFIED' : 'PARTIALLY_MATCHED') : 'CONSISTENT',
    issues,
    summary: `Authority reconciliation: ${issues.length} issue(s) found.`,
  };
}

// ─── Notice vs Record Full Reconciliation ─────────────────────────────────────

export interface FullReconciliationResult {
  recipient: ReconciliationReport;
  property: ReconciliationReport;
  caseId: ReconciliationReport;
  scope: ReconciliationReport;
  deadline: ReconciliationReport;
  authority: ReconciliationReport;
  allIssues: CorrectionIssue[];
  overallResult: ReconciliationResult;
  summary: string;
}

export function reconcileAll(input: {
  extraction: NoticeExtraction;
  reportedDeceased?: boolean;
  deceasedName?: string;
  currentOwner?: string;
  propertyRecord?: PropertyRecord;
  recordCaseNumber?: string;
  recordComplaintNumber?: string;
  statutoryDeadlineDays?: number;
}): FullReconciliationResult {
  const recipient = reconcileRecipient({
    noticeRecipient: input.extraction.recipient.value,
    reportedDeceased: input.reportedDeceased,
    deceasedName: input.deceasedName,
    currentOwner: input.currentOwner,
    propertyRecord: input.propertyRecord,
  });

  const property = reconcileProperty({
    extraction: input.extraction,
    propertyRecord: input.propertyRecord,
  });

  const caseId = reconcileCaseIdentifier({
    noticeCaseNumber: input.extraction.caseNumber.value,
    noticeComplaintNumber: input.extraction.complaintNumber.value,
    recordCaseNumber: input.recordCaseNumber,
    recordComplaintNumber: input.recordComplaintNumber,
  });

  const scope = reconcileScope({
    requestedScope: input.extraction.requestedScope.value,
    allegedViolations: input.extraction.allegedViolations.value,
  });

  const deadline = reconcileDeadline({
    noticeDeadline: input.extraction.responseDeadline.value,
    noticeDate: input.extraction.noticeDate.value,
    statutoryDeadlineDays: input.statutoryDeadlineDays,
  });

  const authority = reconcileAuthority({
    citedAuthority: input.extraction.inspectionAuthority.value,
    statutoryReferences: input.extraction.statutoryReferences.value,
    codeReferences: input.extraction.codeReferences.value,
  });

  const allIssues = [
    ...recipient.issues,
    ...property.issues,
    ...caseId.issues,
    ...scope.issues,
    ...deadline.issues,
    ...authority.issues,
  ];

  const reports = [recipient, property, caseId, scope, deadline, authority];
  const hasInconsistent = reports.some((r) => r.overall === 'INCONSISTENT');
  const hasUnverified = reports.some((r) => r.overall === 'UNVERIFIED');
  const allConsistent = reports.every((r) => r.overall === 'CONSISTENT');

  const overallResult: ReconciliationResult = hasInconsistent ? 'INCONSISTENT' : hasUnverified ? 'UNVERIFIED' : allConsistent ? 'CONSISTENT' : 'PARTIALLY_MATCHED';

  const summary = `Full reconciliation: ${allIssues.length} issue(s). Overall: ${overallResult}. Recipient: ${recipient.overall}, Property: ${property.overall}, Case: ${caseId.overall}, Scope: ${scope.overall}, Deadline: ${deadline.overall}, Authority: ${authority.overall}.`;

  return {
    recipient,
    property,
    caseId,
    scope,
    deadline,
    authority,
    allIssues,
    overallResult,
    summary,
  };
}

/**
 * Human Review & Authorization
 *
 * Before authorization, display: CASE SUMMARY, PROPERTY, RECIPIENT, AGENCY,
 * NOTICE, COMPLAINT, INSPECTION REQUEST, AUTHORITY, JURISDICTION, TIMELINE,
 * EVIDENCE, DISCREPANCIES, UNKNOWN ITEMS, OPTIONS, DRAFT, ATTACHMENTS,
 * RECIPIENT ADDRESS, SUBMISSION METHOD.
 *
 * User must explicitly approve. No automatic consequential send.
 */

// ─── Review Summary Types ─────────────────────────────────────────────────────

export interface ReviewSummarySection {
  key: string;
  label: string;
  content: string;
  items?: string[];
}

export interface ReviewSummary {
  caseSummary: ReviewSummarySection;
  property: ReviewSummarySection;
  recipient: ReviewSummarySection;
  agency: ReviewSummarySection;
  notice: ReviewSummarySection;
  complaint: ReviewSummarySection;
  inspectionRequest: ReviewSummarySection;
  authority: ReviewSummarySection;
  jurisdiction: ReviewSummarySection;
  timeline: ReviewSummarySection;
  evidence: ReviewSummarySection;
  discrepancies: ReviewSummarySection;
  unknownItems: ReviewSummarySection;
  options: ReviewSummarySection;
  draft: ReviewSummarySection;
  attachments: ReviewSummarySection;
  recipientAddress: ReviewSummarySection;
  submissionMethod: ReviewSummarySection;
}

export type AuthorizationState =
  | 'pending_review'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export interface AuthorizationRecord {
  state: AuthorizationState;
  timestamp: string;
  userId: string;
  notes?: string;
  changesRequested?: string[];
}

// ─── Build Review Summary ────────────────────────────────────────────────────

export function buildReviewSummary(input: {
  caseTitle?: string;
  propertyAddress?: string;
  apn?: string;
  recipientName?: string;
  reportedDeceased?: boolean;
  deceasedName?: string;
  agencyName?: string;
  jurisdictionName?: string;
  noticeDate?: string;
  responseDeadline?: string;
  noticeSummary?: string;
  complaintSummary?: string;
  allegations?: string[];
  inspectionScope?: string;
  consentRequested?: boolean;
  warrantReferenced?: boolean;
  warrantWording?: string;
  timelineSummary?: string;
  evidenceSummary?: string;
  discrepancies: string[];
  unknownItems: string[];
  strategies: string[];
  draftSummary: string;
  attachmentNames: string[];
  recipientAddress?: string;
  submissionMethod?: string;
}): ReviewSummary {
  return {
    caseSummary: {
      key: 'case_summary',
      label: 'Case Summary',
      content: input.caseTitle || 'Code Enforcement Property Inspection Request Response',
    },
    property: {
      key: 'property',
      label: 'Property',
      content: input.propertyAddress || '[Not yet identified]',
      items: input.apn ? [`APN: ${input.apn}`] : undefined,
    },
    recipient: {
      key: 'recipient',
      label: 'Recipient',
      content: input.recipientName || '[Not identified]',
      items: input.reportedDeceased ? [
        `Reportedly deceased: ${input.deceasedName || 'Yes'}`,
        'RECIPIENT IDENTITY DISCREPANCY identified',
      ] : undefined,
    },
    agency: {
      key: 'agency',
      label: 'Agency',
      content: input.agencyName || '[Not identified]',
    },
    notice: {
      key: 'notice',
      label: 'Notice',
      content: input.noticeSummary || '[Not yet analyzed]',
      items: [
        input.noticeDate ? `Notice date: ${input.noticeDate}` : undefined,
        input.responseDeadline ? `Response deadline: ${input.responseDeadline}` : undefined,
      ].filter(Boolean) as string[],
    },
    complaint: {
      key: 'complaint',
      label: 'Complaint',
      content: input.complaintSummary || '[Not yet analyzed]',
      items: input.allegations,
    },
    inspectionRequest: {
      key: 'inspection_request',
      label: 'Inspection Request',
      content: input.inspectionScope || '[Not yet analyzed]',
    },
    authority: {
      key: 'authority',
      label: 'Authority',
      content: input.consentRequested ? 'Consent is being requested.' : 'Authority not yet analyzed.',
      items: [
        input.warrantReferenced ? `Warrant referenced: ${input.warrantWording || 'Yes'}` : undefined,
      ].filter(Boolean) as string[],
    },
    jurisdiction: {
      key: 'jurisdiction',
      label: 'Jurisdiction',
      content: input.jurisdictionName || '[Not yet identified]',
    },
    timeline: {
      key: 'timeline',
      label: 'Timeline',
      content: input.timelineSummary || '[Not yet built]',
    },
    evidence: {
      key: 'evidence',
      label: 'Evidence',
      content: input.evidenceSummary || '[Not yet analyzed]',
    },
    discrepancies: {
      key: 'discrepancies',
      label: 'Discrepancies',
      content: input.discrepancies.length > 0
        ? `${input.discrepancies.length} discrepancy(ies) detected.`
        : 'No discrepancies detected.',
      items: input.discrepancies,
    },
    unknownItems: {
      key: 'unknown_items',
      label: 'Unknown Items',
      content: input.unknownItems.length > 0
        ? `${input.unknownItems.length} unknown item(s) require attention.`
        : 'No unknown items.',
      items: input.unknownItems,
    },
    options: {
      key: 'options',
      label: 'Options',
      content: `${input.strategies.length} response strategies available.`,
      items: input.strategies,
    },
    draft: {
      key: 'draft',
      label: 'Draft',
      content: input.draftSummary || '[Not yet generated]',
    },
    attachments: {
      key: 'attachments',
      label: 'Attachments',
      content: input.attachmentNames.length > 0
        ? `${input.attachmentNames.length} attachment(s).`
        : 'No attachments.',
      items: input.attachmentNames,
    },
    recipientAddress: {
      key: 'recipient_address',
      label: 'Recipient Address',
      content: input.recipientAddress || '[Not yet specified]',
    },
    submissionMethod: {
      key: 'submission_method',
      label: 'Submission Method',
      content: input.submissionMethod || '[Not yet selected]',
    },
  };
}

// ─── Authorization ────────────────────────────────────────────────────────────

export function createAuthorizationRecord(
  state: AuthorizationState = 'pending_review',
  userId: string = '',
  notes?: string,
  changesRequested?: string[],
): AuthorizationRecord {
  return {
    state,
    timestamp: new Date().toISOString(),
    userId,
    notes,
    changesRequested,
  };
}

export function approveAuthorization(record: AuthorizationRecord, userId: string): AuthorizationRecord {
  return {
    ...record,
    state: 'approved',
    timestamp: new Date().toISOString(),
    userId,
  };
}

export function rejectAuthorization(record: AuthorizationRecord, userId: string, notes?: string): AuthorizationRecord {
  return {
    ...record,
    state: 'rejected',
    timestamp: new Date().toISOString(),
    userId,
    notes: notes ?? record.notes,
  };
}

export function canSend(authRecord: AuthorizationRecord): boolean {
  return authRecord.state === 'approved';
}

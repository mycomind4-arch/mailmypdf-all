/**
 * Test Helpers — Shared mock factories for correction workflow tests
 */

import type { NoticeExtraction, ExtractedField } from './notice-extraction';

export interface MockExtractionInput {
  agency?: string;
  department?: string;
  jurisdiction?: string;
  sender?: string;
  recipient?: string;
  recipientRole?: string;
  propertyOwner?: string;
  occupant?: string;
  propertyAddress?: string;
  apn?: string;
  parcelNumber?: string;
  caseNumber?: string;
  complaintNumber?: string;
  citationNumber?: string;
  noticeDate?: string;
  serviceDate?: string;
  responseDeadline?: string;
  inspectionDate?: string;
  inspectionTime?: string;
  inspectionLocation?: string;
  requestedScope?: string[];
  complaintBasis?: string[];
  allegedViolations?: string[];
  codeReferences?: string[];
  statutoryReferences?: string[];
  inspectionAuthority?: string;
  consentWording?: string;
  searchInspectionWording?: string;
  warrantWording?: string;
  consequencesOfNonResponse?: string;
  consequencesOfRefusal?: string;
  hearingReviewRights?: string;
  appealInformation?: string;
  contactInformation?: string;
  submissionInstructions?: string;
}

function field<T>(value: T | undefined, confidence = 0.85): ExtractedField<T> {
  return {
    value: value as T | undefined,
    confidence,
    extractionMethod: 'pattern' as const,
  };
}

export function createMockExtraction(overrides?: MockExtractionInput): NoticeExtraction {
  return {
    agency: field(overrides?.agency ?? 'Humboldt County Code Enforcement'),
    department: field(overrides?.department ?? 'Code Enforcement Division'),
    jurisdiction: field(overrides?.jurisdiction ?? 'Humboldt County'),
    sender: field(overrides?.sender ?? 'Code Enforcement Officer'),
    recipient: field(overrides?.recipient ?? 'Jane Doe'),
    recipientRole: field(overrides?.recipientRole ?? 'Property Owner'),
    propertyOwner: field(overrides?.propertyOwner ?? 'Jane Doe'),
    occupant: field(overrides?.occupant ?? 'Jane Doe'),
    propertyAddress: field(overrides?.propertyAddress ?? '1234 McKinleyville Rd, McKinleyville, CA 95519'),
    apn: field(overrides?.apn ?? '502-15-012'),
    parcelNumber: field(overrides?.parcelNumber ?? '502-15-012'),
    caseNumber: field(overrides?.caseNumber ?? 'CE-2026-001'),
    complaintNumber: field(overrides?.complaintNumber),
    citationNumber: field(overrides?.citationNumber),
    noticeDate: field(overrides?.noticeDate ?? '2026-08-15'),
    serviceDate: field(overrides?.serviceDate ?? '2026-08-15'),
    responseDeadline: field(overrides?.responseDeadline ?? '2026-09-03'),
    inspectionDate: field(overrides?.inspectionDate),
    inspectionTime: field(overrides?.inspectionTime),
    inspectionLocation: field(overrides?.inspectionLocation ?? '1234 McKinleyville Rd, McKinleyville, CA'),
    requestedScope: field(overrides?.requestedScope ?? ['exterior', 'outbuildings']),
    complaintBasis: field(overrides?.complaintBasis ?? ['crowing rooster', 'unpermitted structure']),
    allegedViolations: field(overrides?.allegedViolations ?? [
      'crowing rooster',
      'unpermitted structure',
      'broken/inoperable vehicles',
      'improper disposal of solid waste',
      'maintaining a junkyard',
    ]),
    codeReferences: field(overrides?.codeReferences ?? []),
    statutoryReferences: field(overrides?.statutoryReferences ?? []),
    inspectionAuthority: field(overrides?.inspectionAuthority),
    consentWording: field(overrides?.consentWording ?? 'Please contact our office to schedule an inspection'),
    searchInspectionWording: field(overrides?.searchInspectionWording),
    warrantWording: field(overrides?.warrantWording ?? 'If permission is not granted, the County may seek an inspection warrant'),
    consequencesOfNonResponse: field(overrides?.consequencesOfNonResponse ?? 'Failure to respond by September 3, 2026 will be considered a denial'),
    consequencesOfRefusal: field(overrides?.consequencesOfRefusal),
    hearingReviewRights: field(overrides?.hearingReviewRights),
    appealInformation: field(overrides?.appealInformation),
    contactInformation: field(overrides?.contactInformation ?? '(707) 555-0100'),
    submissionInstructions: field(overrides?.submissionInstructions),
    documentId: 'doc-test-001',
    extractionTimestamp: new Date().toISOString(),
    warnings: [],
  };
}

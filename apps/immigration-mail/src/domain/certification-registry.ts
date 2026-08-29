/**
 * Unified Gold Certification Registry
 *
 * Machine-readable certification records for all GOLD-CERTIFIED workflows.
 * Each record maps to the shared Gold certification stages and provides
 * evidence IDs from the workflow's comprehensive test suite.
 *
 * Enhanced fields:
 *  - vertical: which MailMyPDF vertical this workflow belongs to
 *  - pipeline: which ecosystem pipeline archetype (P01–P10)
 *  - domainAdapter: which domain adapter provides specialized intelligence
 *  - specialistModules: specialist modules attached to this workflow
 *  - maturity: workflow stage (GOLD-CERTIFIED)
 *  - build: build passing status
 *  - seoContent: whether SEO content pages exist
 *  - aiCoverage: whether AI tasks are covered
 */

import type { GoldCertificationStage } from './gold-certification-full';
import { ALL_GOLD_STAGES } from './gold-certification-full';
import type { WorkflowStage } from './workflow-foundry';

export type CertificationStatus = 'verified' | 'partial' | 'planned' | 'not_applicable';

export interface WorkflowCertificationRecord {
  workflowSlug: string;
  workflowTitle: string;
  vertical: string;
  pipeline: string;
  domainAdapter: string;
  specialistModules: string[];
  maturity: WorkflowStage;
  certifiedAt: string;
  certified: boolean;
  build: boolean;
  seoContent: boolean;
  aiCoverage: boolean;
  security: CertificationStatus;
  pricing: CertificationStatus;
  mailing: CertificationStatus;
  tracking: CertificationStatus;
  proof: CertificationStatus;
  gold: CertificationStatus;
  stages: Record<GoldCertificationStage, { passed: boolean; evidence: string }>;
  testFile: string;
  testCount: number;
}

function allStagesPassed(evidenceMap: Partial<Record<GoldCertificationStage, string>>): Record<GoldCertificationStage, { passed: boolean; evidence: string }> {
  const result = {} as Record<GoldCertificationStage, { passed: boolean; evidence: string }>;
  for (const stage of ALL_GOLD_STAGES) {
    const evidence = evidenceMap[stage];
    result[stage] = evidence ? { passed: true, evidence } : { passed: false, evidence: 'NOT_TESTED' };
  }
  return result;
}

function routingOnly(): Partial<Record<GoldCertificationStage, string>> {
  const na: Partial<Record<GoldCertificationStage, string>> = {};
  for (const s of ['x_ray','blocking_gates','human_review','explicit_approval','payment','fulfillment','provider_submission','tracking','proof','idempotency','failure_retry'] as GoldCertificationStage[]) {
    na[s] = 'NOT_APPLICABLE_ROUTING_ONLY';
  }
  return na;
}

export const RFE_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'rfe-response', workflowTitle: 'Respond to a USCIS RFE',
  vertical: 'Immigration', pipeline: 'P02 Notice / Official Response',
  domainAdapter: 'RFE Domain Adapter',
  specialistModules: ['Form Adapters (I-485, I-130, I-140, N-400, I-751, H-1B)', 'Evidence Intelligence', 'Authority Engine', 'X-Ray Review', 'Deadline Engine'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-15T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'rfe-workflow.test.ts + rfe-certification.test.ts', testCount: 70,
  stages: allStagesPassed({
    intake: 'RFE_CASE_CREATED', document_ingestion: 'RFE_DOC_INGESTED', classification: 'RFE_CLASSIFIED',
    extraction: 'RFE_ITEMS_EXTRACTED', provenance: 'RFE_DOC_PROVENANCE', fact_normalization: 'RFE_FACTS_RECONCILED',
    deadlines: 'RFE_DEADLINE_87_DAYS', issues: 'RFE_ISSUES', evidence: 'RFE_EVIDENCE_CHECKLIST',
    authority: 'RFE_AUTHORITY', risk: 'RFE_RISK', strategy: 'RFE_STRATEGY', drafting: 'RFE_DRAFT',
    validation: 'RFE_VALIDATED', x_ray: 'RFE_XRAY', blocking_gates: 'RFE_GATES', human_review: 'RFE_REVIEW',
    explicit_approval: 'RFE_APPROVED', payment: 'RFE_PAID', fulfillment: 'RFE_FULFILLED',
    provider_submission: 'RFE_PROVIDER', tracking: 'RFE_TRACKING', proof: 'RFE_PROOF',
    audit: 'RFE_AUDIT', idempotency: 'RFE_IDEMPOTENT', owner_isolation: 'RFE_ISOLATED', failure_retry: 'RFE_RETRY',
  }),
};

export const NOID_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'noid-response', workflowTitle: 'Respond to a USCIS NOID',
  vertical: 'Immigration', pipeline: 'P02 Notice / Official Response',
  domainAdapter: 'NOID Domain Adapter',
  specialistModules: ['Form Adapters (I-485, I-130, I-751)', 'Evidence Intelligence', 'Authority Engine', 'X-Ray Review', 'Deadline Engine'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-17T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'noid-comprehensive.test.ts', testCount: 67,
  stages: allStagesPassed({
    intake: 'NOID_CASE_CREATED', document_ingestion: 'NOID_DOC_INGESTED', classification: 'NOID_CLASSIFIED',
    extraction: 'NOID_GROUNDS', provenance: 'NOID_PROVENANCE', fact_normalization: 'NOID_FACTS',
    deadlines: 'NOID_DEADLINE_33_DAYS', issues: 'NOID_ISSUES', evidence: 'NOID_EVIDENCE_GAPS',
    authority: 'NOID_AUTHORITY', risk: 'NOID_HIGH_RISK', strategy: 'NOID_STRATEGY', drafting: 'NOID_DRAFT',
    validation: 'NOID_VALIDATED', x_ray: 'NOID_XRAY', blocking_gates: 'NOID_GATES', human_review: 'NOID_REVIEW',
    explicit_approval: 'NOID_APPROVED', payment: 'NOID_PAID', fulfillment: 'NOID_FULFILLED',
    provider_submission: 'NOID_PROVIDER', tracking: 'NOID_TRACKING', proof: 'NOID_PROOF',
    audit: 'NOID_AUDIT', idempotency: 'NOID_IDEMPOTENT', owner_isolation: 'NOID_ISOLATED', failure_retry: 'NOID_RETRY',
  }),
};

export const DENIAL_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'uscis-denial-rejection', workflowTitle: 'Respond to a USCIS Denial',
  vertical: 'Immigration', pipeline: 'P03 Appeal / Reconsideration',
  domainAdapter: 'Denial Recovery Adapter',
  specialistModules: ['Appeal Evaluator', 'Motion to Reopen Analyzer', 'Refile Analyzer', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-19T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'denial-comprehensive.test.ts', testCount: 34,
  stages: allStagesPassed({
    intake: 'DENIAL_CASE_CREATED', document_ingestion: 'DENIAL_DOC_INGESTED', classification: 'DENIAL_CLASSIFIED',
    extraction: 'DENIAL_GROUNDS', provenance: 'DENIAL_PROVENANCE', fact_normalization: 'DENIAL_FACTS',
    deadlines: 'DENIAL_30_DAYS', issues: 'DENIAL_APPEAL_OPTIONS', evidence: 'DENIAL_NEW_EVIDENCE',
    authority: 'DENIAL_AUTHORITY', risk: 'DENIAL_HIGH_RISK', strategy: 'DENIAL_STRATEGY', drafting: 'DENIAL_DRAFT',
    validation: 'DENIAL_VALIDATED', x_ray: 'DENIAL_XRAY', blocking_gates: 'DENIAL_GATES', human_review: 'DENIAL_REVIEW',
    explicit_approval: 'DENIAL_APPROVED', payment: 'DENIAL_PAID', fulfillment: 'DENIAL_FULFILLED',
    provider_submission: 'DENIAL_PROVIDER', tracking: 'DENIAL_TRACKING', proof: 'DENIAL_PROOF',
    audit: 'DENIAL_AUDIT', idempotency: 'DENIAL_IDEMPOTENT', owner_isolation: 'DENIAL_ISOLATED', failure_retry: 'DENIAL_RETRY',
  }),
};

export const VISA_REFUSAL_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'visa-refusal-response', workflowTitle: 'Respond to a Visa Refusal',
  vertical: 'Immigration', pipeline: 'P02 Notice / Official Response',
  domainAdapter: 'Visa Refusal Adapter',
  specialistModules: ['221(g) Analyzer', 'Waiver Evaluator', 'Consulate Router', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-20T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'visa-refusal-comprehensive.test.ts', testCount: 52,
  stages: allStagesPassed({
    intake: 'VISA_CASE_CREATED', document_ingestion: 'VISA_DOC_INGESTED', classification: 'VISA_221G_OR_REFUSAL',
    extraction: 'VISA_GROUNDS', provenance: 'VISA_PROVENANCE', fact_normalization: 'VISA_FACTS',
    deadlines: 'VISA_DEADLINE', issues: 'VISA_ISSUES', evidence: 'VISA_EVIDENCE',
    authority: 'VISA_AUTHORITY', risk: 'VISA_RISK', strategy: 'VISA_STRATEGY', drafting: 'VISA_DRAFT',
    validation: 'VISA_VALIDATED', x_ray: 'VISA_XRAY', blocking_gates: 'VISA_GATES', human_review: 'VISA_REVIEW',
    explicit_approval: 'VISA_APPROVED', payment: 'VISA_PAID', fulfillment: 'VISA_FULFILLED',
    provider_submission: 'VISA_PROVIDER', tracking: 'VISA_TRACKING', proof: 'VISA_PROOF',
    audit: 'VISA_AUDIT', idempotency: 'VISA_IDEMPOTENT', owner_isolation: 'VISA_ISOLATED', failure_retry: 'VISA_RETRY',
  }),
};

export const I130_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'i-130-response', workflowTitle: 'Respond to an I-130 Request',
  vertical: 'Immigration', pipeline: 'P05 Immigration Evidence / Response',
  domainAdapter: 'I-130 Family Petition Adapter',
  specialistModules: ['Bona Fide Marriage Evidence', 'Relationship Proof', 'Petitioner/Beneficiary Isolation', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-20T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'i130-comprehensive.test.ts', testCount: 71,
  stages: allStagesPassed({
    intake: 'I130_CASE_CREATED', document_ingestion: 'I130_DOC_INGESTED', classification: 'I130_RELATIONSHIP',
    extraction: 'I130_EVIDENCE', provenance: 'I130_PROVENANCE', fact_normalization: 'I130_FACTS',
    deadlines: 'I130_DEADLINE', issues: 'I130_DISCREPANCIES', evidence: 'I130_BONA_FIDE',
    authority: 'I130_AUTHORITY', risk: 'I130_RISK', strategy: 'I130_STRATEGY', drafting: 'I130_DRAFT',
    validation: 'I130_VALIDATED', x_ray: 'I130_XRAY', blocking_gates: 'I130_GATES', human_review: 'I130_REVIEW',
    explicit_approval: 'I130_APPROVED', payment: 'I130_PAID', fulfillment: 'I130_FULFILLED',
    provider_submission: 'I130_PROVIDER', tracking: 'I130_TRACKING', proof: 'I130_PROOF',
    audit: 'I130_AUDIT', idempotency: 'I130_IDEMPOTENT', owner_isolation: 'I130_ISOLATED', failure_retry: 'I130_RETRY',
  }),
};

export const FOIA_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'uscis-foia', workflowTitle: 'Request USCIS Records by FOIA',
  vertical: 'Immigration', pipeline: 'P08 Records / Information Request',
  domainAdapter: 'FOIA Records Request Adapter',
  specialistModules: ['Identity Verification', 'Agency Routing (USCIS/EOIR/ICE)', 'Record Scope', 'Authority Engine'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-21T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'foia-comprehensive.test.ts', testCount: 49,
  stages: allStagesPassed({
    intake: 'FOIA_CASE_CREATED', document_ingestion: 'FOIA_DOC_INGESTED', classification: 'FOIA_AGENCY',
    extraction: 'FOIA_SCOPE', provenance: 'FOIA_PROVENANCE', fact_normalization: 'FOIA_IDENTITY_VERIFIED',
    deadlines: 'FOIA_USER_INITIATED', issues: 'FOIA_RECORDS_GAP', evidence: 'FOIA_IDENTITY_DOCS',
    authority: 'FOIA_AUTHORITY', risk: 'FOIA_LOW_RISK', strategy: 'FOIA_STRATEGY', drafting: 'FOIA_REQUEST_DRAFTED',
    validation: 'FOIA_VALIDATED', x_ray: 'FOIA_XRAY', blocking_gates: 'FOIA_GATES', human_review: 'FOIA_REVIEW',
    explicit_approval: 'FOIA_APPROVED', payment: 'FOIA_PAID', fulfillment: 'FOIA_FULFILLED',
    provider_submission: 'FOIA_PROVIDER', tracking: 'FOIA_TRACKING', proof: 'FOIA_PROOF',
    audit: 'FOIA_AUDIT', idempotency: 'FOIA_IDEMPOTENT', owner_isolation: 'FOIA_ISOLATED', failure_retry: 'FOIA_RETRY',
  }),
};

export const APPEAL_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'immigration-appeal-letter', workflowTitle: 'Prepare an Immigration Appeal Letter',
  vertical: 'Immigration', pipeline: 'P03 Appeal / Reconsideration',
  domainAdapter: 'Appeal Letter Adapter',
  specialistModules: ['Appeal Type Classifier', 'AAO/BIA Router', 'I-290B/EOIR-26 Handler', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-22T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'appeal-comprehensive.test.ts', testCount: 55,
  stages: allStagesPassed({
    intake: 'APPEAL_CASE_CREATED', document_ingestion: 'APPEAL_DOC_INGESTED', classification: 'APPEAL_TYPE',
    extraction: 'APPEAL_GROUNDS', provenance: 'APPEAL_PROVENANCE', fact_normalization: 'APPEAL_FACTS',
    deadlines: 'APPEAL_30_DAYS', issues: 'APPEAL_ISSUES', evidence: 'APPEAL_EVIDENCE',
    authority: 'APPEAL_AUTHORITY', risk: 'APPEAL_RISK', strategy: 'APPEAL_STRATEGY', drafting: 'APPEAL_DRAFT',
    validation: 'APPEAL_VALIDATED', x_ray: 'APPEAL_XRAY', blocking_gates: 'APPEAL_GATES', human_review: 'APPEAL_REVIEW',
    explicit_approval: 'APPEAL_APPROVED', payment: 'APPEAL_PAID', fulfillment: 'APPEAL_FULFILLED',
    provider_submission: 'APPEAL_PROVIDER', tracking: 'APPEAL_TRACKING', proof: 'APPEAL_PROOF',
    audit: 'APPEAL_AUDIT', idempotency: 'APPEAL_IDEMPOTENT', owner_isolation: 'APPEAL_ISOLATED', failure_retry: 'APPEAL_RETRY',
  }),
};

export const I797_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'i-797-notice', workflowTitle: 'Understand an I-797 Notice',
  vertical: 'Immigration', pipeline: 'P01 Core Mail / Correspondence',
  domainAdapter: 'I-797 Notice Classification Adapter',
  specialistModules: ['Notice Subtype Classifier', 'Action Type Router', 'Case Status Extractor'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'not_applicable',
  mailing: 'not_applicable',
  tracking: 'not_applicable',
  proof: 'not_applicable',
  gold: 'verified',
  testFile: 'i797-comprehensive.test.ts', testCount: 35,
  stages: allStagesPassed({
    intake: 'I797_CASE_CREATED', document_ingestion: 'I797_DOC_INGESTED', classification: 'I797_SUBTYPE',
    extraction: 'I797_ACTION', provenance: 'I797_PROVENANCE', fact_normalization: 'I797_RECEIPT_NUMBER',
    deadlines: 'I797_DEADLINE_IF_REQUIRED', issues: 'I797_ROUTING', evidence: 'I797_ROUTING_ONLY',
    authority: 'I797_USCIS_AUTHORITY', risk: 'I797_URGENT_FLAG', strategy: 'I797_ROUTING_STRATEGY',
    drafting: 'I797_NO_DRAFT_ROUTING', validation: 'I797_ROUTING_VALIDATED',
    audit: 'I797_AUDIT', owner_isolation: 'I797_ISOLATED',
    ...routingOnly(),
  }),
};

export const CASE_INQUIRY_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'case-inquiry', workflowTitle: 'Submit a USCIS Case Inquiry',
  vertical: 'Immigration', pipeline: 'P04 Inquiry / Status / Escalation',
  domainAdapter: 'Case Inquiry Adapter',
  specialistModules: ['Processing Time Verifier', 'Expedite Analyzer', 'Service Center Router', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'case-inquiry-comprehensive.test.ts', testCount: 80,
  stages: allStagesPassed({
    intake: 'INQUIRY_CASE_CREATED', document_ingestion: 'INQUIRY_RECEIPT_OPTIONAL', classification: 'INQUIRY_TYPE_CLASSIFIED',
    extraction: 'INQUIRY_RECEIPT_NUMBER', provenance: 'INQUIRY_PROVENANCE', fact_normalization: 'INQUIRY_FACTS',
    deadlines: 'INQUIRY_NO_DEADLINE_USER_INITIATED', issues: 'INQUIRY_ISSUES', evidence: 'INQUIRY_EVIDENCE',
    authority: 'INQUIRY_AUTHORITY', risk: 'INQUIRY_RISK_LOW', strategy: 'INQUIRY_STRATEGY', drafting: 'INQUIRY_DRAFT',
    validation: 'INQUIRY_VALIDATED', x_ray: 'INQUIRY_XRAY', blocking_gates: 'INQUIRY_GATES', human_review: 'INQUIRY_REVIEW',
    explicit_approval: 'INQUIRY_APPROVED', payment: 'INQUIRY_PAID', fulfillment: 'INQUIRY_FULFILLED',
    provider_submission: 'INQUIRY_PROVIDER', tracking: 'INQUIRY_TRACKING', proof: 'INQUIRY_PROOF',
    audit: 'INQUIRY_AUDIT', idempotency: 'INQUIRY_IDEMPOTENT', owner_isolation: 'INQUIRY_ISOLATED', failure_retry: 'INQUIRY_RETRY',
  }),
};

export const BIOMETRICS_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'biometrics-scheduling',
  workflowTitle: 'Resolve a Biometrics Appointment Issue',
  vertical: 'Immigration', pipeline: 'P06 Biometrics / Scheduling',
  domainAdapter: 'Biometrics Domain Adapter',
  specialistModules: ['ASC Location Resolver', 'Reschedule Analyzer', 'Missed Appointment Remedy', 'Notice Discrepancy Detector', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'biometrics-comprehensive.test.ts', testCount: 146,
  stages: allStagesPassed({
    intake: 'BIOMETRICS_CASE_CREATED', document_ingestion: 'BIOMETRICS_NOTICE_OPTIONAL', classification: 'BIOMETRICS_EVENT_CLASSIFIED',
    extraction: 'BIOMETRICS_RECEIPT_ASC_DATE', provenance: 'BIOMETRICS_PROVENANCE', fact_normalization: 'BIOMETRICS_FACTS',
    deadlines: 'BIOMETRICS_APPOINTMENT_DEADLINE', issues: 'BIOMETRICS_ISSUES', evidence: 'BIOMETRICS_EVIDENCE',
    authority: 'BIOMETRICS_AUTHORITY', risk: 'BIOMETRICS_RISK', strategy: 'BIOMETRICS_STRATEGY', drafting: 'BIOMETRICS_DRAFT',
    validation: 'BIOMETRICS_VALIDATED', x_ray: 'BIOMETRICS_XRAY', blocking_gates: 'BIOMETRICS_GATES', human_review: 'BIOMETRICS_REVIEW',
    explicit_approval: 'BIOMETRICS_APPROVED', payment: 'BIOMETRICS_PAID', fulfillment: 'BIOMETRICS_FULFILLED',
    provider_submission: 'BIOMETRICS_PROVIDER', tracking: 'BIOMETRICS_TRACKING', proof: 'BIOMETRICS_PROOF',
    audit: 'BIOMETRICS_AUDIT', idempotency: 'BIOMETRICS_IDEMPOTENT', owner_isolation: 'BIOMETRICS_ISOLATED', failure_retry: 'BIOMETRICS_RETRY',
  }),
};


export const NATURALIZATION_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'naturalization-citizenship',
  workflowTitle: 'Resolve a Naturalization / Citizenship Issue',
  vertical: 'Immigration', pipeline: 'P07 Naturalization / Citizenship',
  domainAdapter: 'Naturalization Domain Adapter',
  specialistModules: ['Interview Preparation Guide', 'Civics Test Readiness Analyzer', 'Reschedule Analyzer', 'Missed Interview Remedy', 'Notice Discrepancy Detector', 'Oath Ceremony Resolver', 'Post-Interview RFE Handler', 'Delayed Decision Analyzer', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'naturalization-comprehensive.test.ts', testCount: 231,
  stages: allStagesPassed({
    intake: 'NATURALIZATION_CASE_CREATED', document_ingestion: 'NATURALIZATION_NOTICE_OPTIONAL', classification: 'NATURALIZATION_EVENT_CLASSIFIED',
    extraction: 'NATURALIZATION_RECEIPT_INTERVIEW_DATE', provenance: 'NATURALIZATION_PROVENANCE', fact_normalization: 'NATURALIZATION_FACTS',
    deadlines: 'NATURALIZATION_INTERVIEW_DEADLINE', issues: 'NATURALIZATION_ISSUES', evidence: 'NATURALIZATION_EVIDENCE',
    authority: 'NATURALIZATION_AUTHORITY', risk: 'NATURALIZATION_RISK', strategy: 'NATURALIZATION_STRATEGY', drafting: 'NATURALIZATION_DRAFT',
    validation: 'NATURALIZATION_VALIDATED', x_ray: 'NATURALIZATION_XRAY', blocking_gates: 'NATURALIZATION_GATES', human_review: 'NATURALIZATION_REVIEW',
    explicit_approval: 'NATURALIZATION_APPROVED', payment: 'NATURALIZATION_PAID', fulfillment: 'NATURALIZATION_FULFILLED',
    provider_submission: 'NATURALIZATION_PROVIDER', tracking: 'NATURALIZATION_TRACKING', proof: 'NATURALIZATION_PROOF',
    audit: 'NATURALIZATION_AUDIT', idempotency: 'NATURALIZATION_IDEMPOTENT', owner_isolation: 'NATURALIZATION_ISOLATED', failure_retry: 'NATURALIZATION_RETRY',
  }),
};

export const CONSULAR_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'consular-processing',
  workflowTitle: 'Resolve a Consular Processing Issue',
  vertical: 'Immigration', pipeline: 'P09 Consular Processing',
  domainAdapter: 'Consular Processing Domain Adapter',
  specialistModules: ['NVC Processing Guide', 'Consular Interview Preparation', 'Reschedule Analyzer', 'Missed Interview Remedy', 'Civil Document Checker', 'Priority Date Monitor', 'Delay Analyzer', 'Medical Exam Resolver', 'Visa Expiration Tracker', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'consular-comprehensive.test.ts', testCount: 240,
  stages: allStagesPassed({
    intake: 'CONSULAR_CASE_CREATED', document_ingestion: 'CONSULAR_NOTICE_OPTIONAL', classification: 'CONSULAR_EVENT_CLASSIFIED',
    extraction: 'CONSULAR_RECEIPT_INTERVIEW_DATE', provenance: 'CONSULAR_PROVENANCE', fact_normalization: 'CONSULAR_FACTS',
    deadlines: 'CONSULAR_INTERVIEW_DEADLINE', issues: 'CONSULAR_ISSUES', evidence: 'CONSULAR_EVIDENCE',
    authority: 'CONSULAR_AUTHORITY', risk: 'CONSULAR_RISK', strategy: 'CONSULAR_STRATEGY', drafting: 'CONSULAR_DRAFT',
    validation: 'CONSULAR_VALIDATED', x_ray: 'CONSULAR_XRAY', blocking_gates: 'CONSULAR_GATES', human_review: 'CONSULAR_REVIEW',
    explicit_approval: 'CONSULAR_APPROVED', payment: 'CONSULAR_PAID', fulfillment: 'CONSULAR_FULFILLED',
    provider_submission: 'CONSULAR_PROVIDER', tracking: 'CONSULAR_TRACKING', proof: 'CONSULAR_PROOF',
    audit: 'CONSULAR_AUDIT', idempotency: 'CONSULAR_IDEMPOTENT', owner_isolation: 'CONSULAR_ISOLATED', failure_retry: 'CONSULAR_RETRY',
  }),
};


export const I751_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'i751-removal-conditions',
  workflowTitle: 'Remove Conditions on Residence (I-751)',
  vertical: 'Immigration', pipeline: 'P10 Removal of Conditions',
  domainAdapter: 'I-751 Removal of Conditions Adapter',
  specialistModules: ['Filing Window Calculator', 'Waiver Ground Detector', 'Bona Fide Marriage Evidence Handler', 'Stokes Interview Prep', 'NTA Referral Analyzer', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'i751-comprehensive.test.ts', testCount: 182,
  stages: allStagesPassed({
    intake: 'I751_CASE_CREATED', document_ingestion: 'I751_DOC_INGESTED', classification: 'I751_EVENT_CLASSIFIED',
    extraction: 'I751_FILING_TYPE_DETECTED', provenance: 'I751_PROVENANCE', fact_normalization: 'I751_FACTS',
    deadlines: 'I751_FILING_WINDOW', issues: 'I751_ISSUES', evidence: 'I751_EVIDENCE',
    authority: 'I751_AUTHORITY', risk: 'I751_RISK', strategy: 'I751_STRATEGY', drafting: 'I751_DRAFT',
    validation: 'I751_VALIDATED', x_ray: 'I751_XRAY', blocking_gates: 'I751_GATES', human_review: 'I751_REVIEW',
    explicit_approval: 'I751_APPROVED', payment: 'I751_PAID', fulfillment: 'I751_FULFILLED',
    provider_submission: 'I751_PROVIDER', tracking: 'I751_TRACKING', proof: 'I751_PROOF',
    audit: 'I751_AUDIT', idempotency: 'I751_IDEMPOTENT', owner_isolation: 'I751_ISOLATED', failure_retry: 'I751_RETRY',
  }),
};


export const I601_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'i601-waiver',
  workflowTitle: 'Inadmissibility Waiver (I-601 / I-601A)',
  vertical: 'Immigration', pipeline: 'P11 Inadmissibility Waiver',
  domainAdapter: 'I-601/I-601A Inadmissibility Waiver Adapter',
  specialistModules: ['Inadmissibility Ground Detector', 'Pathway Determination Engine', 'Qualifying Relative Analyzer', 'Extreme Hardship Factor Assessor', 'I-601A Eligibility Gate Checker', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'i601-comprehensive.test.ts', testCount: 203,
  stages: allStagesPassed({
    intake: 'I601_CASE_CREATED', document_ingestion: 'I601_DOC_INGESTED', classification: 'I601_PATHWAY_CLASSIFIED',
    extraction: 'I601_GROUND_DETECTED', provenance: 'I601_PROVENANCE', fact_normalization: 'I601_FACTS',
    deadlines: 'I601_PROCESSING_TIME', issues: 'I601_ISSUES', evidence: 'I601_EVIDENCE',
    authority: 'I601_AUTHORITY', risk: 'I601_RISK', strategy: 'I601_STRATEGY', drafting: 'I601_DRAFT',
    validation: 'I601_VALIDATED', x_ray: 'I601_XRAY', blocking_gates: 'I601_GATES', human_review: 'I601_REVIEW',
    explicit_approval: 'I601_APPROVED', payment: 'I601_PAID', fulfillment: 'I601_FULFILLED',
    provider_submission: 'I601_PROVIDER', tracking: 'I601_TRACKING', proof: 'I601_PROOF',
    audit: 'I601_AUDIT', idempotency: 'I601_IDEMPOTENT', owner_isolation: 'I601_ISOLATED', failure_retry: 'I601_RETRY',
  }),
};


export const I765_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'i765-employment-authorization',
  workflowTitle: 'Employment Authorization Document (I-765 EAD / Work Permit)',
  vertical: 'Immigration', pipeline: 'P12 Employment Authorization',
  domainAdapter: 'I-765 EAD Employment Authorization Adapter',
  specialistModules: ['EAD Category Detector', 'Application Type Classifier', 'Underlying Case Analyzer', 'Expiration Analyzer', 'Auto Extension Checker', 'Fee Calculator', 'Biometrics Checker', 'Evidence Gap Detector', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'i765-comprehensive.test.ts', testCount: 223,
  stages: allStagesPassed({
    intake: 'I765_CASE_CREATED', document_ingestion: 'I765_DOC_INGESTED', classification: 'I765_CATEGORY_CLASSIFIED',
    extraction: 'I765_EVIDENCE_DETECTED', provenance: 'I765_PROVENANCE', fact_normalization: 'I765_FACTS',
    deadlines: 'I765_EXPIRATION', issues: 'I765_ISSUES', evidence: 'I765_EVIDENCE',
    authority: 'I765_AUTHORITY', risk: 'I765_RISK', strategy: 'I765_STRATEGY', drafting: 'I765_DRAFT',
    validation: 'I765_VALIDATED', x_ray: 'I765_XRAY', blocking_gates: 'I765_GATES', human_review: 'I765_REVIEW',
    explicit_approval: 'I765_APPROVED', payment: 'I765_PAID', fulfillment: 'I765_FULFILLED',
    provider_submission: 'I765_PROVIDER', tracking: 'I765_TRACKING', proof: 'I765_PROOF',
    audit: 'I765_AUDIT', idempotency: 'I765_IDEMPOTENT', owner_isolation: 'I765_ISOLATED', failure_retry: 'I765_RETRY',
  }),
};


export const I131_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'i131-travel-document',
  workflowTitle: 'Advance Parole / Travel Document (I-131)',
  vertical: 'Immigration', pipeline: 'P13 Travel Documents',
  domainAdapter: 'I-131 Advance Parole / Travel Document Adapter',
  specialistModules: ['Travel Doc Type Detector', 'Application Type Classifier', 'Underlying Status Analyzer', 'Travel Urgency Detector', 'Doc Expiration Analyzer', 'Travel Risk Analyzer', 'Emergency Evidence Analyzer', 'Evidence Gap Detector', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'i131-comprehensive.test.ts', testCount: 210,
  stages: allStagesPassed({
    intake: 'I131_CASE_CREATED', document_ingestion: 'I131_DOC_INGESTED', classification: 'I131_DOC_TYPE_CLASSIFIED',
    extraction: 'I131_EVIDENCE_DETECTED', provenance: 'I131_PROVENANCE', fact_normalization: 'I131_FACTS',
    deadlines: 'I131_EXPIRATION', issues: 'I131_ISSUES', evidence: 'I131_EVIDENCE',
    authority: 'I131_AUTHORITY', risk: 'I131_RISK', strategy: 'I131_STRATEGY', drafting: 'I131_DRAFT',
    validation: 'I131_VALIDATED', x_ray: 'I131_XRAY', blocking_gates: 'I131_GATES', human_review: 'I131_REVIEW',
    explicit_approval: 'I131_APPROVED', payment: 'I131_PAID', fulfillment: 'I131_FULFILLED',
    provider_submission: 'I131_PROVIDER', tracking: 'I131_TRACKING', proof: 'I131_PROOF',
    audit: 'I131_AUDIT', idempotency: 'I131_IDEMPOTENT', owner_isolation: 'I131_ISOLATED', failure_retry: 'I131_RETRY',
  }),
};


export const I90_CERTIFICATION: WorkflowCertificationRecord = {
  workflowSlug: 'i90-green-card-renewal',
  workflowTitle: 'Green Card Renewal / Replacement (I-90)',
  vertical: 'Immigration', pipeline: 'P14 Green Card Renewal',
  domainAdapter: 'I-90 Application to Replace Permanent Resident Card Adapter',
  specialistModules: ['Card Type Detector', 'Filing Reason Classifier', 'Filing Window Analyzer', 'Naturalization Alternative Checker', 'I-90 vs I-751 Distinction', 'Evidence Gap Detector', 'Fee Analyzer', '36-Month Extension Analyzer', 'Authority Engine', 'X-Ray Review'],
  maturity: 'GOLD-CERTIFIED',
  certifiedAt: '2026-08-23T00:00:00Z', certified: true, build: true, seoContent: true, aiCoverage: true,
  security: 'verified',
  pricing: 'verified',
  mailing: 'verified',
  tracking: 'verified',
  proof: 'verified',
  gold: 'verified',
  testFile: 'i90-comprehensive.test.ts', testCount: 171,
  stages: allStagesPassed({
    intake: 'I90_CASE_CREATED', document_ingestion: 'I90_DOC_INGESTED', classification: 'I90_CARD_TYPE_CLASSIFIED',
    extraction: 'I90_EVIDENCE_DETECTED', provenance: 'I90_PROVENANCE', fact_normalization: 'I90_FACTS',
    deadlines: 'I90_FILING_WINDOW', issues: 'I90_ISSUES', evidence: 'I90_EVIDENCE',
    authority: 'I90_AUTHORITY', risk: 'I90_RISK', strategy: 'I90_STRATEGY', drafting: 'I90_DRAFT',
    validation: 'I90_VALIDATED', x_ray: 'I90_XRAY', blocking_gates: 'I90_GATES', human_review: 'I90_REVIEW',
    explicit_approval: 'I90_APPROVED', payment: 'I90_PAID', fulfillment: 'I90_FULFILLED',
    provider_submission: 'I90_PROVIDER', tracking: 'I90_TRACKING', proof: 'I90_PROOF',
    audit: 'I90_AUDIT', idempotency: 'I90_IDEMPOTENT', owner_isolation: 'I90_ISOLATED', failure_retry: 'I90_RETRY',
  }),
};

export const CERTIFICATION_REGISTRY: WorkflowCertificationRecord[] = [
  RFE_CERTIFICATION, NOID_CERTIFICATION, DENIAL_CERTIFICATION, VISA_REFUSAL_CERTIFICATION,
  I130_CERTIFICATION, FOIA_CERTIFICATION, APPEAL_CERTIFICATION, I797_CERTIFICATION,
  CASE_INQUIRY_CERTIFICATION, BIOMETRICS_CERTIFICATION, NATURALIZATION_CERTIFICATION, CONSULAR_CERTIFICATION,
  I751_CERTIFICATION,
  I601_CERTIFICATION,
  I765_CERTIFICATION,
  I131_CERTIFICATION,
  I90_CERTIFICATION,
];

export function getCertification(slug: string): WorkflowCertificationRecord | undefined {
  return CERTIFICATION_REGISTRY.find(r => r.workflowSlug === slug);
}

export function isCertified(slug: string): boolean {
  return getCertification(slug)?.certified ?? false;
}

export function getAllCertifications(): WorkflowCertificationRecord[] {
  return CERTIFICATION_REGISTRY;
}


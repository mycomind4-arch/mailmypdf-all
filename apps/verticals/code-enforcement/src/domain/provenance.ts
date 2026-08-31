/**
 * Provenance System
 *
 * Persists: workflow version, case ID, property ID, document IDs, source documents,
 * source excerpts, AI task, provider, model, model version, prompt/task version,
 * rule sources, research timestamp, extraction outputs, analysis outputs,
 * model disagreements, human corrections, final draft, authorization,
 * submission, tracking, proof.
 *
 * Every consequential output must be traceable.
 */

import type { AIInvocation, ModelDisagreement } from './ai-provider';
import type { ClassifiedFact } from './fact-taxonomy';
import type { Discrepancy } from './discrepancy-engine';

// ─── Provenance Types ─────────────────────────────────────────────────────────

export interface ProvenanceRecord {
  caseId: string;
  workflowVersion: string;
  createdAt: string;
  updatedAt: string;
  documentIds: string[];
  sourceDocuments: { id: string; filename: string; hash: string }[];
  aiInvocations: AIInvocation[];
  modelDisagreements: ModelDisagreement[];
  extractionOutputs: Record<string, unknown>;
  analysisOutputs: Record<string, unknown>;
  findings: ClassifiedFact[];
  discrepancies: Discrepancy[];
  humanCorrections: { timestamp: string; correction: string; userId: string }[];
  finalDraftHash?: string;
  authorizationRecord?: { timestamp: string; userId: string; state: string };
  submissionRecord?: { timestamp: string; providerOrderId?: string };
  trackingRecord?: { trackingNumber?: string; state: string };
  proofRecord?: { packetHash: string; timestamp: string };
}

// ─── Provenance Manager ──────────────────────────────────────────────────────

export function createProvenanceRecord(caseId: string, workflowVersion: string = '1.0.0'): ProvenanceRecord {
  return {
    caseId,
    workflowVersion,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documentIds: [],
    sourceDocuments: [],
    aiInvocations: [],
    modelDisagreements: [],
    extractionOutputs: {},
    analysisOutputs: {},
    findings: [],
    discrepancies: [],
    humanCorrections: [],
  };
}

export function recordAIInvocation(record: ProvenanceRecord, invocation: AIInvocation): ProvenanceRecord {
  return {
    ...record,
    aiInvocations: [...record.aiInvocations, invocation],
    updatedAt: new Date().toISOString(),
  };
}

export function recordDisagreement(record: ProvenanceRecord, disagreement: ModelDisagreement): ProvenanceRecord {
  return {
    ...record,
    modelDisagreements: [...record.modelDisagreements, disagreement],
    updatedAt: new Date().toISOString(),
  };
}

export function recordFinding(record: ProvenanceRecord, finding: ClassifiedFact): ProvenanceRecord {
  return {
    ...record,
    findings: [...record.findings, finding],
    updatedAt: new Date().toISOString(),
  };
}

export function recordHumanCorrection(record: ProvenanceRecord, correction: string, userId: string): ProvenanceRecord {
  return {
    ...record,
    humanCorrections: [...record.humanCorrections, { timestamp: new Date().toISOString(), correction, userId }],
    updatedAt: new Date().toISOString(),
  };
}

export function recordAuthorization(record: ProvenanceRecord, userId: string, state: string): ProvenanceRecord {
  return {
    ...record,
    authorizationRecord: { timestamp: new Date().toISOString(), userId, state },
    updatedAt: new Date().toISOString(),
  };
}

export function recordSubmission(record: ProvenanceRecord, providerOrderId?: string): ProvenanceRecord {
  return {
    ...record,
    submissionRecord: { timestamp: new Date().toISOString(), providerOrderId },
    updatedAt: new Date().toISOString(),
  };
}

export function recordTracking(record: ProvenanceRecord, trackingNumber: string | undefined, state: string): ProvenanceRecord {
  return {
    ...record,
    trackingRecord: { trackingNumber, state },
    updatedAt: new Date().toISOString(),
  };
}

export function recordProof(record: ProvenanceRecord, packetHash: string): ProvenanceRecord {
  return {
    ...record,
    proofRecord: { packetHash, timestamp: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
}

// ─── Traceability Query ────────────────────────────────────────────────────────

export function traceProvenance(record: ProvenanceRecord, findingId: string): {
  finding: ClassifiedFact;
  invocations: AIInvocation[];
  sourceDocuments: { id: string; filename: string; hash: string }[];
} | undefined {
  const finding = record.findings.find(f => f.id === findingId);
  if (!finding) return undefined;

  // Find AI invocations related to this finding
  const sourceText = finding.provenance.source;
  const invocations = record.aiInvocations.filter(inv =>
    inv.task.includes(sourceText) || inv.inputProvenance?.includes(sourceText)
  );

  return {
    finding,
    invocations,
    sourceDocuments: record.sourceDocuments,
  };
}

/**
 * G5 — Document & Evidence Intelligence
 *
 * Comprehensive evidence layer supporting:
 * - document classification
 * - source extraction
 * - document relationships
 * - evidence provenance
 * - supporting evidence
 * - contradicting evidence
 * - missing evidence
 * - evidence sufficiency
 * - evidence freshness where relevant
 * - evidence conflicts
 * - document versions
 * - document integrity
 * - user-provided facts vs document-derived facts
 *
 * The system should be able to say:
 * "I found evidence supporting this."
 * "I found another document that appears to contradict it."
 * "We need one more document before this can be safely resolved."
 */

import type { DocumentUnderstanding } from './document-understanding';
import type { CaseFact, ImmigrationDocument, FactSource } from './immigration-case';

// ─── Evidence Classification ─────────────────────────────────────────────────

export type EvidenceType =
  | 'primary_document'     // The actual notice, decision, or form
  | 'supporting_document'   // Evidence that supports a claim
  | 'contradicting_document'// Evidence that contradicts a claim
  | 'identity_document'     // Passport, birth cert, etc.
  | 'financial_document'    // Tax returns, pay stubs
  | 'relationship_document' // Marriage cert, birth cert
  | 'medical_document'      // Medical records
  | 'legal_document'        // Court orders, attorney correspondence
  | 'translation'           // Certified translation
  | 'photograph'            // Photos
  | 'correspondence'        // Letters, emails
  | 'unknown';

export type EvidenceSufficiency = 'sufficient' | 'insufficient' | 'contradictory' | 'missing' | 'unverified';

export type FactOrigin = 'document' | 'user_stated' | 'user_uploaded' | 'inferred' | 'unknown';

// ─── Evidence Item ────────────────────────────────────────────────────────────

export interface EvidenceItem {
  id: string;
  documentId: string;
  evidenceType: EvidenceType;
  /** What this evidence supports or contradicts. */
  relatesTo: string;
  /** Whether this evidence supports or contradicts the related claim. */
  stance: 'supports' | 'contradicts' | 'neutral';
  /** The extracted fact or observation from this evidence. */
  content: string;
  /** Source provenance — where this evidence came from. */
  provenance: EvidenceProvenance;
  /** Whether the evidence has been verified against the source document. */
  verified: boolean;
  /** Confidence in this evidence (0-1). */
  confidence: number;
}

export interface EvidenceProvenance {
  documentId: string;
  documentName: string;
  page?: number;
  excerpt?: string;
  origin: FactOrigin;
  extractedAt: string;
  extractionMethod: 'manual' | 'ocr' | 'ai_assisted' | 'user_provided';
}

// ─── Document Relationship ──────────────────────────────────────────────────

export type DocumentRelationshipType =
  | 'supersedes'       // New version replaces old
  | 'superseded_by'    // Old version replaced
  | 'responds_to'      // This document responds to another
  | 'referenced_by'    // Another document references this
  | 'contradicts'      // This document contradicts another
  | 'supports'          // This document supports another
  | 'duplicate'         // Same document
  | 'translation_of'    // Translation of another document
  | 'attachment_of'     // Attachment to another document
  | 'related';

export interface DocumentRelationship {
  fromDocumentId: string;
  toDocumentId: string;
  relationshipType: DocumentRelationshipType;
  confidence: number;
  notes?: string;
}

// ─── Evidence Gap (G5-specific) ──────────────────────────────────────────────

export interface EvidenceGapFinding {
  id: string;
  description: string;
  requiredFor: string;
  currentEvidence: string[];
  missingEvidence: string;
  howToObtain: string;
  sufficiency: EvidenceSufficiency;
  blocking: boolean;
}

// ─── Evidence Conflict ───────────────────────────────────────────────────────

export interface EvidenceConflict {
  id: string;
  factKey: string;
  documentA: { documentId: string; value: string; excerpt?: string };
  documentB: { documentId: string; value: string; excerpt?: string };
  conflictType: 'contradiction' | 'discrepancy' | 'version_mismatch';
  severity: 'high' | 'medium' | 'low';
  resolution: string;
  resolved: boolean;
}

// ─── Document Integrity ──────────────────────────────────────────────────────

export type DocumentIntegrityStatus = 'intact' | 'incomplete' | 'corrupted' | 'redacted' | 'unclear';

export interface DocumentIntegrityAssessment {
  documentId: string;
  status: DocumentIntegrityStatus;
  hasAllPages: boolean;
  hasReadableText: boolean;
  hasSignatures: boolean;
  hasDates: boolean;
  warnings: string[];
}

// ─── Evidence Analysis Result ────────────────────────────────────────────────

export interface EvidenceAnalysisResult {
  evidence: EvidenceItem[];
  relationships: DocumentRelationship[];
  conflicts: EvidenceConflict[];
  gaps: EvidenceGapFinding[];
  integrity: DocumentIntegrityAssessment[];
  sufficiency: EvidenceSufficiency;
  userFacingSummary: string;
  userFacingSummaryEs?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let evidenceCounter = 0;
let gapCounter = 0;
let conflictCounter = 0;
let relCounter = 0;

function evidenceId(): string { return `ev-${++evidenceCounter}`; }
function gapId(): string { return `eg-${++gapCounter}`; }
function conflictId(): string { return `cf-${++conflictCounter}`; }
function relId(): string { return `rel-${++relCounter}`; }

function resetCounters() { evidenceCounter = 0; gapCounter = 0; conflictCounter = 0; relCounter = 0; }

// ─── Classify evidence type from document understanding ─────────────────────

export function classifyEvidenceType(du: DocumentUnderstanding): EvidenceType {
  switch (du.noticeType) {
    case 'RFE':
    case 'NOID':
    case 'receipt':
    case 'decision':
    case 'appointment':
    case 'biometrics':
    case 'interview':
      return 'primary_document';
    default:
      return 'unknown';
  }
}

// ─── Assess document integrity ───────────────────────────────────────────────

export function assessDocumentIntegrity(
  documentId: string,
  understanding: DocumentUnderstanding,
): DocumentIntegrityAssessment {
  const warnings: string[] = [];
  const hasReadableText = understanding.agency !== "UNKNOWN" || understanding.noticeType !== "unknown" || understanding.deadlines.length > 0 || understanding.requestedActions.length > 0;
  const hasDates = understanding.deadlines.length > 0;
  const hasSignatures = /signature|signed|respectfully|sincerely/i.test(understanding.plainLanguageSummary);
  const hasAllPages = !understanding.warnings.some(w => w.includes('page') || w.includes('missing'));

  if (!hasReadableText) warnings.push('The document text could not be fully read.');
  if (understanding.warnings.length > 0) warnings.push(...understanding.warnings);
  if (!hasDates && understanding.noticeType !== 'unknown') warnings.push('No dates were found in the document.');

  let status: DocumentIntegrityStatus = 'intact';
  if (!hasReadableText) status = 'corrupted';
  else if (understanding.warnings.length > 2) status = 'incomplete';
  else if (understanding.warnings.length > 0) status = 'unclear';

  return { documentId, status, hasAllPages, hasReadableText, hasSignatures, hasDates, warnings };
}

// ─── Detect evidence conflicts ───────────────────────────────────────────────

export function detectEvidenceConflicts(
  understandings: DocumentUnderstanding[],
): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = [];

  // Check for conflicting notice types across documents
  for (let i = 0; i < understandings.length; i++) {
    for (let j = i + 1; j < understandings.length; j++) {
      const a = understandings[i];
      const b = understandings[j];

      // Same agency but different notice types could indicate confusion
      if (a.agency === b.agency && a.noticeType !== b.noticeType &&
          a.noticeType !== 'unknown' && b.noticeType !== 'unknown') {
        conflicts.push({
          id: conflictId(),
          factKey: 'notice_type',
          documentA: { documentId: `doc-${i + 1}`, value: a.noticeType, excerpt: a.plainLanguageSummary },
          documentB: { documentId: `doc-${j + 1}`, value: b.noticeType, excerpt: b.plainLanguageSummary },
          conflictType: 'discrepancy',
          severity: 'medium',
          resolution: 'Verify which document is the current one and which is superseded.',
          resolved: false,
        });
      }

      // Conflicting deadlines
      for (const dlA of a.deadlines) {
        for (const dlB of b.deadlines) {
          if (dlA.label === dlB.label && dlA.date && dlB.date && dlA.date !== dlB.date) {
            conflicts.push({
              id: conflictId(),
              factKey: `deadline:${dlA.label}`,
              documentA: { documentId: `doc-${i + 1}`, value: dlA.date },
              documentB: { documentId: `doc-${j + 1}`, value: dlB.date },
              conflictType: 'contradiction',
              severity: 'high',
              resolution: 'Determine which deadline is correct by verifying the source document.',
              resolved: false,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

// ─── Detect document relationships ───────────────────────────────────────────

export function detectDocumentRelationships(
  understandings: DocumentUnderstanding[],
): DocumentRelationship[] {
  const relationships: DocumentRelationship[] = [];

  for (let i = 0; i < understandings.length; i++) {
    for (let j = i + 1; j < understandings.length; j++) {
      const a = understandings[i];
      const b = understandings[j];

      // Same agency — potentially related
      if (a.agency === b.agency && a.agency !== 'UNKNOWN') {
        // If one is a decision and another is an RFE/NOID, the decision may respond to the RFE/NOID
        if ((a.noticeType === 'decision' && (b.noticeType === 'RFE' || b.noticeType === 'NOID')) ||
            (b.noticeType === 'decision' && (a.noticeType === 'RFE' || a.noticeType === 'NOID'))) {
          const decisionIdx = a.noticeType === 'decision' ? i : j;
          const responseIdx = a.noticeType === 'decision' ? j : i;
          relationships.push({
            fromDocumentId: `doc-${decisionIdx + 1}`,
            toDocumentId: `doc-${responseIdx + 1}`,
            relationshipType: 'responds_to',
            confidence: 0.7,
            notes: 'Decision may be a response to the earlier request.',
          });
        }

        // If both are the same type, could be duplicates
        if (a.noticeType === b.noticeType && a.noticeType !== 'unknown') {
          relationships.push({
            fromDocumentId: `doc-${i + 1}`,
            toDocumentId: `doc-${j + 1}`,
            relationshipType: 'duplicate',
            confidence: 0.5,
            notes: 'Same notice type — verify whether these are duplicates or different versions.',
          });
        }
      }
    }
  }

  return relationships;
}

// ─── Identify evidence gaps ──────────────────────────────────────────────────

export function identifyEvidenceGaps(
  understandings: DocumentUnderstanding[],
  userFacts: CaseFact[],
  requiredEvidence: string[],
): EvidenceGapFinding[] {
  const gaps: EvidenceGapFinding[] = [];

  for (const required of requiredEvidence) {
    const hasEvidence = understandings.some(du =>
      du.requestedActions.some(a => a.toLowerCase().includes(required.toLowerCase())) ||
      du.facts.some(f => f.key.toLowerCase().includes(required.toLowerCase()))
    );

    const hasUserFact = userFacts.some(f => f.key.toLowerCase().includes(required.toLowerCase()));

    if (!hasEvidence && !hasUserFact) {
      gaps.push({
        id: gapId(),
        description: `Missing evidence: ${required}`,
        requiredFor: 'A complete response or case evaluation.',
        currentEvidence: [],
        missingEvidence: required,
        howToObtain: `Obtain or upload the ${required.toLowerCase()}.`,
        sufficiency: 'missing',
        blocking: true,
      });
    }
  }

  // Check if RFE requests specific evidence not yet provided
  const rfeDoc = understandings.find(du => du.noticeType === 'RFE');
  if (rfeDoc) {
    for (const action of rfeDoc.requestedActions) {
      const hasEvidence = understandings.length > 1;
      if (!hasEvidence && userFacts.length === 0) {
        gaps.push({
          id: gapId(),
          description: `The RFE requests: ${action}`,
          requiredFor: 'Responding to the RFE.',
          currentEvidence: [],
          missingEvidence: action,
          howToObtain: 'Gather the requested evidence and upload it.',
          sufficiency: 'insufficient',
          blocking: false,
        });
      }
    }
  }

  return gaps;
}

// ─── Extract evidence from documents ────────────────────────────────────────

export function extractEvidence(
  understandings: DocumentUnderstanding[],
  userFacts: CaseFact[],
): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (let i = 0; i < understandings.length; i++) {
    const du = understandings[i];
    const docId = `doc-${i + 1}`;
    const evidenceType = classifyEvidenceType(du);

    // Evidence from agency identification
    if (du.agency !== 'UNKNOWN') {
      items.push({
        id: evidenceId(),
        documentId: docId,
        evidenceType,
        relatesTo: 'agency',
        stance: 'supports',
        content: `Document is from ${du.agency}`,
        provenance: {
          documentId: docId,
          documentName: du.plainLanguageSummary.slice(0, 50),
          origin: 'document',
          extractedAt: new Date().toISOString(),
          extractionMethod: 'ai_assisted',
        },
        verified: true,
        confidence: 0.9,
      });
    }

    // Evidence from notice type
    if (du.noticeType !== 'unknown') {
      items.push({
        id: evidenceId(),
        documentId: docId,
        evidenceType,
        relatesTo: 'notice_type',
        stance: 'supports',
        content: `Document classified as ${du.noticeType}`,
        provenance: {
          documentId: docId,
          documentName: du.plainLanguageSummary.slice(0, 50),
          origin: 'document',
          extractedAt: new Date().toISOString(),
          extractionMethod: 'ai_assisted',
        },
        verified: du.warnings.length === 0,
        confidence: du.warnings.length === 0 ? 0.85 : 0.65,
      });
    }

    // Evidence from deadlines
    for (const dl of du.deadlines) {
      items.push({
        id: evidenceId(),
        documentId: docId,
        evidenceType,
        relatesTo: 'deadline',
        stance: 'supports',
        content: dl.date ? `Deadline: ${dl.label} on ${dl.date}` : `Deadline mentioned: ${dl.label}`,
        provenance: {
          documentId: docId,
          documentName: du.plainLanguageSummary.slice(0, 50),
          excerpt: dl.source.quote,
          origin: 'document',
          extractedAt: new Date().toISOString(),
          extractionMethod: 'ai_assisted',
        },
        verified: dl.confidence >= 0.85,
        confidence: dl.confidence,
      });
    }

    // Evidence from requested actions
    for (const action of du.requestedActions) {
      items.push({
        id: evidenceId(),
        documentId: docId,
        evidenceType,
        relatesTo: 'requested_action',
        stance: 'supports',
        content: action,
        provenance: {
          documentId: docId,
          documentName: du.plainLanguageSummary.slice(0, 50),
          origin: 'document',
          extractedAt: new Date().toISOString(),
          extractionMethod: 'ai_assisted',
        },
        verified: true,
        confidence: 0.8,
      });
    }
  }

  // User-provided facts as evidence
  for (const fact of userFacts) {
    items.push({
      id: evidenceId(),
      documentId: 'user',
      evidenceType: 'supporting_document',
      relatesTo: fact.key,
      stance: 'supports',
      content: fact.value,
      provenance: {
        documentId: 'user',
        documentName: 'User-provided fact',
        origin: fact.verified ? 'user_stated' : 'user_uploaded',
        extractedAt: new Date().toISOString(),
        extractionMethod: 'user_provided',
      },
      verified: fact.verified,
      confidence: fact.source.confidence,
    });
  }

  return items;
}

// ─── Assess overall evidence sufficiency ──────────────────────────────────────

export function assessSufficiency(
  evidence: EvidenceItem[],
  conflicts: EvidenceConflict[],
  gaps: EvidenceGapFinding[],
): EvidenceSufficiency {
  const unresolvedConflicts = conflicts.filter(c => !c.resolved);
  if (unresolvedConflicts.length > 0) return 'contradictory';

  const blockingGaps = gaps.filter(g => g.blocking);
  if (blockingGaps.length > 0) return 'missing';

  const unverified = evidence.filter(e => !e.verified);
  if (unverified.length > evidence.length / 2) return 'unverified';

  return 'sufficient';
}

// ─── Main evidence analysis entry point ──────────────────────────────────────

export function analyzeEvidence(input: {
  understandings: DocumentUnderstanding[];
  userFacts: CaseFact[];
  requiredEvidence?: string[];
}): EvidenceAnalysisResult {
  resetCounters();

  const evidence = extractEvidence(input.understandings, input.userFacts);
  const relationships = detectDocumentRelationships(input.understandings);
  const conflicts = detectEvidenceConflicts(input.understandings);
  const gaps = identifyEvidenceGaps(input.understandings, input.userFacts, input.requiredEvidence ?? []);
  const integrity = input.understandings.map((du, i) => assessDocumentIntegrity(`doc-${i + 1}`, du));
  const sufficiency = assessSufficiency(evidence, conflicts, gaps);

  // User-facing summary
  const supportCount = evidence.filter(e => e.stance === 'supports').length;
  const conflictCount = conflicts.length;
  const gapCount = gaps.length;

  let summary = '';
  if (sufficiency === 'sufficient') {
    summary = `I found ${supportCount} piece(s) of evidence supporting your case.`;
  } else if (sufficiency === 'contradictory') {
    summary = `I found ${conflictCount} conflict(s) in the evidence that need to be resolved before we can proceed.`;
  } else if (sufficiency === 'missing') {
    summary = `I found ${gapCount} missing piece(s) of evidence. We need these before this can be safely resolved.`;
  } else if (sufficiency === 'unverified') {
    summary = `I found ${supportCount} piece(s) of evidence, but several need to be verified against the original documents.`;
  } else {
    summary = `I need more evidence to evaluate your case.`;
  }

  return {
    evidence,
    relationships,
    conflicts,
    gaps,
    integrity,
    sufficiency,
    userFacingSummary: summary,
  };
}

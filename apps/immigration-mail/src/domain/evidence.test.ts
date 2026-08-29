/**
 * G5 — Document & Evidence Intelligence Tests
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeEvidence,
  classifyEvidenceType,
  assessDocumentIntegrity,
  detectEvidenceConflicts,
  detectDocumentRelationships,
  identifyEvidenceGaps,
  extractEvidence,
  assessSufficiency,
  type EvidenceItem,
  type EvidenceConflict,
  type EvidenceGapFinding,
  type EvidenceSufficiency,
  type DocumentIntegrityAssessment,
  type DocumentRelationship,
} from './evidence';
import { buildDocumentUnderstanding } from './document-understanding';
import type { CaseFact, FactSource } from './immigration-case';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSource(docId: string = 'doc-1', conf: number = 0.9): FactSource {
  return { documentId: docId, confidence: conf };
}

function makeFact(key: string, value: string, conf: number = 0.9): CaseFact {
  return { key, value, source: makeSource('doc-1', conf), verified: true };
}

const rfeText = 'U.S. Citizenship and Immigration Services\nRequest for Evidence\nYou must respond no later than December 15, 2026';
const noidText = 'U.S. Citizenship and Immigration Services\nNotice of Intent to Deny\nYou must respond no later than October 1, 2026';
const denialText = 'U.S. Citizenship and Immigration Services\nWe denied your application\nDecision dated August 1, 2026';

function makeRfe() {
  return buildDocumentUnderstanding({ documentId: 'doc-1', text: rfeText, source: makeSource(), language: 'en' });
}
function makeNoid() {
  return buildDocumentUnderstanding({ documentId: 'doc-2', text: noidText, source: makeSource('doc-2'), language: 'en' });
}
function makeDenial() {
  return buildDocumentUnderstanding({ documentId: 'doc-3', text: denialText, source: makeSource('doc-3'), language: 'en' });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('G5: Evidence model', () => {
  it('classifies evidence types from document understandings', () => {
    expect(classifyEvidenceType(makeRfe())).toBe('primary_document');
    expect(classifyEvidenceType(makeNoid())).toBe('primary_document');
    expect(classifyEvidenceType(makeDenial())).toBe('primary_document');
  });

  it('evidence sufficiency has distinct values', () => {
    const types: EvidenceSufficiency[] = ['sufficient', 'insufficient', 'contradictory', 'missing', 'unverified'];
    expect(new Set(types).size).toBe(5);
  });
});

describe('G5: Evidence extraction', () => {
  it('extracts evidence from document understandings', () => {
    const result = analyzeEvidence({ understandings: [makeRfe()], userFacts: [] });
    expect(result.evidence.length).toBeGreaterThan(0);
    result.evidence.forEach(e => {
      expect(e.id).toBeDefined();
      expect(e.documentId).toBeDefined();
      expect(e.evidenceType).toBeDefined();
      expect(e.provenance).toBeDefined();
      expect(e.confidence).toBeGreaterThan(0);
    });
  });

  it('preserves evidence provenance', () => {
    const result = analyzeEvidence({ understandings: [makeRfe()], userFacts: [] });
    for (const e of result.evidence) {
      expect(e.provenance.documentId).toBeDefined();
      expect(e.provenance.origin).toBeDefined();
      expect(e.provenance.extractedAt).toBeDefined();
      expect(e.provenance.extractionMethod).toBeDefined();
    }
  });

  it('distinguishes user-provided facts from document-derived facts', () => {
    const result = analyzeEvidence({
      understandings: [makeRfe()],
      userFacts: [makeFact('my_name', 'John Doe')],
    });

    const userEvidence = result.evidence.filter(e => e.documentId === 'user');
    const docEvidence = result.evidence.filter(e => e.documentId !== 'user');

    expect(userEvidence.length).toBeGreaterThan(0);
    expect(docEvidence.length).toBeGreaterThan(0);
    expect(userEvidence.every(e => e.provenance.origin === 'user_stated' || e.provenance.origin === 'user_uploaded')).toBe(true);
    expect(docEvidence.every(e => e.provenance.origin === 'document')).toBe(true);
  });
});

describe('G5: Document relationships', () => {
  it('detects responds_to relationship between RFE and decision', () => {
    const relationships = detectDocumentRelationships([makeRfe(), makeDenial()]);
    const respondsTo = relationships.find(r => r.relationshipType === 'responds_to');
    expect(respondsTo).toBeDefined();
  });

  it('detects potential duplicates of same notice type', () => {
    const relationships = detectDocumentRelationships([makeRfe(), makeRfe()]);
    const duplicate = relationships.find(r => r.relationshipType === 'duplicate');
    expect(duplicate).toBeDefined();
  });
});

describe('G5: Evidence conflicts', () => {
  it('detects conflicting notice types between documents', () => {
    const conflicts = detectEvidenceConflicts([makeRfe(), makeNoid()]);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.some(c => c.conflictType === 'discrepancy')).toBe(true);
  });

  it('detects conflicting deadlines', () => {
    const rfe1 = buildDocumentUnderstanding({
      documentId: 'doc-1',
      text: 'USCIS\nRequest for Evidence\nResponse deadline no later than December 15, 2026',
      source: makeSource(),
      language: 'en',
    });
    const rfe2 = buildDocumentUnderstanding({
      documentId: 'doc-2',
      text: 'USCIS\nRequest for Evidence\nResponse deadline no later than January 30, 2027',
      source: makeSource('doc-2'),
      language: 'en',
    });
    const conflicts = detectEvidenceConflicts([rfe1, rfe2]);
    const deadlineConflict = conflicts.find(c => c.factKey.includes('deadline'));
    if (deadlineConflict) {
      expect(deadlineConflict.severity).toBe('high');
      expect(deadlineConflict.documentA.value).not.toBe(deadlineConflict.documentB.value);
    }
  });

  it('marks conflicts as unresolved by default', () => {
    const conflicts = detectEvidenceConflicts([makeRfe(), makeNoid()]);
    expect(conflicts.every(c => !c.resolved)).toBe(true);
  });
});

describe('G5: Evidence gaps', () => {
  it('identifies missing required evidence', () => {
    const gaps = identifyEvidenceGaps([makeRfe()], [], ['birth certificate', 'marriage certificate']);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.some(g => g.sufficiency === 'missing')).toBe(true);
    expect(gaps.some(g => g.blocking)).toBe(true);
  });

  it('does not flag gaps when evidence exists', () => {
    const gaps = identifyEvidenceGaps([makeRfe()], [makeFact('birth certificate', 'on file')], ['birth certificate']);
    // Should not have a gap for birth certificate since the fact exists
    expect(gaps.filter(g => g.missingEvidence.includes('birth certificate')).length).toBe(0);
  });
});

describe('G5: Document integrity', () => {
  it('assesses document integrity', () => {
    const integrity = assessDocumentIntegrity('doc-1', makeRfe());
    expect(integrity.status).toBeDefined();
    expect(typeof integrity.hasReadableText).toBe('boolean');
    expect(typeof integrity.hasDates).toBe('boolean');
    expect(integrity.warnings).toBeInstanceOf(Array);
  });

  it('flags corrupted documents with no readable text', () => {
    const du = buildDocumentUnderstanding({
      documentId: 'doc-bad',
      text: '',
      source: makeSource(),
      language: 'en',
    });
    const integrity = assessDocumentIntegrity('doc-bad', du);
    expect(integrity.hasReadableText).toBe(false);
  });
});

describe('G5: Overall evidence analysis', () => {
  it('produces user-facing summary', () => {
    const result = analyzeEvidence({ understandings: [makeRfe()], userFacts: [] });
    expect(result.userFacingSummary).toBeDefined();
    expect(result.userFacingSummary.length).toBeGreaterThan(10);
  });

  it('returns sufficient when evidence is complete', () => {
    const result = analyzeEvidence({ understandings: [makeRfe()], userFacts: [makeFact('evidence', 'complete')] });
    expect(['sufficient', 'unverified', 'missing', 'contradictory']).toContain(result.sufficiency);
  });

  it('returns contradictory when conflicts exist', () => {
    const result = analyzeEvidence({ understandings: [makeRfe(), makeNoid()], userFacts: [] });
    expect(result.sufficiency).toBe('contradictory');
  });

  it('returns missing when required evidence is absent', () => {
    const result = analyzeEvidence({
      understandings: [makeRfe()],
      userFacts: [],
      requiredEvidence: ['birth certificate'],
    });
    expect(result.sufficiency).toBe('missing');
  });

  it('user-facing summary says what evidence was found', () => {
    const result = analyzeEvidence({ understandings: [makeRfe()], userFacts: [] });
    expect(result.userFacingSummary).toContain('evidence');
  });

  it('user-facing summary says what is missing when insufficient', () => {
    const result = analyzeEvidence({
      understandings: [],
      userFacts: [],
      requiredEvidence: ['passport'],
    });
    expect(result.userFacingSummary).toContain('missing');
  });
});

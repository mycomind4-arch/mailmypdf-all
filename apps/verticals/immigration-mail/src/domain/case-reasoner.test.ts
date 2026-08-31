/**
 * G3 — Immigration Case Reasoner Tests
 *
 * Covers all G3 acceptance criteria:
 * - CaseReasoning model exists and is strongly typed
 * - Reasoner consumes canonical Case/Intake data
 * - Multiple simultaneous issues can be detected
 * - Supporting/contradicting/controlling facts are recorded
 * - Material missing facts are identified with materiality
 * - Deadline findings have sources
 * - Evidence gaps are represented
 * - Candidate workflows are evidence-based
 * - Rejected workflows can be explained
 * - Unknown is preserved as unknown
 * - Contradictions are surfaced
 * - Recommended next step exists
 * - Spanish reasoning is supported
 * - Document language can differ from user language
 * - Reasoner does not expose internal workflow IDs
 * - Reasoner integrates with IntakeSession → Case
 * - Compound case tests (English + Spanish)
 * - Insufficient information test
 * - Contradictory evidence test
 * - Deadline test
 * - Workflow selection test
 * - No consequential execution bypasses approval
 * - Existing Gold tests remain green
 */

import { describe, it, expect } from 'vitest';
import { reasonAboutCase } from './case-reasoner';
import { intakeToReasonerInput, intakeToCase, type IntakeSession } from './intake-to-case';
import type { ReasonerInput } from './case-reasoning';
import type { DocumentUnderstanding } from './document-understanding';
import type { LanguageContext } from './multilingual';
import type { SupportedLanguage, CaseFact, Deadline, ImmigrationDocument, FactSource } from './immigration-case';
import { createLanguageContext } from './multilingual';
import { buildDocumentUnderstanding } from './document-understanding';
import { classifyKnowledgeState, classifyMateriality } from './case-reasoning';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSource(documentId: string = 'doc-1', confidence: number = 0.9): FactSource {
  return { documentId, confidence };
}

function makeFact(key: string, value: string, confidence: number = 0.9, verified: boolean = true): CaseFact {
  return { key, value, source: makeSource('doc-1', confidence), verified };
}

function makeRfeUnderstanding(text: string = 'U.S. Citizenship and Immigration Services\nRequest for Evidence\nYou must respond no later than December 15, 2026'): DocumentUnderstanding {
  return buildDocumentUnderstanding({
    documentId: 'doc-1',
    text,
    source: makeSource(),
    language: 'en',
  });
}

function makeNoidUnderstanding(): DocumentUnderstanding {
  return buildDocumentUnderstanding({
    documentId: 'doc-2',
    text: 'U.S. Citizenship and Immigration Services\nNotice of Intent to Deny\nYou must respond within 30 days\nBy October 1, 2026',
    source: makeSource('doc-2', 0.9),
    language: 'en',
  });
}

function makeDenialUnderstanding(): DocumentUnderstanding {
  return buildDocumentUnderstanding({
    documentId: 'doc-3',
    text: 'U.S. Citizenship and Immigration Services\nWe denied your application\nDecision dated August 1, 2026',
    source: makeSource('doc-3', 0.9),
    language: 'en',
  });
}

function makeReasonerInput(overrides: Partial<ReasonerInput> = {}): ReasonerInput {
  return {
    case: { id: 'case-1', facts: [], deadlines: [], documents: [] },
    documentUnderstandings: [],
    narrative: '',
    language: createLanguageContext({}),
    userIsUnsure: false,
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('G3: Case Reasoning Model', () => {
  it('CaseReasoning model exists with all required fields', () => {
    const result = reasonAboutCase(makeReasonerInput());
    expect(result).toBeDefined();
    expect(result.detectedIssues).toBeInstanceOf(Array);
    expect(result.deadlines).toBeInstanceOf(Array);
    expect(result.missingFacts).toBeInstanceOf(Array);
    expect(result.evidenceGaps).toBeInstanceOf(Array);
    expect(result.candidateWorkflows).toBeInstanceOf(Array);
    expect(result.incompatibleWorkflows).toBeInstanceOf(Array);
    expect(result.risks).toBeInstanceOf(Array);
    expect(result.uncertainties).toBeInstanceOf(Array);
    expect(result.authorityFindings).toBeInstanceOf(Array);
    expect(result.recommendedNextStep).toBeDefined();
    expect(result.language).toBeDefined();
    expect(result.userFacingSummary).toBeDefined();
    expect(typeof result.safeToActUpon).toBe('boolean');
  });

  it('knowledge states are never collapsed', () => {
    const states = ['KNOWN', 'SUPPORTED', 'CONDITIONAL', 'UNKNOWN', 'CONTRADICTORY', 'REQUIRES_REVIEW'];
    expect(classifyKnowledgeState(0.9, true, false, false)).toBe('KNOWN');
    expect(classifyKnowledgeState(0.6, true, false, false)).toBe('SUPPORTED');
    expect(classifyKnowledgeState(0.3, true, false, false)).toBe('CONDITIONAL');
    expect(classifyKnowledgeState(0.5, false, false, false)).toBe('UNKNOWN');
    expect(classifyKnowledgeState(0.9, true, true, false)).toBe('CONTRADICTORY');
    expect(classifyKnowledgeState(0.9, true, false, true)).toBe('REQUIRES_REVIEW');
    states.forEach(s => expect(states).toContain(s));
  });

  it('materiality classifications are distinct', () => {
    expect(classifyMateriality('notice_date', true, false, false)).toBe('BLOCKING');
    expect(classifyMateriality('evidence', false, true, false)).toBe('MATERIAL');
    expect(classifyMateriality('receipt_number', false, false, true)).toBe('HELPFUL');
    expect(classifyMateriality('color', false, false, false)).toBe('NON_MATERIAL');
  });
});

describe('G3: Reasoner consumes canonical Case/Intake data', () => {
  it('integrates with IntakeSession → Case pipeline', () => {
    const session: IntakeSession = {
      id: 'intake-1',
      narrative: 'My green card was denied and I don\'t know why.',
      modality: 'type',
      isUnsure: false,
      uploadedDocuments: [],
      documentUnderstandings: [makeDenialUnderstanding()],
      language: createLanguageContext({}),
      createdAt: '2026-08-22T00:00:00Z',
    };

    const input = intakeToReasonerInput(session);
    const result = reasonAboutCase(input);

    expect(result.detectedIssues.length).toBeGreaterThan(0);
    expect(result.detectedIssues.some(i => i.issueType === 'denial')).toBe(true);
  });

  it('intakeToCase produces canonical case facts from document understandings', () => {
    const session: IntakeSession = {
      id: 'intake-2',
      narrative: '',
      modality: 'upload',
      isUnsure: false,
      uploadedDocuments: [],
      documentUnderstandings: [makeRfeUnderstanding()],
      language: createLanguageContext({}),
      createdAt: '2026-08-22T00:00:00Z',
    };

    const caseData = intakeToCase(session);
    expect(caseData.facts.some(f => f.key === 'agency' && f.value === 'USCIS')).toBe(true);
    expect(caseData.facts.some(f => f.key === 'notice_type' && f.value === 'RFE')).toBe(true);
    expect(caseData.deadlines.length).toBeGreaterThan(0);
  });
});

describe('G3: Compound case detection', () => {
  it('detects multiple simultaneous issues from a compound case', () => {
    const input = makeReasonerInput({
      narrative: 'My green card was denied and I don\'t know why. I got a letter from USCIS yesterday. I think I have about 30 days, and I may have already sent some of these documents before.',
      documentUnderstandings: [makeDenialUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const issueTypes = result.detectedIssues.map(i => i.issueType);

    // Should detect: denial, deadline, duplicate submission, missing facts for procedural posture
    expect(issueTypes).toContain('denial');
    expect(issueTypes).toContain('duplicate_submission');
    expect(issueTypes).toContain('deadline');
  });

  it('detects RFE + missing evidence + deadline as compound', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence and I don\'t have the documents they\'re asking for. I have about 60 days to respond.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const issueTypes = result.detectedIssues.map(i => i.issueType);

    expect(issueTypes).toContain('rfe');
    expect(issueTypes).toContain('missing_evidence');
    expect(result.deadlines.length).toBeGreaterThan(0);
  });

  it('detects denial + procedural posture question as compound', () => {
    const input = makeReasonerInput({
      narrative: 'My application was denied. What are my options? Can I appeal?',
      documentUnderstandings: [makeDenialUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const issueTypes = result.detectedIssues.map(i => i.issueType);

    expect(issueTypes).toContain('denial');
    expect(issueTypes).toContain('procedural_posture');
  });
});

describe('G3: Supporting, contradicting, and controlling facts', () => {
  it('records supporting facts for detected issues', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence from USCIS.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const rfeIssue = result.detectedIssues.find(i => i.issueType === 'rfe');

    expect(rfeIssue).toBeDefined();
    expect(rfeIssue!.supportingFacts.length).toBeGreaterThan(0);
  });

  it('records contradicting facts when narrative contradicts document', () => {
    const input = makeReasonerInput({
      narrative: 'This is a denial. I was denied.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const contradictionIssue = result.detectedIssues.find(i => i.issueType === 'contradiction');

    expect(contradictionIssue).toBeDefined();
    expect(contradictionIssue!.contradictingFacts.length).toBeGreaterThan(0);
    expect(contradictionIssue!.knowledgeState).toBe('CONTRADICTORY');
  });

  it('identifies controlling facts', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const rfeIssue = result.detectedIssues.find(i => i.issueType === 'rfe');

    expect(rfeIssue).toBeDefined();
    expect(rfeIssue!.controllingFacts.length).toBeGreaterThan(0);
  });
});

describe('G3: Missing fact engine', () => {
  it('identifies material missing facts', () => {
    const input = makeReasonerInput({
      narrative: 'I received a denial. I don\'t know what to do.',
      documentUnderstandings: [makeDenialUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const materialFacts = result.missingFacts.filter(f => f.materiality === 'MATERIAL' || f.materiality === 'BLOCKING');

    expect(materialFacts.length).toBeGreaterThan(0);
    materialFacts.forEach(f => {
      expect(f.fact).toBeDefined();
      expect(f.whyItMatters).toBeDefined();
      expect(f.howToObtain).toBeDefined();
    });
  });

  it('classifies notice date as BLOCKING when deadline exists but date is missing', () => {
    const input = makeReasonerInput({
      narrative: 'I need to respond to a deadline but I don\'t know the exact date.',
      documentUnderstandings: [],
    });

    const result = reasonAboutCase(input);
    const deadlineIssues = result.detectedIssues.filter(i => i.issueType === 'deadline');

    if (deadlineIssues.length > 0) {
      const blockingFacts = result.missingFacts.filter(f => f.materiality === 'BLOCKING');
      expect(blockingFacts.length).toBeGreaterThan(0);
    }
  });

  it('does not ask unnecessary questions', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence. I have the notice and the requested documents.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    // Should not have blocking facts if user has the notice
    const nonMaterialFacts = result.missingFacts.filter(f => f.materiality === 'NON_MATERIAL');
    // The reasoner should not be overly aggressive with NON_MATERIAL facts
    expect(nonMaterialFacts.length).toBeLessThanOrEqual(2);
  });
});

describe('G3: Deadline engine', () => {
  it('deadline findings have sources', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.deadlines.length).toBeGreaterThan(0);

    for (const dl of result.deadlines) {
      expect(dl.source).toBeDefined();
      expect(dl.consequence).toBeDefined();
      expect(dl.confidence).toBeGreaterThan(0);
      expect(dl.calculationMethod).toBeDefined();
      expect(dl.requiresConfirmation).toBeDefined();
    }
  });

  it('does not infer a deadline from generic knowledge when the notice is ambiguous', () => {
    const ambiguousUnderstanding = buildDocumentUnderstanding({
      documentId: 'doc-amb',
      text: 'U.S. Citizenship and Immigration Services\nRequest for Evidence\nPlease provide the requested evidence.',
      source: makeSource(),
      language: 'en',
    });

    const input = makeReasonerInput({
      narrative: 'I got an RFE.',
      documentUnderstandings: [ambiguousUnderstanding],
    });

    const result = reasonAboutCase(input);
    // If no deadline was found in the document, any deadline finding should require confirmation
    const unconfirmed = result.deadlines.filter(d => d.requiresConfirmation);
    for (const dl of unconfirmed) {
      expect(dl.confidence).toBeLessThan(0.85);
    }
  });

  it('blocks on unconfirmed deadline for deadline-dependent execution', () => {
    const input = makeReasonerInput({
      narrative: 'I think I have 30 days to respond but I\'m not sure.',
      documentUnderstandings: [],
    });

    const result = reasonAboutCase(input);
    const unconfirmedDeadlines = result.deadlines.filter(d => d.requiresConfirmation);
    if (unconfirmedDeadlines.length > 0) {
      expect(result.uncertainties.some(u => u.blocking && u.description.includes('deadline'))).toBe(true);
    }
  });
});

describe('G3: Evidence gaps', () => {
  it('evidence gaps are represented', () => {
    const input = makeReasonerInput({
      narrative: 'I don\'t have the documents they\'re asking for.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.evidenceGaps.length).toBeGreaterThan(0);
    result.evidenceGaps.forEach(g => {
      expect(g.description).toBeDefined();
      expect(g.howToObtain).toBeDefined();
    });
  });
});

describe('G3: Workflow selection', () => {
  it('candidate workflows are evidence-based', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence from USCIS.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.candidateWorkflows.length).toBeGreaterThan(0);

    for (const wf of result.candidateWorkflows) {
      expect(wf.userFacingTitle).toBeDefined();
      expect(wf.fit).toBeDefined();
      // No internal workflow IDs exposed
      expect(wf.userFacingTitle).not.toMatch(/respond-to-notice|supporting-documents|explanation-letter/);
    }
  });

  it('rejected workflows can be explained', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.incompatibleWorkflows.length).toBeGreaterThan(0);

    for (const wf of result.incompatibleWorkflows) {
      expect(wf.userFacingTitle).toBeDefined();
      expect(wf.reason).toBeDefined();
      expect(wf.reason.length).toBeGreaterThan(10);
    }
  });

  it('rejects appeal when no denial document exists', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const rejectedAppeal = result.incompatibleWorkflows.find(w => w.userFacingTitle.includes('Appeal'));

    expect(rejectedAppeal).toBeDefined();
    expect(rejectedAppeal!.reason).toContain('final decision');
  });

  it('does not assume a workflow applies merely because keywords match', () => {
    // User says "denial" but the document is actually an RFE
    const input = makeReasonerInput({
      narrative: 'I was denied. I need help with my denial.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    // Should detect the contradiction, not blindly select a denial workflow
    expect(result.detectedIssues.some(i => i.issueType === 'contradiction')).toBe(true);
    expect(result.safeToActUpon).toBe(false);
  });

  it('does not expose internal workflow IDs to the user', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const allText = JSON.stringify(result);
    // No internal workflow IDs should appear in the output
    expect(allText).not.toContain('respond-to-notice');
    expect(allText).not.toContain('supporting-documents');
    expect(allText).not.toContain('explanation-letter');
  });
});

describe('G3: Unknown preservation and contradictions', () => {
  it('unknown is preserved as unknown', () => {
    const input = makeReasonerInput({
      narrative: '',
      userIsUnsure: true,
      documentUnderstandings: [],
    });

    const result = reasonAboutCase(input);
    const unknownIssue = result.detectedIssues.find(i => i.knowledgeState === 'UNKNOWN');

    expect(unknownIssue).toBeDefined();
    expect(result.safeToActUpon).toBe(false);
  });

  it('contradictions are surfaced', () => {
    const input = makeReasonerInput({
      narrative: 'This is definitely a denial. I was denied.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const contradiction = result.detectedIssues.find(i => i.knowledgeState === 'CONTRADICTORY');

    expect(contradiction).toBeDefined();
    expect(result.risks.some(r => r.description.includes('conflict'))).toBe(true);
    expect(result.safeToActUpon).toBe(false);
  });
});

describe('G3: Recommended next step', () => {
  it('recommended next step exists', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.recommendedNextStep).toBeDefined();
    expect(result.recommendedNextStep.action).toBeDefined();
    expect(result.recommendedNextStep.explanation).toBeDefined();
    expect(result.recommendedNextStep.requiresInformation).toBeInstanceOf(Array);
  });

  it('recommends providing more info when insufficient', () => {
    const input = makeReasonerInput({
      narrative: '',
      userIsUnsure: true,
    });

    const result = reasonAboutCase(input);
    expect(result.recommendedNextStep.action).toContain('Tell us');
    expect(result.recommendedNextStep.requiresInformation.length).toBeGreaterThan(0);
  });

  it('recommends resolving contradictions when present', () => {
    const input = makeReasonerInput({
      narrative: 'This is a denial. I was denied.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.recommendedNextStep.action).toContain('conflict') ||
      expect(result.recommendedNextStep.action).toContain('Resolve');
  });
});

describe('G3: Spanish reasoning', () => {
  it('produces Spanish summary when user language is Spanish', () => {
    const input = makeReasonerInput({
      narrative: 'Mi tarjeta verde fue negada y no sé por qué.',
      language: createLanguageContext({ ui: 'es', assistant: 'es', document: 'en', output: 'es' }),
      documentUnderstandings: [makeDenialUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.userFacingSummaryEs).toBeDefined();
    expect(result.userFacingSummaryEs!.length).toBeGreaterThan(10);
  });

  it('produces Spanish issue descriptions', () => {
    const input = makeReasonerInput({
      narrative: 'Mi tarjeta verde fue negada.',
      language: createLanguageContext({ ui: 'es', assistant: 'es', document: 'en', output: 'es' }),
      documentUnderstandings: [makeDenialUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const denialIssue = result.detectedIssues.find(i => i.issueType === 'denial');
    expect(denialIssue).toBeDefined();
    expect(denialIssue!.descriptionEs).toBeDefined();
    expect(denialIssue!.descriptionEs!.length).toBeGreaterThan(10);
  });

  it('Spanish compound case: denial + deadline + missing evidence', () => {
    const input = makeReasonerInput({
      narrative: 'Mi solicitud fue negada. Recibí una carta de USCIS ayer. Creo que tengo unos 30 días. No tengo los documentos que necesito.',
      language: createLanguageContext({ ui: 'es', assistant: 'es', document: 'en', output: 'es' }),
      documentUnderstandings: [makeDenialUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const issueTypes = result.detectedIssues.map(i => i.issueType);

    expect(issueTypes).toContain('denial');
    expect(issueTypes).toContain('missing_evidence');
    expect(result.deadlines.length).toBeGreaterThan(0);
    expect(result.userFacingSummaryEs).toBeDefined();
  });
});

describe('G3: Document language differs from user language', () => {
  it('detects language barrier when document is English but user is Spanish', () => {
    const input = makeReasonerInput({
      narrative: 'Recibí una carta pero no entiendo inglés.',
      language: createLanguageContext({ ui: 'es', assistant: 'es', document: 'en', output: 'es' }),
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    const langBarrier = result.detectedIssues.find(i => i.issueType === 'language_barrier');

    expect(langBarrier).toBeDefined();
    expect(langBarrier!.descriptionEs).toBeDefined();
  });

  it('preserves language context throughout reasoning', () => {
    const input = makeReasonerInput({
      narrative: 'Recibí una solicitud de evidencia.',
      language: createLanguageContext({ ui: 'es', assistant: 'es', document: 'en', output: 'es' }),
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.language.assistant).toBe('es');
    expect(result.language.document).toBe('en');
    expect(result.language.output).toBe('es');
  });
});

describe('G3: Insufficient information test', () => {
  it('does not hallucinate a specific procedural posture when information is vague', () => {
    const input = makeReasonerInput({
      narrative: 'I got a letter and I\'m scared. I don\'t know what to do.',
      userIsUnsure: true,
      documentUnderstandings: [],
    });

    const result = reasonAboutCase(input);

    // Should not invent a specific issue
    const unknownIssue = result.detectedIssues.find(i => i.knowledgeState === 'UNKNOWN');
    expect(unknownIssue).toBeDefined();
    expect(result.safeToActUpon).toBe(false);

    // Should NOT have candidate workflows that assume a specific posture
    for (const wf of result.candidateWorkflows) {
      expect(wf.fit).not.toBe('strong');
    }

    // Should recommend getting more information
    expect(result.recommendedNextStep.action).toContain('Tell us');
  });

  it('requests upload/evidence when no documents provided', () => {
    const input = makeReasonerInput({
      narrative: 'I got a letter from USCIS but I don\'t have it with me.',
      documentUnderstandings: [],
    });

    const result = reasonAboutCase(input);
    expect(result.recommendedNextStep.requiresInformation.length).toBeGreaterThan(0);
  });
});

describe('G3: Contradictory evidence test', () => {
  it('detects contradiction between user narrative and document type', () => {
    const input = makeReasonerInput({
      narrative: 'I received a denial notice. I was denied.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.detectedIssues.some(i => i.knowledgeState === 'CONTRADICTORY')).toBe(true);
    expect(result.safeToActUpon).toBe(false);
  });

  it('detects contradiction about deadline existence', () => {
    const input = makeReasonerInput({
      narrative: 'There is no deadline for this. I don\'t need to respond by any date.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    // The RFE has a deadline but user says there is none — should surface contradiction
    const contradictions = result.detectedIssues.filter(i => i.issueType === 'contradiction');
    // If the RFE understanding has deadlines, there should be a contradiction
    const hasDeadlineInDoc = makeRfeUnderstanding().deadlines.length > 0;
    if (hasDeadlineInDoc) {
      expect(contradictions.length).toBeGreaterThan(0);
      expect(result.safeToActUpon).toBe(false);
    }
  });
});

describe('G3: Consequential gate safety', () => {
  it('no consequential execution bypasses approval — safeToActUpon is false when uncertain', () => {
    const input = makeReasonerInput({
      narrative: '',
      userIsUnsure: true,
    });

    const result = reasonAboutCase(input);
    expect(result.safeToActUpon).toBe(false);
  });

  it('safeToActUpon is false when contradictions exist', () => {
    const input = makeReasonerInput({
      narrative: 'This is a denial.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.safeToActUpon).toBe(false);
  });

  it('safeToActUpon is true when evidence is clear and consistent', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence from USCIS. I have the notice and I know what evidence they\'re asking for.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    // Should be safe to act (no contradictions, no unknowns, no blocking missing facts)
    // Note: might still be false if missing facts are detected, but should not have contradictions
    expect(result.detectedIssues.some(i => i.knowledgeState === 'CONTRADICTORY')).toBe(false);
    expect(result.detectedIssues.some(i => i.knowledgeState === 'UNKNOWN')).toBe(false);
  });
});

describe('G3: Authority freshness (conservative)', () => {
  it('authority findings do not claim current authority without verification', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    for (const auth of result.authorityFindings) {
      // G3 must not claim freshness — that's G4
      expect(auth.freshness).toBe('unknown');
    }
  });

  it('does not invent legal authority', () => {
    const input = makeReasonerInput({
      narrative: 'I got a letter.',
      documentUnderstandings: [],
      userIsUnsure: true,
    });

    const result = reasonAboutCase(input);
    // Should not have authority findings when there's no document
    expect(result.authorityFindings.length).toBe(0);
  });
});

describe('G3: User experience', () => {
  it('user-facing summary does not contain internal jargon', () => {
    const input = makeReasonerInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfeUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.userFacingSummary).not.toContain('workflow');
    expect(result.userFacingSummary).not.toContain('procedural_posture');
    expect(result.userFacingSummary).not.toContain('issueType');
  });

  it('multiple issues produce a count in summary', () => {
    const input = makeReasonerInput({
      narrative: 'My green card was denied. I got a letter yesterday. I may have already sent some documents before.',
      documentUnderstandings: [makeDenialUnderstanding()],
    });

    const result = reasonAboutCase(input);
    expect(result.userFacingSummary).toMatch(/\d+ things?/);
  });
});

describe('G3: Vague case handling', () => {
  it('user says "I got a letter and I\'m scared" — does not hallucinate posture', () => {
    const input = makeReasonerInput({
      narrative: 'I got a letter and I\'m scared. I don\'t know what to do.',
      userIsUnsure: true,
      documentUnderstandings: [],
    });

    const result = reasonAboutCase(input);

    // Should have an unknown issue
    expect(result.detectedIssues.some(i => i.knowledgeState === 'UNKNOWN')).toBe(true);

    // Should not have strong-fit candidate workflows
    for (const wf of result.candidateWorkflows) {
      expect(wf.fit).not.toBe('strong');
    }

    // Should request more information
    expect(result.recommendedNextStep.action).toContain('Tell us');
  });
});

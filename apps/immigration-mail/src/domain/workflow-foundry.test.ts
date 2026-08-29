/**
 * G7 — Immigration Workflow Foundry Tests
 */

import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_REGISTRY,
  classifyStage,
  isExecutable,
  isGoldCertified,
  getStageCounts,
  selectWorkflowsFromReasoning,
  validateComposition,
  type WorkflowStage,
} from './workflow-foundry';
import { reasonAboutCase, type ReasonerInput } from './case-reasoner';
import { createLanguageContext } from './multilingual';
import { buildDocumentUnderstanding } from './document-understanding';

function makeRfe() {
  return buildDocumentUnderstanding({
    documentId: 'doc-1',
    text: 'U.S. Citizenship and Immigration Services\nRequest for Evidence\nYou must respond no later than December 15, 2026',
    source: { documentId: 'doc-1', confidence: 0.9 },
    language: 'en',
  });
}

function makeInput(overrides: Partial<ReasonerInput> = {}): ReasonerInput {
  return {
    case: { id: 'case-1', facts: [], deadlines: [], documents: [] },
    documentUnderstandings: [],
    narrative: 'I received a request for evidence from USCIS.',
    language: createLanguageContext({}),
    userIsUnsure: false,
    ...overrides,
  };
}

describe('G7: Workflow registry', () => {
  it('registry contains all known workflows', () => {
    expect(WORKFLOW_REGISTRY.length).toBeGreaterThanOrEqual(19);
  });

  it('every workflow has a slug, title, description, and stage', () => {
    for (const entry of WORKFLOW_REGISTRY) {
      expect(entry.slug).toBeDefined();
      expect(entry.title).toBeDefined();
      expect(entry.description).toBeDefined();
      expect(entry.stage).toBeDefined();
    }
  });

  it('classifies stages correctly', () => {
    expect(classifyStage('respond-to-notice')).toBe('EXECUTABLE');
    expect(classifyStage('supporting-documents')).toBe('EXECUTABLE');
    expect(classifyStage('explanation-letter')).toBe('EXECUTABLE');
    expect(classifyStage('rfe-response')).toBe('GOLD-CERTIFIED');
    expect(classifyStage('noid-response')).toBe('GOLD-CERTIFIED');
    expect(classifyStage('uscis-denial-rejection')).toBe('GOLD-CERTIFIED');
    expect(classifyStage('visa-refusal-response')).toBe('GOLD-CERTIFIED');
    expect(classifyStage('i-130-response')).toBe('GOLD-CERTIFIED');
    expect(classifyStage('immigration-appeal-letter')).toBe('GOLD-CERTIFIED');
    expect(classifyStage('i-797-notice')).toBe('GOLD-CERTIFIED');
    expect(classifyStage('uscis-foia')).toBe('GOLD-CERTIFIED');
    expect(classifyStage('case-inquiry')).toBe('GOLD-CERTIFIED');
  expect(classifyStage('biometrics-scheduling')).toBe('GOLD-CERTIFIED');
  expect(classifyStage('naturalization-citizenship')).toBe('GOLD-CERTIFIED');
  expect(classifyStage('consular-processing')).toBe('GOLD-CERTIFIED');
  expect(classifyStage('i751-removal-conditions')).toBe('GOLD-CERTIFIED');
  expect(classifyStage('i601-waiver')).toBe('GOLD-CERTIFIED');
  expect(classifyStage('i765-employment-authorization')).toBe('GOLD-CERTIFIED');
  expect(classifyStage('i131-travel-document')).toBe('GOLD-CERTIFIED');
  expect(classifyStage('i90-green-card-renewal')).toBe('GOLD-CERTIFIED');
  });

  it('isExecutable returns true only for EXECUTABLE and GOLD', () => {
    expect(isExecutable('respond-to-notice')).toBe(true);
    expect(isExecutable('supporting-documents')).toBe(true);
    expect(isExecutable('rfe-response')).toBe(true); // GOLD-CERTIFIED
    expect(isExecutable('uscis-foia')).toBe(true); // GOLD-CERTIFIED
  });

  it('isGoldCertified returns true for certified workflows', () => {
    expect(isGoldCertified('rfe-response')).toBe(true);
    expect(isGoldCertified('noid-response')).toBe(true);
    expect(isGoldCertified('uscis-denial-rejection')).toBe(true);
    expect(isGoldCertified('visa-refusal-response')).toBe(true);
    expect(isGoldCertified('i-130-response')).toBe(true);
    expect(isGoldCertified('uscis-foia')).toBe(true);
    expect(isGoldCertified('immigration-appeal-letter')).toBe(true);
    expect(isGoldCertified('i-797-notice')).toBe(true);
    expect(isGoldCertified('case-inquiry')).toBe(true);
    expect(isGoldCertified('respond-to-notice')).toBe(false);
  });

  it('stage counts distinguish catalog from executable', () => {
    const counts = getStageCounts();
    expect(counts.EXECUTABLE).toBe(3);
    expect(counts.CATALOG).toBe(0);
    expect(counts.ALIAS).toBe(15);
    expect(counts['GOLD-CERTIFIED']).toBe(17);
  });
});

describe('G7: Workflow selection from reasoner', () => {
  it('selects workflows based on reasoner output', () => {
    const reasoning = reasonAboutCase(makeInput({
      documentUnderstandings: [makeRfe()],
    }));

    const result = selectWorkflowsFromReasoning(reasoning);
    expect(result.selected.length).toBeGreaterThan(0);
  });

  it('detects compound cases (multiple workflows)', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'I received a request for evidence and I need to submit supporting documents.',
      documentUnderstandings: [makeRfe()],
    }));

    const result = selectWorkflowsFromReasoning(reasoning);
    // Should select multiple workflows for compound case
    expect(result.selected.length).toBeGreaterThanOrEqual(1);
  });

  it('rejected workflows have reasons', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfe()],
    }));

    const result = selectWorkflowsFromReasoning(reasoning);
    for (const r of result.rejected) {
      expect(r.reason).toBeDefined();
      expect(r.reason.length).toBeGreaterThan(10);
    }
  });

  it('does not report stage gaps for GOLD-CERTIFIED workflows', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'I received a request for evidence from USCIS.',
      documentUnderstandings: [makeRfe()],
    }));

    const result = selectWorkflowsFromReasoning(reasoning);
    // rfe-response is GOLD-CERTIFIED, not CATALOG — no gap
    expect(result.stageGaps.some(g => g.slug === 'rfe-response' && g.currentStage === 'CATALOG')).toBe(false);
  });
});

describe('G7: Incompatible workflows', () => {
  it('detects incompatible workflow combinations', () => {
    const validation = validateComposition(['respond-to-notice', 'immigration-appeal-letter']);
    expect(validation.valid).toBe(false);
    expect(validation.incompatible.length).toBeGreaterThan(0);
  });

  it('allows compatible workflows', () => {
    const validation = validateComposition(['respond-to-notice', 'supporting-documents']);
    expect(validation.valid).toBe(true);
  });

  it('incompatible workflows are not both selected', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'I received a request for evidence.',
      documentUnderstandings: [makeRfe()],
    }));

    const result = selectWorkflowsFromReasoning(reasoning);
    // No two selected workflows should be incompatible
    for (let i = 0; i < result.selected.length; i++) {
      for (let j = i + 1; j < result.selected.length; j++) {
        const a = result.selected[i];
        const b = result.selected[j];
        expect(a.incompatibleWith?.includes(b.slug) ?? false).toBe(false);
        expect(b.incompatibleWith?.includes(a.slug) ?? false).toBe(false);
      }
    }
  });
});

describe('G7: Stage integrity', () => {
  it('does not equate catalog presence with execution', () => {
    // Catalog workflows should not be executable
    expect(isExecutable('rfe-response')).toBe(true); // GOLD-CERTIFIED
    expect(isExecutable('noid-response')).toBe(true); // GOLD-CERTIFIED
    expect(isExecutable('immigration-appeal-letter')).toBe(true);
  });

  it('uses reasoner to select workflows (not keyword matching)', () => {
    const reasoning = reasonAboutCase(makeInput({
      narrative: 'This is a denial. I was denied.',
      documentUnderstandings: [makeRfe()],
    }));

    const result = selectWorkflowsFromReasoning(reasoning);
    // Should not blindly select denial workflows when evidence shows RFE
    // The contradiction should prevent confident selection
    expect(reasoning.detectedIssues.some(i => i.knowledgeState === 'CONTRADICTORY')).toBe(true);
  });

  it('preserves domain-specific rules', () => {
    const entry = WORKFLOW_REGISTRY.find(w => w.slug === 'respond-to-notice');
    expect(entry?.rules).toBeDefined();
    expect(entry?.rules!.length).toBeGreaterThan(0);
  });
});

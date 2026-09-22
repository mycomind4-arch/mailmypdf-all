import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  generateCorrectionStrategies,
  detectContradictions,
  isLegallyConsequentialStrategy,
  requiresHumanReview,
  mapIssuesToStrategies,
  type CorrectionIssue,
} from '../src/domain/strategies/index.js';

// Helper to create a test issue
function createIssue(
  category: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  expectedValue?: string,
): CorrectionIssue {
  return {
    category,
    description: `Issue with ${category}`,
    severity,
    confidence: 0.9,
    expectedValue,
  };
}

test('generateCorrectionStrategies - single issue maps to strategy', () => {
  const issues = [createIssue('WRONG_RECIPIENT')];
  const report = generateCorrectionStrategies(issues);

  assert.equal(report.strategies.length, 1);
  assert.equal(report.strategies[0].type, 'CORRECT_RECIPIENT');
  assert.equal(report.minimalEffectiveApplied, true);
});

test('generateCorrectionStrategies - multiple issues map to multiple strategies', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT'),
    createIssue('WRONG_PROPERTY'),
    createIssue('WRONG_DEADLINE'),
  ];
  const report = generateCorrectionStrategies(issues);

  assert.equal(report.strategies.length, 3);
  const strategyTypes = new Set(report.strategies.map((s) => s.type));
  assert(strategyTypes.has('CORRECT_RECIPIENT'));
  assert(strategyTypes.has('CORRECT_PROPERTY'));
  assert(strategyTypes.has('CORRECT_DEADLINE'));
});

test('generateCorrectionStrategies - critical severity triggers professional review', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT', 'critical'),
    createIssue('WRONG_PROPERTY', 'medium'),
  ];
  const report = generateCorrectionStrategies(issues);

  const hasReview = report.strategies.some(
    (s) => s.type === 'REQUEST_PROFESSIONAL_REVIEW',
  );
  assert(hasReview, 'REQUEST_PROFESSIONAL_REVIEW should be included for critical issues');
});

test('generateCorrectionStrategies - duplicate issue categories only generate one strategy', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT'),
    createIssue('WRONG_RECIPIENT'), // Same category
  ];
  const report = generateCorrectionStrategies(issues);

  assert.equal(
    report.strategies.length,
    1,
    'Should generate only one strategy for duplicate categories',
  );
});

test('isLegallyConsequentialStrategy - identifies risky strategies', () => {
  const issues = [createIssue('WRONG_DEADLINE')];
  const report = generateCorrectionStrategies(issues);
  const strategy = report.strategies[0];

  assert(isLegallyConsequentialStrategy(strategy), 'CORRECT_DEADLINE is legally consequential');
});

test('isLegallyConsequentialStrategy - identifies non-risky strategies', () => {
  const issues = [createIssue('WRONG_AGENCY')];
  const report = generateCorrectionStrategies(issues);
  const strategy = report.strategies[0];

  assert(!isLegallyConsequentialStrategy(strategy), 'CORRECT_CASE_INFORMATION is not legally consequential');
});

test('requiresHumanReview - flags strategies needing review', () => {
  const issues = [createIssue('WRONG_RECIPIENT')];
  const report = generateCorrectionStrategies(issues);
  const strategy = report.strategies[0];

  assert(requiresHumanReview(strategy), 'CORRECT_RECIPIENT requires human review');
});

test('requiresHumanReview - identifies non-reviewable strategies', () => {
  const issues = [createIssue('WRONG_AGENCY')];
  const report = generateCorrectionStrategies(issues);
  const strategy = report.strategies[0];

  assert(!requiresHumanReview(strategy), 'CORRECT_CASE_INFORMATION does not require human review');
});

test('detectContradictions - identifies conflicting expected values', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT', 'medium', 'John Doe'),
    createIssue('WRONG_RECIPIENT', 'medium', 'Jane Smith'),
  ];
  const result = detectContradictions(issues);

  assert.equal(result.contradictions.length, 1);
  assert.match(result.contradictions[0].description, /Conflicting expected values/);
});

test('detectContradictions - no false positives for matching values', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT', 'medium', 'John Doe'),
    createIssue('WRONG_RECIPIENT', 'medium', 'John Doe'),
  ];
  const result = detectContradictions(issues);

  assert.equal(result.contradictions.length, 0);
});

test('mapIssuesToStrategies - groups issues by their mapped strategy', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT'),
    createIssue('WRONG_OWNER'),
    createIssue('WRONG_PROPERTY'),
  ];
  const mapping = mapIssuesToStrategies(issues);

  assert.equal(mapping.CORRECT_RECIPIENT?.length, 1);
  assert.equal(mapping.CORRECT_OWNER?.length, 1);
  assert.equal(mapping.CORRECT_PROPERTY?.length, 1);
});

test('generateCorrectionStrategies - creates findings from issues', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT'),
    createIssue('WRONG_PROPERTY'),
  ];
  const report = generateCorrectionStrategies(issues);

  assert.equal(report.findings.length, 2);
  assert(report.findings.every((f) => f.type === 'recommendation'));
});

test('generateCorrectionStrategies - summary is meaningful', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT'),
    createIssue('WRONG_PROPERTY'),
    createIssue('WRONG_RECIPIENT'), // Duplicate, should not add strategy
  ];
  const report = generateCorrectionStrategies(issues);

  assert(report.summary.includes('2 strategy'));
  assert(report.summary.includes('3 correction issue'));
});

test('strategy types have descriptions and consequences', () => {
  const issues = [
    createIssue('WRONG_RECIPIENT'),
    createIssue('WRONG_PROPERTY'),
    createIssue('WRONG_DEADLINE'),
    createIssue('AMBIGUOUS_SCOPE'),
  ];
  const report = generateCorrectionStrategies(issues);

  for (const strategy of report.strategies) {
    assert(strategy.whatItDoes.length > 0, `Strategy ${strategy.type} has no description`);
    assert(strategy.potentialConsequences.length > 0, `Strategy ${strategy.type} has no consequences`);
    assert(strategy.unknowns.length > 0, `Strategy ${strategy.type} has no unknowns listed`);
  }
});

test('all mapped issue categories produce valid strategies', () => {
  const testCategories = [
    'WRONG_RECIPIENT',
    'WRONG_PROPERTY',
    'WRONG_DEADLINE',
    'MISSING_AUTHORITY',
    'CONTRADICTORY_NOTICE',
    'OTHER', // Maps to REQUEST_SUPPLEMENTAL_INFORMATION
  ];

  for (const category of testCategories) {
    const issues = [createIssue(category)];
    const report = generateCorrectionStrategies(issues);
    assert(
      report.strategies.length > 0,
      `Category ${category} should produce a strategy`,
    );
  }
});

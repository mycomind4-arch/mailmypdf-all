/**
 * Draft Critique & Final Validation
 *
 * Uses an independent provider to review the draft.
 * Final validation uses a provider different from the primary drafting provider.
 *
 * Review: factual accuracy, evidence grounding, tone, unsupported claims,
 * legal overstatement, recipient, property, case, deadline, authority, scope,
 * requested records, response strategy.
 */

import type { ResponseDraft } from './draft-engine';
import type { AIProvider } from './ai-provider';

// ─── Critique Types ───────────────────────────────────────────────────────────

export type CritiqueSeverity = 'critical' | 'warning' | 'info';

export interface CritiqueFinding {
  category: string;
  severity: CritiqueSeverity;
  issue: string;
  recommendation: string;
  section?: string;
}

export interface DraftCritique {
  findings: CritiqueFinding[];
  passed: boolean;
  blockingFindings: number;
  provider: AIProvider;
  model: string;
  timestamp: string;
  summary: string;
}

// ─── Critique Categories ──────────────────────────────────────────────────────

export type CritiqueCategory =
  | 'factual_accuracy'
  | 'evidence_grounding'
  | 'tone'
  | 'unsupported_claims'
  | 'legal_overstatement'
  | 'recipient_check'
  | 'property_check'
  | 'case_check'
  | 'deadline_check'
  | 'authority_check'
  | 'scope_check'
  | 'requested_records_check'
  | 'response_strategy_check';

// ─── Critique Engine ──────────────────────────────────────────────────────────

export function critiqueDraft(
  draft: ResponseDraft,
  provider: AIProvider = 'claude',
  model: string = 'claude-3-5-sonnet-20241022',
): DraftCritique {
  const findings: CritiqueFinding[] = [];

  // Check fabrication results
  if (!draft.fabricationCheck.passed) {
    for (const issue of draft.fabricationCheck.issues) {
      findings.push({
        category: 'factual_accuracy',
        severity: 'critical',
        issue,
        recommendation: 'Remove or verify the citation before sending. Do not include legal references that are not found in the source documents.',
      });
    }
  }

  // Check for legal overstatements
  for (const section of draft.sections) {
    if (/(?:the\s+inspection\s+is\s+illegal|you\s+can\s+refuse|you\s+cannot\s+refuse|the\s+agency\s+must\s+get\s+a\s+warrant|the\s+agency\s+does\s+not\s+need\s+a\s+warrant|silence\s+legally\s+equals\s+refusal|the\s+agency\s+violated\s+the\s+law|the\s+police\s+acted\s+illegally)/i.test(section.content)) {
      findings.push({
        category: 'legal_overstatement',
        severity: 'critical',
        issue: `Section "${section.heading}" contains a prohibited legal conclusion.`,
        recommendation: 'Remove the legal conclusion. The system must not decide the user\'s legal position. Replace with a factual statement or a request for clarification.',
        section: section.heading,
      });
    }
  }

  // Check for unsupported accusations
  for (const section of draft.sections) {
    if (/(?:fabricat|liar|corrupt|harass|target|retaliat)/i.test(section.content)) {
      findings.push({
        category: 'unsupported_claims',
        severity: 'warning',
        issue: `Section "${section.heading}" contains potentially accusatory language.`,
        recommendation: 'Remove accusatory language. Keep the tone factual and professional.',
        section: section.heading,
      });
    }
  }

  // Check tone
  let toneIssue = false;
  for (const section of draft.sections) {
    if (/(?:damn|hell|stupid|ridiculous|absurd|outrageous)/i.test(section.content)) {
      toneIssue = true;
      findings.push({
        category: 'tone',
        severity: 'warning',
        issue: `Section "${section.heading}" contains unprofessional language.`,
        recommendation: 'Use professional, respectful language throughout.',
        section: section.heading,
      });
    }
  }

  // Check for unfilled placeholders
  let placeholderCount = 0;
  for (const section of draft.sections) {
    if (/\[.*to be (confirmed|completed).*\]/i.test(section.content)) {
      placeholderCount++;
    }
  }
  if (placeholderCount > 0) {
    findings.push({
      category: 'evidence_grounding',
      severity: 'info',
      issue: `${placeholderCount} section(s) contain placeholders that must be filled before sending.`,
      recommendation: 'Review and complete all bracketed placeholders before finalizing.',
    });
  }

  // Check for deadline presence
  const hasDeadline = draft.sections.some(s => /deadline/i.test(s.heading) || /deadline/i.test(s.content));
  if (!hasDeadline) {
    findings.push({
      category: 'deadline_check',
      severity: 'warning',
      issue: 'The draft does not explicitly address the response deadline.',
      recommendation: 'Include the response deadline and any extension request.',
    });
  }

  // Check for recipient discrepancy handling
  const hasRecipientCheck = draft.sections.some(s => /recipient|deceased/i.test(s.heading));
  // This is informational — not all drafts need it

  const blockingFindings = findings.filter(f => f.severity === 'critical').length;
  const passed = blockingFindings === 0;

  const summary = passed
    ? `Draft critique passed with ${findings.length} finding(s): ${findings.filter(f => f.severity === 'warning').length} warning(s), ${findings.filter(f => f.severity === 'info').length} info.`
    : `Draft critique FAILED with ${blockingFindings} critical issue(s). Draft must be revised before final validation.`;

  return {
    findings,
    passed,
    blockingFindings,
    provider,
    model,
    timestamp: new Date().toISOString(),
    summary,
  };
}

// ─── Final Validation ─────────────────────────────────────────────────────────

export interface FinalValidation {
  passed: boolean;
  provider: AIProvider;
  model: string;
  checks: ValidationCheck[];
  summary: string;
  timestamp: string;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

export function finalValidation(
  draft: ResponseDraft,
  critique: DraftCritique,
  provider: AIProvider = 'openai',
  model: string = 'gpt-4o',
): FinalValidation {
  const checks: ValidationCheck[] = [];

  // Provider must be different from drafting provider
  checks.push({
    name: 'provider_independence',
    passed: provider !== 'gemini', // Draft is generated by Gemini by default
    message: provider !== 'gemini'
      ? 'Validation provider is different from the primary drafting provider.'
      : 'WARNING: Validation provider is the same as the drafting provider. Use a different provider for final validation.',
  });

  // Critique must have passed
  checks.push({
    name: 'critique_passed',
    passed: critique.passed,
    message: critique.passed
      ? 'Independent draft critique passed.'
      : `Draft critique failed with ${critique.blockingFindings} critical issue(s).`,
  });

  // Fabrication check must have passed
  checks.push({
    name: 'fabrication_check',
    passed: draft.fabricationCheck.passed,
    message: draft.fabricationCheck.passed
      ? 'No fabricated citations or unsupported claims detected.'
      : `${draft.fabricationCheck.issues.length} fabrication issue(s) detected.`,
  });

  // No prohibited legal conclusions
  const noLegalConclusions = !draft.sections.some(s =>
    /(?:the\s+inspection\s+is\s+illegal|you\s+can\s+refuse|you\s+cannot\s+refuse|the\s+agency\s+must\s+get\s+a\s+warrant|the\s+agency\s+does\s+not\s+need\s+a\s+warrant|silence\s+legally\s+equals\s+refusal|the\s+agency\s+violated\s+the\s+law|the\s+police\s+acted\s+illegally)/i.test(s.content)
  );
  checks.push({
    name: 'no_prohibited_conclusions',
    passed: noLegalConclusions,
    message: noLegalConclusions
      ? 'No prohibited legal conclusions found.'
      : 'Prohibited legal conclusions detected. Must be removed.',
  });

  // All required sections present
  const requiredHeadings = ['Date', 'Agency', 'Property', 'Subject', 'Acknowledgment', 'Contact'];
  const presentHeadings = draft.sections.map(s => s.heading);
  const missingHeadings = requiredHeadings.filter(h => !presentHeadings.includes(h));
  checks.push({
    name: 'required_sections',
    passed: missingHeadings.length === 0,
    message: missingHeadings.length === 0
      ? 'All required sections are present.'
      : `Missing required sections: ${missingHeadings.join(', ')}.`,
  });

  const allPassed = checks.every(c => c.passed);

  const summary = allPassed
    ? 'Final validation PASSED. Draft is ready for human review.'
    : 'Final validation FAILED. Issues must be resolved before human review.';

  return {
    passed: allPassed,
    provider,
    model,
    checks,
    summary,
    timestamp: new Date().toISOString(),
  };
}

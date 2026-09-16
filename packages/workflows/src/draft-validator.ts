/**
 * Shared independent validator for generated correspondence.
 *
 * Promoted from the identical Benefits Appeal / Insurance Claims validators.
 * The writer and validator stay separate so generated text can be checked
 * deterministically before PDF generation, approval, payment, or mailing.
 */

export interface DraftValidationFinding {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info" | "block";
}

export interface DraftValidationResult {
  findings: DraftValidationFinding[];
  passed: boolean;
  errors: number;
  warnings: number;
  blocks: number;
}

export interface DraftValidationFacts {
  referenceNumber?: string;
  decisionDate?: string;
  deadline?: string;
  amount?: string;
  issuer?: string;
  recipient?: string;
  denialReasons?: string[];
  keyFacts?: string[];
}

export interface LetterDraftValidationPolicy {
  requiredSections?: string[];
  forbiddenPhrases?: string[];
  requiredFacts?: string[];
  minimumWords?: number;
}

export function validateLetterDraft(
  draft: string,
  facts: DraftValidationFacts,
  policy?: LetterDraftValidationPolicy,
): DraftValidationResult {
  const findings: DraftValidationFinding[] = [];
  const draftLower = draft.toLowerCase();
  let errors = 0;
  let warnings = 0;
  let blocks = 0;

  const requiredSections = policy?.requiredSections ?? ["Dear", "Sincerely", "Re:"];
  for (const section of requiredSections) {
    const found = draftLower.includes(section.toLowerCase());
    findings.push({
      check: `required_section:${section}`,
      passed: found,
      detail: found ? `Section "${section}" found` : `Section "${section}" not found in draft`,
      severity: "error",
    });
    if (!found) errors += 1;
  }

  if (facts.referenceNumber) {
    const found = draft.includes(facts.referenceNumber);
    findings.push({
      check: "reference_number_consistency",
      passed: found,
      detail: found
        ? `Reference "${facts.referenceNumber}" found in draft`
        : `Reference "${facts.referenceNumber}" from extraction not found in draft`,
      severity: "warning",
    });
    if (!found) warnings += 1;
  }

  if (facts.decisionDate) {
    const found = draft.includes(facts.decisionDate);
    findings.push({
      check: "decision_date_consistency",
      passed: found,
      detail: found
        ? `Decision date "${facts.decisionDate}" found`
        : `Decision date "${facts.decisionDate}" from extraction not found — verify manually`,
      severity: "info",
    });
  }

  if (facts.deadline) {
    const found = draft.includes(facts.deadline);
    findings.push({
      check: "deadline_consistency",
      passed: found,
      detail: found
        ? `Deadline "${facts.deadline}" found`
        : `Deadline "${facts.deadline}" not found — verify the deadline is addressed`,
      severity: "warning",
    });
    if (!found) warnings += 1;
  }

  if (facts.amount) {
    const found = draft.includes(facts.amount);
    findings.push({
      check: "amount_consistency",
      passed: found,
      detail: found
        ? `Amount "${facts.amount}" found`
        : `Amount "${facts.amount}" from extraction not found in draft`,
      severity: "warning",
    });
    if (!found) warnings += 1;
  }

  const placeholders = draft.match(/\[(?:your|insert|TODO)[^\]]*\]/gi) ?? [];
  findings.push({
    check: "unresolved_placeholders",
    passed: placeholders.length === 0,
    detail:
      placeholders.length === 0
        ? "No unresolved placeholders"
        : `${placeholders.length} unresolved placeholders: ${placeholders.join(", ")}`,
    severity: "error",
  });
  if (placeholders.length > 0) errors += 1;

  for (const phrase of policy?.forbiddenPhrases ?? []) {
    const found = draftLower.includes(phrase.toLowerCase());
    findings.push({
      check: `forbidden_phrase:${phrase}`,
      passed: !found,
      detail: found
        ? `Forbidden phrase "${phrase}" found in draft`
        : `Forbidden phrase "${phrase}" not present`,
      severity: "block",
    });
    if (found) blocks += 1;
  }

  const minimumWords = policy?.minimumWords ?? 100;
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  findings.push({
    check: "minimum_length",
    passed: wordCount >= minimumWords,
    detail:
      wordCount >= minimumWords
        ? `Draft has ${wordCount} words`
        : `Draft has only ${wordCount} words — minimum ${minimumWords} required`,
    severity: "error",
  });
  if (wordCount < minimumWords) errors += 1;

  for (const fact of policy?.requiredFacts ?? []) {
    const found = draftLower.includes(fact.toLowerCase());
    findings.push({
      check: `required_fact:${fact}`,
      passed: found,
      detail: found
        ? `Required fact "${fact}" found`
        : `Required fact "${fact}" not found in draft`,
      severity: "warning",
    });
    if (!found) warnings += 1;
  }

  return {
    findings,
    passed: errors === 0 && blocks === 0,
    errors,
    warnings,
    blocks,
  };
}

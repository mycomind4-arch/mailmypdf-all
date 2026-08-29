/**
 * Draft Validator — independent validation pass on generated drafts.
 * The writer and the validator are SEPARATE. Checks:
 * - Required sections present
 * - Dates consistent with extracted facts
 * - Amounts consistent with extracted facts
 * - Reference numbers consistent
 * - No unsupported factual assertions
 * - No unresolved placeholders
 * - Domain-specific forbidden behavior
 */

export interface ValidationFinding {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info" | "block";
}

export interface DraftValidationResult {
  findings: ValidationFinding[];
  passed: boolean;
  errors: number;
  warnings: number;
  blocks: number;
}

export interface ExtractedFact {
  referenceNumber?: string;
  decisionDate?: string;
  deadline?: string;
  amount?: string;
  issuer?: string;
  recipient?: string;
  denialReasons?: string[];
  keyFacts?: string[];
}

export interface DomainPack {
  requiredSections?: string[];
  forbiddenPhrases?: string[];
  requiredFacts?: string[];
}

export function validateDraft(
  draft: string,
  facts: ExtractedFact,
  pack?: DomainPack,
): DraftValidationResult {
  const findings: ValidationFinding[] = [];
  const draftLower = draft.toLowerCase();
  let errors = 0, warnings = 0, blocks = 0;

  // ── Required sections ──
  const requiredSections = pack?.requiredSections ?? ["Dear", "Sincerely", "Re:"];
  for (const section of requiredSections) {
    const found = draftLower.includes(section.toLowerCase());
    findings.push({
      check: `required_section:${section}`,
      passed: found,
      detail: found ? `Section "${section}" found` : `Section "${section}" not found in draft`,
      severity: "error",
    });
    if (!found) errors++;
  }

  // ── Reference number consistency ──
  if (facts.referenceNumber) {
    const found = draft.includes(facts.referenceNumber);
    findings.push({
      check: "reference_number_consistency",
      passed: found,
      detail: found ? `Reference "${facts.referenceNumber}" found in draft` : `Reference "${facts.referenceNumber}" from extraction not found in draft`,
      severity: "warning",
    });
    if (!found) warnings++;
  }

  // ── Decision date consistency ──
  if (facts.decisionDate) {
    const found = draft.includes(facts.decisionDate);
    findings.push({
      check: "decision_date_consistency",
      passed: found,
      detail: found ? `Decision date "${facts.decisionDate}" found` : `Decision date "${facts.decisionDate}" from extraction not found — verify manually`,
      severity: "info",
    });
  }

  // ── Deadline consistency ──
  if (facts.deadline) {
    const found = draft.includes(facts.deadline);
    findings.push({
      check: "deadline_consistency",
      passed: found,
      detail: found ? `Deadline "${facts.deadline}" found` : `Deadline "${facts.deadline}" not found — verify the deadline is addressed`,
      severity: "warning",
    });
    if (!found) warnings++;
  }

  // ── Amount consistency ──
  if (facts.amount) {
    const found = draft.includes(facts.amount);
    findings.push({
      check: "amount_consistency",
      passed: found,
      detail: found ? `Amount "${facts.amount}" found` : `Amount "${facts.amount}" from extraction not found in draft`,
      severity: "warning",
    });
    if (!found) warnings++;
  }

  // ── Unresolved placeholders ──
  const placeholders = draft.match(/\[(?:your|insert|TODO)[^\]]*\]/gi) || [];
  findings.push({
    check: "unresolved_placeholders",
    passed: placeholders.length === 0,
    detail: placeholders.length === 0 ? "No unresolved placeholders" : `${placeholders.length} unresolved placeholders: ${placeholders.join(", ")}`,
    severity: "error",
  });
  if (placeholders.length > 0) errors++;

  // ── Forbidden phrases ──
  if (pack?.forbiddenPhrases) {
    for (const phrase of pack.forbiddenPhrases) {
      const found = draftLower.includes(phrase.toLowerCase());
      findings.push({
        check: `forbidden_phrase:${phrase}`,
        passed: !found,
        detail: found ? `Forbidden phrase "${phrase}" found in draft` : `Forbidden phrase "${phrase}" not present`,
        severity: "block",
      });
      if (found) blocks++;
    }
  }

  // ── Minimum length check ──
  const wordCount = draft.trim().split(/\s+/).length;
  findings.push({
    check: "minimum_length",
    passed: wordCount >= 100,
    detail: wordCount >= 100 ? `Draft has ${wordCount} words` : `Draft has only ${wordCount} words — minimum 100 required`,
    severity: "error",
  });
  if (wordCount < 100) errors++;

  // ── Required facts check ──
  if (pack?.requiredFacts) {
    for (const fact of pack.requiredFacts) {
      const found = draftLower.includes(fact.toLowerCase());
      findings.push({
        check: `required_fact:${fact}`,
        passed: found,
        detail: found ? `Required fact "${fact}" found` : `Required fact "${fact}" not found in draft`,
        severity: "warning",
      });
      if (!found) warnings++;
    }
  }

  return { findings, passed: errors === 0 && blocks === 0, errors, warnings, blocks };
}

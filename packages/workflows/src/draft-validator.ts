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

/**
 * Structural appeal types keep this shared workflow package independent from a
 * particular vertical package while still accepting the richer objects from
 * @mailmypdf/intelligence/appeal.
 */
export interface AppealDraftDecision {
  referenceNumber?: string;
  decisionDate?: string;
  deadline?: { date?: string };
  agency?: string;
  facts?: readonly { value: string }[];
}

export interface AppealDraftGround {
  id: string;
  type: string;
  claim: string;
}

export interface AppealDraftEvidence {
  groundIds: readonly string[];
}

export interface AppealDraftValidationPolicy {
  requiredSections?: readonly string[];
  prohibitedUnsupportedClaims?: readonly string[];
}

const APPEAL_FORBIDDEN_PATTERNS: Record<string, RegExp> = {
  "guaranteed outcomes": /\b(guaranteed|will result|certain to|assured|definitely will)\b/i,
  "legal authority citations without source": /\b(according to.*law|the law states|statute \d|§)\b/i,
  "legal advice": /\b(legal advice|you should sue|attorney will|lawyer should)\b/i,
  "policy language not quoted from the actual policy document": /\b(policy states|policy says|per your policy)\b(?!.*(?:Exhibit|Attachment|enclosed|attached))/i,
  "medical necessity assertions without clinical evidence": /\b(medically necessary|medical necessity)\b(?!.*(?:Exhibit|Attachment|enclosed|attached|records?))/i,
};

function addFinding(
  findings: DraftValidationFinding[],
  finding: DraftValidationFinding,
): void {
  findings.push(finding);
}

/**
 * Appeal-specific deterministic validation promoted from the legacy Appeal Mail
 * domain layer. It supplements `validateLetterDraft` with appeal grounding and
 * unsupported-assertion checks rather than replacing the generic validator.
 */
export function validateAppealDraft(
  draft: string,
  decision: AppealDraftDecision,
  grounds: readonly AppealDraftGround[],
  evidence: readonly AppealDraftEvidence[],
  policy?: AppealDraftValidationPolicy,
): DraftValidationResult {
  const findings: DraftValidationFinding[] = [];
  const draftLower = draft.toLowerCase();

  for (const section of policy?.requiredSections ?? ["Dear", "Sincerely", "Re:"]) {
    const normalized = section.toLowerCase();
    const sectionFound = draftLower.includes(normalized)
      || draftLower.replace(/[^a-z0-9]/g, "").includes(normalized.replace(/[^a-z0-9]/g, ""));
    addFinding(findings, {
      check: `required_section:${section}`,
      passed: sectionFound,
      detail: sectionFound ? `Section "${section}" found in draft` : `Section "${section}" not found in draft`,
      severity: "error",
    });
  }

  if (decision.referenceNumber) {
    const found = draft.includes(decision.referenceNumber);
    addFinding(findings, {
      check: "reference_number_consistency",
      passed: found,
      detail: found
        ? `Reference number "${decision.referenceNumber}" found in draft`
        : `Reference number "${decision.referenceNumber}" from extraction not found in draft`,
      severity: "warning",
    });
  }

  if (decision.decisionDate) {
    const found = draft.includes(decision.decisionDate);
    addFinding(findings, {
      check: "decision_date_consistency",
      passed: found,
      detail: found
        ? `Decision date "${decision.decisionDate}" found in draft`
        : `Decision date "${decision.decisionDate}" from extraction not found in draft — verify manually`,
      severity: "info",
    });
  }

  if (decision.deadline?.date) {
    const found = draft.includes(decision.deadline.date);
    addFinding(findings, {
      check: "deadline_consistency",
      passed: found,
      detail: found
        ? `Deadline "${decision.deadline.date}" found in draft`
        : `Deadline "${decision.deadline.date}" from extraction not found in draft — verify if needed`,
      severity: "info",
    });
  }

  if (decision.agency) {
    const found = draftLower.includes(decision.agency.toLowerCase());
    addFinding(findings, {
      check: "agency_name_consistency",
      passed: found,
      detail: found
        ? `Agency/insurer "${decision.agency}" found in draft`
        : `Agency/insurer "${decision.agency}" from extraction not found in draft`,
      severity: "warning",
    });
  }

  const knownAmounts = new Set<string>();
  for (const fact of decision.facts ?? []) {
    if (/\$?\d/.test(fact.value)) knownAmounts.add(fact.value);
  }

  for (const amount of draft.match(/\$[\d,]+\.?\d*/g) ?? []) {
    const numericPart = amount.replace("$", "");
    const known = Array.from(knownAmounts).some(
      (candidate) => candidate.includes(numericPart) || candidate.replace("$", "") === numericPart,
    );
    if (knownAmounts.size > 0 && !known) {
      addFinding(findings, {
        check: `unsupported_amount:${amount}`,
        passed: false,
        detail: `Amount "${amount}" in draft is not found in extracted facts or user-provided records. Verify this amount.`,
        severity: "warning",
      });
    }
  }

  for (const claim of policy?.prohibitedUnsupportedClaims ?? []) {
    const key = claim.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const pattern = APPEAL_FORBIDDEN_PATTERNS[key];
    if (pattern?.test(draft)) {
      addFinding(findings, {
        check: `prohibited_claim:${claim}`,
        passed: false,
        detail: `Draft may contain prohibited claim: "${claim}". Review this section.`,
        severity: "warning",
      });
    }
  }

  for (const ground of grounds) {
    if (!ground.claim.trim()) continue;
    const supportingEvidence = evidence.filter((item) => item.groundIds.includes(ground.id));
    if (supportingEvidence.length === 0) {
      const claimWords = ground.claim.split(/\s+/).slice(0, 5).join(" ");
      if (claimWords.length > 10 && draftLower.includes(claimWords.toLowerCase())) {
        addFinding(findings, {
          check: `unsupported_ground:${ground.id}`,
          passed: false,
          detail: `Ground "${ground.type}" claim appears in draft but has no linked evidence. Add supporting evidence.`,
          severity: "warning",
        });
      }
    }
  }

  for (const placeholder of draft.match(/\[[A-Z_ ]+\]/g) ?? []) {
    addFinding(findings, {
      check: `placeholder:${placeholder}`,
      passed: false,
      detail: `Unresolved placeholder "${placeholder}" in draft. Fill in before mailing.`,
      severity: "warning",
    });
  }

  if (draft.trim().length < 50) {
    addFinding(findings, {
      check: "draft_too_short",
      passed: false,
      detail: "Draft is too short. Ensure all required sections are present.",
      severity: "block",
    });
  }

  if (!draftLower.includes("appeal")) {
    addFinding(findings, {
      check: "appeal_type_mentioned",
      passed: false,
      detail: 'The word "appeal" does not appear in the draft. Verify the draft clearly states it is an appeal.',
      severity: "warning",
    });
  }

  const actionKeywords = ["reconsider", "review", "reverse", "overturn", "approve", "reinstate", "reprocess"];
  const hasAction = actionKeywords.some((keyword) => draftLower.includes(keyword));
  addFinding(findings, {
    check: "requested_action_present",
    passed: hasAction,
    detail: hasAction
      ? "Requested action (reconsider/review/reverse/etc.) found in draft"
      : "No clear requested action found in draft. State what action the recipient should take.",
    severity: "warning",
  });

  const blocks = findings.filter((finding) => finding.severity === "block" && !finding.passed).length;
  const errors = findings.filter((finding) => finding.severity === "error" && !finding.passed).length;
  const warnings = findings.filter((finding) => finding.severity === "warning" && !finding.passed).length;

  return {
    findings,
    passed: blocks === 0 && errors === 0,
    errors,
    warnings,
    blocks,
  };
}

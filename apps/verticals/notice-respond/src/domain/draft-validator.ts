/* ═══════════════════════════════════════════════════════════
   DRAFT VALIDATOR — independent validation pass on generated drafts.
   
   The writer and the validator are separate. The validator checks:
   - required sections present
   - dates consistent with extracted facts
   - amounts consistent with extracted facts  
   - notice numbers consistent
   - no unsupported factual assertions
   - no forbidden behavior (from workflow definition)
   
   This is NOT a grammar checker. It checks structural and factual
   consistency against the known facts.
   ═══════════════════════════════════════════════════════════ */

import type { MasterWorkflowDefinition } from "./workflow-definition";
import type { NoticeFact } from "./fact";
import type { DraftValidationResult, DraftValidationFinding } from "./workflow-runtime";

export function validateDraft(
  draft: string,
  facts: NoticeFact[],
  definition: MasterWorkflowDefinition,
  context: {
    expectedNoticeNumber?: string;
    expectedTaxYear?: string;
    expectedDeadline?: string;
    expectedAmounts?: string[];
  },
): DraftValidationResult {
  const findings: DraftValidationFinding[] = [];
  const draftLower = draft.toLowerCase();

  // ── Check required sections ──
  const requiredSections = definition.drafting.requiredSections;
  for (const section of requiredSections) {
    const sectionFound = draftLower.includes(section.toLowerCase()) ||
      draftLower.includes(section.toLowerCase().replace(/[^a-z0-9]/g, ""));
    findings.push({
      check: `required_section:${section}`,
      passed: sectionFound,
      detail: sectionFound
        ? `Section "${section}" found in draft`
        : `Section "${section}" not found in draft`,
      severity: "error",
    });
  }

  // ── Check notice number consistency ──
  if (context.expectedNoticeNumber) {
    const noticeNumInDraft = draft.includes(context.expectedNoticeNumber);
    findings.push({
      check: "notice_number_consistency",
      passed: noticeNumInDraft,
      detail: noticeNumInDraft
        ? `Notice number "${context.expectedNoticeNumber}" found in draft`
        : `Notice number "${context.expectedNoticeNumber}" from extraction not found in draft`,
      severity: "warning",
    });
  }

  // ── Check tax year consistency ──
  if (context.expectedTaxYear) {
    const taxYearInDraft = draft.includes(context.expectedTaxYear);
    findings.push({
      check: "tax_year_consistency",
      passed: taxYearInDraft,
      detail: taxYearInDraft
        ? `Tax year "${context.expectedTaxYear}" found in draft`
        : `Tax year "${context.expectedTaxYear}" from extraction not found in draft`,
      severity: "warning",
    });
  }

  // ── Check deadline consistency ──
  if (context.expectedDeadline) {
    const deadlineInDraft = draft.includes(context.expectedDeadline);
    findings.push({
      check: "deadline_consistency",
      passed: deadlineInDraft,
      detail: deadlineInDraft
        ? `Deadline "${context.expectedDeadline}" found in draft`
        : `Deadline "${context.expectedDeadline}" from extraction not found in draft — verify manually`,
      severity: "info",
    });
  }

  // ── Check amounts ──
  if (context.expectedAmounts) {
    for (const amount of context.expectedAmounts) {
      if (!amount) continue;
      const amountInDraft = draft.includes(amount);
      findings.push({
        check: `amount_consistency:${amount}`,
        passed: amountInDraft,
        detail: amountInDraft
          ? `Amount "${amount}" found in draft`
          : `Amount "${amount}" from extraction not found in draft — verify if needed`,
        severity: "info",
      });
    }
  }

  // ── Check for forbidden behavior ──
  const forbidden = definition.drafting.forbiddenBehavior;
  const forbiddenPatterns: Record<string, RegExp> = {
    "invent facts": /\b(I believe|I think|probably|maybe|likely)\b/i,
    "invent tax conclusions": /\b(you owe|you should pay|the correct tax is|your tax liability is)\b/i,
    "state uncertainty as fact": /\b(definitely|certainly|without doubt|absolutely)\b/i,
    "invent tax positions": /\b(should have filed|must file|required to file|you are required)\b/i,
    "invent income records": /\b(income was|earnings were|wages were)\b.*(?!according to|per|from)/i,
    "claim to provide tax advice": /\b(tax advice|tax recommendation|you should|I recommend.*tax)\b/i,
    "fabricate irs mailing addresses": /\b(P\.?O\.? Box)\b.*\d{5}/i,
    "invent legal authority": /\b(according to.*law|the law states|statute \d|§)\b/i,
    "guarantee outcome": /\b(guaranteed|will result|certain to|assured)\b/i,
  };

  for (const behavior of forbidden) {
    const pattern = forbiddenPatterns[behavior.toLowerCase()];
    if (pattern && pattern.test(draft)) {
      findings.push({
        check: `forbidden_behavior:${behavior}`,
        passed: false,
        detail: `Draft may contain forbidden behavior: "${behavior}". Review this section.`,
        severity: "warning",
      });
    }
  }

  // ── Check for unsupported claims ──
  // Look for dollar amounts in the draft that aren't in the expected amounts
  const draftAmounts = draft.match(/\$[\d,]+\.?\d*/g) ?? [];
  const knownAmounts = new Set([
    ...(context.expectedAmounts ?? []),
    ...facts.map((f) => f.value).filter((v) => /\$?\d/.test(v)),
  ]);
  for (const amount of draftAmounts) {
    if (knownAmounts.size > 0 && !Array.from(knownAmounts).some((k) => k?.includes(amount.replace("$", "")))) {
      findings.push({
        check: `unsupported_amount:${amount}`,
        passed: false,
        detail: `Amount "${amount}" in draft is not found in extracted facts or user-provided records. Verify this amount.`,
        severity: "warning",
      });
    }
  }

  // ── Check for placeholder text ──
  const placeholders = draft.match(/\[[A-Z_ ]+\]/g) ?? [];
  for (const placeholder of placeholders) {
    findings.push({
      check: `placeholder:${placeholder}`,
      passed: false,
      detail: `Unresolved placeholder "${placeholder}" in draft. Fill in before mailing.`,
      severity: "warning",
    });
  }

  // ── Check for empty draft ──
  if (draft.trim().length < 50) {
    findings.push({
      check: "draft_too_short",
      passed: false,
      detail: "Draft is too short. Ensure all required sections are present.",
      severity: "error",
    });
  }

  // ── Summary ──
  const errors = findings.filter((f) => f.severity === "error" && !f.passed).length;
  const warnings = findings.filter((f) => f.severity === "warning" && !f.passed).length;
  const passed = errors === 0;

  return { findings, passed, errors, warnings };
}

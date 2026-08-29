/* ═══════════════════════════════════════════════════════════
   DRAFT VALIDATOR — independent validation pass on generated
   appeal drafts. Adapted from Notice Respond's gold-standard
   draft validator.

   The writer and the validator are SEPARATE. The validator checks:
   - required sections present
   - dates consistent with extracted facts
   - amounts consistent with extracted facts
   - claim numbers consistent
   - no unsupported factual assertions
   - no forbidden behavior (from domain pack)
   - no unresolved placeholders

   This is NOT a grammar checker. It checks structural and factual
   consistency against the known facts.

   ═══════════════════════════════════════════════════════════ */

import type { Decision, DecisionFact } from "./decision";
import type { AppealGround } from "./ground";
import type { Evidence } from "./evidence";
import type { DomainPackSet } from "./workflow-capabilities";

// ── Types ────────────────────────────────────────────────────

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

// ── Main Validator ───────────────────────────────────────────

export function validateAppealDraft(
  draft: string,
  decision: Decision,
  grounds: AppealGround[],
  evidence: Evidence[],
  packs?: DomainPackSet,
): DraftValidationResult {
  const findings: ValidationFinding[] = [];
  const draftLower = draft.toLowerCase();

  // ── Check required sections ──
  const requiredSections = packs?.draft?.requiredSections ?? ["Dear", "Sincerely", "Re:"];
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

  // ── Check claim number consistency ──
  if (decision.referenceNumber) {
    const refInDraft = draft.includes(decision.referenceNumber);
    findings.push({
      check: "reference_number_consistency",
      passed: refInDraft,
      detail: refInDraft
        ? `Reference number "${decision.referenceNumber}" found in draft`
        : `Reference number "${decision.referenceNumber}" from extraction not found in draft`,
      severity: "warning",
    });
  }

  // ── Check decision date consistency ──
  if (decision.decisionDate) {
    const dateInDraft = draft.includes(decision.decisionDate);
    findings.push({
      check: "decision_date_consistency",
      passed: dateInDraft,
      detail: dateInDraft
        ? `Decision date "${decision.decisionDate}" found in draft`
        : `Decision date "${decision.decisionDate}" from extraction not found in draft — verify manually`,
      severity: "info",
    });
  }

  // ── Check deadline consistency ──
  if (decision.deadline?.date) {
    const deadlineInDraft = draft.includes(decision.deadline.date);
    findings.push({
      check: "deadline_consistency",
      passed: deadlineInDraft,
      detail: deadlineInDraft
        ? `Deadline "${decision.deadline.date}" found in draft`
        : `Deadline "${decision.deadline.date}" from extraction not found in draft — verify if needed`,
      severity: "info",
    });
  }

  // ── Check insurer/agency name consistency ──
  if (decision.agency) {
    const agencyInDraft = draftLower.includes(decision.agency.toLowerCase());
    findings.push({
      check: "agency_name_consistency",
      passed: agencyInDraft,
      detail: agencyInDraft
        ? `Agency/insurer "${decision.agency}" found in draft`
        : `Agency/insurer "${decision.agency}" from extraction not found in draft`,
      severity: "warning",
    });
  }

  // ── Check amounts ──
  const knownAmounts = new Set<string>();
  for (const fact of decision.facts ?? []) {
    if (/\$?\d/.test(fact.value)) knownAmounts.add(fact.value);
  }

  // Look for dollar amounts in the draft that aren't in the known amounts
  const draftAmounts = draft.match(/\$[\d,]+\.?\d*/g) ?? [];
  for (const amount of draftAmounts) {
    const numericPart = amount.replace("$", "");
    const isKnown = Array.from(knownAmounts).some(
      (k) => k?.includes(numericPart) || k?.replace("$", "") === numericPart
    );
    if (knownAmounts.size > 0 && !isKnown) {
      findings.push({
        check: `unsupported_amount:${amount}`,
        passed: false,
        detail: `Amount "${amount}" in draft is not found in extracted facts or user-provided records. Verify this amount.`,
        severity: "warning",
      });
    }
  }

  // ── Check for forbidden behavior ──
  const prohibitedClaims = packs?.draft?.prohibitedUnsupportedClaims ?? [];
  const forbiddenPatterns: Record<string, RegExp> = {
    "guaranteed outcomes": /\b(guaranteed|will result|certain to|assured|definitely will)\b/i,
    "legal authority citations without source": /\b(according to.*law|the law states|statute \d|§)\b/i,
    "legal advice": /\b(legal advice|you should sue|attorney will|lawyer should)\b/i,
    "policy language not quoted from the actual policy document": /\b(policy states|policy says|per your policy)\b(?!.*(?:Exhibit|Attachment|enclosed|attached))/i,
    "medical necessity assertions without clinical evidence": /\b(medically necessary|medical necessity)\b(?!.*(?:Exhibit|Attachment|enclosed|attached|records?))/i,
  };

  for (const claim of prohibitedClaims) {
    const patternKey = claim.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const pattern = forbiddenPatterns[patternKey];
    if (pattern && pattern.test(draft)) {
      findings.push({
        check: `prohibited_claim:${claim}`,
        passed: false,
        detail: `Draft may contain prohibited claim: "${claim}". Review this section.`,
        severity: "warning",
      });
    }
  }

  // ── Check for unsupported assertions ──
  // Check that each ground claim is traceable to evidence
  for (const ground of grounds) {
    if (!ground.claim.trim()) continue;
    const supportingEvidence = evidence.filter((e) => e.groundIds.includes(ground.id));
    if (supportingEvidence.length === 0) {
      // Check if the ground claim text appears in the draft without evidence citation
      const claimWords = ground.claim.split(/\s+/).slice(0, 5).join(" ");
      if (claimWords.length > 10 && draftLower.includes(claimWords.toLowerCase())) {
        findings.push({
          check: `unsupported_ground:${ground.id}`,
          passed: false,
          detail: `Ground "${ground.type}" claim appears in draft but has no linked evidence. Add supporting evidence.`,
          severity: "warning",
        });
      }
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
      severity: "block",
    });
  }

  // ── Check appeal type mentioned ──
  if (!draftLower.includes("appeal")) {
    findings.push({
      check: "appeal_type_mentioned",
      passed: false,
      detail: 'The word "appeal" does not appear in the draft. Verify the draft clearly states it is an appeal.',
      severity: "warning",
    });
  }

  // ── Check requested action ──
  const actionKeywords = ["reconsider", "review", "reverse", "overturn", "approve", "reinstate", "reprocess"];
  const hasAction = actionKeywords.some((kw) => draftLower.includes(kw));
  findings.push({
    check: "requested_action_present",
    passed: hasAction,
    detail: hasAction
      ? "Requested action (reconsider/review/reverse/etc.) found in draft"
      : "No clear requested action found in draft. State what you want the insurer to do.",
    severity: "warning",
  });

  // ── Summary ──
  const blocks = findings.filter((f) => f.severity === "block" && !f.passed).length;
  const errors = findings.filter((f) => f.severity === "error" && !f.passed).length;
  const warnings = findings.filter((f) => f.severity === "warning" && !f.passed).length;
  const passed = blocks === 0 && errors === 0;

  return { findings, passed, errors, warnings, blocks };
}

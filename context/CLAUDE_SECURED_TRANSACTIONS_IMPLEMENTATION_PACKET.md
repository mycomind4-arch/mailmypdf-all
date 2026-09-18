# Claude Implementation Packet — Complete Missing Secured-Transaction Engines

Repository: `mycomind4-arch/mailmypdf-all`

## Operating rules

Read `AGENTS.md` first.

Do **not** create a branch, worktree, clone, or alternate checkout. Do not modify legacy architecture. Do not mark any secured-transactions workflow `maturity: "executable"` merely because these shared components compile. Workflow maturity changes only after its real runtime, tests, and acceptance scenarios exist.

The repository already contains substantial implementations in:

```text
packages/identity-capacity/
packages/jurisdiction-rules/
packages/registry-adapters/
packages/secured-transactions/
```

Preserve them.

The current missing layer is that several existing engines deliberately stop at:

```text
ready-for-authority-analysis
evidence-verified
ready-for-rule-analysis
legalSufficiencyDetermined: false
priorityDetermined: false
```

Implement the following components without weakening those boundaries.

---

## 1. Extend jurisdiction rule families

In:

```text
packages/jurisdiction-rules/src/registry.ts
```

change:

```ts
export type JurisdictionRuleFamily =
  | "ucc-debtor-name"
  | "ucc-filing-location"
  | "ucc-perfection"
  | "ucc-priority"
  | "ucc-exception"
  | "ucc-lifecycle";
```

to:

```ts
export type JurisdictionRuleFamily =
  | "ucc-debtor-name"
  | "ucc-governing-law"
  | "ucc-filing-location"
  | "ucc-attachment"
  | "ucc-perfection"
  | "ucc-priority"
  | "ucc-exception"
  | "ucc-lifecycle";
```

Do not otherwise change registry resolution semantics.

---

## 2. Add UCC governing-law rule contract

Create:

```text
packages/jurisdiction-rules/src/ucc/governing-law/rule-contract.ts
```

```ts
import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

/**
 * Authority-backed rule data describing which jurisdiction's law governs
 * the requested secured-transaction issue.
 *
 * This structure contains DATA from a reviewed rule pack. The resolver itself
 * does not embed legal doctrine.
 */
export interface UccGoverningLawRuleData {
  readonly governingLawJurisdiction: string;
  readonly ruleDescription: string;
  readonly requiredFacts: readonly string[];
  readonly notes?: readonly string[];
}

export function resolveUccGoverningLawRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccGoverningLawRuleData> {
  return input.registry.resolve<UccGoverningLawRuleData>({
    family: "ucc-governing-law",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
```

Create:

```text
packages/jurisdiction-rules/src/ucc/governing-law/index.ts
```

```ts
export {
  resolveUccGoverningLawRule,
} from "./rule-contract.js";

export type {
  UccGoverningLawRuleData,
} from "./rule-contract.js";
```

---

## 3. Add attachment rule contract

Create:

```text
packages/jurisdiction-rules/src/ucc/attachment/rule-contract.ts
```

```ts
import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

/**
 * Jurisdiction-specific attachment conditions.
 *
 * Condition identifiers are deliberately data-driven. The engine must not
 * hard-code substantive attachment law. Authority-backed rule packs define
 * which conditions must be established.
 */
export interface UccAttachmentRuleData {
  readonly ruleDescription: string;
  readonly requiredConditions: readonly string[];
  readonly notes?: readonly string[];
}

export function resolveUccAttachmentRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccAttachmentRuleData> {
  return input.registry.resolve<UccAttachmentRuleData>({
    family: "ucc-attachment",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
```

Create:

```text
packages/jurisdiction-rules/src/ucc/attachment/index.ts
```

```ts
export {
  resolveUccAttachmentRule,
} from "./rule-contract.js";

export type {
  UccAttachmentRuleData,
} from "./rule-contract.js";
```

---

## 4. Implement UCC exception rule contract

The existing exceptions namespace is currently empty.

Create:

```text
packages/jurisdiction-rules/src/ucc/exceptions/rule-contract.ts
```

```ts
import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export type UccExceptionTarget =
  | "attachment"
  | "filing-location"
  | "perfection"
  | "priority"
  | "lifecycle";

export interface UccExceptionDefinition {
  readonly id: string;
  readonly target: UccExceptionTarget;
  readonly description: string;

  /**
   * Facts required to decide whether this exception applies.
   * These are identifiers only. The rule pack does not invent the facts.
   */
  readonly requiredFacts?: readonly string[];

  readonly notes?: readonly string[];
}

export interface UccExceptionRuleData {
  readonly exceptions: readonly UccExceptionDefinition[];
  readonly notes?: readonly string[];
}

export function resolveUccExceptionRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccExceptionRuleData> {
  return input.registry.resolve<UccExceptionRuleData>({
    family: "ucc-exception",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
```

Replace:

```text
packages/jurisdiction-rules/src/ucc/exceptions/index.ts
```

with:

```ts
export {
  resolveUccExceptionRule,
} from "./rule-contract.js";

export type {
  UccExceptionTarget,
  UccExceptionDefinition,
  UccExceptionRuleData,
} from "./rule-contract.js";
```

---

## 5. Extend the priority rule contract without breaking existing rule packs

In:

```text
packages/jurisdiction-rules/src/ucc/priority/rule-contract.ts
```

replace the file with:

```ts
import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export type UccPriorityComparisonValueType =
  | "date"
  | "number"
  | "string";

export type UccPriorityComparisonDirection =
  | "ascending"
  | "descending";

/**
 * Priority comparison is deliberately defined by authority-backed rule data.
 *
 * Example:
 *
 * {
 *   field: "eventDate",
 *   valueType: "date",
 *   direction: "ascending"
 * }
 *
 * means the rule pack instructs the analysis engine to compare that field
 * chronologically. The engine itself contains no rule saying that earlier
 * filing automatically wins.
 */
export interface UccPriorityComparisonStep {
  readonly field: string;
  readonly valueType: UccPriorityComparisonValueType;
  readonly direction: UccPriorityComparisonDirection;
}

export interface UccPriorityRuleData {
  readonly ruleDescription: string;
  readonly requiredRecordFields: readonly string[];

  /**
   * Optional deterministic comparison supplied by the authority-backed rule
   * pack. Existing packs without comparisonSteps remain valid but cannot
   * produce an automated priority comparison.
   */
  readonly comparisonSteps?: readonly UccPriorityComparisonStep[];

  readonly specialConditions?: readonly string[];
  readonly notes?: readonly string[];
}

export function resolveUccPriorityRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccPriorityRuleData> {
  return input.registry.resolve<UccPriorityRuleData>({
    family: "ucc-priority",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
```

---

## 6. Allow filing-location rules to declare required facts

In:

```text
packages/jurisdiction-rules/src/ucc/filing-location/rule-contract.ts
```

change the interface to:

```ts
export interface UccFilingLocationRuleData {
  debtorType: string;
  locationBasis: string;
  filingOfficeId: string;
  filingOfficeLabel: string;
  requiredFacts?: readonly string[];
  notes?: readonly string[];
}
```

Do not change the existing resolver.

---

## 7. Update jurisdiction-rules exports

Replace:

```text
packages/jurisdiction-rules/src/ucc/index.ts
```

with:

```ts
export * as DebtorName from "./debtor-name/index.js";
export * as GoverningLaw from "./governing-law/index.js";
export * as FilingLocation from "./filing-location/index.js";
export * as Attachment from "./attachment/index.js";
export * as Perfection from "./perfection/index.js";
export * as Priority from "./priority/index.js";
export * as Exceptions from "./exceptions/index.js";
export * as Lifecycle from "./lifecycle/index.js";
```

In:

```text
packages/jurisdiction-rules/src/index.ts
```

preserve the existing exports and add:

```ts
export type {
  UccGoverningLawRuleData,
} from "./ucc/governing-law/index.js";

export type {
  UccFilingLocationRuleData,
} from "./ucc/filing-location/index.js";

export type {
  UccAttachmentRuleData,
} from "./ucc/attachment/index.js";

export type {
  UccExceptionTarget,
  UccExceptionDefinition,
  UccExceptionRuleData,
} from "./ucc/exceptions/index.js";

export type {
  UccPriorityComparisonValueType,
  UccPriorityComparisonDirection,
  UccPriorityComparisonStep,
} from "./ucc/priority/index.js";
```

If `UccPriorityRuleData` is already exported, do not duplicate it.

---

## 8. Implement governing-law + filing-location analysis

Create:

```text
packages/secured-transactions/src/governing-law/governing-law.ts
```

```ts
import type {
  JurisdictionRuleResult,
  UccFilingLocationRuleData,
  UccGoverningLawRuleData,
} from "@mailmypdf/jurisdiction-rules";

import type {
  SecuredTransactionSourceRef,
} from "../types.js";

export type RuleFactEvidenceStatus =
  | "supported"
  | "unresolved"
  | "contradicted";

export interface RuleFactEvidence {
  readonly status: RuleFactEvidenceStatus;
  readonly sourceRefs: readonly SecuredTransactionSourceRef[];
  readonly note?: string;
}

export interface GoverningLawFilingLocationAssessment {
  readonly status:
    | "supported-for-review"
    | "human-review-required"
    | "blocked"
    | "unsupported";

  readonly governingLawJurisdiction?: string;
  readonly filingOfficeId?: string;
  readonly filingOfficeLabel?: string;

  readonly governingLawRuleId?: string;
  readonly filingLocationRuleId?: string;

  readonly authorityRefIds: readonly string[];
  readonly factSourceRefIds: readonly string[];

  readonly missingFacts: readonly string[];
  readonly unresolvedFacts: readonly string[];
  readonly contradictedFacts: readonly string[];

  readonly reasons: readonly string[];

  readonly requiresHumanReview: boolean;

  /**
   * This analysis is intentionally review-only. It does not independently
   * establish a binding legal conclusion.
   */
  readonly legalConclusionDetermined: false;
  readonly canProceedToConsequentialAction: false;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function factStatus(input: {
  requiredFacts: readonly string[];
  evidence: Readonly<Record<string, RuleFactEvidence | undefined>>;
}) {
  const missing: string[] = [];
  const unresolved: string[] = [];
  const contradicted: string[] = [];
  const sourceIds: string[] = [];

  for (const fact of input.requiredFacts) {
    const evidence = input.evidence[fact];

    if (!evidence) {
      missing.push(fact);
      continue;
    }

    sourceIds.push(...evidence.sourceRefs.map((source) => source.id));

    if (
      evidence.status === "supported" &&
      evidence.sourceRefs.length === 0
    ) {
      missing.push(fact);
      continue;
    }

    if (evidence.status === "unresolved") {
      unresolved.push(fact);
    }

    if (evidence.status === "contradicted") {
      contradicted.push(fact);
    }
  }

  return {
    missing: unique(missing),
    unresolved: unique(unresolved),
    contradicted: unique(contradicted),
    sourceIds: unique(sourceIds),
  };
}

export function assessGoverningLawAndFilingLocation(input: {
  governingLawRule: JurisdictionRuleResult<UccGoverningLawRuleData>;
  filingLocationRule: JurisdictionRuleResult<UccFilingLocationRuleData>;

  factEvidence?: Readonly<
    Record<string, RuleFactEvidence | undefined>
  >;
}): GoverningLawFilingLocationAssessment {
  const { governingLawRule, filingLocationRule } = input;

  const authorityRefIds = unique([
    ...governingLawRule.authorityRefs.map((authority) => authority.id),
    ...filingLocationRule.authorityRefs.map((authority) => authority.id),
  ]);

  if (
    governingLawRule.status === "unsupported" ||
    filingLocationRule.status === "unsupported"
  ) {
    return {
      status: "unsupported",
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: [],
      missingFacts: [],
      unresolvedFacts: [],
      contradictedFacts: [],
      reasons: unique([
        ...governingLawRule.reasonCodes,
        ...filingLocationRule.reasonCodes,
        "Authority-backed governing-law and filing-location coverage is required.",
      ]),
      requiresHumanReview: true,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (
    governingLawRule.status !== "resolved" ||
    filingLocationRule.status !== "resolved" ||
    governingLawRule.requiresHumanReview ||
    filingLocationRule.requiresHumanReview ||
    !governingLawRule.ruleId ||
    !filingLocationRule.ruleId ||
    !governingLawRule.value ||
    !filingLocationRule.value
  ) {
    return {
      status: "human-review-required",
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: [],
      missingFacts: [],
      unresolvedFacts: [],
      contradictedFacts: [],
      reasons: unique([
        ...governingLawRule.reasonCodes,
        ...filingLocationRule.reasonCodes,
        "Governing-law or filing-location rule coverage is unresolved.",
      ]),
      requiresHumanReview: true,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const governingLawJurisdiction =
    governingLawRule.value.governingLawJurisdiction.trim();

  const filingOfficeId =
    filingLocationRule.value.filingOfficeId.trim();

  const filingOfficeLabel =
    filingLocationRule.value.filingOfficeLabel.trim();

  if (
    !governingLawJurisdiction ||
    !filingOfficeId ||
    !filingOfficeLabel
  ) {
    return {
      status: "blocked",
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: [],
      missingFacts: [],
      unresolvedFacts: [],
      contradictedFacts: [],
      reasons: [
        "Resolved jurisdiction rule data is missing required output values.",
      ],
      requiresHumanReview: false,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const requiredFacts = unique([
    ...governingLawRule.value.requiredFacts,
    ...(filingLocationRule.value.requiredFacts ?? []),
  ]);

  const facts = factStatus({
    requiredFacts,
    evidence: input.factEvidence ?? {},
  });

  if (facts.contradicted.length > 0) {
    return {
      status: "human-review-required",
      governingLawJurisdiction,
      filingOfficeId,
      filingOfficeLabel,
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: facts.sourceIds,
      missingFacts: facts.missing,
      unresolvedFacts: facts.unresolved,
      contradictedFacts: facts.contradicted,
      reasons: [
        `Required jurisdiction fact(s) are contradicted: ${facts.contradicted.join(", ")}.`,
      ],
      requiresHumanReview: true,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (
    facts.missing.length > 0 ||
    facts.unresolved.length > 0
  ) {
    return {
      status: "blocked",
      governingLawJurisdiction,
      filingOfficeId,
      filingOfficeLabel,
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: facts.sourceIds,
      missingFacts: facts.missing,
      unresolvedFacts: facts.unresolved,
      contradictedFacts: [],
      reasons: [
        "Required jurisdiction facts are incomplete or unresolved.",
      ],
      requiresHumanReview: false,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  return {
    status: "supported-for-review",
    governingLawJurisdiction,
    filingOfficeId,
    filingOfficeLabel,
    governingLawRuleId: governingLawRule.ruleId,
    filingLocationRuleId: filingLocationRule.ruleId,
    authorityRefIds,
    factSourceRefIds: facts.sourceIds,
    missingFacts: [],
    unresolvedFacts: [],
    contradictedFacts: [],
    reasons: [
      "Authority-backed rule packs and their required facts support the proposed governing-law and filing-location analysis.",
      "A human must review the conclusion before it is used for a filing or other consequential action.",
    ],
    requiresHumanReview: true,
    legalConclusionDetermined: false,
    canProceedToConsequentialAction: false,
  };
}
```

Replace:

```text
packages/secured-transactions/src/governing-law/index.ts
```

with:

```ts
export {
  assessGoverningLawAndFilingLocation,
} from "./governing-law.js";

export type {
  RuleFactEvidenceStatus,
  RuleFactEvidence,
  GoverningLawFilingLocationAssessment,
} from "./governing-law.js";
```

---

## 9. Add attachment authority analysis

Create:

```text
packages/secured-transactions/src/certification/attachment-analysis.ts
```

```ts
import type {
  JurisdictionRuleResult,
  UccAttachmentRuleData,
} from "@mailmypdf/jurisdiction-rules";

import type {
  SecuredTransactionSourceRef,
} from "../types.js";

import type {
  AttachmentReadinessAssessment,
} from "./attachment-readiness.js";

export interface AttachmentConditionEvidence {
  readonly status:
    | "supported"
    | "unresolved"
    | "contradicted";

  readonly sourceRefs: readonly SecuredTransactionSourceRef[];
  readonly note?: string;
}

export interface AttachmentAuthorityAssessment {
  readonly status:
    | "supported-for-review"
    | "human-review-required"
    | "blocked"
    | "unsupported";

  readonly ruleId?: string;
  readonly authorityRefIds: readonly string[];
  readonly conditionSourceRefIds: readonly string[];

  readonly missingConditions: readonly string[];
  readonly unresolvedConditions: readonly string[];
  readonly contradictedConditions: readonly string[];

  readonly reasons: readonly string[];

  readonly evidenceSupportsAttachmentElements: boolean;
  readonly requiresHumanReview: boolean;

  /**
   * This result intentionally stops short of declaring legal attachment.
   */
  readonly attachmentLegallyDetermined: false;
}

export function assessAttachmentUnderRule(input: {
  readiness: AttachmentReadinessAssessment;
  rule: JurisdictionRuleResult<UccAttachmentRuleData>;

  conditionEvidence?: Readonly<
    Record<string, AttachmentConditionEvidence | undefined>
  >;
}): AttachmentAuthorityAssessment {
  const authorityRefIds =
    input.rule.authorityRefs.map((authority) => authority.id);

  if (!input.readiness.canProceedToAuthorityAnalysis) {
    return {
      status: input.readiness.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: input.readiness.reasons,
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: input.readiness.requiresHumanReview,
      attachmentLegallyDetermined: false,
    };
  }

  if (input.rule.status === "unsupported") {
    return {
      status: "unsupported",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        ...input.rule.reasonCodes,
        "No supported attachment rule pack is available.",
      ],
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: true,
      attachmentLegallyDetermined: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    input.rule.requiresHumanReview ||
    !input.rule.ruleId ||
    !input.rule.value
  ) {
    return {
      status: "human-review-required",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        ...input.rule.reasonCodes,
        "Attachment rule coverage is unresolved.",
      ],
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: true,
      attachmentLegallyDetermined: false,
    };
  }

  const evidence = input.conditionEvidence ?? {};

  const missingConditions: string[] = [];
  const unresolvedConditions: string[] = [];
  const contradictedConditions: string[] = [];
  const sourceIds: string[] = [];

  for (const condition of input.rule.value.requiredConditions) {
    const item = evidence[condition];

    if (!item) {
      missingConditions.push(condition);
      continue;
    }

    sourceIds.push(...item.sourceRefs.map((source) => source.id));

    if (
      item.status === "supported" &&
      item.sourceRefs.length === 0
    ) {
      missingConditions.push(condition);
      continue;
    }

    if (item.status === "unresolved") {
      unresolvedConditions.push(condition);
    }

    if (item.status === "contradicted") {
      contradictedConditions.push(condition);
    }
  }

  if (contradictedConditions.length > 0) {
    return {
      status: "human-review-required",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [...new Set(sourceIds)],
      missingConditions,
      unresolvedConditions,
      contradictedConditions,
      reasons: [
        `Attachment condition(s) are contradicted: ${contradictedConditions.join(", ")}.`,
      ],
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: true,
      attachmentLegallyDetermined: false,
    };
  }

  if (
    missingConditions.length > 0 ||
    unresolvedConditions.length > 0
  ) {
    return {
      status: "blocked",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [...new Set(sourceIds)],
      missingConditions,
      unresolvedConditions,
      contradictedConditions: [],
      reasons: [
        "Required attachment conditions are incomplete or unresolved.",
      ],
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: false,
      attachmentLegallyDetermined: false,
    };
  }

  return {
    status: "supported-for-review",
    ruleId: input.rule.ruleId,
    authorityRefIds,
    conditionSourceRefIds: [...new Set(sourceIds)],
    missingConditions: [],
    unresolvedConditions: [],
    contradictedConditions: [],
    reasons: [
      "The evidence supports each condition identified by the resolved authority-backed attachment rule.",
      "Human review remains required before treating attachment as legally established.",
    ],
    evidenceSupportsAttachmentElements: true,
    requiresHumanReview: true,
    attachmentLegallyDetermined: false,
  };
}
```

Append to:

```text
packages/secured-transactions/src/certification/index.ts
```

```ts
export {
  assessAttachmentUnderRule,
} from "./attachment-analysis.js";

export type {
  AttachmentConditionEvidence,
  AttachmentAuthorityAssessment,
} from "./attachment-analysis.js";
```

---

## 10. Add reviewable security-agreement draft builder

Create:

```text
packages/secured-transactions/src/obligations/security-agreement-draft.ts
```

```ts
export interface SecurityAgreementDraftInput {
  readonly agreementId: string;

  readonly debtorName: string;
  readonly securedPartyName: string;

  readonly debtorFindingId: string;
  readonly securedPartyFindingId: string;
  readonly obligationFindingId: string;

  readonly collateralFindingIds: readonly string[];

  readonly obligationDescription: string;
  readonly collateralDescription: string;

  readonly governingLawJurisdiction?: string;

  readonly effectiveDate?: string;
}

export interface SecurityAgreementDraftModel {
  readonly agreementId: string;

  readonly debtorName: string;
  readonly securedPartyName: string;

  readonly debtorFindingId: string;
  readonly securedPartyFindingId: string;
  readonly obligationFindingId: string;
  readonly collateralFindingIds: readonly string[];

  readonly obligationDescription: string;
  readonly collateralDescription: string;

  readonly governingLawJurisdiction?: string;
  readonly effectiveDate?: string;
}

export interface SecurityAgreementDraftResult {
  readonly status: "prepared-for-review" | "blocked";

  readonly draft?: SecurityAgreementDraftModel;
  readonly renderedText?: string;

  readonly missing: readonly string[];
  readonly reasons: readonly string[];

  readonly requiresHumanReview: boolean;

  readonly legalSufficiencyDetermined: false;
  readonly canExecute: false;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function required(
  value: string,
  label: string,
  missing: string[],
): string {
  const normalized = clean(value);

  if (!normalized) {
    missing.push(label);
  }

  return normalized;
}

export function buildSecurityAgreementDraft(
  input: SecurityAgreementDraftInput,
): SecurityAgreementDraftResult {
  const missing: string[] = [];

  const agreementId = required(
    input.agreementId,
    "agreement-id",
    missing,
  );

  const debtorName = required(
    input.debtorName,
    "debtor-name",
    missing,
  );

  const securedPartyName = required(
    input.securedPartyName,
    "secured-party-name",
    missing,
  );

  const debtorFindingId = required(
    input.debtorFindingId,
    "debtor-finding-id",
    missing,
  );

  const securedPartyFindingId = required(
    input.securedPartyFindingId,
    "secured-party-finding-id",
    missing,
  );

  const obligationFindingId = required(
    input.obligationFindingId,
    "obligation-finding-id",
    missing,
  );

  const obligationDescription = required(
    input.obligationDescription,
    "obligation-description",
    missing,
  );

  const collateralDescription = required(
    input.collateralDescription,
    "collateral-description",
    missing,
  );

  const collateralFindingIds = [
    ...new Set(
      input.collateralFindingIds
        .map(clean)
        .filter(Boolean),
    ),
  ];

  if (collateralFindingIds.length === 0) {
    missing.push("collateral-finding-id");
  }

  if (missing.length > 0) {
    return {
      status: "blocked",
      missing: [...new Set(missing)],
      reasons: [
        `Security-agreement draft inputs are incomplete: ${[
          ...new Set(missing),
        ].join(", ")}.`,
      ],
      requiresHumanReview: false,
      legalSufficiencyDetermined: false,
      canExecute: false,
    };
  }

  const governingLawJurisdiction =
    input.governingLawJurisdiction?.trim() || undefined;

  const effectiveDate =
    input.effectiveDate?.trim() || undefined;

  const draft: SecurityAgreementDraftModel = {
    agreementId,
    debtorName,
    securedPartyName,
    debtorFindingId,
    securedPartyFindingId,
    obligationFindingId,
    collateralFindingIds,
    obligationDescription,
    collateralDescription,
    ...(governingLawJurisdiction
      ? { governingLawJurisdiction }
      : {}),
    ...(effectiveDate
      ? { effectiveDate }
      : {}),
  };

  const lines = [
    "SECURITY AGREEMENT — DRAFT FOR REVIEW",
    "",
    `Agreement ID: ${agreementId}`,
    ...(effectiveDate
      ? [`Proposed effective date: ${effectiveDate}`]
      : []),
    "",
    `Debtor: ${debtorName}`,
    `Secured Party: ${securedPartyName}`,
    "",
    "Secured Obligation",
    obligationDescription,
    "",
    "Collateral",
    collateralDescription,
    "",
    "Proposed Security Interest",
    `Subject to final legal and human review, ${debtorName} proposes to grant ${securedPartyName} a security interest in the collateral described above to secure the identified obligation.`,
    ...(governingLawJurisdiction
      ? [
          "",
          "Proposed Governing Law",
          governingLawJurisdiction,
        ]
      : []),
    "",
    "REVIEW STATUS",
    "This document is a draft assembled from matter findings. It is not executed, does not establish perfection or priority, and must not be treated as legally sufficient until the required review and execution steps are completed.",
  ];

  return {
    status: "prepared-for-review",
    draft,
    renderedText: lines.join("\n"),
    missing: [],
    reasons: [
      "The draft model was assembled from explicit party, obligation, and collateral findings.",
      "The draft remains non-executable until reviewed and separately authenticated.",
    ],
    requiresHumanReview: true,
    legalSufficiencyDetermined: false,
    canExecute: false,
  };
}
```

Append to:

```text
packages/secured-transactions/src/obligations/index.ts
```

```ts
export {
  buildSecurityAgreementDraft,
} from "./security-agreement-draft.js";

export type {
  SecurityAgreementDraftInput,
  SecurityAgreementDraftModel,
  SecurityAgreementDraftResult,
} from "./security-agreement-draft.js";
```

---

## 11. Add post-perfection authority analysis

Create:

```text
packages/secured-transactions/src/perfection/analysis.ts
```

```ts
import type {
  JurisdictionRuleResult,
  UccPerfectionRuleData,
} from "@mailmypdf/jurisdiction-rules";

import type {
  SecuredTransactionSourceRef,
} from "../types.js";

import type {
  PerfectionMethodSelection,
} from "./method-selector.js";

import type {
  PerfectionEvidenceVerification,
} from "./verification.js";

export interface PerfectionConditionEvidence {
  readonly status:
    | "supported"
    | "unresolved"
    | "contradicted";

  readonly sourceRefs: readonly SecuredTransactionSourceRef[];
}

export interface PerfectionAuthorityAssessment {
  readonly status:
    | "supported-for-review"
    | "human-review-required"
    | "blocked"
    | "unsupported";

  readonly ruleId?: string;
  readonly method?: string;

  readonly authorityRefIds: readonly string[];
  readonly conditionSourceRefIds: readonly string[];

  readonly missingConditions: readonly string[];
  readonly unresolvedConditions: readonly string[];
  readonly contradictedConditions: readonly string[];

  readonly reasons: readonly string[];

  readonly evidenceSupportsPerfectionElements: boolean;
  readonly requiresHumanReview: boolean;

  readonly perfectionLegallyDetermined: false;
}

export function assessPerfectionUnderRule(input: {
  selection: PerfectionMethodSelection;
  verification: PerfectionEvidenceVerification;

  rule: JurisdictionRuleResult<UccPerfectionRuleData>;

  conditionEvidence?: Readonly<
    Record<string, PerfectionConditionEvidence | undefined>
  >;
}): PerfectionAuthorityAssessment {
  const authorityRefIds =
    input.rule.authorityRefs.map((authority) => authority.id);

  if (
    input.selection.status !== "selected" ||
    !input.selection.selectedMethod
  ) {
    return {
      status: input.selection.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: input.selection.reasons,
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: input.selection.requiresHumanReview,
      perfectionLegallyDetermined: false,
    };
  }

  if (input.verification.status !== "evidence-verified") {
    return {
      status: input.verification.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: input.verification.reasons,
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: input.verification.requiresHumanReview,
      perfectionLegallyDetermined: false,
    };
  }

  if (input.rule.status === "unsupported") {
    return {
      status: "unsupported",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        ...input.rule.reasonCodes,
        "No supported perfection rule pack is available.",
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: true,
      perfectionLegallyDetermined: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    input.rule.requiresHumanReview ||
    !input.rule.ruleId ||
    !input.rule.value
  ) {
    return {
      status: "human-review-required",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        ...input.rule.reasonCodes,
        "Perfection rule coverage remains unresolved.",
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: true,
      perfectionLegallyDetermined: false,
    };
  }

  if (
    !input.rule.value.allowedMethods.includes(
      input.selection.selectedMethod,
    )
  ) {
    return {
      status: "blocked",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        "The selected method is not allowed by the resolved perfection rule.",
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: false,
      perfectionLegallyDetermined: false,
    };
  }

  const evidence = input.conditionEvidence ?? {};

  const requiredConditions =
    input.rule.value.requiredConditions ?? [];

  const missingConditions: string[] = [];
  const unresolvedConditions: string[] = [];
  const contradictedConditions: string[] = [];
  const sourceIds: string[] = [];

  for (const condition of requiredConditions) {
    const item = evidence[condition];

    if (!item) {
      missingConditions.push(condition);
      continue;
    }

    sourceIds.push(...item.sourceRefs.map((source) => source.id));

    if (
      item.status === "supported" &&
      item.sourceRefs.length === 0
    ) {
      missingConditions.push(condition);
      continue;
    }

    if (item.status === "unresolved") {
      unresolvedConditions.push(condition);
    }

    if (item.status === "contradicted") {
      contradictedConditions.push(condition);
    }
  }

  if (contradictedConditions.length > 0) {
    return {
      status: "human-review-required",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [...new Set(sourceIds)],
      missingConditions,
      unresolvedConditions,
      contradictedConditions,
      reasons: [
        `Perfection condition(s) are contradicted: ${contradictedConditions.join(", ")}.`,
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: true,
      perfectionLegallyDetermined: false,
    };
  }

  if (
    missingConditions.length > 0 ||
    unresolvedConditions.length > 0
  ) {
    return {
      status: "blocked",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [...new Set(sourceIds)],
      missingConditions,
      unresolvedConditions,
      contradictedConditions: [],
      reasons: [
        "Required perfection conditions remain incomplete or unresolved.",
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: false,
      perfectionLegallyDetermined: false,
    };
  }

  return {
    status: "supported-for-review",
    ruleId: input.rule.ruleId,
    method: input.selection.selectedMethod,
    authorityRefIds,
    conditionSourceRefIds: [...new Set(sourceIds)],
    missingConditions: [],
    unresolvedConditions: [],
    contradictedConditions: [],
    reasons: [
      "The recorded execution evidence and required authority-backed conditions support the proposed perfection finding.",
      "Human review remains required and this engine does not determine priority.",
    ],
    evidenceSupportsPerfectionElements: true,
    requiresHumanReview: true,
    perfectionLegallyDetermined: false,
  };
}
```

Append to:

```text
packages/secured-transactions/src/perfection/index.ts
```

```ts
export {
  assessPerfectionUnderRule,
} from "./analysis.js";

export type {
  PerfectionConditionEvidence,
  PerfectionAuthorityAssessment,
} from "./analysis.js";
```

---

## 12. Implement priority-exception analysis

Create:

```text
packages/secured-transactions/src/priority/exception-analysis.ts
```

```ts
import type {
  JurisdictionRuleResult,
  UccExceptionRuleData,
} from "@mailmypdf/jurisdiction-rules";

import type {
  SecuredTransactionSourceRef,
} from "../types.js";

export interface PriorityExceptionEvidence {
  readonly status:
    | "applies"
    | "does-not-apply"
    | "unresolved";

  readonly sourceRefs: readonly SecuredTransactionSourceRef[];
  readonly note?: string;
}

export interface PriorityExceptionAssessment {
  readonly status:
    | "clear"
    | "exception-applies"
    | "human-review-required"
    | "unsupported";

  readonly applicableExceptionIds: readonly string[];
  readonly unresolvedExceptionIds: readonly string[];

  readonly sourceRefIds: readonly string[];
  readonly authorityRefIds: readonly string[];

  readonly reasons: readonly string[];

  readonly requiresHumanReview: boolean;

  /**
   * Exception analysis never applies a priority override automatically.
   */
  readonly canAutoOverridePriority: false;
}

export function assessPriorityExceptions(input: {
  rule: JurisdictionRuleResult<UccExceptionRuleData>;

  evidence?: Readonly<
    Record<string, PriorityExceptionEvidence | undefined>
  >;
}): PriorityExceptionAssessment {
  const authorityRefIds =
    input.rule.authorityRefs.map((authority) => authority.id);

  if (input.rule.status === "unsupported") {
    return {
      status: "unsupported",
      applicableExceptionIds: [],
      unresolvedExceptionIds: [],
      sourceRefIds: [],
      authorityRefIds,
      reasons: [
        ...input.rule.reasonCodes,
        "Priority cannot be automatically compared without exception coverage.",
      ],
      requiresHumanReview: true,
      canAutoOverridePriority: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    input.rule.requiresHumanReview ||
    !input.rule.value
  ) {
    return {
      status: "human-review-required",
      applicableExceptionIds: [],
      unresolvedExceptionIds: [],
      sourceRefIds: [],
      authorityRefIds,
      reasons: [
        ...input.rule.reasonCodes,
        "Exception-rule coverage is unresolved.",
      ],
      requiresHumanReview: true,
      canAutoOverridePriority: false,
    };
  }

  const evidence = input.evidence ?? {};

  const priorityExceptions =
    input.rule.value.exceptions.filter(
      (exception) => exception.target === "priority",
    );

  const applicableExceptionIds: string[] = [];
  const unresolvedExceptionIds: string[] = [];
  const sourceRefIds: string[] = [];

  for (const exception of priorityExceptions) {
    const item = evidence[exception.id];

    if (!item) {
      unresolvedExceptionIds.push(exception.id);
      continue;
    }

    sourceRefIds.push(
      ...item.sourceRefs.map((source) => source.id),
    );

    if (item.status === "applies") {
      applicableExceptionIds.push(exception.id);
    }

    if (item.status === "unresolved") {
      unresolvedExceptionIds.push(exception.id);
    }

    if (
      item.status === "does-not-apply" &&
      item.sourceRefs.length === 0
    ) {
      unresolvedExceptionIds.push(exception.id);
    }
  }

  if (applicableExceptionIds.length > 0) {
    return {
      status: "exception-applies",
      applicableExceptionIds,
      unresolvedExceptionIds,
      sourceRefIds: [...new Set(sourceRefIds)],
      authorityRefIds,
      reasons: [
        `Potential priority exception(s) apply: ${applicableExceptionIds.join(", ")}.`,
        "Automatic ordinary-rule ranking is blocked until the exception is reviewed.",
      ],
      requiresHumanReview: true,
      canAutoOverridePriority: false,
    };
  }

  if (unresolvedExceptionIds.length > 0) {
    return {
      status: "human-review-required",
      applicableExceptionIds: [],
      unresolvedExceptionIds: [
        ...new Set(unresolvedExceptionIds),
      ],
      sourceRefIds: [...new Set(sourceRefIds)],
      authorityRefIds,
      reasons: [
        `Priority exception coverage remains unresolved for: ${[
          ...new Set(unresolvedExceptionIds),
        ].join(", ")}.`,
      ],
      requiresHumanReview: true,
      canAutoOverridePriority: false,
    };
  }

  return {
    status: "clear",
    applicableExceptionIds: [],
    unresolvedExceptionIds: [],
    sourceRefIds: [...new Set(sourceRefIds)],
    authorityRefIds,
    reasons: [
      "The reviewed exception evidence does not identify an applicable priority exception.",
    ],
    requiresHumanReview: false,
    canAutoOverridePriority: false,
  };
}
```

---

## 13. Implement deterministic evidence-based priority comparison

Create:

```text
packages/secured-transactions/src/priority/priority-determination.ts
```

```ts
import type {
  JurisdictionRuleResult,
  UccPriorityComparisonStep,
  UccPriorityRuleData,
} from "@mailmypdf/jurisdiction-rules";

import {
  assessPriorityAnalysisReadiness,
  type CompetingInterestEvidenceRecord,
  type CompetingInterestMatrix,
} from "./priority-readiness.js";

import type {
  PriorityExceptionAssessment,
} from "./exception-analysis.js";

export interface PriorityDetermination {
  readonly status:
    | "evidence-supports-first-priority"
    | "evidence-supports-not-first-priority"
    | "human-review-required"
    | "blocked"
    | "unsupported";

  readonly subjectRecordId: string;

  readonly rankedRecordIds: readonly string[];
  readonly leadingRecordIds: readonly string[];

  readonly ruleId?: string;

  readonly reasons: readonly string[];

  readonly requiresHumanReview: boolean;

  /**
   * This is an evidence/rule finding rather than a judicial or legal
   * certification of priority.
   */
  readonly priorityLegallyDetermined: false;

  readonly canProceedToConsequentialAction: false;
}

function fieldValue(
  record: CompetingInterestEvidenceRecord,
  field: string,
): unknown {
  switch (field) {
    case "eventDate":
      return record.eventDate;

    case "externalRecordId":
      return record.externalRecordId;

    case "status":
      return record.status;

    case "interestKind":
      return record.interestKind;

    case "claimantEntityId":
      return record.claimantEntityId;

    case "jurisdiction":
      return record.jurisdiction;

    default:
      return record.attributes?.[field];
  }
}

function normalizedComparable(
  value: unknown,
  step: UccPriorityComparisonStep,
): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (step.valueType === "date") {
    const parsed = Date.parse(String(value));

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  if (step.valueType === "number") {
    const parsed =
      typeof value === "number"
        ? value
        : Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return String(value);
}

function comparePrimitive(
  left: string | number,
  right: string | number,
): number {
  if (left === right) return 0;

  return left < right
    ? -1
    : 1;
}

function compareRecords(
  left: CompetingInterestEvidenceRecord,
  right: CompetingInterestEvidenceRecord,
  steps: readonly UccPriorityComparisonStep[],
): number | null {
  for (const step of steps) {
    const leftValue = normalizedComparable(
      fieldValue(left, step.field),
      step,
    );

    const rightValue = normalizedComparable(
      fieldValue(right, step.field),
      step,
    );

    if (leftValue === null || rightValue === null) {
      return null;
    }

    const raw = comparePrimitive(leftValue, rightValue);

    if (raw !== 0) {
      return step.direction === "ascending"
        ? raw
        : -raw;
    }
  }

  return 0;
}

export function determinePriorityFromRule(input: {
  matrix: CompetingInterestMatrix;

  rule: JurisdictionRuleResult<UccPriorityRuleData>;

  exceptionAssessment: PriorityExceptionAssessment;

  subjectRecordId: string;
}): PriorityDetermination {
  const subjectRecordId = input.subjectRecordId.trim();

  if (!subjectRecordId) {
    return {
      status: "blocked",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: input.rule.ruleId,
      reasons: ["Subject competing-interest record id is required."],
      requiresHumanReview: false,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const readiness = assessPriorityAnalysisReadiness({
    matrix: input.matrix,
    rule: input.rule,
  });

  if (readiness.status === "unsupported") {
    return {
      status: "unsupported",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: readiness.ruleId,
      reasons: readiness.reasons,
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (readiness.status !== "ready-for-rule-analysis") {
    return {
      status: readiness.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: readiness.ruleId,
      reasons: readiness.reasons,
      requiresHumanReview: readiness.requiresHumanReview,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (input.exceptionAssessment.status !== "clear") {
    return {
      status: "human-review-required",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: readiness.ruleId,
      reasons: input.exceptionAssessment.reasons,
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    !input.rule.value ||
    !input.rule.ruleId
  ) {
    return {
      status: "human-review-required",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: input.rule.ruleId,
      reasons: [
        "Priority rule data is not fully resolved.",
      ],
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const steps =
    input.rule.value.comparisonSteps ?? [];

  if (steps.length === 0) {
    return {
      status: "unsupported",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: input.rule.ruleId,
      reasons: [
        "The authority-backed priority rule does not define deterministic comparison steps.",
      ],
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const records = [...input.matrix.records];

  const subject =
    records.find(
      (record) => record.id === subjectRecordId,
    );

  if (!subject) {
    return {
      status: "blocked",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: input.rule.ruleId,
      reasons: [
        "The subject record is not present in the competing-interest matrix.",
      ],
      requiresHumanReview: false,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  for (const record of records) {
    for (const step of steps) {
      if (
        normalizedComparable(
          fieldValue(record, step.field),
          step,
        ) === null
      ) {
        return {
          status: "blocked",
          subjectRecordId,
          rankedRecordIds: [],
          leadingRecordIds: [],
          ruleId: input.rule.ruleId,
          reasons: [
            `Record ${record.id} lacks a usable comparison value for ${step.field}.`,
          ],
          requiresHumanReview: false,
          priorityLegallyDetermined: false,
          canProceedToConsequentialAction: false,
        };
      }
    }
  }

  records.sort((left, right) => {
    const result = compareRecords(
      left,
      right,
      steps,
    );

    if (result === null) {
      return 0;
    }

    if (result !== 0) {
      return result;
    }

    return left.id.localeCompare(right.id);
  });

  const leading = records.filter((record) => {
    const result = compareRecords(
      record,
      records[0]!,
      steps,
    );

    return result === 0;
  });

  const rankedRecordIds =
    records.map((record) => record.id);

  const leadingRecordIds =
    leading.map((record) => record.id);

  if (
    leadingRecordIds.includes(subjectRecordId) &&
    leadingRecordIds.length > 1
  ) {
    return {
      status: "human-review-required",
      subjectRecordId,
      rankedRecordIds,
      leadingRecordIds,
      ruleId: input.rule.ruleId,
      reasons: [
        "The authority-backed comparison produces a tie among leading records.",
      ],
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (leadingRecordIds[0] === subjectRecordId) {
    return {
      status: "evidence-supports-first-priority",
      subjectRecordId,
      rankedRecordIds,
      leadingRecordIds,
      ruleId: input.rule.ruleId,
      reasons: [
        "The subject record ranks first under the deterministic comparison supplied by the resolved authority-backed rule pack.",
        "This is an evidence-based finding for human review, not a legal certification of first priority.",
      ],
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  return {
    status: "evidence-supports-not-first-priority",
    subjectRecordId,
    rankedRecordIds,
    leadingRecordIds,
    ruleId: input.rule.ruleId,
    reasons: [
      `Another record ranks ahead of the subject record under the resolved authority-backed comparison: ${leadingRecordIds.join(", ")}.`,
    ],
    requiresHumanReview: true,
    priorityLegallyDetermined: false,
    canProceedToConsequentialAction: false,
  };
}
```

Append to:

```text
packages/secured-transactions/src/priority/index.ts
```

```ts
export {
  assessPriorityExceptions,
} from "./exception-analysis.js";

export type {
  PriorityExceptionEvidence,
  PriorityExceptionAssessment,
} from "./exception-analysis.js";

export {
  determinePriorityFromRule,
} from "./priority-determination.js";

export type {
  PriorityDetermination,
} from "./priority-determination.js";
```

---

## 14. Ensure root secured-transactions exports remain usable

The root currently has namespaced exports.

Keep those, but make sure this remains present:

```ts
export * as GoverningLaw from "./governing-law/index.js";
export * as Perfection from "./perfection/index.js";
export * as Priority from "./priority/index.js";
export * as Certification from "./certification/index.js";
```

Do not remove existing exports.

---

## 15. Add jurisdiction-rule tests

Create:

```text
packages/jurisdiction-rules/tests/secured-transaction-rule-contracts.test.ts
```

```ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createJurisdictionRuleRegistry,
} from "../src/registry.js";

import {
  resolveUccGoverningLawRule,
} from "../src/ucc/governing-law/index.js";

import {
  resolveUccAttachmentRule,
} from "../src/ucc/attachment/index.js";

import {
  resolveUccExceptionRule,
} from "../src/ucc/exceptions/index.js";

const authority = {
  id: "synthetic-authority",
  title: "Synthetic authority",
  jurisdiction: "TEST-1",
};

describe("secured-transaction jurisdiction rule contracts", () => {
  test("resolves authority-backed governing-law data", () => {
    const registry = createJurisdictionRuleRegistry([
      {
        id: "governing-law-test",
        family: "ucc-governing-law",
        jurisdiction: "TEST-1",
        status: "active",
        effectiveFrom: "2026-01-01",
        authorityRefs: [authority],
        value: {
          governingLawJurisdiction: "TEST-1",
          ruleDescription: "Synthetic governing-law rule",
          requiredFacts: ["debtor-location"],
        },
      },
    ]);

    const result = resolveUccGoverningLawRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-18",
    });

    assert.equal(result.status, "resolved");
    assert.equal(
      result.value?.governingLawJurisdiction,
      "TEST-1",
    );
  });

  test("resolves authority-backed attachment conditions", () => {
    const registry = createJurisdictionRuleRegistry([
      {
        id: "attachment-test",
        family: "ucc-attachment",
        jurisdiction: "TEST-1",
        status: "active",
        effectiveFrom: "2026-01-01",
        authorityRefs: [authority],
        value: {
          ruleDescription: "Synthetic attachment rule",
          requiredConditions: [
            "value",
            "debtor-rights",
            "authenticated-agreement",
          ],
        },
      },
    ]);

    const result = resolveUccAttachmentRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-18",
    });

    assert.equal(result.status, "resolved");
    assert.deepEqual(
      result.value?.requiredConditions,
      [
        "value",
        "debtor-rights",
        "authenticated-agreement",
      ],
    );
  });

  test("resolves exception catalog without applying exceptions itself", () => {
    const registry = createJurisdictionRuleRegistry([
      {
        id: "exceptions-test",
        family: "ucc-exception",
        jurisdiction: "TEST-1",
        status: "active",
        effectiveFrom: "2026-01-01",
        authorityRefs: [authority],
        value: {
          exceptions: [
            {
              id: "synthetic-priority-exception",
              target: "priority",
              description: "Synthetic priority exception",
            },
          ],
        },
      },
    ]);

    const result = resolveUccExceptionRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-18",
    });

    assert.equal(result.status, "resolved");
    assert.equal(
      result.value?.exceptions[0]?.target,
      "priority",
    );
  });
});
```

---

## 16. Add priority-determination tests

Create:

```text
packages/secured-transactions/tests/priority-determination.test.ts
```

```ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildCompetingInterestMatrix,
  determinePriorityFromRule,
} from "../src/priority/index.js";

const source = {
  id: "filing-source",
  kind: "filing" as const,
  label: "Synthetic filing source",
};

const priorityRule = {
  status: "resolved" as const,
  jurisdiction: "TEST-1",
  ruleId: "synthetic-priority-rule",
  value: {
    ruleDescription: "Synthetic date comparison",
    requiredRecordFields: ["eventDate"],
    comparisonSteps: [
      {
        field: "eventDate",
        valueType: "date" as const,
        direction: "ascending" as const,
      },
    ],
  },
  authorityRefs: [
    {
      id: "priority-authority",
      title: "Synthetic priority authority",
      jurisdiction: "TEST-1",
    },
  ],
  reasonCodes: [],
  requiresHumanReview: false,
};

const noExceptions = {
  status: "clear" as const,
  applicableExceptionIds: [],
  unresolvedExceptionIds: [],
  sourceRefIds: ["exception-search"],
  authorityRefIds: ["exception-authority"],
  reasons: [],
  requiresHumanReview: false,
  canAutoOverridePriority: false as const,
};

describe("priority determination", () => {
  test("supports first-priority finding only from configured comparison", () => {
    const matrix = buildCompetingInterestMatrix([
      {
        id: "subject",
        claimantEntityId: "secured-party-a",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
      {
        id: "competitor",
        claimantEntityId: "secured-party-b",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-02-01",
        sourceRefs: [source],
      },
    ]);

    const result = determinePriorityFromRule({
      matrix,
      rule: priorityRule,
      exceptionAssessment: noExceptions,
      subjectRecordId: "subject",
    });

    assert.equal(
      result.status,
      "evidence-supports-first-priority",
    );

    assert.equal(
      result.priorityLegallyDetermined,
      false,
    );

    assert.equal(
      result.canProceedToConsequentialAction,
      false,
    );

    assert.equal(
      result.requiresHumanReview,
      true,
    );
  });

  test("does not claim first priority when another record ranks first", () => {
    const matrix = buildCompetingInterestMatrix([
      {
        id: "subject",
        claimantEntityId: "secured-party-a",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-03-01",
        sourceRefs: [source],
      },
      {
        id: "competitor",
        claimantEntityId: "secured-party-b",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
    ]);

    const result = determinePriorityFromRule({
      matrix,
      rule: priorityRule,
      exceptionAssessment: noExceptions,
      subjectRecordId: "subject",
    });

    assert.equal(
      result.status,
      "evidence-supports-not-first-priority",
    );
  });

  test("ties require human review", () => {
    const matrix = buildCompetingInterestMatrix([
      {
        id: "subject",
        claimantEntityId: "secured-party-a",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
      {
        id: "competitor",
        claimantEntityId: "secured-party-b",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
    ]);

    const result = determinePriorityFromRule({
      matrix,
      rule: priorityRule,
      exceptionAssessment: noExceptions,
      subjectRecordId: "subject",
    });

    assert.equal(
      result.status,
      "human-review-required",
    );
  });

  test("applicable exceptions block ordinary ranking", () => {
    const matrix = buildCompetingInterestMatrix([
      {
        id: "subject",
        claimantEntityId: "secured-party-a",
        interestKind: "synthetic-interest",
        jurisdiction: "TEST-1",
        eventDate: "2026-01-01",
        sourceRefs: [source],
      },
    ]);

    const result = determinePriorityFromRule({
      matrix,
      rule: priorityRule,
      exceptionAssessment: {
        ...noExceptions,
        status: "exception-applies",
        applicableExceptionIds: ["special-rule"],
        reasons: ["Special rule requires review."],
        requiresHumanReview: true,
      },
      subjectRecordId: "subject",
    });

    assert.equal(
      result.status,
      "human-review-required",
    );
  });
});
```

---

## 17. Add security-agreement draft test

Create:

```text
packages/secured-transactions/tests/security-agreement-draft.test.ts
```

```ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildSecurityAgreementDraft,
} from "../src/obligations/index.js";

describe("security agreement draft", () => {
  test("builds a review-only draft from explicit findings", () => {
    const result = buildSecurityAgreementDraft({
      agreementId: "agreement-1",
      debtorName: "Example Debtor LLC",
      securedPartyName: "Example Secured Party LLC",
      debtorFindingId: "debtor-finding",
      securedPartyFindingId: "secured-party-finding",
      obligationFindingId: "obligation-finding",
      collateralFindingIds: ["collateral-finding"],
      obligationDescription:
        "Synthetic obligation for testing.",
      collateralDescription:
        "Synthetic identified collateral for testing.",
      governingLawJurisdiction: "TEST-1",
    });

    assert.equal(
      result.status,
      "prepared-for-review",
    );

    assert.equal(
      result.canExecute,
      false,
    );

    assert.equal(
      result.legalSufficiencyDetermined,
      false,
    );

    assert.match(
      result.renderedText ?? "",
      /DRAFT FOR REVIEW/,
    );
  });

  test("fails closed when material findings are missing", () => {
    const result = buildSecurityAgreementDraft({
      agreementId: "agreement-1",
      debtorName: "Example Debtor LLC",
      securedPartyName: "",
      debtorFindingId: "debtor-finding",
      securedPartyFindingId: "",
      obligationFindingId: "obligation-finding",
      collateralFindingIds: [],
      obligationDescription: "Synthetic obligation",
      collateralDescription: "Synthetic collateral",
    });

    assert.equal(
      result.status,
      "blocked",
    );

    assert.equal(
      result.canExecute,
      false,
    );
  });
});
```

---

## 18. Add secured-transactions package to root TypeScript references

The package is currently missing from the root `tsconfig.json` project references.

Add:

```json
{
  "path": "./packages/secured-transactions"
}
```

Do not remove existing references.

---

## 19. Add the secured-transactions vertical to pnpm workspace

The shared package is already in `packages/*`, but the top-level secured-transactions vertical is currently outside the workspace.

In:

```text
pnpm-workspace.yaml
```

change:

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "apps/verticals/*"
  - "services/*"
  - "appeal-mail"
  - "notice-respond"
  - "records-request"
```

to:

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "apps/verticals/*"
  - "services/*"
  - "appeal-mail"
  - "notice-respond"
  - "records-request"
  - "secured-transactions"
```

Regenerate the lockfile normally using pnpm. Do not hand-edit the lockfile.

---

## 20. Verification requirements

After implementing everything, run:

```bash
pnpm install --lockfile-only

pnpm --filter @mailmypdf/jurisdiction-rules typecheck
pnpm --filter @mailmypdf/jurisdiction-rules test

pnpm --filter @mailmypdf/identity-capacity typecheck
pnpm --filter @mailmypdf/identity-capacity test

pnpm --filter @mailmypdf/secured-transactions typecheck
pnpm --filter @mailmypdf/secured-transactions test

pnpm --filter @mailmypdf/secured-transactions-section typecheck
pnpm --filter @mailmypdf/secured-transactions-section test
```

If the section package filter differs after workspace discovery, use its actual package name from:

```text
secured-transactions/package.json
```

which currently should be:

```text
@mailmypdf/secured-transactions-section
```

Then inspect:

```bash
git diff --check
git status --short
git diff
```

Do not hide existing failures. Distinguish new failures from pre-existing failures.

Do **not** change the 17 secured workflow manifests from:

```ts
maturity: "placeholder"
```

during this task.

Do not add real UCC statutory rule data from memory. The rule-engine architecture may be completed with synthetic test packs, but actual jurisdiction packs require independently reviewed authority and effective-date data.

Do not implement automatic UCC filing.

Do not implement automatic execution/signing of a security agreement.

Do not change:

```ts
canSubmit: false
canExecute: false
canProceedToConsequentialAction: false
priorityLegallyDetermined: false
attachmentLegallyDetermined: false
perfectionLegallyDetermined: false
```

into permissive values merely to make a workflow pass.

At completion, report exactly:

```text
FILES CREATED
FILES MODIFIED

TESTS RUN
PASS/FAIL COUNTS

NEW FAILURES
PRE-EXISTING FAILURES

REMAINING SHARED-ENGINE GAPS

WHICH OF THE 17 PLACEHOLDER WORKFLOWS
NOW HAVE ENOUGH SHARED INFRASTRUCTURE
TO BEGIN THEIR REAL EXECUTABLE IMPLEMENTATION
```

---

## Intended implementation sequence after this batch

This batch is meant to complete the missing shared-engine chain before any of the 17 workflow folders are upgraded.

```text
identity/capacity
        ↓
obligation + value
        ↓
collateral ownership/classification
        ↓
governing law + filing location
        ↓
security-agreement draft
        ↓
attachment rule analysis
        ↓
perfection method
        ↓
UCC-1 preparation
        ↓
execution evidence
        ↓
perfection rule analysis
        ↓
competing-interest matrix
        ↓
exception analysis
        ↓
authority-backed priority comparison
        ↓
first-priority finding FOR REVIEW
        ↓
remediation / lifecycle
```

The architecture must preserve the distinction between:

```text
exists
implemented
integrated
tested
acceptance-tested
executable
deployed
production-ready
```

A result such as:

```text
evidence supports first priority under the currently loaded authority-backed comparison
```

is acceptable only as a review finding. It must remain materially different from a legal certification of first priority.

Do not begin mass-filling all 17 workflow folders until the shared-engine tests above are clean and the shared package boundaries are verified.

import type {
  JurisdictionRuleResult,
  UccDebtorNameRuleData,
} from "@mailmypdf/jurisdiction-rules";
import type { SecuredTransactionSourceRef } from "../types.js";

export interface FilingAuthorizationEvidence {
  status: "supported" | "unresolved" | "contradicted";
  sourceRefs: readonly SecuredTransactionSourceRef[];
  reasonCodes?: readonly string[];
}

export interface Ucc1PreparationInput {
  debtorName: string;
  debtorEntityType: string;
  debtorNameFindingId: string;
  debtorNameRule: JurisdictionRuleResult<UccDebtorNameRuleData>;
  securedPartyName: string;
  collateralIndication: string;
  filingJurisdiction: string;
  authorization: FilingAuthorizationEvidence;
}

export interface PreparedUcc1Data {
  debtorName: string;
  debtorEntityType: string;
  debtorNameFindingId: string;
  securedPartyName: string;
  collateralIndication: string;
  filingJurisdiction: string;
  debtorNameRuleId: string;
  authorityRefIds: readonly string[];
  authorizationSourceRefIds: readonly string[];
}

export interface Ucc1PreparationResult {
  status: "prepared-for-review" | "human-review-required" | "blocked" | "unsupported";
  data?: PreparedUcc1Data;
  reasons: readonly string[];
  requiresHumanReview: boolean;
  canSubmit: false;
}

function requiredText(value: string, label: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

/**
 * Prepares a reviewable financing-statement data model. It never submits a
 * filing and does not treat preparation as perfection or priority.
 */
export function prepareUcc1Data(
  input: Ucc1PreparationInput,
): Ucc1PreparationResult {
  const debtorName = requiredText(input.debtorName, "Debtor name");
  const debtorEntityType = requiredText(input.debtorEntityType, "Debtor entity type");
  const debtorNameFindingId = requiredText(input.debtorNameFindingId, "Debtor-name finding id");
  const securedPartyName = requiredText(input.securedPartyName, "Secured-party name");
  const collateralIndication = requiredText(input.collateralIndication, "Collateral indication");
  const filingJurisdiction = requiredText(input.filingJurisdiction, "Filing jurisdiction");

  if (input.debtorNameRule.status === "unsupported") {
    return {
      status: "unsupported",
      reasons: [
        ...input.debtorNameRule.reasonCodes,
        "No supported debtor-name rule is available for the requested jurisdiction/date.",
      ],
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  if (
    input.debtorNameRule.status !== "resolved" ||
    input.debtorNameRule.requiresHumanReview ||
    !input.debtorNameRule.ruleId ||
    !input.debtorNameRule.value
  ) {
    return {
      status: "human-review-required",
      reasons: [
        ...input.debtorNameRule.reasonCodes,
        "The debtor-name rule is unresolved or requires review.",
      ],
      requiresHumanReview: true,
      canSubmit: false,
    };
  }

  if (input.debtorNameRule.jurisdiction !== filingJurisdiction) {
    return {
      status: "blocked",
      reasons: ["The debtor-name rule jurisdiction does not match the proposed filing jurisdiction."],
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  if (
    input.authorization.status === "supported" &&
    input.authorization.sourceRefs.length === 0
  ) {
    return {
      status: "blocked",
      reasons: ["Authorization was marked supported but has no source provenance."],
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  if (input.authorization.status === "contradicted") {
    return {
      status: "human-review-required",
      reasons: [
        ...(input.authorization.reasonCodes ?? []),
        "Authorization evidence is contradicted and requires review.",
      ],
      requiresHumanReview: true,
      canSubmit: false,
    };
  }

  if (input.authorization.status !== "supported") {
    return {
      status: "blocked",
      reasons: [
        ...(input.authorization.reasonCodes ?? []),
        "Supported filing authorization evidence is required before filing data can be prepared for review.",
      ],
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  return {
    status: "prepared-for-review",
    data: {
      debtorName,
      debtorEntityType,
      debtorNameFindingId,
      securedPartyName,
      collateralIndication,
      filingJurisdiction,
      debtorNameRuleId: input.debtorNameRule.ruleId,
      authorityRefIds: input.debtorNameRule.authorityRefs.map((authority) => authority.id),
      authorizationSourceRefIds: input.authorization.sourceRefs.map((source) => source.id),
    },
    reasons: [
      "Financing-statement data is prepared for review from a resolved authority-backed debtor-name rule and sourced authorization evidence.",
      "Preparation does not submit a filing and does not establish attachment, perfection, priority, or enforceability.",
    ],
    requiresHumanReview: true,
    canSubmit: false,
  };
}

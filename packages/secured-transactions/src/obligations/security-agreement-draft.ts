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

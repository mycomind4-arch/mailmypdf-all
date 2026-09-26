/**
 * Provider-neutral UCC filing contract. Filing-office integrations remain
 * provider-specific; this contract gives workflows one safe boundary for
 * validation, authorization, submission, and provenance.
 */

export type UccFilingAction =
  | "initial"
  | "amendment"
  | "continuation"
  | "termination";

export interface UccFilingRequest {
  readonly action: UccFilingAction;
  readonly jurisdiction: string;
  readonly debtorNames: readonly string[];
  readonly securedPartyNames: readonly string[];
  readonly collateralText?: string | undefined;
  readonly originalFilingNumber?: string | undefined;
  readonly authorizationEvidenceId: string;
  readonly idempotencyKey: string;
}

export interface UccFilingSubmission {
  readonly submissionId: string;
  readonly status: "accepted" | "pending" | "rejected";
  readonly filingNumber?: string | undefined;
  readonly submittedAt: string;
  readonly sourceUrl?: string | undefined;
  readonly rawArtifactHash?: string | undefined;
  readonly rejectionReason?: string | undefined;
}

export interface UccFilingProvider {
  readonly providerId: string;
  readonly supportedActions: readonly UccFilingAction[];
  submit(request: UccFilingRequest): Promise<UccFilingSubmission>;
}

export function validateUccFilingRequest(
  request: UccFilingRequest,
): ReadonlyArray<string> {
  const errors: string[] = [];
  if (!request.jurisdiction.trim()) errors.push("jurisdiction is required");
  if (request.debtorNames.length === 0) errors.push("at least one debtor is required");
  if (request.securedPartyNames.length === 0) errors.push("at least one secured party is required");
  if (!request.authorizationEvidenceId.trim()) errors.push("authorization evidence is required");
  if (!request.idempotencyKey.trim()) errors.push("idempotency key is required");
  if (request.action !== "initial" && !request.originalFilingNumber?.trim()) {
    errors.push("original filing number is required for non-initial actions");
  }
  if (request.action === "initial" && !request.collateralText?.trim()) {
    errors.push("collateral text is required for an initial filing");
  }
  return errors;
}

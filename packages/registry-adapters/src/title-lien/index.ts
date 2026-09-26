/** Provider-neutral title and lien search boundary. */

export type TitleLienRecordKind = "mortgage" | "deed-of-trust" | "judgment" | "tax-lien" | "mechanic-lien" | "ucc" | "other";

export interface TitleLienSearchRequest {
  readonly propertyId: string;
  readonly jurisdiction: string;
  readonly asOf?: string | undefined;
  readonly idempotencyKey: string;
}

export interface TitleLienRecord {
  readonly recordId: string;
  readonly kind: TitleLienRecordKind;
  readonly holder?: string | undefined;
  readonly amount?: string | undefined;
  readonly status: "open" | "released" | "unknown";
  readonly recordingDate?: string | undefined;
  readonly sourceUrl?: string | undefined;
  readonly sourceArtifactHash?: string | undefined;
}

export interface TitleLienSearchResult {
  readonly searchId: string;
  readonly propertyId: string;
  readonly searchedAt: string;
  readonly records: readonly TitleLienRecord[];
  readonly limitations: readonly string[];
}

export interface TitleLienSearchProvider {
  readonly providerId: string;
  search(request: TitleLienSearchRequest): Promise<TitleLienSearchResult>;
}

export function validateTitleLienSearchRequest(
  request: TitleLienSearchRequest,
): ReadonlyArray<string> {
  const errors: string[] = [];
  if (!request.propertyId.trim()) errors.push("property id is required");
  if (!request.jurisdiction.trim()) errors.push("jurisdiction is required");
  if (!request.idempotencyKey.trim()) errors.push("idempotency key is required");
  return errors;
}

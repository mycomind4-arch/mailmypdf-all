import type { AuthorityJurisdiction } from "@mailmypdf/intelligence/authority";
import type { AuthoritySource } from "@mailmypdf/identity-capacity";

export type RegistrySourceKind =
  | "business-registry"
  | "ucc-filing-office"
  | "property-records"
  | "court-index"
  | "agency-index"
  | "official-api"
  | "open-data"
  | "gis"
  | "document-archive"
  | "public-index"
  | "other";

export type RegistryAccessMethod =
  | "api"
  | "html"
  | "browser"
  | "pdf"
  | "csv"
  | "json"
  | "manual";

export type RegistryCapability =
  | "name-search"
  | "identifier-search"
  | "entity-detail"
  | "filing-search"
  | "property-search"
  | "document-fetch"
  | "status-lookup"
  | "history-search";

export type SearchCompleteness =
  | "complete"
  | "partial"
  | "provider-limited"
  | "unknown";

export interface RegistrySourceCompliance {
  readonly robotsChecked?: boolean | undefined;
  readonly termsReviewed?: boolean | undefined;
  readonly reviewedAt?: string | undefined;
  readonly automationAllowed?: boolean | undefined;
  readonly notes?: readonly string[] | undefined;
}

export interface RegistrySourceDescriptor {
  readonly id: string;
  readonly name: string;
  readonly kind: RegistrySourceKind;
  readonly jurisdiction: AuthorityJurisdiction;
  readonly agency?: string | undefined;
  readonly officialUrl: string;
  readonly accessMethod: RegistryAccessMethod;
  readonly capabilities: readonly RegistryCapability[];
  readonly enabled: boolean;
  readonly compliance?: RegistrySourceCompliance | undefined;
  readonly rateLimitPerMinute?: number | undefined;
  readonly lastVerifiedAt?: string | undefined;
  readonly providerVersion?: string | undefined;
}

export interface RegistrySearchQuery {
  readonly queryId: string;
  readonly purpose: string;
  readonly jurisdiction: AuthorityJurisdiction;
  readonly names?: readonly string[] | undefined;
  readonly identifiers?: Readonly<Record<string, string>> | undefined;
  readonly asOf?: string | undefined;
  readonly limit?: number | undefined;
  readonly metadata?: Readonly<Record<string, string>> | undefined;
}

export interface RegistryArtifact {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly contentType: string;
  readonly sourceRecordId?: string | undefined;
  readonly title?: string | undefined;
  readonly documentHash?: string | undefined;
  readonly content?: string | undefined;
  readonly metadata?: Readonly<Record<string, string>> | undefined;
}

export interface RegistryRecord {
  readonly sourceId: string;
  readonly sourceRecordId: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly recordType: string;
  readonly rawNames: readonly string[];
  readonly identifiers: Readonly<Record<string, string>>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly artifacts?: readonly RegistryArtifact[] | undefined;
}

export interface RegistrySearchResult<RecordType extends RegistryRecord = RegistryRecord> {
  readonly query: RegistrySearchQuery;
  readonly source: RegistrySourceDescriptor;
  readonly records: readonly RecordType[];
  readonly completeness: SearchCompleteness;
  readonly searchedAt: string;
  readonly warnings: readonly string[];
  readonly providerQueryId?: string | undefined;
}

export interface RegistryAdapter<RecordType extends RegistryRecord = RegistryRecord> {
  readonly source: RegistrySourceDescriptor;
  supports(query: RegistrySearchQuery): boolean;
  search(query: RegistrySearchQuery): Promise<RegistrySearchResult<RecordType>>;
}

export function normalizeRegistryArtifact(input: RegistryArtifact): RegistryArtifact {
  return {
    ...input,
    retrievedAt: new Date(input.retrievedAt).toISOString(),
    content: input.content?.replace(/\r\n/g, "\n"),
    metadata: input.metadata
      ? Object.fromEntries(Object.entries(input.metadata).sort(([a], [b]) => a.localeCompare(b)))
      : undefined,
  };
}

export function toAuthoritySource(
  source: RegistrySourceDescriptor,
  record?: Pick<RegistryRecord, "sourceUrl" | "retrievedAt">,
): AuthoritySource {
  return {
    id: source.id,
    sourceType:
      source.kind === "business-registry" ? "official-registry-record"
      : source.kind === "property-records" ? "recorded-title"
      : source.kind === "court-index" ? "court-order"
      : "official-registry-record",
    provenanceLevel: "external_source",
    jurisdiction: [
      source.jurisdiction.country,
      source.jurisdiction.state,
      source.jurisdiction.county,
      source.jurisdiction.city,
    ].filter(Boolean).join("/"),
    effectiveAt: record?.retrievedAt,
  };
}

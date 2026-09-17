import type {
  RegistryRecord,
  RegistrySearchQuery,
  RegistrySearchResult,
  SearchCompleteness,
} from "../types.js";

export interface UccSearchQuery extends RegistrySearchQuery {
  readonly debtorNames?: readonly string[] | undefined;
  readonly filingNumber?: string | undefined;
  readonly securedPartyNames?: readonly string[] | undefined;
  readonly filedFrom?: string | undefined;
  readonly filedTo?: string | undefined;
}

export type UccFilingStatus =
  | "active"
  | "lapsed"
  | "terminated"
  | "amended"
  | "continued"
  | "unknown";

export interface UccFilingRecord extends RegistryRecord {
  readonly recordType: "ucc-filing";
  readonly filingNumber: string;
  readonly filingDate?: string | undefined;
  readonly status: UccFilingStatus;
  readonly debtorNames: readonly string[];
  readonly securedPartyNames: readonly string[];
  readonly collateralText?: string | undefined;
  readonly lapseDate?: string | undefined;
  readonly amendmentOf?: string | undefined;
  readonly continuationOf?: string | undefined;
}

export interface UccSearchResult extends RegistrySearchResult<UccFilingRecord> {
  readonly completeness: SearchCompleteness;
  readonly searchedNames: readonly string[];
  readonly providerLimitations: readonly string[];
}

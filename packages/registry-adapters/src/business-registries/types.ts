import type {
  RegistryRecord,
  RegistrySearchQuery,
  RegistrySearchResult,
} from "../types.js";

export type BusinessEntityStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "dissolved"
  | "cancelled"
  | "merged"
  | "unknown";

export interface BusinessRegistryQuery extends RegistrySearchQuery {
  readonly identifiers?: Readonly<{
    entityNumber?: string;
    filingNumber?: string;
    taxIdLast4?: string;
    [key: string]: string | undefined;
  }> | undefined;
}

export interface BusinessRegistryRecord extends RegistryRecord {
  readonly recordType: "business-entity";
  readonly legalName: string;
  readonly entityNumber?: string | undefined;
  readonly entityType?: string | undefined;
  readonly status: BusinessEntityStatus;
  readonly formationJurisdiction?: string | undefined;
  readonly formationDate?: string | undefined;
  readonly registeredAgentNames?: readonly string[] | undefined;
  readonly addresses?: readonly string[] | undefined;
  readonly alternateNames?: readonly string[] | undefined;
}

export type BusinessRegistrySearchResult = RegistrySearchResult<BusinessRegistryRecord>;

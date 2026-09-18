import type { AuthoritativeNameCandidate } from "@mailmypdf/identity-capacity";
import type {
  NormalizedBusinessRegistryRecord,
  RegistryRecord,
} from "@mailmypdf/registry-adapters";

/**
 * Converts a normalized registry search record into a candidate for the
 * authoritative-name resolver. The registry adapter itself does not make the
 * authoritative-name decision.
 */
export function businessRegistryRecordToNameCandidate(
  record: RegistryRecord<NormalizedBusinessRegistryRecord>,
): AuthoritativeNameCandidate {
  return {
    id: `business-registry-name:${record.id}`,
    rawName: record.normalized.legalName,
    source: {
      id: `business-registry-source:${record.id}`,
      sourceType: "official-registry-record",
      provenanceLevel: "external_source",
      jurisdiction: record.normalized.jurisdiction,
    },
  };
}

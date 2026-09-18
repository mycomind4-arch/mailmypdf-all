import {
  buildNameSearchPlan,
  type SearchPlan,
  type SearchStrategyPolicy,
} from "../search-strategy.js";
import type { RegistrySearchQuery } from "../types.js";

export function buildUccDebtorSearchPlan(input: {
  jurisdiction: RegistrySearchQuery["jurisdiction"];
  authoritativeDebtorName: string;
  aliases?: readonly string[];
  sourceIds?: readonly string[];
  allowedVariantKinds: SearchStrategyPolicy["allowedVariantKinds"];
  maxVariants?: number;
}): SearchPlan {
  return buildNameSearchPlan({
    purpose: "ucc-debtor-name-search",
    jurisdiction: input.jurisdiction,
    capability: "filing-search",
    sourceKind: "ucc-filing-office",
    seeds: [
      { name: input.authoritativeDebtorName, role: "authoritative" },
      ...(input.aliases ?? []).map((name) => ({ name, role: "alias" as const })),
    ],
    policy: {
      allowedVariantKinds: input.allowedVariantKinds,
      maxVariants: input.maxVariants ?? 12,
      requireAuthoritativeExact: true,
      requireCompleteResults: true,
      requiredSourceIds: input.sourceIds,
    },
  });
}

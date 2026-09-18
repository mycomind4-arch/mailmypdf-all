import { normalizeName } from "@mailmypdf/identity-capacity";
import { RegistryAdapterError } from "./errors.js";
import { RegistryAdapterRegistry } from "./adapter-registry.js";
import { assertRegistrySourceUsable } from "./source-policy.js";
import type {
  RegistryCapability,
  RegistrySearchQuery,
  RegistrySearchResult,
  RegistrySourceDescriptor,
  SearchCompleteness,
} from "./types.js";

export type SearchVariantKind =
  | "exact-authoritative"
  | "normalized-legal-form"
  | "base-name"
  | "middle-initial"
  | "alias"
  | "trade-name"
  | "user-supplied";

export interface SearchNameSeed {
  readonly name: string;
  readonly role:
    | "authoritative"
    | "alias"
    | "trade-name"
    | "user-supplied";
}

export interface SearchStrategyPolicy {
  readonly allowedVariantKinds: readonly SearchVariantKind[];
  readonly maxVariants: number;
  readonly requireAuthoritativeExact: boolean;
  readonly requireCompleteResults: boolean;
  readonly requiredSourceIds?: readonly string[] | undefined;
}

export interface SearchPlanStep {
  readonly id: string;
  readonly value: string;
  readonly variantKind: SearchVariantKind;
  readonly priority: number;
  readonly rationale: string;
}

export interface SearchPlan {
  readonly purpose: string;
  readonly jurisdiction: RegistrySearchQuery["jurisdiction"];
  readonly capability: RegistryCapability;
  readonly sourceKind?: RegistrySourceDescriptor["kind"] | undefined;
  readonly steps: readonly SearchPlanStep[];
  readonly policy: SearchStrategyPolicy;
  readonly warnings: readonly string[];
}

export interface SearchAttempt {
  readonly step: SearchPlanStep;
  readonly sourceId?: string | undefined;
  readonly status: "success" | "error" | "no-adapter";
  readonly result?: RegistrySearchResult | undefined;
  readonly errorCode?: string | undefined;
  readonly message?: string | undefined;
}

export interface SearchExecution {
  readonly plan: SearchPlan;
  readonly attempts: readonly SearchAttempt[];
  readonly completeness: SearchCompleteness;
  readonly totalRecords: number;
  readonly warnings: readonly string[];
  readonly executedAt: string;
}

export const SAFE_DEFAULT_SEARCH_POLICY: SearchStrategyPolicy = Object.freeze({
  allowedVariantKinds: [
    "exact-authoritative",
    "normalized-legal-form",
    "alias",
    "trade-name",
    "user-supplied",
  ],
  maxVariants: 12,
  requireAuthoritativeExact: true,
  requireCompleteResults: false,
});

function middleInitialForm(tokens: readonly string[]): string | null {
  if (tokens.length < 3) return null;
  const first = tokens[0];
  const last = tokens.at(-1);
  if (!first || !last) return null;
  const middle = tokens.slice(1, -1).map((token) => token.charAt(0).toUpperCase());
  if (middle.some((token) => !token)) return null;
  return [first, ...middle, last].join(" ");
}

function variantKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildNameSearchPlan(input: {
  purpose: string;
  jurisdiction: RegistrySearchQuery["jurisdiction"];
  seeds: readonly SearchNameSeed[];
  capability: RegistryCapability;
  sourceKind?: RegistrySourceDescriptor["kind"];
  policy?: SearchStrategyPolicy;
}): SearchPlan {
  const policy = input.policy ?? SAFE_DEFAULT_SEARCH_POLICY;
  if (!input.purpose.trim()) throw new Error("SEARCH_PURPOSE_REQUIRED");
  if (policy.maxVariants < 1 || !Number.isInteger(policy.maxVariants)) {
    throw new Error("SEARCH_MAX_VARIANTS_INVALID");
  }

  const steps: SearchPlanStep[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  function add(value: string | undefined, kind: SearchVariantKind, priority: number, rationale: string): void {
    if (!value?.trim()) return;
    if (!policy.allowedVariantKinds.includes(kind)) return;
    const key = variantKey(value);
    if (seen.has(key) || steps.length >= policy.maxVariants) return;
    seen.add(key);
    steps.push({
      id: `search-${steps.length + 1}`,
      value: value.trim(),
      variantKind: kind,
      priority,
      rationale,
    });
  }

  for (const seed of input.seeds) {
    const normalized = normalizeName(seed.name);

    if (seed.role === "authoritative") {
      add(seed.name, "exact-authoritative", 100, "Exact authoritative-name evidence is searched first.");
      add(
        normalized.legalForm,
        "normalized-legal-form",
        90,
        "Normalized legal form is a controlled comparison/search form, not a replacement legal name.",
      );
      add(
        normalized.primaryName,
        "base-name",
        55,
        "Organization designator/suffix-stripped form is discovery-only and must not be treated as the filing name.",
      );
      add(
        middleInitialForm(normalized.tokens),
        "middle-initial",
        45,
        "Middle-initial form is a broader personal-name discovery variant.",
      );
      add(
        normalized.tradeName,
        "trade-name",
        40,
        "Trade name is searched as a separate discovery identity, not as the legal entity name.",
      );
    } else if (seed.role === "alias") {
      add(seed.name, "alias", 60, "Known alias or alternate name supplied by evidence.");
    } else if (seed.role === "trade-name") {
      add(seed.name, "trade-name", 40, "Known trade name supplied by evidence.");
    } else {
      add(seed.name, "user-supplied", 30, "User-supplied search seed; requires corroboration.");
    }
  }

  steps.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  if (
    policy.requireAuthoritativeExact &&
    input.seeds.some((seed) => seed.role === "authoritative") &&
    !steps.some((step) => step.variantKind === "exact-authoritative")
  ) {
    warnings.push("Policy requires an exact authoritative-name search, but that variant kind is disabled.");
  }

  if (steps.length >= policy.maxVariants) {
    warnings.push(`Search variants were capped at ${policy.maxVariants}.`);
  }

  return {
    purpose: input.purpose,
    jurisdiction: input.jurisdiction,
    capability: input.capability,
    sourceKind: input.sourceKind,
    steps,
    policy,
    warnings,
  };
}

function combineCompleteness(values: readonly SearchCompleteness[]): SearchCompleteness {
  if (values.length === 0) return "unknown";
  if (values.every((value) => value === "complete")) return "complete";
  if (values.some((value) => value === "provider-limited")) return "provider-limited";
  if (values.some((value) => value === "partial")) return "partial";
  return "unknown";
}

export async function executeSearchPlan(input: {
  plan: SearchPlan;
  registry: RegistryAdapterRegistry;
}): Promise<SearchExecution> {
  const attempts: SearchAttempt[] = [];
  const warnings = [...input.plan.warnings];

  for (const step of input.plan.steps) {
    const query: RegistrySearchQuery = {
      queryId: `${input.plan.purpose}:${step.id}`,
      purpose: input.plan.purpose,
      jurisdiction: input.plan.jurisdiction,
      names: [step.value],
    };

    let adapters = input.registry.resolve(query, {
      capability: input.plan.capability,
      kind: input.plan.sourceKind,
    });

    if (input.plan.policy.requiredSourceIds?.length) {
      adapters = adapters.filter((adapter) =>
        input.plan.policy.requiredSourceIds!.includes(adapter.source.id),
      );

      for (const requiredSourceId of input.plan.policy.requiredSourceIds) {
        if (!adapters.some((adapter) => adapter.source.id === requiredSourceId)) {
          attempts.push({
            step,
            sourceId: requiredSourceId,
            status: "no-adapter",
            errorCode: "REQUIRED_SOURCE_UNAVAILABLE",
            message: `Required source ${requiredSourceId} did not resolve for this query.`,
          });
        }
      }
    }

    if (adapters.length === 0 && !input.plan.policy.requiredSourceIds?.length) {
      attempts.push({
        step,
        status: "no-adapter",
        errorCode: "NO_ADAPTER",
        message: "No registered adapter supports this search step.",
      });
      continue;
    }

    for (const adapter of adapters) {
      try {
        assertRegistrySourceUsable(adapter.source);
        const result = await adapter.search(query);
        attempts.push({
          step,
          sourceId: adapter.source.id,
          status: "success",
          result,
        });
      } catch (error) {
        const normalized = error instanceof RegistryAdapterError
          ? error
          : new RegistryAdapterError({
              code: "PROVIDER_UNAVAILABLE",
              message: error instanceof Error ? error.message : "Registry search failed.",
              retryable: true,
              sourceId: adapter.source.id,
              cause: error,
            });
        attempts.push({
          step,
          sourceId: adapter.source.id,
          status: "error",
          errorCode: normalized.code,
          message: normalized.message,
        });
      }
    }
  }

  const successful = attempts.filter((attempt) => attempt.status === "success" && attempt.result);
  let completeness = combineCompleteness(successful.map((attempt) => attempt.result!.completeness));

  const missing = attempts.some((attempt) => attempt.status !== "success");
  if (missing && completeness === "complete") completeness = "partial";

  if (
    input.plan.policy.requireCompleteResults &&
    successful.some((attempt) => attempt.result!.completeness !== "complete")
  ) {
    warnings.push("Search policy requires complete results, but at least one provider reported incomplete coverage.");
  }

  if (missing) {
    warnings.push("One or more planned search steps or required sources were not successfully executed.");
  }

  return {
    plan: input.plan,
    attempts,
    completeness,
    totalRecords: successful.reduce((sum, attempt) => sum + attempt.result!.records.length, 0),
    warnings: [...new Set(warnings)],
    executedAt: new Date().toISOString(),
  };
}

export function searchExecutionNoHitIsConclusive(execution: SearchExecution): boolean {
  if (execution.totalRecords !== 0) return false;
  if (execution.completeness !== "complete") return false;
  if (execution.attempts.length === 0) return false;
  return execution.attempts.every((attempt) =>
    attempt.status === "success" &&
    attempt.result?.completeness === "complete" &&
    attempt.result.warnings.length === 0,
  );
}

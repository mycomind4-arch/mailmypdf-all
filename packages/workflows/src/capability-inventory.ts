import {
  CAPABILITY_REGISTRY_VERSION,
  capabilityRegistry,
  type CapabilityCategory,
  type CapabilityCertificationState,
  type CapabilityId,
  type CapabilityRegistry,
  type CapabilityStatus,
} from "./capability-registry.js";
import {
  buildCapabilityPackageAdapters,
  validateCapabilityAdapters,
} from "./capability-adapters.js";

export type CapabilityInventoryGap = {
  capability: CapabilityId;
  gaps: readonly string[];
};

export type CapabilityInventory = {
  registryVersion: string;
  total: number;
  ids: readonly CapabilityId[];
  byStatus: Readonly<Record<CapabilityStatus, number>>;
  byCertification: Readonly<Record<CapabilityCertificationState, number>>;
  byCategory: Readonly<Record<CapabilityCategory, number>>;
  adapterPackages: readonly `@mailmypdf/${string}`[];
  implemented: readonly CapabilityId[];
  certified: readonly CapabilityId[];
  planned: readonly CapabilityId[];
  gaps: readonly CapabilityInventoryGap[];
  validationErrors: readonly string[];
};

const STATUSES: readonly CapabilityStatus[] = ["foundation", "partial", "implemented", "production"];
const CERTIFICATIONS: readonly CapabilityCertificationState[] = ["planned", "implemented", "certified"];
const CATEGORIES: readonly CapabilityCategory[] = ["identity", "documents", "intelligence", "ai", "workflow", "commerce", "fulfillment", "proof", "operations"];

function countBy<T extends string>(values: readonly T[], keys: readonly T[]): Readonly<Record<T, number>> {
  return Object.fromEntries(keys.map((key) => [key, values.filter((value) => value === key).length])) as Record<T, number>;
}

export function buildCapabilityInventory(
  registry: CapabilityRegistry = capabilityRegistry,
): CapabilityInventory {
  const definitions = registry.ids().map((id) => registry.getOrThrow(id));
  const gaps = definitions.map((definition): CapabilityInventoryGap => {
    const capabilityGaps = [
      ...definition.certification.gaps,
      ...(definition.runtimeBindings.some((binding) => binding.status === "implemented") ? [] : ["No implemented runtime binding."]),
      ...(definition.fixtures.some((fixture) => fixture.status === "present") ? [] : ["No present capability fixture."]),
      ...(definition.sources.some((source) => source.reviewState === "pending") ? ["An implementation source is awaiting review."] : []),
    ];
    return { capability: definition.id, gaps: [...new Set(capabilityGaps)] };
  }).filter((item) => item.gaps.length > 0);

  return {
    registryVersion: CAPABILITY_REGISTRY_VERSION,
    total: definitions.length,
    ids: definitions.map((definition) => definition.id),
    byStatus: countBy(definitions.map((definition) => definition.status), STATUSES),
    byCertification: countBy(definitions.map((definition) => definition.certification.state), CERTIFICATIONS),
    byCategory: countBy(definitions.map((definition) => definition.category), CATEGORIES),
    adapterPackages: buildCapabilityPackageAdapters(registry.definitions).map((adapter) => adapter.package),
    implemented: definitions.filter((definition) => definition.certification.state === "implemented").map((definition) => definition.id),
    certified: definitions.filter((definition) => definition.certification.state === "certified").map((definition) => definition.id),
    planned: definitions.filter((definition) => definition.certification.state === "planned").map((definition) => definition.id),
    gaps,
    validationErrors: [
      ...registry.audit().filter((issue) => issue.severity === "error").map((issue) => issue.message),
      ...validateCapabilityAdapters(registry),
    ],
  };
}

export function renderCapabilityInventoryMarkdown(
  registry: CapabilityRegistry = capabilityRegistry,
): string {
  const inventory = buildCapabilityInventory(registry);
  const lines = [
    "# Master Capability Registry Inventory",
    "",
    `Registry contract: \`${inventory.registryVersion}\``,
    "",
    `Registered: ${inventory.total}; certified: ${inventory.certified.length}; implemented: ${inventory.implemented.length}; planned: ${inventory.planned.length}.`,
    "",
    "| Capability | Status | Certification | Owner package | Runtime binding | Gaps |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  const gapsById = new Map(inventory.gaps.map((item) => [item.capability, item.gaps]));
  for (const id of registry.ids()) {
    const definition = registry.getOrThrow(id);
    const binding = definition.runtimeBindings.map((item) => `${item.package}${item.exportPath === "." ? "" : item.exportPath} (${item.status})`).join("<br>");
    lines.push(`| \`${id}\` | ${definition.status} | ${definition.certification.state} | \`${definition.implementation}\` | ${binding} | ${(gapsById.get(id) ?? []).join(" ") || "—"} |`);
  }
  lines.push(
    "",
    "## Registry validation",
    "",
    inventory.validationErrors.length === 0
      ? "The canonical contract, dependency graph, certification metadata, and package-adapter mapping are internally valid."
      : inventory.validationErrors.map((error) => `- ${error}`).join("\n"),
    "",
  );
  return lines.join("\n");
}

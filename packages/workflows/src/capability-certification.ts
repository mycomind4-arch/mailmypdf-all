import {
  CAPABILITIES,
  assertCapabilityDependencies,
  type CapabilityId,
} from "./capability-registry.js";
import type { WorkflowManifest } from "./workflow-manifest.js";

export type CapabilityCertificationIssue = {
  code:
    | "missing_dependency"
    | "capability_not_production"
    | "production_baseline_missing";
  capability?: CapabilityId;
  message: string;
};

export type WorkflowCapabilityCertification = {
  workflowId: string;
  declared: readonly CapabilityId[];
  required: readonly CapabilityId[];
  productionBaseline: readonly CapabilityId[];
  productionBaselineMissing: readonly CapabilityId[];
  nonProductionRequired: readonly CapabilityId[];
  dependencyErrors: readonly string[];
  issues: readonly CapabilityCertificationIssue[];
  productionReady: boolean;
};

export function productionBaselineFor(
  manifest: WorkflowManifest,
): readonly CapabilityId[] {
  const required = new Set<CapabilityId>([
    "identity",
    "matterState",
    "security",
    "resilience",
    "observability",
    "acceptanceTesting",
  ]);

  if (manifest.primaryInput === "document") {
    for (const id of [
      "secureUpload",
      "documentStorage",
      "documentScanning",
      "retention",
      "provenance",
    ] as const) required.add(id);
  }

  const declared = new Set([
    ...manifest.requiredCapabilities,
    ...manifest.optionalCapabilities,
  ]);

  if (
    declared.has("classification") ||
    declared.has("extraction") ||
    declared.has("draft") ||
    declared.has("research") ||
    declared.has("strategy") ||
    declared.has("visionAnalysis")
  ) required.add("aiExecution");

  if (declared.has("deadlines")) required.add("notifications");

  if (declared.has("mailing")) {
    for (const id of [
      "humanReview",
      "approval",
      "pdfGeneration",
      "packetAssembly",
      "addressVerification",
      "tracking",
      "proofAudit",
      "archive",
    ] as const) required.add(id);
  }

  if (declared.has("payment")) {
    required.add("pricing");
    required.add("approval");
  }

  return [...required];
}

export function certifyWorkflowCapabilities(
  manifest: WorkflowManifest,
): WorkflowCapabilityCertification {
  const declared = [
    ...new Set([
      ...manifest.requiredCapabilities,
      ...manifest.optionalCapabilities,
    ]),
  ];

  const dependencyErrors = assertCapabilityDependencies(declared);
  const nonProductionRequired = manifest.requiredCapabilities.filter(
    (id) => CAPABILITIES[id].status !== "production",
  );

  const productionBaseline = productionBaselineFor(manifest);
  const declaredSet = new Set(declared);
  const productionBaselineMissing = productionBaseline.filter(
    (id) => !declaredSet.has(id),
  );

  const issues: CapabilityCertificationIssue[] = [
    ...dependencyErrors.map((message) => ({
      code: "missing_dependency" as const,
      message,
    })),
    ...nonProductionRequired.map((capability) => ({
      code: "capability_not_production" as const,
      capability,
      message:
        `Required capability ${capability} is ${CAPABILITIES[capability].status}, not production.`,
    })),
  ];

  if (manifest.maturity === "production-verified") {
    for (const capability of productionBaselineMissing) {
      issues.push({
        code: "production_baseline_missing",
        capability,
        message:
          `Production workflow is missing baseline capability ${capability} (${CAPABILITIES[capability].implementation}).`,
      });
    }
  }

  return {
    workflowId: manifest.id,
    declared,
    required: [...manifest.requiredCapabilities],
    productionBaseline,
    productionBaselineMissing,
    nonProductionRequired,
    dependencyErrors,
    issues,
    productionReady:
      dependencyErrors.length === 0 &&
      nonProductionRequired.length === 0 &&
      productionBaselineMissing.length === 0,
  };
}

export type PlatformCapabilityHealth = {
  total: number;
  production: number;
  implemented: number;
  partial: number;
  foundation: number;
  nonProduction: readonly CapabilityId[];
};

export function platformCapabilityHealth(): PlatformCapabilityHealth {
  const ids = Object.keys(CAPABILITIES) as CapabilityId[];
  const byStatus = (status: "production" | "implemented" | "partial" | "foundation") =>
    ids.filter((id) => CAPABILITIES[id].status === status);

  const implemented = byStatus("implemented");
  const partial = byStatus("partial");
  const foundation = byStatus("foundation");

  return {
    total: ids.length,
    production: byStatus("production").length,
    implemented: implemented.length,
    partial: partial.length,
    foundation: foundation.length,
    nonProduction: [...implemented, ...partial, ...foundation],
  };
}

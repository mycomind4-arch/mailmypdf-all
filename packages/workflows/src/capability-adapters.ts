import {
  CAPABILITIES,
  capabilityRegistry,
  type CapabilityDefinition,
  type CapabilityId,
  type CapabilityRegistry,
  type CapabilityRuntimeBinding,
} from "./capability-registry.js";

export type CapabilityBoundRuntimeBinding = CapabilityRuntimeBinding & {
  capability: CapabilityId;
};

/** Runtime adapter inventory derived from the canonical definitions. Binding
 * metadata is deliberately not hand-copied here; capability-registry.ts is the
 * single source of truth consumed by both the compiler and runtime planner. */
export type CapabilityPackageAdapter = {
  package: `@mailmypdf/${string}`;
  capabilities: readonly CapabilityId[];
  bindings: readonly CapabilityBoundRuntimeBinding[];
  status: "implemented" | "planned";
};

/** Packages can contribute policy, data, or domain logic without being the
 * canonical executor for a capability. This preserves the real shared-package
 * architecture without pretending every contributor is a runtime binding. */
export type CapabilityPackageContribution = {
  package: `@mailmypdf/${string}`;
  capabilities: readonly CapabilityId[];
  role: "canonical-owner" | "supporting";
  notes?: string;
};

export const CAPABILITY_PACKAGE_CONTRIBUTIONS: readonly CapabilityPackageContribution[] = [
  { package: "@mailmypdf/capability-services", capabilities: ["secureSharing", "legalHold", "taxNoticeClassification", "taxDocumentExtraction", "taxDeadlineAnalysis", "taxResponse", "amortization", "translation", "templateSimilarity"], role: "canonical-owner" },
  { package: "@mailmypdf/identity-capacity", capabilities: ["identity"], role: "canonical-owner" },
  { package: "@mailmypdf/identity-capacity", capabilities: ["facts"], role: "supporting", notes: "Supplies party, role, capacity, and authority facts; @mailmypdf/intelligence owns the shared fact model." },
  { package: "@mailmypdf/jurisdiction-rules", capabilities: ["deadlines", "research", "perfectionAnalysis"], role: "supporting", notes: "Supplies versioned jurisdiction rules; analytical capabilities retain their canonical owners." },
  { package: "@mailmypdf/registry-adapters", capabilities: ["uccSearch", "titleLienSearch", "uccFiling"], role: "canonical-owner" },
  { package: "@mailmypdf/registry-adapters", capabilities: ["facts", "research"], role: "supporting" },
  { package: "@mailmypdf/secured-transactions", capabilities: ["dealStructure", "attachmentAnalysis", "perfectionAnalysis"], role: "canonical-owner" },
  { package: "@mailmypdf/secured-transactions", capabilities: ["facts", "requirements", "validation", "research"], role: "supporting" },
  { package: "@mailmypdf/security", capabilities: ["identity", "security"], role: "supporting", notes: "HTTP/auth primitives support the document and identity boundaries; it is not a parallel capability registry." },
  { package: "@mailmypdf/documents", capabilities: ["security", "secureUpload", "documentSourceImport", "documentStorage", "documentScanning", "retention", "piiDetection", "privacyRelease"], role: "canonical-owner" },
  { package: "@mailmypdf/document-intelligence", capabilities: ["classification", "extraction"], role: "canonical-owner" },
  { package: "@mailmypdf/ai", capabilities: ["aiExecution", "visionAnalysis", "draft"], role: "canonical-owner" },
  { package: "@mailmypdf/intelligence", capabilities: ["understand", "facts", "provenance", "timeline", "deadlines", "findings", "contradictions", "discrepancies", "requirements", "evidence", "research", "risk", "strategy", "draftProvenance"], role: "canonical-owner" },
  { package: "@mailmypdf/audit", capabilities: ["auditTrail"], role: "canonical-owner" },
  { package: "@mailmypdf/forms", capabilities: ["officialForms"], role: "canonical-owner" },
  { package: "@mailmypdf/workflows", capabilities: ["validation", "blockingGate", "humanReview", "approval", "resilience", "observability"], role: "canonical-owner" },
  { package: "@mailmypdf/step-workflow", capabilities: ["matterState"], role: "canonical-owner" },
  { package: "@mailmypdf/packet-builder", capabilities: ["pdfGeneration", "packetAssembly"], role: "canonical-owner" },
  { package: "@mailmypdf/signature", capabilities: ["signature"], role: "canonical-owner" },
  { package: "@mailmypdf/identity-verification", capabilities: ["identityVerification"], role: "canonical-owner" },
  { package: "@mailmypdf/notarization", capabilities: ["notarization"], role: "canonical-owner" },
  { package: "@mailmypdf/efiling", capabilities: ["efiling"], role: "canonical-owner" },
  { package: "@mailmypdf/pricing", capabilities: ["pricing"], role: "canonical-owner" },
  { package: "@mailmypdf/payment-fulfillment", capabilities: ["payment", "savedPayment", "mailing"], role: "canonical-owner" },
  { package: "@mailmypdf/fulfillment", capabilities: ["addressVerification", "scheduledMailing", "batchMailing", "tracking"], role: "canonical-owner" },
  { package: "@mailmypdf/mailing-client", capabilities: ["mailing", "tracking"], role: "supporting", notes: "Provider client used behind the canonical fulfillment/payment boundary." },
  { package: "@mailmypdf/notifications", capabilities: ["notifications"], role: "canonical-owner" },
  { package: "@mailmypdf/proof", capabilities: ["proofAudit", "archive"], role: "canonical-owner" },
  { package: "@mailmypdf/workflow-acceptance", capabilities: ["acceptanceTesting"], role: "canonical-owner" },
];

export function buildCapabilityPackageAdapters(
  definitions: Readonly<Record<CapabilityId, CapabilityDefinition>> = CAPABILITIES,
): readonly CapabilityPackageAdapter[] {
  const grouped = new Map<`@mailmypdf/${string}`, CapabilityBoundRuntimeBinding[]>();
  for (const definition of Object.values(definitions)) {
    for (const binding of definition.runtimeBindings) {
      const bindings = grouped.get(binding.package) ?? [];
      bindings.push({ ...binding, capability: definition.id });
      grouped.set(binding.package, bindings);
    }
  }

  return [...grouped.entries()].map(([packageName, bindings]) => ({
    package: packageName,
    capabilities: [...new Set(bindings.map((binding) => binding.capability))],
    bindings,
    status: bindings.some((binding) => binding.status === "implemented") ? "implemented" : "planned",
  }));
}

export const CAPABILITY_PACKAGE_ADAPTERS = buildCapabilityPackageAdapters();

export function adaptersForCapability(id: CapabilityId): readonly CapabilityPackageAdapter[] {
  return CAPABILITY_PACKAGE_ADAPTERS.filter((adapter) => adapter.capabilities.includes(id));
}

export function contributionsForCapability(id: CapabilityId): readonly CapabilityPackageContribution[] {
  return CAPABILITY_PACKAGE_CONTRIBUTIONS.filter((contribution) => contribution.capabilities.includes(id));
}

export function validateCapabilityAdapters(
  registry: CapabilityRegistry = capabilityRegistry,
): string[] {
  const errors: string[] = [];
  const adapters = buildCapabilityPackageAdapters(registry.definitions);

  for (const adapter of adapters) {
    const identities = new Set<string>();
    for (const binding of adapter.bindings) {
      const identity = `${binding.capability}:${binding.kind}:${binding.package}:${binding.exportPath}`;
      if (identities.has(identity)) errors.push(`duplicate capability binding ${identity}`);
      identities.add(identity);
      if (binding.package !== adapter.package) errors.push(`${binding.capability} binding package does not match adapter ${adapter.package}`);
      if (!registry.has(binding.capability)) errors.push(`${adapter.package} registers unknown capability ${binding.capability}`);
    }
  }

  for (const id of registry.ids()) {
    const definition = registry.getOrThrow(id);
    const bindings = adapters.flatMap((adapter) => adapter.bindings).filter((binding) => binding.capability === id);
    if (bindings.length === 0) errors.push(`${id} has no package adapter`);
    if (definition.certification.state !== "planned" && !bindings.some((binding) => binding.status === "implemented")) {
      errors.push(`${id} is ${definition.certification.state} without an implemented package binding`);
    }
    if (!bindings.some((binding) => binding.package === definition.implementation)) {
      errors.push(`${id} has no binding for canonical implementation ${definition.implementation}`);
    }
  }

  for (const contribution of CAPABILITY_PACKAGE_CONTRIBUTIONS) {
    for (const id of contribution.capabilities) {
      if (!registry.has(id)) errors.push(`${contribution.package} contributes unknown capability ${id}`);
      if (contribution.role === "canonical-owner" && registry.get(id)?.implementation !== contribution.package) {
        errors.push(`${contribution.package} claims canonical ownership of ${id}, owned by ${registry.get(id)?.implementation ?? "unknown"}`);
      }
    }
  }

  return [...new Set(errors)];
}

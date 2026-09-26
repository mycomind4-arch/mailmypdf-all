import type { CapabilityId, CapabilityRuntimeBinding } from "./capability-registry.js";

/** Package-level adapter inventory. This is intentionally metadata-only: the
 * package remains the owner of behavior, while the factory gets a canonical
 * way to discover what can be bound. */
export type CapabilityPackageAdapter = {
  package: `@mailmypdf/${string}`;
  capabilities: readonly CapabilityId[];
  bindings: readonly CapabilityRuntimeBinding[];
  status: "implemented" | "planned";
  notes?: string;
};

export const CAPABILITY_PACKAGE_ADAPTERS: readonly CapabilityPackageAdapter[] = [
  { package: "@mailmypdf/capability-services", capabilities: ["secureSharing", "legalHold", "taxNoticeClassification", "taxDocumentExtraction", "taxDeadlineAnalysis", "taxResponse", "amortization", "translation", "templateSimilarity"], bindings: [{ kind: "package-export", package: "@mailmypdf/capability-services", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/identity-capacity", capabilities: ["identity", "facts"], bindings: [{ kind: "package-export", package: "@mailmypdf/identity-capacity", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/jurisdiction-rules", capabilities: ["deadlines", "research"], bindings: [{ kind: "package-export", package: "@mailmypdf/jurisdiction-rules", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/registry-adapters", capabilities: ["research", "facts", "uccSearch"], bindings: [{ kind: "package-export", package: "@mailmypdf/registry-adapters", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/registry-adapters", capabilities: ["titleLienSearch", "uccFiling"], bindings: [{ kind: "adapter", package: "@mailmypdf/registry-adapters", exportPath: "./title-lien", status: "planned" }, { kind: "adapter", package: "@mailmypdf/registry-adapters", exportPath: "./ucc-search/filing", status: "planned" }], status: "planned", notes: "Provider/state filing adapters are not implemented; search evidence must not be treated as a filing or legal conclusion." },
  { package: "@mailmypdf/audit", capabilities: ["auditTrail"], bindings: [{ kind: "package-export", package: "@mailmypdf/audit", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/secured-transactions", capabilities: ["facts", "requirements", "validation", "research"], bindings: [{ kind: "package-export", package: "@mailmypdf/secured-transactions", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/security", capabilities: ["security"], bindings: [{ kind: "package-export", package: "@mailmypdf/security", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/documents", capabilities: ["secureUpload", "documentStorage", "documentScanning", "retention", "piiDetection", "privacyRelease"], bindings: [{ kind: "package-export", package: "@mailmypdf/documents", exportPath: ".", status: "implemented" }, { kind: "package-export", package: "@mailmypdf/documents", exportPath: "./privacy", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/document-intelligence", capabilities: ["classification", "extraction"], bindings: [{ kind: "package-export", package: "@mailmypdf/document-intelligence", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/ai", capabilities: ["aiExecution", "visionAnalysis", "draft"], bindings: [{ kind: "package-export", package: "@mailmypdf/ai", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/packet-builder", capabilities: ["pdfGeneration", "packetAssembly"], bindings: [{ kind: "package-export", package: "@mailmypdf/packet-builder", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/forms", capabilities: ["officialForms"], bindings: [{ kind: "package-export", package: "@mailmypdf/forms", exportPath: ".", status: "implemented" }], status: "implemented", notes: "Official government/agency form registry and required-form completeness checks against packet documents." },
  { package: "@mailmypdf/signature", capabilities: ["signature"], bindings: [{ kind: "package-export", package: "@mailmypdf/signature", exportPath: ".", status: "implemented" }], status: "implemented", notes: "Envelope/consent state machine and in-memory reference provider only; no live e-signature vendor is wired yet." },
  { package: "@mailmypdf/identity-verification", capabilities: ["identityVerification"], bindings: [{ kind: "package-export", package: "@mailmypdf/identity-verification", exportPath: ".", status: "implemented" }], status: "implemented", notes: "Verification-session state machine and in-memory reference provider only; no live KYC vendor is wired yet." },
  { package: "@mailmypdf/notarization", capabilities: ["notarization"], bindings: [{ kind: "package-export", package: "@mailmypdf/notarization", exportPath: ".", status: "implemented" }], status: "implemented", notes: "Notarization-session state machine and in-memory reference provider only; no live RON vendor is wired yet." },
  { package: "@mailmypdf/efiling", capabilities: ["efiling"], bindings: [{ kind: "package-export", package: "@mailmypdf/efiling", exportPath: ".", status: "implemented" }], status: "implemented", notes: "Filing-submission state machine and in-memory reference provider only; real e-filing needs an EFSP partnership, not just a vendor API key." },
  { package: "@mailmypdf/payment-fulfillment", capabilities: ["payment", "mailing"], bindings: [{ kind: "package-export", package: "@mailmypdf/payment-fulfillment", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/fulfillment", capabilities: ["addressVerification", "tracking"], bindings: [{ kind: "package-export", package: "@mailmypdf/fulfillment", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/mailing-client", capabilities: ["mailing", "tracking"], bindings: [{ kind: "package-export", package: "@mailmypdf/mailing-client", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/proof", capabilities: ["proofAudit", "archive"], bindings: [{ kind: "package-export", package: "@mailmypdf/proof", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/workflow-acceptance", capabilities: ["acceptanceTesting"], bindings: [{ kind: "package-export", package: "@mailmypdf/workflow-acceptance", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/step-workflow", capabilities: ["matterState"], bindings: [{ kind: "package-export", package: "@mailmypdf/step-workflow", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/notifications", capabilities: ["notifications"], bindings: [{ kind: "package-export", package: "@mailmypdf/notifications", exportPath: ".", status: "implemented" }], status: "implemented" },
  { package: "@mailmypdf/pricing", capabilities: ["pricing"], bindings: [{ kind: "package-export", package: "@mailmypdf/pricing", exportPath: ".", status: "implemented" }], status: "implemented" },
];

export function adaptersForCapability(id: CapabilityId): readonly CapabilityPackageAdapter[] {
  return CAPABILITY_PACKAGE_ADAPTERS.filter((adapter) => adapter.capabilities.includes(id));
}

export function validateCapabilityAdapters(): string[] {
  const errors: string[] = [];
  for (const adapter of CAPABILITY_PACKAGE_ADAPTERS) {
    for (const capability of adapter.capabilities) {
      if (adapter.status === "implemented" && !adapter.bindings.some((binding) => binding.status === "implemented")) {
        errors.push(`${adapter.package} registers ${capability} without an implemented binding`);
      }
    }
  }
  return errors;
}

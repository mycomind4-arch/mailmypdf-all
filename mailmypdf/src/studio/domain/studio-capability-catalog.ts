import { capabilityRegistry, type CapabilityDefinition } from "@mailmypdf/workflows";
import type { StudioExecutionMode } from "./studio-workflow";

/**
 * Studio is a consumer of the canonical capability registry, not a parallel
 * source of truth. An implemented package does NOT imply a Studio runner exists.
 */
export const studioRunnableEngines = [
  {
    id: "studio.name-normalization",
    label: "Name normalization and comparison",
    description: "Compare name forms without asserting legal identity.",
    packageName: "@mailmypdf/identity-capacity",
    category: "identity",
    exampleInput: { name: "Acme Limited Liability Company", compareTo: "ACME LLC" },
  },
  {
    id: "studio.source-authority",
    label: "Evidence source authority",
    description: "Rate the applicability of a source for a stated purpose and jurisdiction without treating a source as conclusive proof.",
    packageName: "@mailmypdf/identity-capacity",
    category: "identity",
    exampleInput: { source: { id: "source-1", sourceType: "official-registry-record", provenanceLevel: "external_source", jurisdiction: "CA" }, context: { purpose: "registered-organization-name", jurisdiction: "CA" } },
  },
  {
    id: "studio.authoritative-name",
    label: "Authoritative name evidence",
    description: "Compare proposed authoritative names and competing sources for a specific purpose.",
    packageName: "@mailmypdf/identity-capacity",
    category: "identity",
    exampleInput: { purpose: "registered-organization-name", candidates: [{ id: "name-1", rawName: "Example LLC", source: { id: "record-1", sourceType: "official-registry-record", provenanceLevel: "external_source" } }] },
  },
  {
    id: "studio.entity-classification",
    label: "Entity classification evidence",
    description: "Evaluate entity-type claims from supplied records with preserved uncertainty.",
    packageName: "@mailmypdf/identity-capacity",
    category: "identity",
    exampleInput: { signals: [{ id: "signal-1", proposedType: "registered-organization", source: { id: "record-1", sourceType: "official-registry-record", provenanceLevel: "external_source" } }] },
  },
  {
    id: "studio.capability-dependencies",
    label: "Workflow capability dependency resolver",
    description: "Resolve the existing registry dependencies and identify unsupported capability IDs before building a workflow.",
    packageName: "@mailmypdf/workflows",
    category: "workflow",
    exampleInput: { capabilityIds: ["evidence", "provenance", "timeline"] },
  },
  {
    id: "studio.recovery-scan",
    label: "Duplicate-payment evidence scan",
    description: "Screen user-supplied transactions for possible duplicate charges; no recovery entitlement is determined.",
    packageName: "@mailmypdf/intelligence",
    category: "intelligence",
    exampleInput: {
      transactions: [
        { id: "txn-1", accountId: "demo", merchant: "Example Vendor", amountMinor: 2599, currency: "USD", postedAt: "2026-09-01T12:00:00Z", state: "settled", kind: "debit" },
        { id: "txn-2", accountId: "demo", merchant: "Example Vendor", amountMinor: 2599, currency: "USD", postedAt: "2026-09-01T13:00:00Z", state: "settled", kind: "debit" },
      ],
    },
  },
  {
    id: "studio.exhibit-index",
    label: "Evidence exhibit index",
    description: "Organize source-linked exhibits for a report or packet without sending it.",
    packageName: "@mailmypdf/packet-builder",
    category: "documents",
    exampleInput: { items: [{ evidenceId: "doc-1", label: "Contract", pageRef: "1-3" }, { evidenceId: "doc-2", label: "Invoice", pageRef: "4" }] },
  },
  {
    id: "studio.secured-eligibility",
    label: "Secured-transaction readiness gates",
    description: "Assess submitted evidence against eligibility prerequisites; never determines legal enforceability or authorizes filing.",
    packageName: "@mailmypdf/secured-transactions",
    category: "intelligence",
    exampleInput: { evidence: { "identifiable-debtor": { status: "verified", sourceRefs: ["demo:contract:1"] }, "actual-obligation": { status: "unverified", sourceRefs: [] } } },
  },
] as const;

export type StudioEngineId = (typeof studioRunnableEngines)[number]["id"];

export type StudioCapabilityCatalogEntry = {
  id: string;
  label: string;
  description: string;
  category: string;
  mode: StudioExecutionMode;
  packageName: string;
  status: "foundation" | "partial" | "implemented" | "production" | "legacy";
  runnable: boolean;
  exampleInput?: Record<string, unknown>;
  requiresApproval: boolean;
};

function modeForDefinition(def: CapabilityDefinition): StudioExecutionMode {
  if (def.id === "humanReview" || def.id === "approval") return "human";
  if (def.consequential || def.security.requiresApproval ||
      def.security.externalEffects.some((effect) => effect !== "none" && effect !== "ai")) {
    return "external_service";
  }
  if (def.security.externalEffects.includes("ai")) return "ai_advisory";
  return "deterministic";
}

// Retain existing Studio draft identifiers for backward compatibility.
// These legacy names are descriptions, not executable package bindings.
const legacy: ReadonlyArray<Pick<StudioCapabilityCatalogEntry, "id" | "label" | "mode">> = [
  { id: "secure-ingest", label: "Secure document ingest (legacy)", mode: "deterministic" },
  { id: "fact-provenance", label: "Fact provenance (legacy)", mode: "deterministic" },
  { id: "authority-research", label: "Authority research (legacy)", mode: "ai_advisory" },
  { id: "evidence-analysis", label: "Evidence analysis (legacy)", mode: "ai_advisory" },
  { id: "risk-assessment", label: "Risk assessment (legacy)", mode: "ai_advisory" },
  { id: "draft-generation", label: "Draft generation (legacy)", mode: "ai_advisory" },
  { id: "draft-validation", label: "Draft validation (legacy)", mode: "deterministic" },
  { id: "owner-review", label: "Owner approval (legacy)", mode: "human" },
  { id: "stripe-checkout", label: "Stripe checkout (legacy)", mode: "external_service" },
  { id: "mailing-submit", label: "MailMyPDF fulfillment (legacy)", mode: "external_service" },
];

export const studioCapabilityCatalog: readonly StudioCapabilityCatalogEntry[] = Object.freeze([
  ...studioRunnableEngines.map((engine) => ({
    id: engine.id,
    label: engine.label,
    description: engine.description,
    category: engine.category,
    mode: "deterministic" as const,
    packageName: engine.packageName,
    status: "implemented" as const,
    runnable: true,
    exampleInput: engine.exampleInput as Record<string, unknown>,
    requiresApproval: false,
  })),
  ...capabilityRegistry.ids().map((id) => {
    const def = capabilityRegistry.getOrThrow(id);
    return {
      id: def.id,
      label: def.name,
      description: def.description,
      category: def.category,
      mode: modeForDefinition(def),
      packageName: def.implementation,
      status: def.status,
      runnable: false,
      requiresApproval: def.security.requiresApproval || def.consequential === true,
    };
  }),
  ...legacy.map((item) => ({
    ...item,
    description: "Legacy Studio draft identifier. No direct package executor is bound.",
    category: "legacy",
    packageName: "Studio compatibility",
    status: "legacy" as const,
    runnable: false,
    requiresApproval: item.mode === "external_service",
  })),
]);

export function findStudioCapability(id: string): StudioCapabilityCatalogEntry | undefined {
  return studioCapabilityCatalog.find((entry) => entry.id === id);
}

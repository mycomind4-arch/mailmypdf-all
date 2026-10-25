export type CapabilityOwner = "platform" | "vertical" | "hybrid";
/**
 * Capability maturity, from least to most evidence:
 * - foundation: the capability is declared and has a canonical package, but
 *   the implementation is a contract/stub only, or is materially incomplete.
 * - partial: real logic exists but is known to be missing a required piece
 *   (e.g. no tests yet, or a required production adapter is confirmed absent).
 * - implemented: the canonical package has real, working logic for this
 *   capability (dependencies resolve, tests exist where applicable), but
 *   there is no confirmed live production runtime/adapter binding yet — the
 *   deployment host has not wired this capability into a running system.
 * - production: implemented, AND there is confirmed evidence of a live
 *   production adapter/runtime binding, and — for consequential capabilities
 *   — the required safety gating (human review / blocking gate reachability)
 *   is in force, not merely declared.
 *
 * This field must never be assumed true by omission. Every capability
 * declares it explicitly (see the `capability()` helper below, which has no
 * default). Certification (capability-certification.ts) treats only
 * "production" as satisfying a production-workflow's required capabilities;
 * "implemented" is not silently accepted as production-ready.
 */
export type CapabilityStatus = "foundation" | "partial" | "implemented" | "production";
export type CapabilityCertificationState = "planned" | "implemented" | "certified";
export type CapabilityCompositionMode = "plan" | "execute" | "production";
export type CapabilityCategory =
  | "identity"
  | "documents"
  | "intelligence"
  | "ai"
  | "workflow"
  | "commerce"
  | "fulfillment"
  | "proof"
  | "operations";

export type CapabilityId =
  | "identity"
  | "matterState"
  | "security"
  | "secureUpload"
  | "documentSourceImport"
  | "documentStorage"
  | "documentScanning"
  | "officialForms"
  | "piiDetection"
  | "privacyRelease"
  | "secureSharing"
  | "legalHold"
  | "retention"
  | "classification"
  | "extraction"
  | "visionAnalysis"
  | "aiExecution"
  | "understand"
  | "facts"
  | "provenance"
  | "timeline"
  | "deadlines"
  | "findings"
  | "contradictions"
  | "discrepancies"
  | "requirements"
  | "evidence"
  | "auditTrail"
  | "uccSearch"
  | "titleLienSearch"
  | "identityVerification"
  | "research"
  | "risk"
  | "strategy"
  | "draft"
  | "draftProvenance"
  | "validation"
  | "blockingGate"
  | "humanReview"
  | "approval"
  | "signature"
  | "notarization"
  | "efiling"
  | "uccFiling"
  | "pdfGeneration"
  | "packetAssembly"
  | "pricing"
  | "payment"
  | "savedPayment"
  | "addressVerification"
  | "mailing"
  | "scheduledMailing"
  | "batchMailing"
  | "tracking"
  | "notifications"
  | "proofAudit"
  | "archive"
  | "resilience"
  | "observability"
  | "acceptanceTesting"
  | "taxNoticeClassification"
  | "taxDocumentExtraction"
  | "taxDeadlineAnalysis"
  | "taxResponse"
  | "dealStructure"
  | "amortization"
  | "attachmentAnalysis"
  | "perfectionAnalysis"
  | "translation"
  | "templateSimilarity";

/** JSON-Schema-shaped metadata kept deliberately structural so manifests can
 * be consumed by the factory without bringing a schema validator into the
 * shared workflow package. Runtime validators remain package-owned. */
export type CapabilitySchema = {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null" | "unknown";
  title?: string;
  description?: string;
  properties?: Readonly<Record<string, CapabilitySchema>>;
  items?: CapabilitySchema;
  required?: readonly string[];
  additionalProperties?: boolean;
  format?: string;
};

export type CapabilityRequirement =
  | { kind: "capability"; capability: CapabilityId; reason: string }
  | { kind: "security" | "configuration" | "jurisdiction" | "human"; key: string; reason: string };

export type CapabilitySecurityPosture = {
  dataClass: "public" | "account" | "matter" | "sensitive" | "regulated";
  reads: readonly string[];
  writes: readonly string[];
  externalEffects: readonly ("none" | "ai" | "payment" | "mailing" | "notification" | "registry")[];
  requiresOwnership: boolean;
  requiresApproval: boolean;
  failClosed: boolean;
};

export type CapabilityApplicability = {
  jurisdictions: readonly string[];
  domains: readonly string[];
  limitations: readonly string[];
};

export type CapabilityFailureMode = {
  code: string;
  behavior: "block" | "retry" | "warn" | "degrade";
  description: string;
};

export type CapabilityFixture = {
  id: string;
  kind: "unit" | "integration" | "acceptance";
  path: string;
  status: "present" | "missing";
};

export type CapabilityCertification = {
  state: CapabilityCertificationState;
  evidence: readonly string[];
  gaps: readonly string[];
  reviewedAt?: string;
};

export type CapabilityRuntimeBinding = {
  kind: "package-export" | "adapter" | "service";
  package: `@mailmypdf/${string}`;
  exportPath: string;
  status: "implemented" | "planned";
  notes?: string;
};

export type CapabilityImplementationSource = {
  origin: "workspace" | "public-repository" | "external-service";
  package: `@mailmypdf/${string}`;
  repository?: string;
  revision?: string;
  license?: string;
  reviewState: "not-required" | "pending" | "approved";
};

export type CapabilityDefinition = {
  id: CapabilityId;
  name: string;
  owner: CapabilityOwner;
  category: CapabilityCategory;
  description: string;
  /** Canonical package that owns the reusable implementation or contract. */
  implementation: `@mailmypdf/${string}`;
  status: CapabilityStatus;
  version: string;
  inputSchema: CapabilitySchema;
  outputSchema: CapabilitySchema;
  requirements: readonly CapabilityRequirement[];
  security: CapabilitySecurityPosture;
  applicability: CapabilityApplicability;
  failureModes: readonly CapabilityFailureMode[];
  fixtures: readonly CapabilityFixture[];
  certification: CapabilityCertification;
  runtimeBindings: readonly CapabilityRuntimeBinding[];
  /** Provenance for the implementation. Public code never becomes trusted by
   * merely appearing here; it must retain its immutable revision and review. */
  sources: readonly CapabilityImplementationSource[];
  /** Consequential capabilities must not run before explicit review/approval gates. */
  consequential?: boolean;
  dependencies?: readonly CapabilityId[];
};

const capability = (
  id: CapabilityId,
  name: string,
  owner: CapabilityOwner,
  category: CapabilityCategory,
  description: string,
  implementation: `@mailmypdf/${string}`,
  status: CapabilityStatus,
  extras: Partial<Pick<CapabilityDefinition, "consequential" | "dependencies" | "version" | "inputSchema" | "outputSchema" | "requirements" | "security" | "applicability" | "failureModes" | "fixtures" | "certification" | "runtimeBindings" | "sources">> = {},
): CapabilityDefinition => {
  const dependencies = extras.dependencies ?? [];
  const implemented = status === "implemented" || status === "production";
  const fixturePath = capabilityFixturePath(id, implementation);
  const fixtures = extras.fixtures ?? [{
    id: `${id}-contract`,
    kind: "unit" as const,
    path: fixturePath,
    status: implemented ? "present" as const : "missing" as const,
  }];
  const runtimeBindings = extras.runtimeBindings ?? [{
    kind: "package-export" as const,
    package: implementation,
    exportPath: ".",
    status: implemented ? "implemented" as const : "planned" as const,
  }];
  const externalEffects = defaultExternalEffects(id, category);
  const certification = extras.certification ?? {
    state: status === "production" ? "certified" as const : implemented ? "implemented" as const : "planned" as const,
    evidence: implemented
      ? [`fixture:${fixturePath}`, `binding:${implementation}#${runtimeBindings[0]?.exportPath ?? "."}`]
      : [],
    gaps: status === "production"
      ? []
      : implemented
        ? ["Live production binding and production certification are not recorded."]
        : ["Implementation, runtime binding, and certification evidence are incomplete."],
    reviewedAt: "2026-09-27",
  };

  return {
    id, name, owner, category, description, implementation, status,
    version: "1.0.0",
    inputSchema: {
      type: "object",
      title: `${name} input`,
      description: `Provider-neutral ${id} payload. Package-specific validation remains authoritative.`,
      additionalProperties: true,
    },
    outputSchema: {
      type: "object",
      title: `${name} output`,
      description: `Provider-neutral ${id} result. Package-specific validation remains authoritative.`,
      additionalProperties: true,
    },
    requirements: dependencies.map((dependency) => ({
      kind: "capability" as const,
      capability: dependency,
      reason: `${id} depends on ${dependency}.`,
    })),
    security: {
      dataClass: category === "documents" || category === "intelligence" || category === "ai" ? "sensitive" : "matter",
      reads: [], writes: [], externalEffects, requiresOwnership: true,
      requiresApproval: extras.consequential === true, failClosed: true,
    },
    applicability: { jurisdictions: ["unspecified"], domains: ["shared"], limitations: [] },
    failureModes: [
      { code: "CONTRACT_VIOLATION", behavior: "block", description: "Input, output, or policy validation failed." },
      { code: "BINDING_UNAVAILABLE", behavior: externalEffects.includes("none") ? "block" : "retry", description: "No healthy runtime binding is available." },
    ],
    fixtures,
    certification,
    runtimeBindings,
    sources: extras.sources ?? [{ origin: "workspace", package: implementation, reviewState: "not-required" }],
    consequential: extras.consequential,
    dependencies,
    ...extras,
  };
};

function defaultExternalEffects(
  id: CapabilityId,
  category: CapabilityCategory,
): CapabilitySecurityPosture["externalEffects"] {
  if (id === "payment") return ["payment"];
  if (["mailing", "tracking", "addressVerification"].includes(id)) return ["mailing"];
  if (id === "notifications") return ["notification"];
  if (["uccSearch", "titleLienSearch", "uccFiling", "efiling", "research"].includes(id)) return ["registry"];
  if (category === "ai") return ["ai"];
  return ["none"];
}

const PACKAGE_FIXTURES: Readonly<Record<string, string>> = {
  "@mailmypdf/ai": "packages/ai/tests/document-disclosure.test.ts",
  "@mailmypdf/audit": "packages/audit/tests/audit.test.ts",
  "@mailmypdf/capability-services": "packages/capability-services/tests/capability-services.test.ts",
  "@mailmypdf/document-intelligence": "packages/document-intelligence/tests/extraction-schema.test.ts",
  "@mailmypdf/documents": "packages/documents/tests/secure-lifecycle.test.ts",
  "@mailmypdf/efiling": "packages/efiling/tests/efiling.test.ts",
  "@mailmypdf/forms": "packages/forms/tests/forms.test.ts",
  "@mailmypdf/fulfillment": "packages/fulfillment/tests/fulfillment.test.ts",
  "@mailmypdf/identity-capacity": "packages/identity-capacity/tests/name-capacity-certification.test.ts",
  "@mailmypdf/identity-verification": "packages/identity-verification/tests/identity-verification.test.ts",
  "@mailmypdf/intelligence": "packages/intelligence/tests/cross-vertical.test.ts",
  "@mailmypdf/notarization": "packages/notarization/tests/notarization.test.ts",
  "@mailmypdf/notifications": "packages/notifications/tests/notifications.test.ts",
  "@mailmypdf/packet-builder": "packages/packet-builder/tests/packet-builder.test.ts",
  "@mailmypdf/payment-fulfillment": "packages/payment-fulfillment/tests/approved-checkout.test.ts",
  "@mailmypdf/pricing": "packages/pricing/tests/pricing-engine.test.ts",
  "@mailmypdf/proof": "packages/proof/tests/proof.test.ts",
  "@mailmypdf/registry-adapters": "packages/registry-adapters/tests/ucc-search.test.ts",
  "@mailmypdf/secured-transactions": "packages/secured-transactions/tests/attachment-readiness.test.ts",
  "@mailmypdf/signature": "packages/signature/tests/signature.test.ts",
  "@mailmypdf/step-workflow": "packages/step-workflow/src/step-workflow.test.ts",
  "@mailmypdf/workflow-acceptance": "appeal-mail/tests/acceptance/appeal-denied-claim/run.acceptance.ts",
  "@mailmypdf/workflows": "packages/workflows/tests/capability-runtime.test.ts",
};

function capabilityFixturePath(
  id: CapabilityId,
  implementation: `@mailmypdf/${string}`,
): string {
  if (id === "piiDetection") return "packages/documents/tests/pii-detection.test.ts";
  if (id === "privacyRelease") return "packages/documents/tests/privacy-release-review.test.ts";
  if (id === "titleLienSearch") return "packages/registry-adapters/tests/title-lien-search.test.ts";
  if (id === "uccFiling") return "packages/registry-adapters/tests/ucc-filing.test.ts";
  return PACKAGE_FIXTURES[implementation] ?? `packages/${implementation.replace("@mailmypdf/", "")}/tests`;
}

export const CAPABILITIES: Readonly<Record<CapabilityId, CapabilityDefinition>> = {
  // The following capabilities previously had no explicit status argument
  // and silently defaulted to "production" — never deliberately reviewed.
  // Reassigned to "implemented": their canonical packages exist and (per
  // available evidence — the packages build, and dependents such as
  // @mailmypdf/identity-capacity's 61-test suite exercise @mailmypdf/intelligence
  // and @mailmypdf/ai transitively) contain real logic, but no shared package
  // yet exposes a confirmed live production runtime/adapter binding for them
  // (there is still no deployed /api/workflow-runtime host wiring any of
  // this into a running system) — so "production" was not evidence-based.
  identity: capability("identity", "Identity / Authorization", "platform", "identity", "Canonical MailMyPDF identity, ownership, entitlement, and access boundaries.", "@mailmypdf/identity-capacity", "implemented"),
  matterState: capability("matterState", "Matter State", "platform", "workflow", "Durable workflow/matter state, optimistic concurrency, resume, and ownership.", "@mailmypdf/step-workflow", "implemented"),
  security: capability("security", "Security Boundary", "platform", "documents", "Authorization, safe intake, tenant isolation, input validation, and disclosure controls.", "@mailmypdf/documents", "implemented"),
  secureUpload: capability("secureUpload", "Secure Upload", "platform", "documents", "Validated consented document intake into quarantine before processing.", "@mailmypdf/documents", "production", { dependencies: ["security"] }),
  documentSourceImport: capability("documentSourceImport", "Document Source Import", "platform", "documents", "Normalize user-authorized local, conversation, Google Drive, MailMyPDF library, and provider document references into one secure intake provenance contract.", "@mailmypdf/documents", "implemented", {
    dependencies: ["secureUpload", "documentStorage", "documentScanning"],
    security: { dataClass: "sensitive", reads: ["user-authorized source metadata"], writes: ["document provenance"], externalEffects: ["none"], requiresOwnership: true, requiresApproval: false, failClosed: true },
    fixtures: [{ id: "documentSourceImport-contract", kind: "unit", path: "packages/documents/tests/document-source.test.ts", status: "present" }],
    runtimeBindings: [{ kind: "package-export", package: "@mailmypdf/documents", exportPath: "./document-source", status: "implemented" }],
  }),
  documentStorage: capability("documentStorage", "Document Storage", "platform", "documents", "Private object storage, ownership-safe paths, signed retrieval, hashes, and deletion.", "@mailmypdf/documents", "production", { dependencies: ["security"] }),
  documentScanning: capability("documentScanning", "Document Scanning", "platform", "documents", "Malware and structural scanning before a document becomes disclosable.", "@mailmypdf/documents", "production", { dependencies: ["secureUpload", "documentStorage"] }),
  officialForms: capability("officialForms", "Official Form Registry", "platform", "documents", "Versioned official-form definitions, source provenance, signatures, and completeness rules.", "@mailmypdf/forms", "implemented"),
  privacyRelease: capability("privacyRelease", "Privacy Release Review", "platform", "documents", "Human-reviewed retain, redact, or exclude decisions before disclosure or template reuse.", "@mailmypdf/documents", "implemented", { dependencies: ["piiDetection", "documentStorage", "humanReview", "blockingGate"] }),
  secureSharing: capability("secureSharing", "Secure Artifact Sharing", "platform", "documents", "Scoped, expiring, revocable artifact sharing with access audit.", "@mailmypdf/capability-services", "implemented", { dependencies: ["security", "documentStorage", "auditTrail"] }),
  legalHold: capability("legalHold", "Legal Hold", "platform", "documents", "Suspend deletion for an authorized matter or evidence set with release history.", "@mailmypdf/capability-services", "implemented", { dependencies: ["retention", "auditTrail"] }),
  retention: capability("retention", "Retention / Deletion", "platform", "documents", "Retention policy, deletion requests, purge jobs, and tombstones.", "@mailmypdf/documents", "production", { dependencies: ["documentStorage"] }),
  classification: capability("classification", "Domain Classification", "hybrid", "intelligence", "Classify source material using reusable document intelligence plus domain rules.", "@mailmypdf/document-intelligence", "implemented"),
  extraction: capability("extraction", "Structured Extraction", "hybrid", "intelligence", "Extract page-aware text and structured values from source material.", "@mailmypdf/document-intelligence", "implemented"),
  visionAnalysis: capability("visionAnalysis", "Vision / Scanned Document Analysis", "platform", "ai", "Analyze image and scanned-document content through the secure multimodal AI boundary.", "@mailmypdf/ai", "production", { dependencies: ["documentScanning", "aiExecution"] }),
  aiExecution: capability("aiExecution", "Secure AI Execution", "platform", "ai", "Provider routing, schema validation, provenance, prompt versioning, fallback, and disclosure safety.", "@mailmypdf/ai", "implemented"),
  understand: capability("understand", "Document Understanding", "hybrid", "intelligence", "Convert extraction into a structured understanding of the document and matter.", "@mailmypdf/intelligence", "production", { dependencies: ["extraction"] }),
  facts: capability("facts", "Fact Model", "platform", "intelligence", "Normalize, verify, dispute, supersede, and source material facts.", "@mailmypdf/intelligence", "production", { dependencies: ["provenance"] }),
  provenance: capability("provenance", "Source Provenance", "platform", "intelligence", "Attach material facts, findings, drafts, and actions to source evidence.", "@mailmypdf/intelligence", "implemented"),
  timeline: capability("timeline", "Timeline", "platform", "intelligence", "Chronology, event normalization, duplicate detection, and gap analysis.", "@mailmypdf/intelligence", "implemented"),
  deadlines: capability("deadlines", "Deadline Engine", "hybrid", "intelligence", "Derive and validate deadlines from sources and authoritative rules.", "@mailmypdf/intelligence", "implemented"),
  findings: capability("findings", "Findings", "hybrid", "intelligence", "Domain-specific factual findings and requirement detection.", "@mailmypdf/intelligence", "implemented"),
  contradictions: capability("contradictions", "Contradiction Detection", "platform", "intelligence", "Cross-document and intra-document contradiction analysis.", "@mailmypdf/intelligence", "implemented"),
  discrepancies: capability("discrepancies", "Discrepancy Detection", "platform", "intelligence", "Identify mismatches between source claims, facts, requirements, and evidence.", "@mailmypdf/intelligence", "implemented"),
  requirements: capability("requirements", "Requirements Analysis", "hybrid", "intelligence", "Map source/domain requirements to case evidence and response obligations.", "@mailmypdf/intelligence", "implemented"),
  evidence: capability("evidence", "Evidence", "platform", "intelligence", "Evidence organization, sufficiency, linkage, missing-item detection, and traceability.", "@mailmypdf/intelligence", "implemented"),
  auditTrail: capability("auditTrail", "Audit Trail", "platform", "proof", "Durable actor, access, decision, and external-effect audit events.", "@mailmypdf/audit", "implemented", { dependencies: ["provenance"] }),
  uccSearch: capability("uccSearch", "UCC Search", "hybrid", "intelligence", "Provider-neutral UCC search, normalization, coverage, and source provenance.", "@mailmypdf/registry-adapters", "implemented", { dependencies: ["identity", "provenance"], applicability: { jurisdictions: ["unspecified"], domains: ["creative-finance", "secured-transactions"], limitations: ["Search results are evidence, not a filing or legal conclusion."] } }),
  titleLienSearch: capability("titleLienSearch", "Title and Lien Search", "hybrid", "intelligence", "Normalize title, lien, judgment, tax, and encumbrance evidence without making a legal conclusion.", "@mailmypdf/registry-adapters", "foundation", { dependencies: ["identity", "provenance"], applicability: { jurisdictions: ["unspecified"], domains: ["creative-finance", "property"], limitations: ["A provider contract exists, but no reviewed jurisdictional provider is registered."] } }),
  research: capability("research", "Authority / Research", "hybrid", "intelligence", "Ground rules and authoritative sources when a workflow requires external authority.", "@mailmypdf/intelligence", "implemented"),
  risk: capability("risk", "Risk Assessment", "platform", "intelligence", "Assess supported strength, uncertainty, readiness, and consequential risk.", "@mailmypdf/intelligence", "implemented"),
  strategy: capability("strategy", "Case Strategy", "hybrid", "intelligence", "Translate verified facts and domain rules into case-specific next actions.", "@mailmypdf/intelligence", "implemented"),
  draft: capability("draft", "Grounded Drafting", "platform", "ai", "Generate correspondence constrained by verified case state and source material.", "@mailmypdf/ai", "production", { dependencies: ["aiExecution", "facts", "provenance"] }),
  draftProvenance: capability("draftProvenance", "Draft Provenance", "platform", "intelligence", "Trace material draft claims back to structured facts and sources.", "@mailmypdf/intelligence", "implemented"),
  validation: capability("validation", "Validation", "platform", "workflow", "Validate facts, requirements, documents, recipients, packet state, and draft integrity.", "@mailmypdf/workflows", "implemented"),
  blockingGate: capability("blockingGate", "Blocking Gate", "platform", "workflow", "Prevent consequential action while critical requirements remain unresolved.", "@mailmypdf/workflows", "implemented"),
  humanReview: capability("humanReview", "Human Review", "platform", "workflow", "Require explicit review before consequential action.", "@mailmypdf/workflows", "implemented"),
  approval: capability("approval", "Approval", "hybrid", "workflow", "Role- or policy-based explicit approval for consequential transitions.", "@mailmypdf/workflows", "production", { consequential: true, dependencies: ["humanReview", "blockingGate"] }),
  uccFiling: capability("uccFiling", "UCC Filing", "hybrid", "fulfillment", "Prepare and submit authorized UCC filings where a supported filing adapter exists.", "@mailmypdf/registry-adapters", "foundation", { consequential: true, dependencies: ["uccSearch", "signature", "humanReview", "blockingGate", "auditTrail"], applicability: { jurisdictions: ["unspecified"], domains: ["creative-finance", "secured-transactions"], limitations: ["A provider-neutral contract exists, but no reviewed filing-office provider is registered."] } }),
  pdfGeneration: capability("pdfGeneration", "PDF Generation", "platform", "documents", "Generate printable deterministic PDFs from approved content.", "@mailmypdf/packet-builder", "implemented"),
  packetAssembly: capability("packetAssembly", "Packet Assembly", "platform", "documents", "Merge the approved response and selected supporting documents into the exact mail-ready packet.", "@mailmypdf/packet-builder", "production", { dependencies: ["pdfGeneration"] }),
  identityVerification: capability("identityVerification", "Identity Verification", "platform", "documents", "Provider-neutral identity proofing (document/database/biometric checks) confirming a matter party is who they claim to be, distinct from platform auth/ownership.", "@mailmypdf/identity-verification", "implemented"),
  signature: capability("signature", "Electronic Signature", "platform", "documents", "Provider-neutral electronic signature capture, affirmative consent, and completion state bound to a specific document hash.", "@mailmypdf/signature", "implemented", { dependencies: ["documentStorage"] }),
  notarization: capability("notarization", "Remote Online Notarization", "platform", "fulfillment", "Provider-neutral notarized-signature session requiring prior identity verification before a notary attests a signature.", "@mailmypdf/notarization", "implemented", { consequential: true, dependencies: ["identityVerification", "humanReview", "blockingGate"] }),
  efiling: capability("efiling", "Electronic Court/Agency Filing", "platform", "fulfillment", "Provider-neutral direct electronic filing submission to a court or agency, as an alternative fulfillment path to physical mailing.", "@mailmypdf/efiling", "implemented", { consequential: true, dependencies: ["packetAssembly", "approval", "humanReview", "blockingGate"] }),
  piiDetection: capability("piiDetection", "PII Detection", "hybrid", "documents", "Automatic detection of sensitive personal data spans feeding the existing privacy release/redaction review before a document may be disclosed or reused as a template.", "@mailmypdf/documents", "implemented", { dependencies: ["documentStorage"], applicability: { jurisdictions: ["unspecified"], domains: ["shared"], limitations: ["Detection produces review findings; it does not authorize disclosure or silently redact source files."] } }),
  pricing: capability("pricing", "Server-authoritative Pricing", "platform", "commerce", "Deterministic workflow and mailing quotes controlled by the server.", "@mailmypdf/pricing", "implemented"),
  payment: capability("payment", "Payment", "platform", "commerce", "Stripe/payment intent state and immutable approved-artifact payment boundary.", "@mailmypdf/payment-fulfillment", "production", { consequential: true, dependencies: ["pricing", "approval"] }),
  savedPayment: capability("savedPayment", "Saved Payment Authorization", "platform", "commerce", "Use a server-held tokenized payment method only after explicit authorization bound to the current approved packet and price ceiling.", "@mailmypdf/payment-fulfillment", "implemented", {
    consequential: true,
    dependencies: ["payment", "resilience"],
    security: { dataClass: "account", reads: ["tokenized payment readiness", "approved mailing identity"], writes: ["payment authorization result"], externalEffects: ["payment"], requiresOwnership: true, requiresApproval: true, failClosed: true },
    fixtures: [{ id: "savedPayment-contract", kind: "unit", path: "packages/payment-fulfillment/tests/saved-payment.test.ts", status: "present" }],
    runtimeBindings: [{ kind: "package-export", package: "@mailmypdf/payment-fulfillment", exportPath: "./saved-payment", status: "implemented" }],
  }),
  addressVerification: capability("addressVerification", "Address Verification", "platform", "fulfillment", "Normalize and verify recipient/sender postal addresses before submission.", "@mailmypdf/fulfillment", "production"),
  mailing: capability("mailing", "Authorized Mailing", "platform", "fulfillment", "Idempotent physical-mail submission of the exact approved packet.", "@mailmypdf/payment-fulfillment", "production", { consequential: true, dependencies: ["packetAssembly", "addressVerification", "approval"] }),
  scheduledMailing: capability("scheduledMailing", "Scheduled Mailing", "platform", "fulfillment", "Release an immutable approved mailing at a future send time only while packet, approval, address, payment, and approved price-ceiling gates remain current.", "@mailmypdf/fulfillment", "implemented", {
    consequential: true,
    dependencies: ["mailing", "pricing", "resilience"],
    security: { dataClass: "matter", reads: ["approved mailing snapshot", "current quote", "payment readiness"], writes: ["scheduled mailing state"], externalEffects: ["mailing"], requiresOwnership: true, requiresApproval: true, failClosed: true },
    fixtures: [{ id: "scheduledMailing-contract", kind: "unit", path: "packages/fulfillment/tests/mailing-schedule.test.ts", status: "present" }],
    runtimeBindings: [{ kind: "package-export", package: "@mailmypdf/fulfillment", exportPath: "./mailing-schedule", status: "implemented" }],
  }),
  batchMailing: capability("batchMailing", "Batch Mailing", "platform", "fulfillment", "Represent one approved mailing operation spanning multiple independently addressable pieces, including identical and personalized packet modes.", "@mailmypdf/fulfillment", "implemented", {
    consequential: true,
    dependencies: ["mailing", "pricing", "resilience"],
    security: { dataClass: "matter", reads: ["recipient set", "approved packet identities", "server-authoritative pricing"], writes: ["batch mailing manifest"], externalEffects: ["mailing"], requiresOwnership: true, requiresApproval: true, failClosed: true },
    fixtures: [{ id: "batchMailing-contract", kind: "unit", path: "packages/fulfillment/tests/mailing-batch.test.ts", status: "present" }],
    runtimeBindings: [{ kind: "package-export", package: "@mailmypdf/fulfillment", exportPath: "./mailing-batch", status: "implemented" }],
  }),
  tracking: capability("tracking", "Tracking", "platform", "fulfillment", "Normalize provider tracking state and retain delivery events.", "@mailmypdf/fulfillment", "production", { dependencies: ["mailing"] }),
  notifications: capability("notifications", "Notifications / Reminders", "platform", "operations", "Idempotent transactional notifications and deadline/action reminders.", "@mailmypdf/notifications", "production"),
  proofAudit: capability("proofAudit", "Proof / Audit", "platform", "proof", "Durable artifacts, custody, mailing events, hashes, and proof records.", "@mailmypdf/proof", "production", { dependencies: ["provenance"] }),
  archive: capability("archive", "Matter Archive", "platform", "proof", "Final immutable matter archive containing source, generated, packet, payment, tracking, and proof artifacts.", "@mailmypdf/proof", "production", { dependencies: ["proofAudit"] }),
  resilience: capability("resilience", "Execution Resilience", "platform", "operations", "Idempotency, bounded retries, replay-safe external actions, and recovery semantics.", "@mailmypdf/workflows", "implemented"),
  observability: capability("observability", "Workflow Observability", "platform", "operations", "Privacy-safe workflow telemetry, diagnostics, and execution health.", "@mailmypdf/workflows", "implemented"),
  acceptanceTesting: capability("acceptanceTesting", "Workflow Acceptance Testing", "platform", "operations", "Synthetic end-to-end tests with mock Stripe/Lob and production PDF primitives.", "@mailmypdf/workflow-acceptance", "production"),
  taxNoticeClassification: capability("taxNoticeClassification", "Tax Notice Classification", "hybrid", "intelligence", "Classify IRS notices into supported notice families, stated issues, response windows, and evidence needs.", "@mailmypdf/capability-services", "implemented", { dependencies: ["classification", "officialForms", "deadlines", "provenance"], applicability: { jurisdictions: ["US-federal"], domains: ["tax", "irs"], limitations: ["Only registered notice families are supported."] } }),
  taxDocumentExtraction: capability("taxDocumentExtraction", "Tax Document Extraction", "hybrid", "intelligence", "Extract tax-year, taxpayer, payer, amounts, withholding, and form identifiers with source linkage.", "@mailmypdf/capability-services", "implemented", { dependencies: ["extraction", "provenance"], applicability: { jurisdictions: ["US-federal"], domains: ["tax", "irs"], limitations: ["Extracted values require source linkage and confirmation before consequential use."] } }),
  taxDeadlineAnalysis: capability("taxDeadlineAnalysis", "Tax Deadline Analysis", "hybrid", "intelligence", "Derive IRS response and appeal deadlines from notice dates, receipt evidence, and authoritative rules.", "@mailmypdf/capability-services", "implemented", { dependencies: ["deadlines", "research", "provenance"], applicability: { jurisdictions: ["US-federal"], domains: ["tax", "irs"], limitations: ["Uncertain trigger dates or authority coverage block definitive deadline claims."] } }),
  taxResponse: capability("taxResponse", "Tax Response Packet", "hybrid", "documents", "Assemble a reviewed IRS response with grounded facts, forms, evidence, and mailing proof.", "@mailmypdf/capability-services", "implemented", { dependencies: ["taxNoticeClassification", "taxDocumentExtraction", "validation", "packetAssembly", "humanReview"], applicability: { jurisdictions: ["US-federal"], domains: ["tax", "irs"], limitations: ["Human review remains mandatory; the capability does not provide tax advice."] } }),
  dealStructure: capability("dealStructure", "Creative Finance Deal Structure", "hybrid", "intelligence", "Represent seller financing, lease option, land contract, subject-to, wraparound, and private-loan structures.", "@mailmypdf/secured-transactions", "implemented", { dependencies: ["identity", "facts", "research"], applicability: { jurisdictions: ["unspecified"], domains: ["creative-finance", "secured-transactions"], limitations: ["The structure is an analytical model, not a legal conclusion or closing authorization."] } }),
  amortization: capability("amortization", "Amortization and Scenario Analysis", "platform", "intelligence", "Deterministically calculate payment schedules, interest, principal, balloons, and payoff scenarios.", "@mailmypdf/capability-services", "implemented", { dependencies: ["dealStructure"], applicability: { jurisdictions: ["unspecified"], domains: ["creative-finance", "secured-transactions"], limitations: ["Calculations depend on the confirmed terms supplied to the engine."] } }),
  attachmentAnalysis: capability("attachmentAnalysis", "Attachment Analysis", "hybrid", "intelligence", "Analyze obligation, value, rights in collateral, and authenticated agreement facts.", "@mailmypdf/secured-transactions", "implemented", { dependencies: ["dealStructure", "facts", "provenance"], applicability: { jurisdictions: ["unspecified"], domains: ["creative-finance", "secured-transactions"], limitations: ["Unsupported or disputed facts remain unresolved and block certification."] } }),
  perfectionAnalysis: capability("perfectionAnalysis", "Perfection Analysis", "hybrid", "intelligence", "Map filing, possession, control, and other perfection steps to collateral and jurisdiction.", "@mailmypdf/secured-transactions", "implemented", { dependencies: ["attachmentAnalysis", "research", "uccSearch"], applicability: { jurisdictions: ["unspecified"], domains: ["creative-finance", "secured-transactions"], limitations: ["Jurisdiction-specific authority and current registry evidence are required."] } }),
  translation: capability("translation", "Translation and Localization", "hybrid", "documents", "Prepare translated drafts while preserving source text, review status, and uncertainty.", "@mailmypdf/capability-services", "implemented", { dependencies: ["provenance", "humanReview"] }),
  templateSimilarity: capability("templateSimilarity", "Template Similarity and Deduplication", "platform", "operations", "Detect near-duplicate workflow templates before publication.", "@mailmypdf/capability-services", "implemented", { dependencies: ["privacyRelease", "provenance"] }),
};

export const CAPABILITY_REGISTRY_VERSION = "2.0.0";
export const capabilityIds = Object.keys(CAPABILITIES) as CapabilityId[];

export type CapabilityQuery = {
  ids?: readonly string[];
  category?: CapabilityCategory;
  owner?: CapabilityOwner;
  status?: CapabilityStatus;
  certification?: CapabilityCertificationState;
  domain?: string;
  jurisdiction?: string;
  consequential?: boolean;
};

export type CapabilityCompositionRequest = {
  required: readonly string[];
  optional?: readonly string[];
  notApplicable?: readonly string[];
  jurisdiction?: string;
  domain?: string;
  mode?: CapabilityCompositionMode;
  /** Exact or caret semantic-version requirements keyed by capability ID. */
  versionRequirements?: Readonly<Record<string, string>>;
  /** Non-capability requirement keys already satisfied by the host. These are
   * enforced for execute/production composition, never guessed by the factory. */
  satisfiedRequirements?: readonly string[];
};

export type CapabilityRegistryIssueCode =
  | "INVALID_DEFINITION"
  | "UNKNOWN_DEPENDENCY"
  | "DEPENDENCY_CYCLE"
  | "MISSING_GATE_DEPENDENCY"
  | "INVALID_CERTIFICATION"
  | "INVALID_BINDING"
  | "INVALID_FIXTURE"
  | "INVALID_SOURCE"
  | "UNKNOWN_CAPABILITY"
  | "VERSION_INCOMPATIBLE"
  | "NOT_APPLICABLE"
  | "UNSUPPORTED_DOMAIN"
  | "UNSUPPORTED_JURISDICTION"
  | "UNSATISFIED_REQUIREMENT"
  | "CAPABILITY_NOT_IMPLEMENTED"
  | "CAPABILITY_NOT_CERTIFIED"
  | "RUNTIME_BINDING_UNAVAILABLE";

export type CapabilityRegistryIssue = {
  code: CapabilityRegistryIssueCode;
  severity: "error" | "warning";
  capability?: CapabilityId;
  message: string;
};

export type CapabilityComposition = {
  mode: CapabilityCompositionMode;
  requested: readonly CapabilityId[];
  versionRequirements: Readonly<Partial<Record<CapabilityId, string>>>;
  resolved: readonly CapabilityId[];
  required: readonly CapabilityId[];
  optional: readonly CapabilityId[];
  issues: readonly CapabilityRegistryIssue[];
  diagnostics: readonly string[];
  executable: boolean;
};

export type CapabilityDependencyResolution = {
  ordered: readonly CapabilityId[];
  errors: readonly string[];
};

type SemanticVersion = { major: number; minor: number; patch: number };

function semanticVersion(value: string): SemanticVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  return match
    ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
    : null;
}

function compareSemanticVersions(left: SemanticVersion, right: SemanticVersion): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

/** Exact requirements match exactly. Caret requirements accept compatible
 * versions using standard major-zero semantics. */
export function satisfiesCapabilityVersion(requested: string, available: string): boolean {
  const caret = requested.startsWith("^");
  const requestedVersion = semanticVersion(caret ? requested.slice(1) : requested);
  const availableVersion = semanticVersion(available);
  if (!requestedVersion || !availableVersion) return false;
  if (!caret) return compareSemanticVersions(availableVersion, requestedVersion) === 0;
  if (compareSemanticVersions(availableVersion, requestedVersion) < 0) return false;
  if (requestedVersion.major > 0) return availableVersion.major === requestedVersion.major;
  if (requestedVersion.minor > 0) return availableVersion.major === 0 && availableVersion.minor === requestedVersion.minor;
  return availableVersion.major === 0 && availableVersion.minor === 0 && availableVersion.patch === requestedVersion.patch;
}

export class CapabilityRegistry {
  constructor(readonly definitions: Readonly<Record<CapabilityId, CapabilityDefinition>> = CAPABILITIES) {}

  ids(): readonly CapabilityId[] {
    return Object.keys(this.definitions) as CapabilityId[];
  }

  has(id: string): id is CapabilityId {
    return Object.prototype.hasOwnProperty.call(this.definitions, id);
  }

  get(id: string): CapabilityDefinition | undefined {
    return this.has(id) ? this.definitions[id] : undefined;
  }

  getOrThrow(id: string): CapabilityDefinition {
    const definition = this.get(id);
    if (!definition) throw new Error(`Unknown capability ${id}`);
    return definition;
  }

  dependencies(id: CapabilityId): readonly CapabilityId[] {
    return this.definitions[id].dependencies ?? [];
  }

  dependents(id: CapabilityId, transitive = false): readonly CapabilityId[] {
    const direct = this.ids().filter((candidate) => this.dependencies(candidate).includes(id));
    if (!transitive) return direct;
    const discovered = new Set<CapabilityId>();
    const queue = [...direct];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (discovered.has(current)) continue;
      discovered.add(current);
      queue.push(...this.ids().filter((candidate) => this.dependencies(candidate).includes(current)));
    }
    return this.ids().filter((candidate) => discovered.has(candidate));
  }

  /** Stable topological order for compiler-facing manifests. Dependencies are
   * emitted before consumers, including dependencies declared later in source. */
  resolve(ids: readonly string[]): CapabilityDependencyResolution {
    const visited = new Set<CapabilityId>();
    const visiting = new Set<CapabilityId>();
    const ordered: CapabilityId[] = [];
    const errors: string[] = [];

    const visit = (id: CapabilityId, path: readonly CapabilityId[]) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        const start = path.indexOf(id);
        errors.push(`capability dependency cycle: ${[...path.slice(Math.max(0, start)), id].join(" -> ")}`);
        return;
      }
      visiting.add(id);
      for (const dependency of this.dependencies(id)) {
        if (!this.has(dependency)) errors.push(`${id} requires unknown capability ${dependency}`);
        else visit(dependency, [...path, id]);
      }
      visiting.delete(id);
      visited.add(id);
      ordered.push(id);
    };

    for (const rawId of ids) {
      if (!this.has(rawId)) errors.push(`unknown capability ${rawId}`);
      else visit(rawId, []);
    }
    return { ordered, errors: [...new Set(errors)] };
  }

  validateSelection(ids: readonly CapabilityId[]): readonly string[] {
    const selected = new Set(ids);
    const errors: string[] = [];
    for (const id of ids) {
      for (const dependency of this.dependencies(id)) {
        if (!selected.has(dependency)) errors.push(`${id} requires capability ${dependency}`);
      }
    }
    return [...new Set(errors)];
  }

  audit(): readonly CapabilityRegistryIssue[] {
    const issues: CapabilityRegistryIssue[] = [];
    const add = (code: CapabilityRegistryIssueCode, message: string, capability?: CapabilityId, severity: "error" | "warning" = "error") => {
      issues.push({ code, severity, capability, message });
    };

    for (const id of this.ids()) {
      const definition = this.definitions[id];
      if (definition.id !== id) add("INVALID_DEFINITION", `${id} definition id is ${definition.id}`, id);
      if (!/^\d+\.\d+\.\d+$/.test(definition.version)) add("INVALID_DEFINITION", `${id} has invalid semantic version ${definition.version}`, id);
      if (!definition.name.trim() || !definition.description.trim()) add("INVALID_DEFINITION", `${id} requires a name and description`, id);
      if (!definition.inputSchema.type || !definition.outputSchema.type) add("INVALID_DEFINITION", `${id} requires input and output schemas`, id);
      if (definition.applicability.domains.length === 0 || definition.applicability.jurisdictions.length === 0) add("INVALID_DEFINITION", `${id} requires domain and jurisdiction applicability`, id);
      if (definition.failureModes.length === 0) add("INVALID_DEFINITION", `${id} must declare at least one failure mode`, id);
      if (definition.runtimeBindings.length === 0) add("INVALID_BINDING", `${id} must declare at least one runtime binding`, id);
      if (definition.sources.length === 0) add("INVALID_SOURCE", `${id} must declare implementation provenance`, id);
      if (new Set(this.dependencies(id)).size !== this.dependencies(id).length) add("INVALID_DEFINITION", `${id} declares duplicate dependencies`, id);
      if (new Set(definition.failureModes.map((failure) => failure.code)).size !== definition.failureModes.length) add("INVALID_DEFINITION", `${id} declares duplicate failure-mode codes`, id);
      if (new Set(definition.fixtures.map((fixture) => fixture.id)).size !== definition.fixtures.length) add("INVALID_FIXTURE", `${id} declares duplicate fixture IDs`, id);
      if (definition.security.externalEffects.includes("none") && definition.security.externalEffects.length > 1) add("INVALID_DEFINITION", `${id} cannot combine the none external effect with real effects`, id);

      for (const dependency of this.dependencies(id)) {
        if (!this.has(dependency)) add("UNKNOWN_DEPENDENCY", `${id} declares unknown dependency ${dependency}`, id);
        if (!definition.requirements.some((requirement) => requirement.kind === "capability" && requirement.capability === dependency)) {
          add("INVALID_DEFINITION", `${id} dependency ${dependency} is missing its requirement rationale`, id);
        }
      }
      for (const requirement of definition.requirements) {
        if (requirement.kind === "capability" && !this.has(requirement.capability)) {
          add("UNKNOWN_DEPENDENCY", `${id} declares unknown capability requirement ${requirement.capability}`, id);
        }
      }
      for (const source of definition.sources) {
        if (source.origin === "public-repository" && (!source.repository || !source.revision || !source.license)) {
          add("INVALID_SOURCE", `${id} public-repository source requires repository, immutable revision, and license`, id);
        }
        if (source.origin !== "workspace" && source.reviewState !== "approved" && definition.certification.state === "certified") {
          add("INVALID_SOURCE", `${id} cannot be certified with an unapproved external source`, id);
        }
      }
      for (const binding of definition.runtimeBindings) {
        if (!binding.package.startsWith("@mailmypdf/") || !binding.exportPath.trim()) add("INVALID_BINDING", `${id} has an invalid runtime binding`, id);
        if (!definition.sources.some((source) => source.package === binding.package)) add("INVALID_SOURCE", `${id} binding ${binding.package} has no implementation source`, id);
      }
      const bindingKeys = definition.runtimeBindings.map((binding) => `${binding.kind}:${binding.package}:${binding.exportPath}`);
      if (new Set(bindingKeys).size !== bindingKeys.length) add("INVALID_BINDING", `${id} declares duplicate runtime bindings`, id);
      if (definition.certification.state === "certified") {
        if (definition.certification.gaps.length > 0) add("INVALID_CERTIFICATION", `${id} is certified but still declares certification gaps`, id);
        if (definition.certification.evidence.length === 0) add("INVALID_CERTIFICATION", `${id} is certified without evidence`, id);
        if (definition.status !== "production") add("INVALID_CERTIFICATION", `${id} is certified but status is ${definition.status}`, id);
      }
      if (definition.status === "production" && definition.certification.state !== "certified") {
        add("INVALID_CERTIFICATION", `${id} is production without certified evidence`, id);
      }
      if ((definition.status === "foundation" || definition.status === "partial") && definition.certification.state === "certified") {
        add("INVALID_CERTIFICATION", `${id} cannot be ${definition.status} and certified`, id);
      }
      if (definition.certification.state !== "planned" && definition.certification.evidence.length === 0) {
        add("INVALID_CERTIFICATION", `${id} is ${definition.certification.state} without evidence`, id);
      }
      if (definition.certification.reviewedAt && Number.isNaN(Date.parse(definition.certification.reviewedAt))) {
        add("INVALID_CERTIFICATION", `${id} has an invalid certification review date`, id);
      }
      if (definition.certification.state !== "planned" && !definition.fixtures.some((fixture) => fixture.status === "present")) {
        add("INVALID_FIXTURE", `${id} is ${definition.certification.state} without a present fixture`, id);
      }
      if (definition.consequential && !definition.security.requiresApproval) {
        add("INVALID_DEFINITION", `${id} is consequential but its security posture does not require approval`, id);
      }
      if (definition.consequential && !definition.security.failClosed) {
        add("INVALID_DEFINITION", `${id} is consequential but does not fail closed`, id);
      }
    }

    for (const message of this.resolve(this.ids()).errors.filter((error) => error.includes("cycle"))) {
      add("DEPENDENCY_CYCLE", message);
    }

    for (const id of this.ids().filter((candidate) => this.definitions[candidate].consequential === true)) {
      const reachable = new Set(this.resolve(this.dependencies(id)).ordered);
      if (!reachable.has("humanReview")) add("MISSING_GATE_DEPENDENCY", `consequential capability ${id} must depend on humanReview directly or transitively`, id);
      if (!reachable.has("blockingGate")) add("MISSING_GATE_DEPENDENCY", `consequential capability ${id} must depend on blockingGate directly or transitively`, id);
    }

    return [...new Map(issues.map((issue) => [`${issue.code}:${issue.capability ?? "registry"}:${issue.message}`, issue])).values()];
  }

  discover(query: CapabilityQuery = {}): readonly CapabilityDefinition[] {
    return Object.values(this.definitions).filter((definition) => {
      if (query.ids && (!query.ids.includes(definition.id))) return false;
      if (query.category && definition.category !== query.category) return false;
      if (query.owner && definition.owner !== query.owner) return false;
      if (query.status && definition.status !== query.status) return false;
      if (query.certification && definition.certification.state !== query.certification) return false;
      if (query.domain && !definition.applicability.domains.includes(query.domain)) return false;
      if (query.jurisdiction && !definition.applicability.jurisdictions.includes(query.jurisdiction) && !definition.applicability.jurisdictions.includes("unspecified")) return false;
      if (query.consequential !== undefined && definition.consequential !== query.consequential) return false;
      return true;
    });
  }

  compose(request: CapabilityCompositionRequest): CapabilityComposition {
    const mode = request.mode ?? "plan";
    const issues: CapabilityRegistryIssue[] = [];
    const add = (code: CapabilityRegistryIssueCode, message: string, capability?: CapabilityId, severity: "error" | "warning" = "error") => {
      issues.push({ code, severity, capability, message });
    };
    const notApplicable = new Set(request.notApplicable ?? []);
    const requiredRoots = request.required.filter((id): id is CapabilityId => this.has(id));
    const optionalRoots = (request.optional ?? []).filter((id): id is CapabilityId => this.has(id));
    for (const id of [...request.required, ...(request.optional ?? [])]) {
      if (!this.has(id)) add("UNKNOWN_CAPABILITY", `unknown capability ${id}`);
      else if (notApplicable.has(id)) add("NOT_APPLICABLE", `capability ${id} is both selected and not applicable`, id);
    }
    const requested = [...new Set([...requiredRoots, ...optionalRoots])];
    const requiredResolution = this.resolve(requiredRoots);
    const optionalResolution = this.resolve(optionalRoots);
    const resolution = this.resolve(requested);
    for (const message of [...requiredResolution.errors, ...optionalResolution.errors, ...resolution.errors]) {
      add(message.includes("cycle") ? "DEPENDENCY_CYCLE" : "UNKNOWN_DEPENDENCY", message);
    }
    const requiredSet = new Set(requiredResolution.ordered);
    const optionalSet = new Set(optionalResolution.ordered.filter((id) => !requiredSet.has(id)));
    const satisfiedRequirements = new Set(request.satisfiedRequirements ?? []);

    for (const id of resolution.ordered) {
      const definition = this.definitions[id];
      if (request.domain && !definition.applicability.domains.includes(request.domain) && !definition.applicability.domains.includes("shared")) {
        add("UNSUPPORTED_DOMAIN", `${id} is not applicable to domain ${request.domain}`, id, requiredSet.has(id) ? "error" : "warning");
      }
      if (request.jurisdiction && !definition.applicability.jurisdictions.includes("unspecified") && !definition.applicability.jurisdictions.includes(request.jurisdiction)) {
        add("UNSUPPORTED_JURISDICTION", `${id} is not applicable to jurisdiction ${request.jurisdiction}`, id, requiredSet.has(id) ? "error" : "warning");
      }
      if (notApplicable.has(id)) {
        add("NOT_APPLICABLE", `${id} is required transitively but declared not applicable`, id, requiredSet.has(id) ? "error" : "warning");
      }
      const versionRequirement = request.versionRequirements?.[id];
      if (versionRequirement && !satisfiesCapabilityVersion(versionRequirement, definition.version)) {
        add("VERSION_INCOMPATIBLE", `${id} requires ${versionRequirement}; ${definition.version} is registered`, id, requiredSet.has(id) ? "error" : "warning");
      }

      if (mode !== "plan") {
        const severity = requiredSet.has(id) ? "error" : "warning";
        if (definition.certification.state === "planned") {
          add("CAPABILITY_NOT_IMPLEMENTED", `${id} is planned and cannot be executed`, id, severity);
        }
        if (!definition.runtimeBindings.some((binding) => binding.status === "implemented")) {
          add("RUNTIME_BINDING_UNAVAILABLE", `${id} has no implemented runtime binding`, id, severity);
        }
        for (const requirement of definition.requirements) {
          if (requirement.kind !== "capability" && !satisfiedRequirements.has(requirement.key)) {
            add("UNSATISFIED_REQUIREMENT", `${id} requires ${requirement.kind}:${requirement.key}: ${requirement.reason}`, id, severity);
          }
        }
      }
      if (mode === "production" && (definition.status !== "production" || definition.certification.state !== "certified")) {
        add("CAPABILITY_NOT_CERTIFIED", `${id} is not certified for production execution`, id, requiredSet.has(id) ? "error" : "warning");
      }
    }

    const uniqueIssues = [...new Map(issues.map((issue) => [`${issue.code}:${issue.capability ?? "registry"}:${issue.message}`, issue])).values()];
    const versionRequirements = Object.fromEntries(
      resolution.ordered
        .filter((id) => request.versionRequirements?.[id] !== undefined)
        .map((id) => [id, request.versionRequirements![id]]),
    ) as Readonly<Partial<Record<CapabilityId, string>>>;
    return {
      mode,
      requested,
      versionRequirements,
      resolved: resolution.ordered,
      required: resolution.ordered.filter((id) => requiredSet.has(id)),
      optional: resolution.ordered.filter((id) => optionalSet.has(id)),
      issues: uniqueIssues,
      diagnostics: uniqueIssues.map((issue) => issue.message),
      executable: !uniqueIssues.some((issue) => issue.severity === "error"),
    };
  }

  compileManifest(input: {
    workflowId: string;
    workflowVersion?: number;
    composition: CapabilityComposition;
  }): CapabilityManifest {
    if (!input.composition.executable) throw new Error(input.composition.diagnostics.join("\n"));
    const capabilities = Object.fromEntries(input.composition.resolved.map((id) => {
      const definition = this.definitions[id];
      return [id, {
        id,
        version: definition.version,
        status: definition.status,
        inputSchema: definition.inputSchema,
        outputSchema: definition.outputSchema,
        requirements: definition.requirements,
        dependencies: this.dependencies(id),
        security: definition.security,
        applicability: definition.applicability,
        failureModes: definition.failureModes,
        fixtures: definition.fixtures,
        certification: definition.certification,
        bindings: definition.runtimeBindings,
        sources: definition.sources,
      } satisfies CapabilityManifestEntry];
    })) as Readonly<Partial<Record<CapabilityId, CapabilityManifestEntry>>>;
    const bindings = Object.fromEntries(input.composition.resolved.map((id) => [id, this.definitions[id].runtimeBindings])) as Readonly<Partial<Record<CapabilityId, readonly CapabilityRuntimeBinding[]>>>;
    return {
      schemaVersion: "mailmypdf.capabilities/v2",
      registryVersion: CAPABILITY_REGISTRY_VERSION,
      mode: input.composition.mode,
      workflow: { id: input.workflowId, version: input.workflowVersion ?? 1 },
      requested: input.composition.requested,
      versionRequirements: input.composition.versionRequirements,
      required: input.composition.required,
      optional: input.composition.optional,
      resolved: input.composition.resolved,
      capabilities,
      bindings,
    };
  }
}

export const capabilityRegistry = new CapabilityRegistry();
/** Explicit name for compiler and connector consumers. This is an alias, not
 * a second registry or architecture. */
export const masterCapabilityRegistry = capabilityRegistry;

export function hasCapability(id: string): id is CapabilityId {
  return capabilityRegistry.has(id);
}

export function capabilityDependencies(id: CapabilityId): readonly CapabilityId[] {
  return capabilityRegistry.dependencies(id);
}

export function isConsequentialCapability(id: CapabilityId): boolean {
  return capabilityRegistry.getOrThrow(id).consequential === true;
}

export function assertCapabilityDependencies(ids: readonly CapabilityId[]): string[] {
  return [...capabilityRegistry.validateSelection(ids)];
}

export function resolveCapabilityDependencies(ids: readonly CapabilityId[]): CapabilityDependencyResolution {
  return capabilityRegistry.resolve(ids);
}

/** CI-safe compatibility API. Use auditCapabilityRegistry() when warnings and
 * structured codes are needed. */
export function validateCapabilityRegistry(): string[] {
  return capabilityRegistry.audit().filter((issue) => issue.severity === "error").map((issue) => issue.message);
}

export function auditCapabilityRegistry(): readonly CapabilityRegistryIssue[] {
  return capabilityRegistry.audit();
}

export type CapabilityManifestEntry = {
  id: CapabilityId;
  version: string;
  status: CapabilityStatus;
  inputSchema: CapabilitySchema;
  outputSchema: CapabilitySchema;
  requirements: readonly CapabilityRequirement[];
  dependencies: readonly CapabilityId[];
  security: CapabilitySecurityPosture;
  applicability: CapabilityApplicability;
  failureModes: readonly CapabilityFailureMode[];
  fixtures: readonly CapabilityFixture[];
  certification: CapabilityCertification;
  bindings: readonly CapabilityRuntimeBinding[];
  sources: readonly CapabilityImplementationSource[];
};

export type CapabilityManifest = {
  schemaVersion: "mailmypdf.capabilities/v2";
  registryVersion: string;
  mode: CapabilityCompositionMode;
  workflow: { id: string; version: number };
  requested: readonly CapabilityId[];
  versionRequirements: Readonly<Partial<Record<CapabilityId, string>>>;
  required: readonly CapabilityId[];
  optional: readonly CapabilityId[];
  resolved: readonly CapabilityId[];
  capabilities: Readonly<Partial<Record<CapabilityId, CapabilityManifestEntry>>>;
  /** Compatibility projection for existing hosts. New compilers should read
   * the binding data from capabilities. */
  bindings: Readonly<Partial<Record<CapabilityId, readonly CapabilityRuntimeBinding[]>>>;
};

/** Compiles a validated registry composition into the factory's stable input.
 * The compiler consumes this artifact; it never infers capabilities from code. */
export function compileCapabilityManifest(input: {
  workflowId: string;
  workflowVersion?: number;
  composition: CapabilityComposition;
}): CapabilityManifest {
  return capabilityRegistry.compileManifest(input);
}

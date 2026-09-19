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
  | "documentStorage"
  | "documentScanning"
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
  | "research"
  | "risk"
  | "strategy"
  | "draft"
  | "draftProvenance"
  | "validation"
  | "blockingGate"
  | "humanReview"
  | "approval"
  | "pdfGeneration"
  | "packetAssembly"
  | "pricing"
  | "payment"
  | "addressVerification"
  | "mailing"
  | "tracking"
  | "notifications"
  | "proofAudit"
  | "archive"
  | "resilience"
  | "observability"
  | "acceptanceTesting";

export type CapabilityDefinition = {
  id: CapabilityId;
  name: string;
  owner: CapabilityOwner;
  category: CapabilityCategory;
  description: string;
  /** Canonical package that owns the reusable implementation or contract. */
  implementation: `@mailmypdf/${string}`;
  status: CapabilityStatus;
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
  extras: Pick<CapabilityDefinition, "consequential" | "dependencies"> = {},
): CapabilityDefinition => ({ id, name, owner, category, description, implementation, status, ...extras });

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
  identity: capability("identity", "Identity / Authorization", "platform", "identity", "Canonical MailMyPDF identity, ownership, entitlement, and access boundaries.", "@mailmypdf/ecosystem", "implemented"),
  matterState: capability("matterState", "Matter State", "platform", "workflow", "Durable workflow/matter state, optimistic concurrency, resume, and ownership.", "@mailmypdf/step-workflow", "implemented"),
  security: capability("security", "Security Boundary", "platform", "documents", "Authorization, safe intake, tenant isolation, input validation, and disclosure controls.", "@mailmypdf/documents", "implemented"),
  secureUpload: capability("secureUpload", "Secure Upload", "platform", "documents", "Validated consented document intake into quarantine before processing.", "@mailmypdf/documents", "production", { dependencies: ["security"] }),
  documentStorage: capability("documentStorage", "Document Storage", "platform", "documents", "Private object storage, ownership-safe paths, signed retrieval, hashes, and deletion.", "@mailmypdf/documents", "production", { dependencies: ["security"] }),
  documentScanning: capability("documentScanning", "Document Scanning", "platform", "documents", "Malware and structural scanning before a document becomes disclosable.", "@mailmypdf/documents", "production", { dependencies: ["secureUpload", "documentStorage"] }),
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
  research: capability("research", "Authority / Research", "hybrid", "intelligence", "Ground rules and authoritative sources when a workflow requires external authority.", "@mailmypdf/intelligence", "implemented"),
  risk: capability("risk", "Risk Assessment", "platform", "intelligence", "Assess supported strength, uncertainty, readiness, and consequential risk.", "@mailmypdf/intelligence", "implemented"),
  strategy: capability("strategy", "Case Strategy", "hybrid", "intelligence", "Translate verified facts and domain rules into case-specific next actions.", "@mailmypdf/intelligence", "implemented"),
  draft: capability("draft", "Grounded Drafting", "platform", "ai", "Generate correspondence constrained by verified case state and source material.", "@mailmypdf/ai", "production", { dependencies: ["aiExecution", "facts", "provenance"] }),
  draftProvenance: capability("draftProvenance", "Draft Provenance", "platform", "intelligence", "Trace material draft claims back to structured facts and sources.", "@mailmypdf/intelligence", "implemented"),
  validation: capability("validation", "Validation", "platform", "workflow", "Validate facts, requirements, documents, recipients, packet state, and draft integrity.", "@mailmypdf/workflows", "implemented"),
  blockingGate: capability("blockingGate", "Blocking Gate", "platform", "workflow", "Prevent consequential action while critical requirements remain unresolved.", "@mailmypdf/workflows", "implemented"),
  humanReview: capability("humanReview", "Human Review", "platform", "workflow", "Require explicit review before consequential action.", "@mailmypdf/workflows", "implemented"),
  approval: capability("approval", "Approval", "hybrid", "workflow", "Role- or policy-based explicit approval for consequential transitions.", "@mailmypdf/workflows", "production", { consequential: true, dependencies: ["humanReview", "blockingGate"] }),
  pdfGeneration: capability("pdfGeneration", "PDF Generation", "platform", "documents", "Generate printable deterministic PDFs from approved content.", "@mailmypdf/packet-builder", "implemented"),
  packetAssembly: capability("packetAssembly", "Packet Assembly", "platform", "documents", "Merge the approved response and selected supporting documents into the exact mail-ready packet.", "@mailmypdf/packet-builder", "production", { dependencies: ["pdfGeneration"] }),
  pricing: capability("pricing", "Server-authoritative Pricing", "platform", "commerce", "Deterministic workflow and mailing quotes controlled by the server.", "@mailmypdf/pricing", "implemented"),
  payment: capability("payment", "Payment", "platform", "commerce", "Stripe/payment intent state and immutable approved-artifact payment boundary.", "@mailmypdf/payment-fulfillment", "production", { consequential: true, dependencies: ["pricing", "approval"] }),
  addressVerification: capability("addressVerification", "Address Verification", "platform", "fulfillment", "Normalize and verify recipient/sender postal addresses before submission.", "@mailmypdf/fulfillment", "production"),
  mailing: capability("mailing", "Authorized Mailing", "platform", "fulfillment", "Idempotent physical-mail submission of the exact approved packet.", "@mailmypdf/payment-fulfillment", "production", { consequential: true, dependencies: ["packetAssembly", "addressVerification", "approval"] }),
  tracking: capability("tracking", "Tracking", "platform", "fulfillment", "Normalize provider tracking state and retain delivery events.", "@mailmypdf/fulfillment", "production", { dependencies: ["mailing"] }),
  notifications: capability("notifications", "Notifications / Reminders", "platform", "operations", "Idempotent transactional notifications and deadline/action reminders.", "@mailmypdf/notifications", "production"),
  proofAudit: capability("proofAudit", "Proof / Audit", "platform", "proof", "Durable artifacts, custody, mailing events, hashes, and proof records.", "@mailmypdf/proof", "production", { dependencies: ["provenance"] }),
  archive: capability("archive", "Matter Archive", "platform", "proof", "Final immutable matter archive containing source, generated, packet, payment, tracking, and proof artifacts.", "@mailmypdf/proof", "production", { dependencies: ["proofAudit"] }),
  resilience: capability("resilience", "Execution Resilience", "platform", "operations", "Idempotency, bounded retries, replay-safe external actions, and recovery semantics.", "@mailmypdf/workflows", "implemented"),
  observability: capability("observability", "Workflow Observability", "platform", "operations", "Privacy-safe workflow telemetry, diagnostics, and execution health.", "@mailmypdf/workflows", "implemented"),
  acceptanceTesting: capability("acceptanceTesting", "Workflow Acceptance Testing", "platform", "operations", "Synthetic end-to-end tests with mock Stripe/Lob and production PDF primitives.", "@mailmypdf/workflow-acceptance", "production"),
};

export const capabilityIds = Object.keys(CAPABILITIES) as CapabilityId[];

export function hasCapability(id: string): id is CapabilityId {
  return Object.prototype.hasOwnProperty.call(CAPABILITIES, id);
}

export function capabilityDependencies(id: CapabilityId): readonly CapabilityId[] {
  return CAPABILITIES[id].dependencies ?? [];
}

export function isConsequentialCapability(id: CapabilityId): boolean {
  return CAPABILITIES[id].consequential === true;
}

export function assertCapabilityDependencies(ids: readonly CapabilityId[]): string[] {
  const selected = new Set(ids);
  const errors: string[] = [];
  for (const id of ids) {
    for (const dependency of capabilityDependencies(id)) {
      if (!selected.has(dependency)) errors.push(`${id} requires capability ${dependency}`);
    }
  }
  return errors;
}


/**
 * Audits the registry itself independently of any one workflow selection.
 * This catches unknown dependencies and dependency cycles before manifests are
 * generated from the registry.
 */
export function validateCapabilityRegistry(): string[] {
  const errors: string[] = [];

  for (const id of capabilityIds) {
    for (const dependency of capabilityDependencies(id)) {
      if (!hasCapability(dependency)) {
        errors.push(`${id} declares unknown dependency ${dependency}`);
      }
    }
  }

  const visiting = new Set<CapabilityId>();
  const visited = new Set<CapabilityId>();

  const visit = (id: CapabilityId, path: readonly CapabilityId[]) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const cycleStart = path.indexOf(id);
      const cycle = [...path.slice(Math.max(0, cycleStart)), id];
      errors.push(`capability dependency cycle: ${cycle.join(" -> ")}`);
      return;
    }

    visiting.add(id);
    for (const dependency of capabilityDependencies(id)) {
      visit(dependency, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of capabilityIds) visit(id, []);

  for (const id of capabilityIds.filter(isConsequentialCapability)) {
    const reachable = new Set<CapabilityId>();
    const queue = [...capabilityDependencies(id)];
    while (queue.length) {
      const dependency = queue.shift()!;
      if (reachable.has(dependency)) continue;
      reachable.add(dependency);
      queue.push(...capabilityDependencies(dependency));
    }

    if (!reachable.has("humanReview")) {
      errors.push(`consequential capability ${id} must depend on humanReview directly or transitively`);
    }
    if (!reachable.has("blockingGate")) {
      errors.push(`consequential capability ${id} must depend on blockingGate directly or transitively`);
    }
  }

  return [...new Set(errors)];
}

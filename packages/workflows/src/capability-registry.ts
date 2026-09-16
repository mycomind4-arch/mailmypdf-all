export type CapabilityOwner = "platform" | "vertical" | "hybrid";
export type CapabilityStatus = "foundation" | "production" | "partial";
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
  status: CapabilityStatus = "production",
  extras: Pick<CapabilityDefinition, "consequential" | "dependencies"> = {},
): CapabilityDefinition => ({ id, name, owner, category, description, implementation, status, ...extras });

export const CAPABILITIES: Readonly<Record<CapabilityId, CapabilityDefinition>> = {
  identity: capability("identity", "Identity / Authorization", "platform", "identity", "Canonical MailMyPDF identity, ownership, entitlement, and access boundaries.", "@mailmypdf/ecosystem"),
  matterState: capability("matterState", "Matter State", "platform", "workflow", "Durable workflow/matter state, optimistic concurrency, resume, and ownership.", "@mailmypdf/step-workflow"),
  security: capability("security", "Security Boundary", "platform", "documents", "Authorization, safe intake, tenant isolation, input validation, and disclosure controls.", "@mailmypdf/documents"),
  secureUpload: capability("secureUpload", "Secure Upload", "platform", "documents", "Validated consented document intake into quarantine before processing.", "@mailmypdf/document-storage", "foundation", { dependencies: ["security"] }),
  documentStorage: capability("documentStorage", "Document Storage", "platform", "documents", "Private object storage, ownership-safe paths, signed retrieval, hashes, and deletion.", "@mailmypdf/document-storage", "foundation", { dependencies: ["security"] }),
  documentScanning: capability("documentScanning", "Document Scanning", "platform", "documents", "Malware and structural scanning before a document becomes disclosable.", "@mailmypdf/document-storage", "foundation", { dependencies: ["secureUpload", "documentStorage"] }),
  retention: capability("retention", "Retention / Deletion", "platform", "documents", "Retention policy, deletion requests, purge jobs, and tombstones.", "@mailmypdf/document-storage", "foundation", { dependencies: ["documentStorage"] }),
  classification: capability("classification", "Domain Classification", "hybrid", "intelligence", "Classify source material using reusable document intelligence plus domain rules.", "@mailmypdf/document-intelligence"),
  extraction: capability("extraction", "Structured Extraction", "hybrid", "intelligence", "Extract page-aware text and structured values from source material.", "@mailmypdf/document-intelligence"),
  visionAnalysis: capability("visionAnalysis", "Vision / Scanned Document Analysis", "platform", "ai", "Analyze image and scanned-document content through the secure multimodal AI boundary.", "@mailmypdf/ai", "foundation", { dependencies: ["documentScanning", "aiExecution"] }),
  aiExecution: capability("aiExecution", "Secure AI Execution", "platform", "ai", "Provider routing, schema validation, provenance, prompt versioning, fallback, and disclosure safety.", "@mailmypdf/ai"),
  understand: capability("understand", "Document Understanding", "hybrid", "intelligence", "Convert extraction into a structured understanding of the document and matter.", "@mailmypdf/intelligence", "foundation", { dependencies: ["extraction"] }),
  facts: capability("facts", "Fact Model", "platform", "intelligence", "Normalize, verify, dispute, supersede, and source material facts.", "@mailmypdf/intelligence", "production", { dependencies: ["provenance"] }),
  provenance: capability("provenance", "Source Provenance", "platform", "intelligence", "Attach material facts, findings, drafts, and actions to source evidence.", "@mailmypdf/intelligence"),
  timeline: capability("timeline", "Timeline", "platform", "intelligence", "Chronology, event normalization, duplicate detection, and gap analysis.", "@mailmypdf/intelligence"),
  deadlines: capability("deadlines", "Deadline Engine", "hybrid", "intelligence", "Derive and validate deadlines from sources and authoritative rules.", "@mailmypdf/intelligence"),
  findings: capability("findings", "Findings", "hybrid", "intelligence", "Domain-specific factual findings and requirement detection.", "@mailmypdf/intelligence"),
  contradictions: capability("contradictions", "Contradiction Detection", "platform", "intelligence", "Cross-document and intra-document contradiction analysis.", "@mailmypdf/intelligence"),
  discrepancies: capability("discrepancies", "Discrepancy Detection", "platform", "intelligence", "Identify mismatches between source claims, facts, requirements, and evidence.", "@mailmypdf/intelligence"),
  requirements: capability("requirements", "Requirements Analysis", "hybrid", "intelligence", "Map source/domain requirements to case evidence and response obligations.", "@mailmypdf/intelligence"),
  evidence: capability("evidence", "Evidence", "platform", "intelligence", "Evidence organization, sufficiency, linkage, missing-item detection, and traceability.", "@mailmypdf/intelligence"),
  research: capability("research", "Authority / Research", "hybrid", "intelligence", "Ground rules and authoritative sources when a workflow requires external authority.", "@mailmypdf/intelligence"),
  risk: capability("risk", "Risk Assessment", "platform", "intelligence", "Assess supported strength, uncertainty, readiness, and consequential risk.", "@mailmypdf/intelligence"),
  strategy: capability("strategy", "Case Strategy", "hybrid", "intelligence", "Translate verified facts and domain rules into case-specific next actions.", "@mailmypdf/intelligence"),
  draft: capability("draft", "Grounded Drafting", "platform", "ai", "Generate correspondence constrained by verified case state and source material.", "@mailmypdf/ai", "production", { dependencies: ["aiExecution", "facts", "provenance"] }),
  draftProvenance: capability("draftProvenance", "Draft Provenance", "platform", "intelligence", "Trace material draft claims back to structured facts and sources.", "@mailmypdf/intelligence"),
  validation: capability("validation", "Validation", "platform", "workflow", "Validate facts, requirements, documents, recipients, packet state, and draft integrity.", "@mailmypdf/workflows"),
  blockingGate: capability("blockingGate", "Blocking Gate", "platform", "workflow", "Prevent consequential action while critical requirements remain unresolved.", "@mailmypdf/workflows"),
  humanReview: capability("humanReview", "Human Review", "platform", "workflow", "Require explicit review before consequential action.", "@mailmypdf/workflows"),
  approval: capability("approval", "Approval", "hybrid", "workflow", "Role- or policy-based explicit approval for consequential transitions.", "@mailmypdf/workflows", "production", { consequential: true, dependencies: ["humanReview", "blockingGate"] }),
  pdfGeneration: capability("pdfGeneration", "PDF Generation", "platform", "documents", "Generate printable deterministic PDFs from approved content.", "@mailmypdf/packet-builder"),
  packetAssembly: capability("packetAssembly", "Packet Assembly", "platform", "documents", "Merge the approved response and selected supporting documents into the exact mail-ready packet.", "@mailmypdf/packet-builder", "production", { dependencies: ["pdfGeneration"] }),
  pricing: capability("pricing", "Server-authoritative Pricing", "platform", "commerce", "Deterministic workflow and mailing quotes controlled by the server.", "@mailmypdf/pricing"),
  payment: capability("payment", "Payment", "platform", "commerce", "Stripe/payment intent state and immutable approved-artifact payment boundary.", "@mailmypdf/payment-fulfillment", "production", { consequential: true, dependencies: ["pricing", "approval"] }),
  addressVerification: capability("addressVerification", "Address Verification", "platform", "fulfillment", "Normalize and verify recipient/sender postal addresses before submission.", "@mailmypdf/fulfillment", "production"),
  mailing: capability("mailing", "Authorized Mailing", "platform", "fulfillment", "Idempotent physical-mail submission of the exact approved packet.", "@mailmypdf/payment-fulfillment", "production", { consequential: true, dependencies: ["packetAssembly", "addressVerification", "approval"] }),
  tracking: capability("tracking", "Tracking", "platform", "fulfillment", "Normalize provider tracking state and retain delivery events.", "@mailmypdf/fulfillment", "production", { dependencies: ["mailing"] }),
  notifications: capability("notifications", "Notifications / Reminders", "platform", "operations", "Idempotent transactional notifications and deadline/action reminders.", "@mailmypdf/notifications", "production"),
  proofAudit: capability("proofAudit", "Proof / Audit", "platform", "proof", "Durable artifacts, custody, mailing events, hashes, and proof records.", "@mailmypdf/proof", "partial", { dependencies: ["provenance"] }),
  archive: capability("archive", "Matter Archive", "platform", "proof", "Final immutable matter archive containing source, generated, packet, payment, tracking, and proof artifacts.", "@mailmypdf/proof", "foundation", { dependencies: ["proofAudit"] }),
  resilience: capability("resilience", "Execution Resilience", "platform", "operations", "Idempotency, bounded retries, replay-safe external actions, and recovery semantics.", "@mailmypdf/workflows"),
  observability: capability("observability", "Workflow Observability", "platform", "operations", "Privacy-safe workflow telemetry, diagnostics, and execution health.", "@mailmypdf/workflows"),
  acceptanceTesting: capability("acceptanceTesting", "Workflow Acceptance Testing", "platform", "operations", "Synthetic end-to-end tests with mock Stripe/Lob and production PDF primitives.", "@mailmypdf/workflow-acceptance"),
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

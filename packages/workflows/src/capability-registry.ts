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
  | "addressVerification"
  | "mailing"
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
  extras: Partial<Pick<CapabilityDefinition, "consequential" | "dependencies" | "version" | "inputSchema" | "outputSchema" | "requirements" | "security" | "applicability" | "failureModes" | "fixtures" | "certification" | "runtimeBindings">> = {},
): CapabilityDefinition => ({
  id, name, owner, category, description, implementation, status,
  version: "1.0.0",
  inputSchema: { type: "object", title: `${name} input` },
  outputSchema: { type: "object", title: `${name} output` },
  requirements: [],
  security: {
    dataClass: category === "documents" || category === "intelligence" ? "sensitive" : "matter",
    reads: [], writes: [], externalEffects: ["none"], requiresOwnership: true,
    requiresApproval: extras.consequential === true, failClosed: true,
  },
  applicability: { jurisdictions: ["unspecified"], domains: [category], limitations: [] },
  failureModes: [{ code: "UNAVAILABLE", behavior: "block", description: "Capability cannot execute when its binding is unavailable." }],
  fixtures: [],
  certification: extras.certification ?? {
    state: status === "production" ? "certified" : status === "implemented" ? "implemented" : "planned",
    evidence: [],
    gaps: status === "production" ? [] : ["Production binding or certification evidence is incomplete."],
  },
  runtimeBindings: extras.runtimeBindings ?? [{ kind: "package-export", package: implementation, exportPath: ".", status: status === "foundation" || status === "partial" ? "planned" : "implemented" }],
  ...extras,
} as CapabilityDefinition);

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
  uccSearch: capability("uccSearch", "UCC Search", "hybrid", "intelligence", "Provider-neutral UCC search, normalization, coverage, and source provenance.", "@mailmypdf/registry-adapters", "implemented", { dependencies: ["identity", "provenance"] }),
  titleLienSearch: capability("titleLienSearch", "Title and Lien Search", "hybrid", "intelligence", "Normalize title, lien, judgment, tax, and encumbrance evidence without making a legal conclusion.", "@mailmypdf/registry-adapters", "foundation", { dependencies: ["identity", "provenance"] }),
  research: capability("research", "Authority / Research", "hybrid", "intelligence", "Ground rules and authoritative sources when a workflow requires external authority.", "@mailmypdf/intelligence", "implemented"),
  risk: capability("risk", "Risk Assessment", "platform", "intelligence", "Assess supported strength, uncertainty, readiness, and consequential risk.", "@mailmypdf/intelligence", "implemented"),
  strategy: capability("strategy", "Case Strategy", "hybrid", "intelligence", "Translate verified facts and domain rules into case-specific next actions.", "@mailmypdf/intelligence", "implemented"),
  draft: capability("draft", "Grounded Drafting", "platform", "ai", "Generate correspondence constrained by verified case state and source material.", "@mailmypdf/ai", "production", { dependencies: ["aiExecution", "facts", "provenance"] }),
  draftProvenance: capability("draftProvenance", "Draft Provenance", "platform", "intelligence", "Trace material draft claims back to structured facts and sources.", "@mailmypdf/intelligence", "implemented"),
  validation: capability("validation", "Validation", "platform", "workflow", "Validate facts, requirements, documents, recipients, packet state, and draft integrity.", "@mailmypdf/workflows", "implemented"),
  blockingGate: capability("blockingGate", "Blocking Gate", "platform", "workflow", "Prevent consequential action while critical requirements remain unresolved.", "@mailmypdf/workflows", "implemented"),
  humanReview: capability("humanReview", "Human Review", "platform", "workflow", "Require explicit review before consequential action.", "@mailmypdf/workflows", "implemented"),
  approval: capability("approval", "Approval", "hybrid", "workflow", "Role- or policy-based explicit approval for consequential transitions.", "@mailmypdf/workflows", "production", { consequential: true, dependencies: ["humanReview", "blockingGate"] }),
  uccFiling: capability("uccFiling", "UCC Filing", "hybrid", "fulfillment", "Prepare and submit authorized UCC filings where a supported filing adapter exists.", "@mailmypdf/registry-adapters", "foundation", { consequential: true, dependencies: ["uccSearch", "signature", "humanReview", "blockingGate", "auditTrail"] }),
  pdfGeneration: capability("pdfGeneration", "PDF Generation", "platform", "documents", "Generate printable deterministic PDFs from approved content.", "@mailmypdf/packet-builder", "implemented"),
  packetAssembly: capability("packetAssembly", "Packet Assembly", "platform", "documents", "Merge the approved response and selected supporting documents into the exact mail-ready packet.", "@mailmypdf/packet-builder", "production", { dependencies: ["pdfGeneration"] }),
  identityVerification: capability("identityVerification", "Identity Verification", "platform", "documents", "Provider-neutral identity proofing (document/database/biometric checks) confirming a matter party is who they claim to be, distinct from platform auth/ownership.", "@mailmypdf/identity-verification", "implemented"),
  signature: capability("signature", "Electronic Signature", "platform", "documents", "Provider-neutral electronic signature capture, affirmative consent, and completion state bound to a specific document hash.", "@mailmypdf/signature", "implemented", { dependencies: ["documentStorage"] }),
  notarization: capability("notarization", "Remote Online Notarization", "platform", "fulfillment", "Provider-neutral notarized-signature session requiring prior identity verification before a notary attests a signature.", "@mailmypdf/notarization", "implemented", { consequential: true, dependencies: ["identityVerification", "humanReview", "blockingGate"] }),
  efiling: capability("efiling", "Electronic Court/Agency Filing", "platform", "fulfillment", "Provider-neutral direct electronic filing submission to a court or agency, as an alternative fulfillment path to physical mailing.", "@mailmypdf/efiling", "implemented", { consequential: true, dependencies: ["packetAssembly", "approval", "humanReview", "blockingGate"] }),
  piiDetection: capability("piiDetection", "PII Detection", "hybrid", "documents", "Automatic detection of sensitive personal data spans feeding the existing privacy release/redaction review before a document may be disclosed or reused as a template.", "@mailmypdf/documents", "foundation", { dependencies: ["documentStorage"] }),
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
  taxNoticeClassification: capability("taxNoticeClassification", "Tax Notice Classification", "hybrid", "intelligence", "Classify IRS notices into supported notice families, stated issues, response windows, and evidence needs.", "@mailmypdf/capability-services", "implemented", { dependencies: ["classification", "officialForms", "deadlines", "provenance"] }),
  taxDocumentExtraction: capability("taxDocumentExtraction", "Tax Document Extraction", "hybrid", "intelligence", "Extract tax-year, taxpayer, payer, amounts, withholding, and form identifiers with source linkage.", "@mailmypdf/capability-services", "implemented", { dependencies: ["extraction", "provenance"] }),
  taxDeadlineAnalysis: capability("taxDeadlineAnalysis", "Tax Deadline Analysis", "hybrid", "intelligence", "Derive IRS response and appeal deadlines from notice dates, receipt evidence, and authoritative rules.", "@mailmypdf/capability-services", "implemented", { dependencies: ["deadlines", "research", "provenance"] }),
  taxResponse: capability("taxResponse", "Tax Response Packet", "hybrid", "documents", "Assemble a reviewed IRS response with grounded facts, forms, evidence, and mailing proof.", "@mailmypdf/capability-services", "implemented", { dependencies: ["taxNoticeClassification", "taxDocumentExtraction", "validation", "packetAssembly", "humanReview"] }),
  dealStructure: capability("dealStructure", "Creative Finance Deal Structure", "hybrid", "intelligence", "Represent seller financing, lease option, land contract, subject-to, wraparound, and private-loan structures.", "@mailmypdf/secured-transactions", "implemented", { dependencies: ["identity", "facts", "research"] }),
  amortization: capability("amortization", "Amortization and Scenario Analysis", "platform", "intelligence", "Deterministically calculate payment schedules, interest, principal, balloons, and payoff scenarios.", "@mailmypdf/capability-services", "implemented", { dependencies: ["dealStructure"] }),
  attachmentAnalysis: capability("attachmentAnalysis", "Attachment Analysis", "hybrid", "intelligence", "Analyze obligation, value, rights in collateral, and authenticated agreement facts.", "@mailmypdf/secured-transactions", "implemented", { dependencies: ["dealStructure", "facts", "provenance"] }),
  perfectionAnalysis: capability("perfectionAnalysis", "Perfection Analysis", "hybrid", "intelligence", "Map filing, possession, control, and other perfection steps to collateral and jurisdiction.", "@mailmypdf/secured-transactions", "implemented", { dependencies: ["attachmentAnalysis", "research", "uccSearch"] }),
  translation: capability("translation", "Translation and Localization", "hybrid", "documents", "Prepare translated drafts while preserving source text, review status, and uncertainty.", "@mailmypdf/capability-services", "implemented", { dependencies: ["provenance", "humanReview"] }),
  templateSimilarity: capability("templateSimilarity", "Template Similarity and Deduplication", "platform", "operations", "Detect near-duplicate workflow templates before publication.", "@mailmypdf/capability-services", "implemented", { dependencies: ["privacyRelease", "provenance"] }),
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
    const definition = CAPABILITIES[id];
    for (const requirement of definition.requirements) {
      if (requirement.kind === "capability" && !hasCapability(requirement.capability)) {
        errors.push(`${id} declares unknown capability requirement ${requirement.capability}`);
      }
    }
    if (definition.failureModes.length === 0) errors.push(`${id} must declare at least one failure mode`);
    if (definition.runtimeBindings.length === 0) errors.push(`${id} must declare at least one runtime binding`);
    if (definition.certification.state === "certified" && definition.certification.gaps.length > 0) {
      errors.push(`${id} is certified but still declares certification gaps`);
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
};

export type CapabilityComposition = {
  requested: readonly CapabilityId[];
  resolved: readonly CapabilityId[];
  required: readonly CapabilityId[];
  optional: readonly CapabilityId[];
  diagnostics: readonly string[];
  executable: boolean;
};

function isCapabilityId(value: string): value is CapabilityId {
  return hasCapability(value);
}

/** Stable topological order for compiler-facing manifests. Dependencies are
 * emitted before their consumers, while preserving registry order otherwise. */
export function resolveCapabilityDependencies(ids: readonly CapabilityId[]): {
  ordered: readonly CapabilityId[];
  errors: readonly string[];
} {
  const selected = new Set<CapabilityId>();
  const errors: string[] = [];
  const visit = (id: CapabilityId, path: readonly CapabilityId[]) => {
    if (selected.has(id)) return;
    if (path.includes(id)) {
      errors.push(`capability dependency cycle: ${[...path, id].join(" -> ")}`);
      return;
    }
    for (const dependency of capabilityDependencies(id)) {
      if (!hasCapability(dependency)) {
        errors.push(`${id} requires unknown capability ${dependency}`);
      } else visit(dependency, [...path, id]);
    }
    selected.add(id);
  };
  for (const id of ids) visit(id, []);
  return { ordered: capabilityIds.filter((id) => selected.has(id)), errors: [...new Set(errors)] };
}

export class CapabilityRegistry {
  constructor(readonly definitions: Readonly<Record<CapabilityId, CapabilityDefinition>> = CAPABILITIES) {}

  get(id: string): CapabilityDefinition | undefined {
    return isCapabilityId(id) ? this.definitions[id] : undefined;
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
    const diagnostics: string[] = [];
    const notApplicable = new Set(request.notApplicable ?? []);
    const required = request.required.filter(isCapabilityId);
    const optional = (request.optional ?? []).filter(isCapabilityId);
    for (const id of [...request.required, ...(request.optional ?? [])]) {
      if (!isCapabilityId(id)) diagnostics.push(`unknown capability ${id}`);
      if (notApplicable.has(id)) diagnostics.push(`capability ${id} is both selected and not applicable`);
    }
    const requested = [...new Set([...required, ...optional])];
    const resolution = resolveCapabilityDependencies(requested);
    diagnostics.push(...resolution.errors);
    const selected = new Set(resolution.ordered);
    for (const id of resolution.ordered) {
      const definition = this.definitions[id];
      if (request.domain && !definition.applicability.domains.includes(request.domain) && !definition.applicability.domains.includes("shared")) {
        diagnostics.push(`${id} is not applicable to domain ${request.domain}`);
      }
      if (request.jurisdiction && !definition.applicability.jurisdictions.includes("unspecified") && !definition.applicability.jurisdictions.includes(request.jurisdiction)) {
        diagnostics.push(`${id} is not applicable to jurisdiction ${request.jurisdiction}`);
      }
    }
    for (const id of requested) {
      if (!selected.has(id)) diagnostics.push(`could not resolve capability ${id}`);
    }
    return {
      requested, resolved: resolution.ordered,
      required: required.filter((id) => selected.has(id)),
      optional: optional.filter((id) => selected.has(id)),
      diagnostics: [...new Set(diagnostics)],
      executable: diagnostics.length === 0,
    };
  }
}

export const capabilityRegistry = new CapabilityRegistry();

export type CapabilityManifest = {
  schemaVersion: "mailmypdf.capabilities/v1";
  workflow: { id: string; version: number };
  required: readonly CapabilityId[];
  optional: readonly CapabilityId[];
  resolved: readonly CapabilityId[];
  bindings: Readonly<Record<CapabilityId, readonly CapabilityRuntimeBinding[]>>;
};

/** Compiles a validated registry composition into the factory's stable input.
 * The compiler consumes this artifact; it never infers capabilities from code. */
export function compileCapabilityManifest(input: {
  workflowId: string;
  workflowVersion?: number;
  composition: CapabilityComposition;
}): CapabilityManifest {
  if (!input.composition.executable) {
    throw new Error(input.composition.diagnostics.join("\n"));
  }
  const bindings = Object.fromEntries(input.composition.resolved.map((id) => [id, CAPABILITIES[id].runtimeBindings])) as Readonly<Record<CapabilityId, readonly CapabilityRuntimeBinding[]>>;
  return {
    schemaVersion: "mailmypdf.capabilities/v1",
    workflow: { id: input.workflowId, version: input.workflowVersion ?? 1 },
    required: input.composition.required,
    optional: input.composition.optional,
    resolved: input.composition.resolved,
    bindings,
  };
}

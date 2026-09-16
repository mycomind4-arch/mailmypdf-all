export type CapabilityLayer =
  | "foundation"
  | "documents"
  | "intelligence"
  | "experience"
  | "commerce"
  | "delivery";

export type CapabilityId =
  | "identity"
  | "matterState"
  | "aiExecution"
  | "security"
  | "secureUpload"
  | "documentStorage"
  | "documentScanning"
  | "retention"
  | "classification"
  | "extraction"
  | "visionAnalysis"
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
  | "resilience"
  | "observability"
  | "acceptanceTesting"
  | "proofAudit"
  | "archive";

export type CapabilityDefinition = {
  id: CapabilityId;
  name: string;
  owner: "platform" | "vertical" | "hybrid";
  layer: CapabilityLayer;
  implementation: string;
  description: string;
};

const def = (
  id: CapabilityId,
  name: string,
  owner: CapabilityDefinition["owner"],
  layer: CapabilityLayer,
  implementation: string,
  description: string,
): CapabilityDefinition => ({ id, name, owner, layer, implementation, description });

export const CAPABILITIES: Readonly<Record<CapabilityId, CapabilityDefinition>> = {
  identity: def("identity","Identity & authorization","platform","foundation","@mailmypdf/ecosystem","Shared identity, authenticated access, entitlements, and authorization context."),
  matterState: def("matterState","Matter state","platform","foundation","@mailmypdf/step-workflow","Durable matter state, optimistic versioning, dynamic conditional steps, progress, and ownership."),
  aiExecution: def("aiExecution","AI execution gateway","platform","foundation","@mailmypdf/ai","Authorized model routing, timeouts, fallback, schema validation, confidence, prompt versions, and AI provenance."),
  security: def("security","Security boundary","platform","foundation","@mailmypdf/core + @mailmypdf/documents","Fail-closed validation, trusted context, input boundaries, and security controls."),
  secureUpload: def("secureUpload","Secure document intake","platform","documents","@mailmypdf/documents","Consent-aware validation, owner-scoped paths, hashing, quarantine, and rollback-safe registration."),
  documentStorage: def("documentStorage","Document storage","platform","documents","@mailmypdf/documents","Provider-neutral quarantine storage and immutable document metadata contracts."),
  documentScanning: def("documentScanning","Malware & structural scan","platform","documents","@mailmypdf/documents","Hash re-verification, malware verdicts, and static document safety before disclosure."),
  retention: def("retention","Document retention","platform","documents","@mailmypdf/documents","Retention deadlines, deletion-request handling, and purge eligibility."),
  classification: def("classification","Domain classification","hybrid","intelligence","@mailmypdf/document-intelligence","Classify source material using document and domain signals."),
  extraction: def("extraction","Structured extraction","hybrid","intelligence","@mailmypdf/document-intelligence","Extract page text and structured source data while preserving source identity."),
  visionAnalysis: def("visionAnalysis","Visual document analysis","hybrid","intelligence","@mailmypdf/document-intelligence","Provider-neutral PDF/image analysis over scanned-clean, hash-verified source bytes."),
  understand: def("understand","Document understanding","hybrid","intelligence","@mailmypdf/workflows","Convert extracted material into workflow-specific structured understanding."),
  facts: def("facts","Fact model","platform","intelligence","@mailmypdf/intelligence","Normalized facts, entities, statuses, and source-linked assertions."),
  provenance: def("provenance","Source provenance","platform","intelligence","@mailmypdf/intelligence + @mailmypdf/documents","Trace material facts, events, findings, and draft claims back to source documents."),
  timeline: def("timeline","Timeline","platform","intelligence","@mailmypdf/intelligence","Chronology, event normalization, duplicate detection, and gap analysis."),
  deadlines: def("deadlines","Deadline engine","hybrid","intelligence","@mailmypdf/intelligence","Source-grounded temporal rules, deadline computation, and status."),
  findings: def("findings","Findings","hybrid","intelligence","@mailmypdf/intelligence","Domain findings with severity, confidence, provenance, and recommended actions."),
  contradictions: def("contradictions","Contradiction detection","platform","intelligence","@mailmypdf/intelligence","Detect and resolve conflicting source-grounded facts."),
  discrepancies: def("discrepancies","Discrepancy detection","platform","intelligence","@mailmypdf/workflows + @mailmypdf/intelligence","Detect mismatches among claims, facts, requirements, and evidence."),
  requirements: def("requirements","Requirements analysis","hybrid","intelligence","@mailmypdf/workflows","Map source and domain requirements to evidence and response obligations."),
  evidence: def("evidence","Evidence system","platform","intelligence","@mailmypdf/intelligence","Evidence organization, sufficiency, contradictions, gaps, and traceability."),
  research: def("research","Authority / research","hybrid","intelligence","@mailmypdf/workflows","Ground workflow decisions in reviewed authoritative sources when required."),
  risk: def("risk","Risk assessment","platform","intelligence","@mailmypdf/intelligence","Assess supported strength, uncertainty, consequence, and readiness."),
  strategy: def("strategy","Case strategy","hybrid","intelligence","@mailmypdf/workflows","Translate verified facts, requirements, and evidence into a proposed next action."),
  draft: def("draft","Grounded drafting","platform","experience","@mailmypdf/ai + @mailmypdf/workflows","Generate correspondence constrained by verified case state and workflow rules."),
  draftProvenance: def("draftProvenance","Draft provenance","platform","experience","@mailmypdf/intelligence","Trace material draft claims back to verified facts and sources."),
  validation: def("validation","Validation","platform","foundation","@mailmypdf/workflows","Validate required facts, evidence, recipient, packet, and consequential readiness."),
  blockingGate: def("blockingGate","Blocking gates","platform","foundation","@mailmypdf/workflows","Prevent consequential action while critical requirements remain unresolved."),
  humanReview: def("humanReview","Human review","platform","experience","@mailmypdf/step-workflow + @mailmypdf/workflows","Explicit owner review before consequential action."),
  approval: def("approval","Approval","hybrid","experience","@mailmypdf/agent-runtime + @mailmypdf/step-workflow","Role- or policy-based approval with durable state."),
  pdfGeneration: def("pdfGeneration","PDF generation","platform","delivery","@mailmypdf/packet-builder","Produce deterministic printable correspondence PDFs."),
  packetAssembly: def("packetAssembly","Packet assembly","platform","delivery","@mailmypdf/packet-builder","Merge approved correspondence and source attachments with integrity checks and page manifests."),
  pricing: def("pricing","Pricing","platform","commerce","@mailmypdf/pricing","Server-authoritative workflow, page, and mail-service quote calculation."),
  payment: def("payment","Payment","platform","commerce","@mailmypdf/payment-fulfillment","Stripe-backed payment intent/session lifecycle and immutable approval-to-payment binding."),
  addressVerification: def("addressVerification","Address verification","platform","delivery","@mailmypdf/fulfillment","Provider-neutral address preflight, verification, and deliverability semantics."),
  mailing: def("mailing","Authorized mailing","platform","delivery","@mailmypdf/mailing-client + @mailmypdf/payment-fulfillment","Idempotent submission of the approved packet to physical-mail fulfillment."),
  tracking: def("tracking","Tracking","platform","delivery","@mailmypdf/fulfillment + @mailmypdf/mailing-client","Canonical provider lifecycle and tracking state."),
  notifications: def("notifications","Notifications & reminders","platform","experience","@mailmypdf/ecosystem","Idempotent dispatch plus durable due-reminder processing primitives."),
  resilience: def("resilience","Execution resilience","platform","foundation","@mailmypdf/workflows","Reusable idempotency claims, bounded retries, replay-safe results, and duplicate-action prevention."),
  observability: def("observability","Workflow observability","platform","foundation","@mailmypdf/workflows","Structured workflow telemetry with sensitive-content filtering."),
  acceptanceTesting: def("acceptanceTesting","Workflow acceptance testing","platform","foundation","@mailmypdf/workflow-acceptance","Synthetic scenarios, Stripe and mailing simulation, production PDF assembly, run artifacts, and acceptance reports."),
  proofAudit: def("proofAudit","Proof / audit","platform","delivery","@mailmypdf/proof","Tamper-evident custody chains, proof bundle integrity, and delivery artifacts."),
  archive: def("archive","Matter completion archive","platform","delivery","@mailmypdf/proof","Tamper-evident final matter manifest tying the approved document, artifacts, and proof bundle together."),
};

export const capabilityIds = Object.keys(CAPABILITIES) as CapabilityId[];

export function hasCapability(id: string): id is CapabilityId {
  return Object.prototype.hasOwnProperty.call(CAPABILITIES, id);
}

export function capabilitiesByLayer(layer: CapabilityLayer): CapabilityDefinition[] {
  return capabilityIds.map((id) => CAPABILITIES[id]).filter((capability) => capability.layer === layer);
}

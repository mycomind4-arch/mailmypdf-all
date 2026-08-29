export type CapabilityId =
  | "security"
  | "classification"
  | "extraction"
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
  | "mailing"
  | "tracking"
  | "proofAudit";

export type CapabilityDefinition = {
  id: CapabilityId;
  name: string;
  owner: "platform" | "vertical" | "hybrid";
  description: string;
};

export const CAPABILITIES: Readonly<Record<CapabilityId, CapabilityDefinition>> = {
  security: { id: "security", name: "Secure Ingest", owner: "platform", description: "Authorization, safe intake, validation, tenant isolation, and security controls." },
  classification: { id: "classification", name: "Domain Classification", owner: "hybrid", description: "Classify source material using domain-aware rules." },
  extraction: { id: "extraction", name: "Structured Extraction", owner: "hybrid", description: "Extract structured facts from source documents." },
  provenance: { id: "provenance", name: "Source Provenance", owner: "platform", description: "Attach material facts and findings to source evidence." },
  timeline: { id: "timeline", name: "Timeline", owner: "platform", description: "Chronology and event normalization." },
  deadlines: { id: "deadlines", name: "Deadline Engine", owner: "hybrid", description: "Derive and validate deadlines from sources and authoritative rules." },
  findings: { id: "findings", name: "Findings", owner: "hybrid", description: "Domain-specific factual findings and requirement detection." },
  contradictions: { id: "contradictions", name: "Contradiction Detection", owner: "platform", description: "Cross-document and intra-document contradiction analysis." },
  discrepancies: { id: "discrepancies", name: "Discrepancy Detection", owner: "platform", description: "Identify mismatches between source claims, facts, and evidence." },
  requirements: { id: "requirements", name: "Requirements Analysis", owner: "hybrid", description: "Map source and domain requirements to case evidence and response obligations." },
  evidence: { id: "evidence", name: "Evidence", owner: "platform", description: "Evidence organization, sufficiency, linkage, and traceability." },
  research: { id: "research", name: "Authority / Research", owner: "hybrid", description: "Ground domain rules and authoritative sources when required." },
  risk: { id: "risk", name: "Risk Assessment", owner: "platform", description: "Assess supported strength, uncertainty, and consequential risk." },
  strategy: { id: "strategy", name: "Case Strategy", owner: "hybrid", description: "Translate verified facts and domain rules into case-specific strategy." },
  draft: { id: "draft", name: "Grounded Drafting", owner: "platform", description: "Generate correspondence constrained by verified case state." },
  draftProvenance: { id: "draftProvenance", name: "Draft Provenance", owner: "platform", description: "Trace material draft claims back to sources and structured facts." },
  validation: { id: "validation", name: "Validation", owner: "platform", description: "Validate facts, requirements, documents, recipients, and draft integrity." },
  blockingGate: { id: "blockingGate", name: "Blocking Gates", owner: "platform", description: "Prevent consequential action while critical requirements remain unresolved." },
  humanReview: { id: "humanReview", name: "Human Review", owner: "platform", description: "Explicit review before consequential action." },
  approval: { id: "approval", name: "Approval", owner: "hybrid", description: "Role- or policy-based approval where required." },
  mailing: { id: "mailing", name: "Authorized Mailing", owner: "platform", description: "Real MailMyPDF fulfillment integration." },
  tracking: { id: "tracking", name: "Tracking", owner: "platform", description: "Real provider tracking state." },
  proofAudit: { id: "proofAudit", name: "Proof / Audit", owner: "platform", description: "Durable proof, custody, and audit information." },
};

export const capabilityIds = Object.keys(CAPABILITIES) as CapabilityId[];

export function hasCapability(id: string): id is CapabilityId {
  return Object.prototype.hasOwnProperty.call(CAPABILITIES, id);
}

import type { DomainPack, PipelineStage } from "./gold-standard-pipeline.js";

export type DomainCapability =
  | "classification"
  | "extraction"
  | "understand"
  | "facts"
  | "provenance"
  | "timeline"
  | "deadlines"
  | "requirements"
  | "findings"
  | "contradictions"
  | "discrepancies"
  | "evidence"
  | "research"
  | "risk"
  | "strategy"
  | "draft"
  | "validation"
  | "humanReview"
  | "approval"
  | "mailing"
  | "tracking"
  | "proofAudit";

export type DomainPackManifest = {
  id: string;
  displayName: string;
  capabilities: readonly DomainCapability[];
};

const capabilityToMethod: Record<DomainCapability, keyof DomainPack> = {
  classification: "classify",
  extraction: "extract",
  understand: "understand",
  facts: "facts",
  provenance: "provenance",
  timeline: "timeline",
  deadlines: "deadlines",
  requirements: "requirements",
  findings: "findings",
  contradictions: "contradictions",
  discrepancies: "discrepancies",
  evidence: "evidence",
  research: "research",
  risk: "risk",
  strategy: "strategy",
  draft: "draft",
  validation: "validation",
  humanReview: "review",
  approval: "approval",
  mailing: "mailing",
  tracking: "tracking",
  proofAudit: "proofAudit",
};

export type DomainPackDiagnostic = {
  capability: DomainCapability;
  method: keyof DomainPack;
  status: "executable" | "missing";
};

export function diagnoseDomainPack(pack: DomainPack, manifest: DomainPackManifest): DomainPackDiagnostic[] {
  return manifest.capabilities.map((capability) => {
    const method = capabilityToMethod[capability];
    return { capability, method, status: typeof pack[method] === "function" ? "executable" : "missing" };
  });
}

export function isExecutableDomainPack(pack: DomainPack, manifest: DomainPackManifest): boolean {
  return diagnoseDomainPack(pack, manifest).every((diagnostic) => diagnostic.status === "executable");
}

export function missingCapabilities(pack: DomainPack, manifest: DomainPackManifest): DomainCapability[] {
  return diagnoseDomainPack(pack, manifest).filter((diagnostic) => diagnostic.status === "missing").map((diagnostic) => diagnostic.capability);
}

export function isConsequentialStage(stage: PipelineStage): boolean {
  return ["review", "approval", "mailing", "tracking", "proofAudit"].includes(stage);
}

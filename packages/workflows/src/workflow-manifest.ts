import type { AdapterId } from "./adapter-registry.js";
import type { PipelineId } from "./pipeline-registry.js";

export type WorkflowMaturity = "catalog" | "placeholder" | "wired" | "executable" | "gold" | "production-verified";

export type WorkflowCapability =
  | "security"
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
  | "draftProvenance"
  | "validation"
  | "blockingGate"
  | "humanReview"
  | "approval"
  | "mailing"
  | "tracking"
  | "proofAudit";

export type WorkflowManifest = {
  id: string;
  vertical: string;
  title: string;
  route: string;
  pipeline: PipelineId;
  adapters: readonly AdapterId[];
  requiredCapabilities: readonly WorkflowCapability[];
  optionalCapabilities: readonly WorkflowCapability[];
  notApplicableCapabilities: readonly WorkflowCapability[];
  maturity: WorkflowMaturity;
  primaryInput: "document" | "case" | "event" | "request" | "claim";
  requiresHumanReview: boolean;
  allowsConsequentialAction: boolean;
};

export function validateManifestShape(manifest: WorkflowManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id.trim()) errors.push("id is required");
  if (!manifest.vertical.trim()) errors.push("vertical is required");
  if (!manifest.title.trim()) errors.push("title is required");
  if (!manifest.route.startsWith("/")) errors.push("route must start with /");
  if (manifest.adapters.length === 0 && manifest.pipeline !== "P01_CORE_MAIL") errors.push("domain workflows require at least one adapter");
  if (!manifest.requiresHumanReview && manifest.allowsConsequentialAction) errors.push("consequential workflows must require human review");
  if (new Set(manifest.requiredCapabilities).size !== manifest.requiredCapabilities.length) errors.push("requiredCapabilities contains duplicates");
  if (new Set(manifest.optionalCapabilities).size !== manifest.optionalCapabilities.length) errors.push("optionalCapabilities contains duplicates");
  if (new Set(manifest.notApplicableCapabilities).size !== manifest.notApplicableCapabilities.length) errors.push("notApplicableCapabilities contains duplicates");
  const required = new Set(manifest.requiredCapabilities);
  for (const capability of manifest.notApplicableCapabilities) if (required.has(capability)) errors.push(`capability ${capability} cannot be both required and not applicable`);
  return errors;
}

export function isProductionMaturity(maturity: WorkflowMaturity): boolean {
  return maturity === "production-verified";
}

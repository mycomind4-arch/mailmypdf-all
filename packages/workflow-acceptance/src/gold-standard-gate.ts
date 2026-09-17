/*
 * Gold-standard workflow acceptance gate promoted from the legacy Appeal Mail
 * domain. This gate deliberately consumes resolved/executable capability and
 * pipeline information; it never infers capability from labels alone.
 */

export const REQUIRED_GOLD_CAPABILITIES = [
  "classification",
  "extraction",
  "understand",
  "facts",
  "provenance",
  "timeline",
  "deadlines",
  "requirements",
  "findings",
  "contradictions",
  "discrepancies",
  "evidence",
  "research",
  "risk",
  "strategy",
  "draft",
  "validation",
  "humanReview",
  "approval",
  "mailing",
  "tracking",
  "proofAudit",
] as const;

export type GoldCapability = (typeof REQUIRED_GOLD_CAPABILITIES)[number];

export const REQUIRED_GOLD_PIPELINE_STAGES = [
  "security",
  "classification",
  "extraction",
  "understand",
  "facts",
  "provenance",
  "timeline",
  "deadline",
  "requirements",
  "contradiction",
  "findings",
  "discrepancy",
  "evidence",
  "research",
  "risk",
  "strategy",
  "draft",
  "draftProvenance",
  "validation",
  "blockingGate",
  "review",
  "approval",
  "mailing",
  "tracking",
  "proofAudit",
] as const;

export type GoldPipelineStage = (typeof REQUIRED_GOLD_PIPELINE_STAGES)[number];

export interface GoldStandardWorkflowSnapshot {
  /** Capabilities already resolved to executable handlers by the workflow engine. */
  executableCapabilities: readonly string[];
  /** Pipeline stages implemented/registered for this workflow. */
  pipelineStages: readonly string[];
  errors?: readonly string[];
  hasDomainPack: boolean;
  qualityGate?: {
    submissionReadiness?: boolean;
    proofReady?: boolean;
  };
}

export interface GoldStandardGateResult {
  passed: boolean;
  missingCapabilities: GoldCapability[];
  missingPipelineStages: GoldPipelineStage[];
  blockingReasons: string[];
}

export function getExecutableCapabilities(workflow: GoldStandardWorkflowSnapshot): Set<string> {
  return new Set(workflow.executableCapabilities);
}

export function evaluateGoldStandardGate(workflow: GoldStandardWorkflowSnapshot): GoldStandardGateResult {
  const capabilities = getExecutableCapabilities(workflow);
  const stages = new Set(workflow.pipelineStages);
  const missingCapabilities = REQUIRED_GOLD_CAPABILITIES.filter(
    (capability) => !capabilities.has(capability),
  );
  const missingPipelineStages = REQUIRED_GOLD_PIPELINE_STAGES.filter(
    (stage) => !stages.has(stage),
  );
  const blockingReasons: string[] = [...(workflow.errors ?? [])];

  if (!workflow.hasDomainPack) blockingReasons.push("No executable domain pack is registered");
  if (workflow.qualityGate?.proofReady === false) blockingReasons.push("Proof capability is not ready");
  if (workflow.qualityGate?.submissionReadiness === false) blockingReasons.push("Submission readiness gate is not satisfied");
  if (missingCapabilities.length > 0) {
    blockingReasons.push(`Missing executable capabilities: ${missingCapabilities.join(", ")}`);
  }
  if (missingPipelineStages.length > 0) {
    blockingReasons.push(`Missing pipeline stages: ${missingPipelineStages.join(", ")}`);
  }

  return {
    passed: blockingReasons.length === 0,
    missingCapabilities,
    missingPipelineStages,
    blockingReasons,
  };
}

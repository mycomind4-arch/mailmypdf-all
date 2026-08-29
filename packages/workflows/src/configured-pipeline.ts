import { getPipeline, type PipelineId } from "./pipeline-registry.js";
import type { DomainPack, GoldStandardInput, PipelineResult, PipelineStage, StageResult } from "./gold-standard-pipeline.js";

const STAGE_ORDER: readonly PipelineStage[] = [
  "security", "classification", "extraction", "understand", "facts", "provenance",
  "timeline", "deadline", "requirements", "contradiction", "findings", "discrepancy",
  "evidence", "research", "risk", "strategy", "draft", "draftProvenance", "validation",
  "blockingGate", "review", "approval", "mailing", "tracking", "proofAudit",
];

type StageFn = (input: GoldStandardInput, prior: readonly StageResult[]) => Promise<StageResult>;

const methodFor: Readonly<Record<PipelineStage, keyof DomainPack>> = {
  security: "security", classification: "classify", extraction: "extract", understand: "understand",
  facts: "facts", provenance: "provenance", timeline: "timeline", deadline: "deadlines",
  requirements: "requirements", contradiction: "contradictions", findings: "findings", discrepancy: "discrepancies",
  evidence: "evidence", research: "research", risk: "risk", strategy: "strategy", draft: "draft",
  draftProvenance: "draftProvenance", validation: "validation", blockingGate: "validation", review: "review",
  approval: "approval", mailing: "mailing", tracking: "tracking", proofAudit: "proofAudit",
};

function method(pack: DomainPack, stage: PipelineStage): StageFn {
  const fn = pack[methodFor[stage]] as unknown as StageFn;
  return fn;
}

export async function runConfiguredPipeline(
  workflowId: string,
  pipelineId: PipelineId,
  pack: DomainPack,
  input: GoldStandardInput,
  enabledOptionalStages: readonly PipelineStage[] = [],
): Promise<PipelineResult> {
  const pipeline = getPipeline(pipelineId);
  const active = new Set<PipelineStage>([...pipeline.requiredStages as PipelineStage[], ...enabledOptionalStages]);
  const stages: StageResult[] = [];

  const push = async (stage: PipelineStage): Promise<boolean> => {
    try {
      const result = await method(pack, stage)(input, stages);
      if (result.stage !== stage) {
        stages.push({ stage, status: "failed", messages: [`Stage contract mismatch: expected ${stage}, received ${result.stage}.`] });
        return false;
      }
      stages.push(result);
      return result.status !== "failed" && result.status !== "blocked" && result.status !== "warning";
    } catch (error) {
      stages.push({ stage, status: "failed", messages: [error instanceof Error ? error.message : String(error)] });
      return false;
    }
  };

  for (const stage of STAGE_ORDER) {
    if (stage === "blockingGate" || !active.has(stage)) continue;
    if (!(await push(stage))) {
      stages.push({ stage: "blockingGate", status: "blocked", messages: [`Required stage ${stage} did not pass.`] });
      return { workflowId, status: "blocked", stages };
    }
  }

  const blockingGate: StageResult = { stage: "blockingGate", status: "passed", messages: ["Configured pipeline intelligence passed; consequential stages remain gated."] };
  stages.push(blockingGate);

  for (const stage of ["review", "approval", "mailing", "tracking", "proofAudit"] as const) {
    if (!active.has(stage)) continue;
    if (!(await push(stage))) return { workflowId, status: "blocked", stages };
  }

  return { workflowId, status: active.has("review") ? "completed" : "ready_for_review", stages };
}

export function configuredPipelineStages(pipelineId: PipelineId, enabledOptionalStages: readonly PipelineStage[] = []): readonly PipelineStage[] {
  const pipeline = getPipeline(pipelineId);
  return [...new Set([...pipeline.requiredStages as PipelineStage[], ...enabledOptionalStages])]
    .sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
}

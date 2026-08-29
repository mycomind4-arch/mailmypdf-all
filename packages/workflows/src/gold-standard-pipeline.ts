/**
 * Canonical Gold Standard workflow runner.
 *
 * Domain packs own domain intelligence. The runner owns lifecycle semantics,
 * stage ordering, and consequential-action gates.
 */

export type PipelineStage =
  | "security"
  | "classification"
  | "extraction"
  | "understand"
  | "facts"
  | "provenance"
  | "timeline"
  | "deadline"
  | "requirements"
  | "contradiction"
  | "findings"
  | "discrepancy"
  | "evidence"
  | "research"
  | "risk"
  | "strategy"
  | "draft"
  | "draftProvenance"
  | "validation"
  | "blockingGate"
  | "review"
  | "approval"
  | "mailing"
  | "tracking"
  | "proofAudit";

export type StageStatus = "passed" | "warning" | "blocked" | "failed";

export interface StageResult<T = unknown> {
  stage: PipelineStage;
  status: StageStatus;
  data?: T;
  messages: string[];
}

export interface GoldStandardInput {
  documents: readonly unknown[];
  context?: unknown;
}

export interface DomainPack {
  id: string;
  security(input: GoldStandardInput): Promise<StageResult>;
  classify(input: GoldStandardInput): Promise<StageResult>;
  extract(input: GoldStandardInput): Promise<StageResult>;
  understand(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  facts(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  provenance(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  timeline(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  deadlines(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  requirements(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  contradictions(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  findings(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  discrepancies(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  evidence(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  research(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  risk(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  strategy(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  draft(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  draftProvenance(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  validation(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  review(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  approval(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  mailing(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  tracking(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
  proofAudit(input: GoldStandardInput, prior: readonly StageResult[]): Promise<StageResult>;
}

export interface PipelineResult {
  workflowId: string;
  status: "completed" | "ready_for_review" | "blocked" | "failed";
  stages: readonly StageResult[];
}

export const GOLD_STANDARD_PIPELINE_STAGES: readonly PipelineStage[] = [
  "security", "classification", "extraction", "understand", "facts", "provenance",
  "timeline", "deadline", "requirements", "contradiction", "findings", "discrepancy",
  "evidence", "research", "risk", "strategy", "draft", "draftProvenance", "validation",
  "blockingGate", "review", "approval", "mailing", "tracking", "proofAudit",
];

const intelligenceStages: readonly PipelineStage[] = GOLD_STANDARD_PIPELINE_STAGES.slice(0, 19);

export async function runGoldStandardPipeline(
  workflowId: string,
  pack: DomainPack,
  input: GoldStandardInput,
): Promise<PipelineResult> {
  const stages: StageResult[] = [];
  const run = async (stage: PipelineStage, fn: () => Promise<StageResult>) => {
    try {
      const result = await fn();
      if (result.stage !== stage) {
        stages.push({ stage, status: "failed", messages: [`Stage contract mismatch: expected ${stage}, received ${result.stage}.`] });
        return false;
      }
      stages.push(result);
      return result.status !== "failed" && result.status !== "blocked";
    } catch (error) {
      stages.push({ stage, status: "failed", messages: [error instanceof Error ? error.message : String(error)] });
      return false;
    }
  };

  const ordered: Array<[PipelineStage, () => Promise<StageResult>]> = [
    ["security", () => pack.security(input)],
    ["classification", () => pack.classify(input)],
    ["extraction", () => pack.extract(input)],
    ["understand", () => pack.understand(input, stages)],
    ["facts", () => pack.facts(input, stages)],
    ["provenance", () => pack.provenance(input, stages)],
    ["timeline", () => pack.timeline(input, stages)],
    ["deadline", () => pack.deadlines(input, stages)],
    ["requirements", () => pack.requirements(input, stages)],
    ["contradiction", () => pack.contradictions(input, stages)],
    ["findings", () => pack.findings(input, stages)],
    ["discrepancy", () => pack.discrepancies(input, stages)],
    ["evidence", () => pack.evidence(input, stages)],
    ["research", () => pack.research(input, stages)],
    ["risk", () => pack.risk(input, stages)],
    ["strategy", () => pack.strategy(input, stages)],
    ["draft", () => pack.draft(input, stages)],
    ["draftProvenance", () => pack.draftProvenance(input, stages)],
    ["validation", () => pack.validation(input, stages)],
  ];

  let intelligenceOk = true;
  for (const [stage, fn] of ordered) {
    if (!(await run(stage, fn))) {
      intelligenceOk = false;
      break;
    }
  }

  const validation = stages.find((s) => s.stage === "validation");
  const blockingGate: StageResult = {
    stage: "blockingGate",
    status: validation?.status === "passed" ? "passed" : "blocked",
    messages: validation?.status === "passed"
      ? ["All pre-review validation passed; consequential stages may proceed only through their explicit gates."]
      : ["Validation did not pass; review, approval, mailing, tracking, and proof certification are blocked."],
  };
  stages.push(blockingGate);

  if (!intelligenceOk || blockingGate.status !== "passed") {
    return { workflowId, status: "blocked", stages };
  }

  const consequential: Array<[PipelineStage, () => Promise<StageResult>]> = [
    ["review", () => pack.review(input, stages)],
    ["approval", () => pack.approval(input, stages)],
    ["mailing", () => pack.mailing(input, stages)],
    ["tracking", () => pack.tracking(input, stages)],
    ["proofAudit", () => pack.proofAudit(input, stages)],
  ];

  for (const [stage, fn] of consequential) {
    if (!(await run(stage, fn))) return { workflowId, status: "blocked", stages };
  }

  return { workflowId, status: "completed", stages };
}

export function isGoldStandardPipeline(result: PipelineResult): boolean {
  return GOLD_STANDARD_PIPELINE_STAGES.every((stage) => result.stages.find((candidate) => candidate.stage === stage)?.status === "passed");
}

export function hasCompleteIntelligence(result: PipelineResult): boolean {
  return intelligenceStages.every((stage) => result.stages.some((candidate) => candidate.stage === stage && candidate.status === "passed"));
}

import type { DomainPack, GoldStandardInput, PipelineStage, StageResult } from "./gold-standard-pipeline.js";

export type DomainStageHandler = (input: GoldStandardInput, prior: readonly StageResult[]) => Promise<StageResult>;
export type InitialStageHandler = (input: GoldStandardInput) => Promise<StageResult>;

export type DomainPackHandlers = {
  security?: InitialStageHandler;
  classification?: InitialStageHandler;
  extraction?: InitialStageHandler;
  understand?: DomainStageHandler;
  facts?: DomainStageHandler;
  provenance?: DomainStageHandler;
  timeline?: DomainStageHandler;
  deadline?: DomainStageHandler;
  requirements?: DomainStageHandler;
  contradiction?: DomainStageHandler;
  findings?: DomainStageHandler;
  discrepancy?: DomainStageHandler;
  evidence?: DomainStageHandler;
  research?: DomainStageHandler;
  risk?: DomainStageHandler;
  strategy?: DomainStageHandler;
  draft?: DomainStageHandler;
  draftProvenance?: DomainStageHandler;
  validation?: DomainStageHandler;
  review?: DomainStageHandler;
  approval?: DomainStageHandler;
  mailing?: DomainStageHandler;
  tracking?: DomainStageHandler;
  proofAudit?: DomainStageHandler;
};

const failClosed = (id: string, stage: PipelineStage): DomainStageHandler => async () => ({
  stage,
  status: "failed",
  messages: [`Domain pack '${id}' does not implement required stage '${stage}'.`],
});

const first = (handler: InitialStageHandler | undefined, fallback: DomainStageHandler, input: GoldStandardInput, prior: readonly StageResult[]) =>
  handler ? handler(input) : fallback(input, prior);

export function buildDomainPack(id: string, handlers: DomainPackHandlers): DomainPack {
  const stage = (name: keyof DomainPackHandlers, pipelineStage: PipelineStage): DomainStageHandler =>
    handlers[name] ?? failClosed(id, pipelineStage);

  return {
    id,
    security: (input) => first(handlers.security, stage("security", "security"), input, []),
    classify: (input) => first(handlers.classification, stage("classification", "classification"), input, []),
    extract: (input) => first(handlers.extraction, stage("extraction", "extraction"), input, []),
    understand: stage("understand", "understand"),
    facts: stage("facts", "facts"),
    provenance: stage("provenance", "provenance"),
    timeline: stage("timeline", "timeline"),
    deadlines: stage("deadline", "deadline"),
    requirements: stage("requirements", "requirements"),
    contradictions: stage("contradiction", "contradiction"),
    findings: stage("findings", "findings"),
    discrepancies: stage("discrepancy", "discrepancy"),
    evidence: stage("evidence", "evidence"),
    research: stage("research", "research"),
    risk: stage("risk", "risk"),
    strategy: stage("strategy", "strategy"),
    draft: stage("draft", "draft"),
    draftProvenance: stage("draftProvenance", "draftProvenance"),
    validation: stage("validation", "validation"),
    review: stage("review", "review"),
    approval: stage("approval", "approval"),
    mailing: stage("mailing", "mailing"),
    tracking: stage("tracking", "tracking"),
    proofAudit: stage("proofAudit", "proofAudit"),
  };
}

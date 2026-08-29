import { workflows, type WorkflowId, type WorkflowDefinition } from "./workflows";

export type CapabilityStatus = "executable" | "partial" | "catalog" | "gold";

export type WorkflowCapabilityStatus = {
  workflowId: WorkflowId;
  lifecycle: CapabilityStatus;
  implementedDomainAnalysis: boolean;
  hasGoldStageContract: boolean;
  hasPipelineExecutor: boolean;
  readyForMailingGate: boolean;
  notes: string[];
};

const implementedAnalysis: Record<WorkflowId, boolean> = {
  "credit-report": true,
  "debt-validation": false,
  "billing-error": false,
  "unauthorized-charge": false,
};

const hasPipeline: Record<WorkflowId, boolean> = {
  "credit-report": true,
  "debt-validation": false,
  "billing-error": false,
  "unauthorized-charge": false,
};

const toStatus = (definition: WorkflowDefinition): WorkflowCapabilityStatus => {
  const hasAnalysis = implementedAnalysis[definition.id];
  const hasExec = hasPipeline[definition.id];
  const readyForMailingGate = hasAnalysis && hasExec && definition.lifecycle !== "catalog";

  return {
    workflowId: definition.id,
    lifecycle: definition.lifecycle,
    implementedDomainAnalysis: hasAnalysis,
    hasGoldStageContract: definition.goldStandardStages.length > 0,
    hasPipelineExecutor: hasExec,
    readyForMailingGate,
    notes: hasAnalysis && hasExec
      ? ["Full pipeline + consequential enforcement. Gold certified."]
      : hasAnalysis
        ? ["Domain analysis exists; pipeline executor not yet built."]
        : ["No domain analysis or pipeline — do not advertise as executable."],
  };
};

export function getWorkflowCapabilityStatuses(): WorkflowCapabilityStatus[] {
  return (Object.values(workflows) as WorkflowDefinition[]).map(toStatus);
}

export function isWorkflowGoldEligible(id: WorkflowId): boolean {
  const definition = workflows[id];
  const status = toStatus(definition);
  return status.lifecycle === "gold" && status.implementedDomainAnalysis && status.hasPipelineExecutor && status.readyForMailingGate;
}

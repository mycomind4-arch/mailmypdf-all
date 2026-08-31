import type { DisputeAnalysis } from "./gold-standard";
import { getWorkflowProfile } from "./workflow-profiles";
import type { WorkflowId } from "./workflows";

export function evidenceRequirementId(description: string): string {
  return `evidence-${description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function validateWorkflowAnalysisCoverage(input: { workflowId: WorkflowId; documentId: string; analysis: DisputeAnalysis }): string[] {
  const profile = getWorkflowProfile(input.workflowId);
  const errors: string[] = [];
  if (input.analysis.documentId !== input.documentId) errors.push("Analysis documentId does not match the supplied documentId");
  if (input.analysis.classification.type !== input.workflowId) errors.push("Analysis classification type does not match the workflow ID");

  const evidenceIds = new Set(input.analysis.evidence.map((item) => item.id));
  for (const requirement of profile.evidenceRequirements) {
    const id = evidenceRequirementId(requirement);
    if (!evidenceIds.has(id)) errors.push(`Analysis omitted required evidence item: ${requirement}`);
  }

  const factLabels = new Set(input.analysis.facts.map((fact) => fact.label.toLowerCase()));
  for (const requiredFact of profile.requiredFacts) {
    const normalized = requiredFact.toLowerCase().replace(/[^a-z0-9]/g, "");
    const present = [...factLabels].some((label) => label.replace(/[^a-z0-9]/g, "").includes(normalized) || normalized.includes(label.replace(/[^a-z0-9]/g, "")));
    if (!present) errors.push(`Analysis omitted required fact category: ${requiredFact}`);
  }

  return errors;
}

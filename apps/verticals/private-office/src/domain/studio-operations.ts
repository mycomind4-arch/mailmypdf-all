import type { StudioPhase, StudioWorkflow } from "./studio-workflow";

export type StudioOperation =
  | { type: "ADD_PHASE"; phase: StudioPhase }
  | { type: "REMOVE_PHASE"; phaseId: string }
  | { type: "UPDATE_PHASE"; phaseId: string; changes: Partial<StudioPhase> }
  | { type: "ADD_EDGE"; edge: { from: string; to: string; condition?: string } }
  | { type: "REMOVE_EDGE"; from: string; to: string };

export function applyStudioOperation(workflow: StudioWorkflow, operation: StudioOperation): StudioWorkflow {
  switch (operation.type) {
    case "ADD_PHASE":
      return { ...workflow, phases: [...workflow.phases, operation.phase], updatedAt: new Date().toISOString() };
    case "REMOVE_PHASE":
      return { ...workflow, phases: workflow.phases.filter((phase) => phase.id !== operation.phaseId), edges: workflow.edges.filter((edge) => edge.from !== operation.phaseId && edge.to !== operation.phaseId), updatedAt: new Date().toISOString() };
    case "UPDATE_PHASE":
      return { ...workflow, phases: workflow.phases.map((phase) => phase.id === operation.phaseId ? { ...phase, ...operation.changes } : phase), updatedAt: new Date().toISOString() };
    case "ADD_EDGE":
      if (workflow.edges.some((edge) => edge.from === operation.edge.from && edge.to === operation.edge.to)) return workflow;
      return { ...workflow, edges: [...workflow.edges, operation.edge], updatedAt: new Date().toISOString() };
    case "REMOVE_EDGE":
      return { ...workflow, edges: workflow.edges.filter((edge) => !(edge.from === operation.from && edge.to === operation.to)), updatedAt: new Date().toISOString() };
  }
}

export function createStudioHistory(initial: StudioWorkflow) {
  let past: StudioWorkflow[] = [];
  let current = initial;
  let future: StudioWorkflow[] = [];
  return {
    get current() { return current; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    apply(operation: StudioOperation) { past.push(current); current = applyStudioOperation(current, operation); future = []; return current; },
    undo() { if (!past.length) return current; future.push(current); current = past.pop()!; return current; },
    redo() { if (!future.length) return current; past.push(current); current = future.pop()!; return current; },
  };
}

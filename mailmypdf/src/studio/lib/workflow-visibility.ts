export const WORKFLOW_VISIBILITY_KEY = "mailmypdf-hidden-workflows";
export const WORKFLOW_VISIBILITY_EVENT = "mailmypdf-workflow-visibility-changed";

export function readHiddenWorkflowIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const value = JSON.parse(window.localStorage.getItem(WORKFLOW_VISIBILITY_KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeHiddenWorkflowIds(hiddenWorkflowIds: Set<string>) {
  window.localStorage.setItem(WORKFLOW_VISIBILITY_KEY, JSON.stringify([...hiddenWorkflowIds]));
  window.dispatchEvent(new Event(WORKFLOW_VISIBILITY_EVENT));
}

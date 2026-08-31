/* ═══════════════════════════════════════════════════════════
   LEGACY WORKFLOW ADAPTER — thin adapter to the master catalog.
   This file exists for backward compatibility with route files
   that import `workflows` or `WorkflowId`. It derives everything
   from workflow-catalog.ts so there is one source of truth.
   ═══════════════════════════════════════════════════════════ */

import { noticeRespondCatalog, getWorkflowById } from "./workflow-catalog";
import type { MasterWorkflowDefinition } from "./workflow-definition";

export type WorkflowId = "irs-notice" | "court-summons" | "agency-action" | "file-appeal" | "cp2000-response";

export type WorkflowStep = "intro" | "document" | "facts" | "objective" | "draft" | "review" | "attachments" | "recipient" | "mailing" | "checkout" | "submitted";

export interface WorkflowDefinition {
  id: WorkflowId;
  title: string;
  description: string;
  disclaimer: string;
  steps: WorkflowStep[];
}

function toLegacy(def: MasterWorkflowDefinition): WorkflowDefinition {
  const steps = (def.ux?.steps ?? []).map((s) => s.id as WorkflowStep);
  return {
    id: def.id as WorkflowId,
    title: def.title,
    description: def.description,
    disclaimer: def.ux?.disclaimerText ?? def.disclaimer,
    steps: steps.length > 0 ? steps : ["intro", "document", "facts", "objective", "draft", "review", "attachments", "recipient", "mailing", "checkout", "submitted"],
  };
}

export const workflows: Record<string, WorkflowDefinition> = Object.fromEntries(
  noticeRespondCatalog
    .filter((w) => w.lifecycle !== "blueprint" || w.id === "cp2000-response")
    .map((w) => [w.id, toLegacy(w)]),
);

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  const def = getWorkflowById(id);
  return def ? toLegacy(def) : undefined;
}

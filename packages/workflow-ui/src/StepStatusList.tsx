import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type WorkflowStepStatus = "not_started" | "in_progress" | "complete" | "blocked" | "failed";

export interface WorkflowStepStatusItem {
  id: string;
  label: string;
  status: WorkflowStepStatus;
  description?: string;
}

export interface StepStatusListProps {
  steps: WorkflowStepStatusItem[];
  title?: string;
  description?: string;
  onSelect?: (stepId: string) => void;
}

function tone(status: WorkflowStepStatus): StatusPillTone {
  if (status === "complete") return "success";
  if (status === "in_progress") return "info";
  if (status === "blocked" || status === "failed") return "danger";
  return "neutral";
}

/** Shared matter-overview step list distilled from vertical Overview steps. */
export function StepStatusList({
  steps,
  title = "Workflow steps",
  description = "Open any step to review its current status and continue the matter.",
  onSelect,
}: StepStatusListProps) {
  return (
    <SectionCard title={title} description={description}>
      <ol className="wf-step-status-list">
        {steps.map((step, index) => (
          <li key={step.id} className="wf-step-status-row">
            <button
              type="button"
              className="wf-step-status-action"
              onClick={() => onSelect?.(step.id)}
              disabled={!onSelect}
            >
              <span className="wf-recommended-steps-number">{index + 1}</span>
              <span className="wf-step-status-copy">
                <strong>{step.label}</strong>
                {step.description && <span>{step.description}</span>}
              </span>
            </button>
            <StatusPill tone={tone(step.status)} label={step.status.replace(/_/g, " ")} />
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

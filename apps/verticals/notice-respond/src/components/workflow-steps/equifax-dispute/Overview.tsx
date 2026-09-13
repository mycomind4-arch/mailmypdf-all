import { SectionCard, StatusPill } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import {
  equifaxDisputeStepWorkflow,
  type EquifaxDisputeIntake,
} from "@/domain/step-workflows/equifax-dispute";

/** Read-only matter dashboard — not one of the 6 workflow steps, just a summary + quick links. */
export function OverviewStep({ matter, goToStep }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as EquifaxDisputeIntake;
  const itemCount = intake.disputedItems?.length ?? 0;

  return (
    <SectionCard title="Matter overview" description="A summary of this Equifax Dispute matter and quick links to each step.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div>
          <div className="wf-card-eyebrow">Consumer</div>
          <div style={{ fontSize: "0.9rem" }}>{intake.consumerName ?? "Not yet entered"}</div>
        </div>
        <div>
          <div className="wf-card-eyebrow">Disputed items</div>
          <div style={{ fontSize: "0.9rem" }}>{itemCount > 0 ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Not yet entered"}</div>
        </div>
      </div>
      <div className="wf-card-eyebrow" style={{ marginBottom: "0.5rem" }}>
        Steps
      </div>
      <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {equifaxDisputeStepWorkflow.steps.map((step, index) => {
          const status = matter.steps[step.id]?.status ?? "not_started";
          return (
            <li key={step.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <button type="button" onClick={() => goToStep(step.id)} className="wf-btn wf-btn--outline" style={{ flex: 1, justifyContent: "flex-start" }}>
                {index + 1}. {step.label}
              </button>
              <StatusPill
                tone={status === "complete" ? "success" : status === "in_progress" ? "info" : "neutral"}
                label={status === "complete" ? "Complete" : status === "in_progress" ? "In progress" : "Not started"}
              />
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

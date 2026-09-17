import { SectionCard, StatusPill } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "@mailmypdf/workflow-ui";
import {
  administrativeDecisionAppealStepWorkflow,
  type AdministrativeDecisionAppealIntake,
} from "@/domain/step-workflows/administrative-decision-appeal";

/** Read-only matter dashboard — not one of the 8 workflow steps, just a summary + quick links. */
export function OverviewStep({ matter, goToStep }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as AdministrativeDecisionAppealIntake;

  return (
    <SectionCard title="Matter overview" description="A summary of this Administrative Decision Appeal matter and quick links to each step.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div>
          <div className="wf-card-eyebrow">Decision-maker</div>
          <div style={{ fontSize: "0.9rem" }}>{intake.issuer ?? "Not yet entered"}</div>
        </div>
        <div>
          <div className="wf-card-eyebrow">Jurisdiction</div>
          <div style={{ fontSize: "0.9rem" }}>{intake.jurisdiction ?? "Not yet entered"}</div>
        </div>
      </div>
      <div className="wf-card-eyebrow" style={{ marginBottom: "0.5rem" }}>
        Steps
      </div>
      <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {administrativeDecisionAppealStepWorkflow.steps.map((step, index) => {
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

import { SectionCard, StatusPill } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { cp2000StepWorkflow, getCombinedCP2000Data } from "@/domain/step-workflows/cp2000";

/** Read-only matter dashboard — not one of the 8 workflow steps, just a summary + quick links. */
export function OverviewStep({ matter, goToStep }: StepComponentProps) {
  const data = getCombinedCP2000Data(matter);

  return (
    <SectionCard title="Matter overview" description="A summary of this CP2000 matter and quick links to each step.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div>
          <div className="wf-card-eyebrow">Notice number</div>
          <div style={{ fontSize: "0.9rem" }}>{data.noticeNumber ?? "Not yet entered"}</div>
        </div>
        <div>
          <div className="wf-card-eyebrow">Taxpayer</div>
          <div style={{ fontSize: "0.9rem" }}>{data.taxpayerName ?? "Not yet entered"}</div>
        </div>
      </div>
      <div className="wf-card-eyebrow" style={{ marginBottom: "0.5rem" }}>
        Steps
      </div>
      <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {cp2000StepWorkflow.steps.map((step, index) => {
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

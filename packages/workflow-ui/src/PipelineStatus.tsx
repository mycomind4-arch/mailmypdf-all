import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type PipelineStageStatus = "passed" | "failed" | "blocked" | "pending" | "running";

export interface PipelineStage {
  id: string;
  label: string;
  status: PipelineStageStatus;
  detail?: string;
}

export interface PipelineStatusProps {
  stages: PipelineStage[];
  errors?: string[];
  title?: string;
  description?: string;
}

function tone(status: PipelineStageStatus): StatusPillTone {
  if (status === "passed") return "success";
  if (status === "failed" || status === "blocked") return "danger";
  if (status === "running") return "info";
  return "neutral";
}

/** Domain-neutral execution-stage surface extracted from Private Office results. */
export function PipelineStatus({
  stages,
  errors = [],
  title = "Workflow pipeline",
  description = "Current execution stages and any blocking issues.",
}: PipelineStatusProps) {
  return (
    <SectionCard title={title} description={description}>
      <div className="wf-pipeline-list">
        {stages.map((stage) => (
          <div key={stage.id} className="wf-pipeline-row">
            <StatusPill tone={tone(stage.status)} label={stage.status} />
            <div className="wf-pipeline-copy">
              <strong>{stage.label}</strong>
              {stage.detail && <span>{stage.detail}</span>}
            </div>
          </div>
        ))}
      </div>
      {errors.length > 0 && (
        <div className="wf-callout wf-callout--danger">
          <strong>Blocking issues</strong>
          <ul className="wf-callout-list">
            {errors.map((error, index) => <li key={index}>{error}</li>)}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

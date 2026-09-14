export interface StatusCardProps {
  current: number;
  total: number;
  stepLabel: string;
  state: "in_progress" | "ready" | "complete";
  summary: string;
}

const stateLabel: Record<StatusCardProps["state"], string> = {
  in_progress: "In progress",
  ready: "Ready",
  complete: "Complete",
};

/**
 * The right-rail "Workflow status" card: a circular step-count ring, the
 * current step's title, a status pill, and a short summary line.
 */
export function StatusCard({ current, total, stepLabel, state, summary }: StatusCardProps) {
  const fraction = total > 0 ? current / total : 0;
  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - fraction);

  return (
    <div className="wf-card wf-status-card">
      <div className="wf-status-card-eyebrow">Workflow status</div>
      <div className="wf-status-card-body">
        <svg viewBox="0 0 64 64" width="64" height="64" className="wf-status-ring" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--wf-color-rule)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="var(--wf-color-brass)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div>
          <div className="wf-status-card-fraction">
            Step {current} of {total}
          </div>
          <div className="wf-status-card-step">{stepLabel}</div>
          <span className={`wf-pill wf-pill--${state === "complete" ? "success" : state === "ready" ? "info" : "neutral"}`}>
            {stateLabel[state]}
          </span>
        </div>
      </div>
      <p className="wf-status-card-summary">{summary}</p>
    </div>
  );
}

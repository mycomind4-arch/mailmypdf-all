export interface ProofTimelineStep {
  id: string;
  label: string;
  description?: string;
  state?: "complete" | "current" | "pending" | "failed";
  occurredAt?: string;
}

export interface ProofTimelineProps {
  steps: ProofTimelineStep[];
}

/** Shared fulfillment/proof timeline promoted from the consolidated app-local design helpers. */
export function ProofTimeline({ steps }: ProofTimelineProps) {
  return (
    <ol className="wf-proof-timeline">
      {steps.map((step, index) => {
        const state = step.state ?? "pending";
        return (
          <li key={step.id} className={`wf-proof-step wf-proof-step--${state}`}>
            <div className="wf-proof-marker-wrap">
              <span className="wf-proof-marker" aria-hidden="true">
                {state === "complete" ? "✓" : state === "failed" ? "!" : index + 1}
              </span>
              {index < steps.length - 1 && <span className="wf-proof-line" aria-hidden="true" />}
            </div>
            <div className="wf-proof-copy">
              <div className="wf-proof-label">{step.label}</div>
              {step.description && <p>{step.description}</p>}
              {step.occurredAt && <time>{step.occurredAt}</time>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

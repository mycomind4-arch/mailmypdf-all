export interface RecommendedStep {
  label: string;
}

export interface RecommendedStepsRowProps {
  steps: RecommendedStep[];
  continueLabel: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
}

/** The numbered mini-step CTA row at the bottom of each step screen. */
export function RecommendedStepsRow({ steps, continueLabel, onContinue, continueDisabled }: RecommendedStepsRowProps) {
  return (
    <div className="wf-card wf-recommended-steps">
      <div className="wf-card-eyebrow">Recommended next steps</div>
      <p className="wf-recommended-steps-lead">Follow these steps to continue building your evidence record.</p>
      <div className="wf-recommended-steps-row">
        <ol className="wf-recommended-steps-list">
          {steps.map((step, index) => (
            <li key={index} className="wf-recommended-steps-item">
              <span className="wf-recommended-steps-number">{index + 1}</span>
              {step.label}
            </li>
          ))}
        </ol>
        <button type="button" className="wf-btn wf-btn--primary" onClick={onContinue} disabled={continueDisabled}>
          {continueLabel} →
        </button>
      </div>
    </div>
  );
}

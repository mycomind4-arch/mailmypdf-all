export interface StepperStep {
  id: string;
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStepId: string;
  completedStepIds: string[];
  /** Called when a completed or current step is clicked; upcoming steps are not clickable. */
  onStepClick?: (stepId: string) => void;
  className?: string;
}

/**
 * The numbered circle row with a connecting line — complete steps show a
 * check, the current step is a filled ring, upcoming steps are outlined
 * numbers. Matches the "1 2 3 4 5 6 7 8" stepper across every matter screen.
 */
export function Stepper({ steps, currentStepId, completedStepIds, onStepClick, className }: StepperProps) {
  const completed = new Set(completedStepIds);
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <nav className={["wf-stepper", className].filter(Boolean).join(" ")} aria-label="Workflow steps">
      {steps.map((step, index) => {
        const isComplete = completed.has(step.id);
        const isCurrent = step.id === currentStepId;
        const isClickable = Boolean(onStepClick) && (isComplete || isCurrent);
        const state = isComplete ? "complete" : isCurrent ? "current" : "upcoming";

        return (
          <div key={step.id} className={`wf-stepper-item wf-stepper-item--${state}`}>
            {index > 0 && (
              <span
                className={`wf-stepper-line ${index <= currentIndex || isComplete ? "wf-stepper-line--filled" : ""}`}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              className="wf-stepper-marker"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(step.id)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${step.label}`}
            >
              {isComplete ? (
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                index + 1
              )}
            </button>
            <span className="wf-stepper-label">{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

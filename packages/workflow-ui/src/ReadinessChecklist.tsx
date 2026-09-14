export interface ReadinessChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ReadinessChecklistProps {
  title: string;
  items: ReadinessChecklistItem[];
  /** Rendered as "n of total complete" beneath the title, and a progress bar. */
  showProgress?: boolean;
}

/**
 * Generic checkmark/hollow-circle list — extracted from the exact pattern
 * used inline in Private Office's original workflow-authority-page.tsx.
 */
export function ReadinessChecklist({ title, items, showProgress = true }: ReadinessChecklistProps) {
  const doneCount = items.filter((item) => item.done).length;
  const fraction = items.length > 0 ? doneCount / items.length : 0;

  return (
    <div className="wf-card wf-readiness">
      <div className="wf-card-eyebrow">{title}</div>
      {showProgress && (
        <>
          <div className="wf-readiness-progress-label">
            {doneCount} of {items.length} complete
          </div>
          <div className="wf-progress-track">
            <div className="wf-progress-fill" style={{ width: `${Math.round(fraction * 100)}%` }} />
          </div>
        </>
      )}
      <ul className="wf-readiness-list">
        {items.map((item) => (
          <li key={item.id} className="wf-readiness-item">
            <span className={item.done ? "wf-readiness-check wf-readiness-check--done" : "wf-readiness-check"}>
              {item.done ? "✓" : "○"}
            </span>
            <span className={item.done ? "wf-readiness-label wf-readiness-label--done" : "wf-readiness-label"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

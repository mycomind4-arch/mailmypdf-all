import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";

export interface DeadlineSummaryProps {
  label?: string;
  date: string;
  daysRemaining?: number | null;
  sourceLabel?: string;
  verified?: boolean;
  warning?: string;
  onReviewSource?: () => void;
}

/**
 * Shared deadline/provenance surface distilled from Appeal's DeadlineCard.
 * Date calculation and legal/domain significance remain outside presentation.
 */
export function DeadlineSummary({
  label = "Response deadline",
  date,
  daysRemaining = null,
  sourceLabel,
  verified = false,
  warning,
  onReviewSource,
}: DeadlineSummaryProps) {
  const overdue = daysRemaining !== null && daysRemaining < 0;
  const urgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;
  const tone = overdue ? "danger" : urgent ? "warning" : verified ? "success" : "info";

  return (
    <SectionCard
      title={label}
      headerAside={<StatusPill tone={tone} label={verified ? "Verified" : "Review"} />}
    >
      <div className="wf-deadline-date">{date}</div>
      {daysRemaining !== null && (
        <div className={`wf-deadline-count wf-deadline-count--${overdue ? "overdue" : urgent ? "urgent" : "normal"}`}>
          {overdue
            ? `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} overdue`
            : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
        </div>
      )}
      {sourceLabel && (
        <div className="wf-deadline-source">
          <span>Source: {sourceLabel}</span>
          {onReviewSource && (
            <button type="button" className="wf-link-button" onClick={onReviewSource}>
              Review source
            </button>
          )}
        </div>
      )}
      {warning && <div className="wf-callout wf-callout--warning">{warning}</div>}
    </SectionCard>
  );
}

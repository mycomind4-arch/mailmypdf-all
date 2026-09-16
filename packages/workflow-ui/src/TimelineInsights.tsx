import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";

export interface TimelineConflict {
  id: string;
  title: string;
  description?: string;
  severity?: "low" | "medium" | "high";
}

export interface TimelineGap {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
}

export interface TimelineDeadline {
  id: string;
  label: string;
  date: string;
  status?: "confirmed" | "review" | "overdue";
  sourceLabel?: string;
}

export interface TimelineInsightsProps {
  conflicts?: TimelineConflict[];
  gaps?: TimelineGap[];
  deadlines?: TimelineDeadline[];
}

/**
 * Domain-neutral conflict/gap/deadline surface extracted from the standalone
 * Appeal Timeline view. Pair with TimelineList for chronological events.
 */
export function TimelineInsights({
  conflicts = [],
  gaps = [],
  deadlines = [],
}: TimelineInsightsProps) {
  return (
    <div className="wf-insights-grid">
      <SectionCard title="Deadlines" description="Detected and confirmed dates that may affect this matter.">
        {deadlines.length === 0 ? <p className="wf-empty">No deadlines recorded.</p> : (
          <div className="wf-compact-list">
            {deadlines.map((item) => (
              <div key={item.id} className="wf-compact-row">
                <div>
                  <strong>{item.label}</strong>
                  <div className="wf-review-detail">{item.date}{item.sourceLabel ? ` · ${item.sourceLabel}` : ""}</div>
                </div>
                <StatusPill
                  tone={item.status === "confirmed" ? "success" : item.status === "overdue" ? "danger" : "warning"}
                  label={item.status ?? "review"}
                />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard title="Conflicts" description="Conflicting dates, facts, or records that need review.">
        {conflicts.length === 0 ? <p className="wf-empty">No conflicts detected.</p> : (
          <div className="wf-compact-list">
            {conflicts.map((item) => (
              <div key={item.id} className="wf-compact-row">
                <div>
                  <strong>{item.title}</strong>
                  {item.description && <div className="wf-review-detail">{item.description}</div>}
                </div>
                <StatusPill tone={item.severity === "high" ? "danger" : item.severity === "medium" ? "warning" : "neutral"} label={item.severity ?? "review"} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard title="Timeline gaps" description="Missing dates or records that may need user input or another document.">
        {gaps.length === 0 ? <p className="wf-empty">No timeline gaps detected.</p> : (
          <div className="wf-compact-list">
            {gaps.map((item) => (
              <div key={item.id} className="wf-compact-row">
                <div>
                  <strong>{item.title}</strong>
                  {item.description && <div className="wf-review-detail">{item.description}</div>}
                </div>
                <StatusPill tone={item.required ? "warning" : "neutral"} label={item.required ? "Required" : "Optional"} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

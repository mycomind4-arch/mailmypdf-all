import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type StressSeverity = "critical" | "serious" | "moderate" | "low";
export type StressStatus = "open" | "mitigated" | "accepted";

export interface StressTestItem {
  id: string;
  title: string;
  challenge: string;
  severity: StressSeverity;
  status?: StressStatus;
  recommendation?: string;
}

export interface StressTestPanelProps {
  items: StressTestItem[];
  title?: string;
  description?: string;
  onStatusChange?: (itemId: string, status: StressStatus) => void;
}

function severityTone(severity: StressSeverity): StatusPillTone {
  if (severity === "critical") return "danger";
  if (severity === "serious" || severity === "moderate") return "warning";
  return "neutral";
}

/**
 * Shared adversarial-review panel distilled from the Appeal/Benefits stress
 * test views. The component is domain-neutral so any workflow can surface
 * vulnerabilities before drafting or approval.
 */
export function StressTestPanel({
  items,
  title = "Stress test",
  description = "Review weaknesses, likely challenges, and mitigation steps before finalizing the packet.",
  onStatusChange,
}: StressTestPanelProps) {
  return (
    <SectionCard title={title} description={description}>
      {items.length === 0 ? (
        <p className="wf-empty">No stress-test issues found.</p>
      ) : (
        <div className="wf-stress-list">
          {items.map((item) => (
            <article key={item.id} className="wf-stress-item">
              <div className="wf-stress-header">
                <div>
                  <div className="wf-finding-meta">
                    <StatusPill tone={severityTone(item.severity)} label={item.severity} />
                    {item.status && (
                      <StatusPill tone={item.status === "mitigated" ? "success" : "info"} label={item.status} />
                    )}
                  </div>
                  <h3 className="wf-finding-title">{item.title}</h3>
                </div>
              </div>
              <p className="wf-finding-description">{item.challenge}</p>
              {item.recommendation && (
                <div className="wf-stress-recommendation">
                  <strong>Mitigation</strong>
                  <span>{item.recommendation}</span>
                </div>
              )}
              {onStatusChange && (
                <div className="wf-finding-actions">
                  <button type="button" className="wf-btn wf-btn--outline" onClick={() => onStatusChange(item.id, "mitigated")}>
                    Mark mitigated
                  </button>
                  <button type="button" className="wf-btn wf-btn--outline" onClick={() => onStatusChange(item.id, "accepted")}>
                    Accept risk
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

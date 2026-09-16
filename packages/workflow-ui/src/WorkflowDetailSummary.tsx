import type { ReactNode } from "react";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export interface WorkflowDetailMetric {
  label: string;
  value: ReactNode;
  tone?: StatusPillTone;
  mono?: boolean;
}

export interface WorkflowDetailSummaryProps {
  title: string;
  sectionLabel: string;
  backHref?: string;
  backLabel?: string;
  startHref?: string;
  startLabel?: string;
  unavailableLabel?: string;
  metrics?: WorkflowDetailMetric[];
  children?: ReactNode;
}

/**
 * Data-only authenticated workflow detail masthead and status grid.
 *
 * Authority lookup, permissions, admin controls, and routing stay in the host
 * app; this component renders the common operational summary.
 */
export function WorkflowDetailSummary({
  title,
  sectionLabel,
  backHref,
  backLabel,
  startHref,
  startLabel = "Start workflow",
  unavailableLabel = "Runtime not connected",
  metrics = [],
  children,
}: WorkflowDetailSummaryProps) {
  return (
    <section className="wf-detail-summary">
      {backHref && (
        <a href={backHref} className="wf-detail-back">
          ← {backLabel ?? sectionLabel}
        </a>
      )}
      <header className="wf-detail-header">
        <div>
          <div className="wf-card-eyebrow">{sectionLabel}</div>
          <h1 className="wf-detail-title">{title}</h1>
        </div>
        {startHref ? (
          <a href={startHref} className="wf-btn wf-btn--primary">{startLabel} →</a>
        ) : (
          <span className="wf-detail-unavailable">{unavailableLabel}</span>
        )}
      </header>

      {metrics.length > 0 && (
        <div className="wf-detail-metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="wf-detail-metric">
              <div className="wf-detail-metric-label">{metric.label}</div>
              <div className={`wf-detail-metric-value${metric.mono ? " wf-detail-metric-value--mono" : ""}`}>
                {metric.tone ? <StatusPill tone={metric.tone} label={String(metric.value)} /> : metric.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {children}
    </section>
  );
}

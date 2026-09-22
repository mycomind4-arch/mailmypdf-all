import type { ReactNode } from "react";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export interface WorkflowDetailMetric {
  label: string;
  value: ReactNode;
  tone?: StatusPillTone;
  mono?: boolean;
}

/** Content researched for one authenticated workflow, separate from SEO copy and execution readiness. */
export interface WorkflowDetailGuide {
  overview: string;
  appropriateFor?: readonly string[];
  beforeYouBegin?: readonly string[];
  documentsAndFacts?: readonly string[];
  timing?: readonly string[];
  steps?: readonly { title: string; description: string }[];
  reviewChecklist?: readonly string[];
  deliveryAndProof?: readonly string[];
  afterSubmission?: readonly string[];
  costsAndLimits?: readonly string[];
  helpAndAlternatives?: readonly string[];
  cautions?: readonly string[];
  sources?: readonly { label: string; url: string }[];
  scopeNote?: string;
  reviewedOn?: string;
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
  guide?: WorkflowDetailGuide;
  children?: ReactNode;
}

/**
 * Authenticated workflow detail masthead, operational status and researched guide.
 * Authority lookup, permissions, admin controls and routing stay in the host app.
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
  guide,
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

      {guide && (
        <div className="wf-detail-guide">
          <section className="wf-detail-guide-intro" aria-labelledby="workflow-overview">
            <h2 id="workflow-overview">About this workflow</h2>
            <p>{guide.overview}</p>
          </section>
          <div className="wf-detail-guide-grid">
            <GuideList title="Is this the right workflow?" items={guide.appropriateFor} />
            <GuideList title="Before you begin" items={guide.beforeYouBegin} />
            <GuideList title="Documents and facts to gather" items={guide.documentsAndFacts} />
            <GuideList title="Timing and deadlines" items={guide.timing} />
          </div>
          {guide.steps && guide.steps.length > 0 && (
            <section className="wf-detail-guide-panel">
              <h2>How to proceed</h2>
              <ol className="wf-detail-guide-steps">
                {guide.steps.map((step, index) => (
                  <li key={`${index}-${step.title}`}>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <div className="wf-detail-guide-grid">
            <GuideList title="Review before sending" items={guide.reviewChecklist} />
            <GuideList title="Delivery and proof" items={guide.deliveryAndProof} />
            <GuideList title="After submission" items={guide.afterSubmission} />
            <GuideList title="Costs and limits" items={guide.costsAndLimits} />
            <GuideList title="Other options and help" items={guide.helpAndAlternatives} />
            <GuideList title="Things to watch for" items={guide.cautions} />
          </div>
          {guide.sources && guide.sources.length > 0 && (
            <section className="wf-detail-guide-panel">
              <h2>Official guidance and references</h2>
              <ul>
                {guide.sources.map((source) => (
                  <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>
                ))}
              </ul>
              {guide.reviewedOn && <p className="wf-detail-guide-meta">Sources reviewed {guide.reviewedOn}. Check the current notice and applicable rules before acting.</p>}
            </section>
          )}
          {guide.scopeNote && <p className="wf-detail-guide-note">{guide.scopeNote}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function GuideList({ title, items }: { title: string; items?: readonly string[] }) {
  if (!items?.length) return null;
  return (
    <section className="wf-detail-guide-panel">
      <h2>{title}</h2>
      <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
    </section>
  );
}

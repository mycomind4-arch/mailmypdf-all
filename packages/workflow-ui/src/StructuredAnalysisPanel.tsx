import { SectionCard } from "./SectionCard";
import { SourceReference } from "./SourceReference";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type AnalysisConfidence = "high" | "medium" | "low";

export interface StructuredAnalysisFact {
  id: string;
  label: string;
  value: string;
  source?: string;
  documentName?: string;
  page?: number;
  confidence?: AnalysisConfidence;
  onOpenSource?: () => void;
}

export interface StructuredAnalysisIssue {
  id: string;
  title: string;
  description?: string;
  evidenceNeeded?: string[];
  severity?: "info" | "warning" | "danger";
}

export interface StructuredAnalysisPanelProps {
  title?: string;
  providerLabel?: string;
  confidence?: AnalysisConfidence;
  summary?: string;
  urgentActions?: string[];
  facts?: StructuredAnalysisFact[];
  requestedActions?: string[];
  issues?: StructuredAnalysisIssue[];
  evidenceNeeded?: string[];
  uncertainties?: string[];
}

function confidenceTone(confidence?: AnalysisConfidence): StatusPillTone {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "warning";
  if (confidence === "low") return "danger";
  return "neutral";
}

function issueTone(severity?: StructuredAnalysisIssue["severity"]): StatusPillTone {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

/**
 * Provider-agnostic structured document-analysis presentation.
 *
 * Distilled from Notice Respond's LLMAnalysisPanel so workflow apps can render
 * summaries, grounded facts, issues, requested actions, evidence gaps, and
 * uncertainty without importing a provider SDK or vertical-specific domain type.
 */
export function StructuredAnalysisPanel({
  title = "Document analysis",
  providerLabel,
  confidence,
  summary,
  urgentActions = [],
  facts = [],
  requestedActions = [],
  issues = [],
  evidenceNeeded = [],
  uncertainties = [],
}: StructuredAnalysisPanelProps) {
  const hasDetails =
    urgentActions.length > 0 ||
    facts.length > 0 ||
    requestedActions.length > 0 ||
    issues.length > 0 ||
    evidenceNeeded.length > 0 ||
    uncertainties.length > 0;

  return (
    <div className="wf-analysis-stack">
      <SectionCard
        title={title}
        headerAside={
          <div className="wf-analysis-badges">
            {providerLabel && <StatusPill tone="info" label={providerLabel} />}
            {confidence && <StatusPill tone={confidenceTone(confidence)} label={`${confidence} confidence`} />}
          </div>
        }
      >
        {summary ? (
          <p className="wf-analysis-summary">{summary}</p>
        ) : !hasDetails ? (
          <p className="wf-empty">No structured analysis is available yet.</p>
        ) : null}
      </SectionCard>

      {urgentActions.length > 0 && (
        <SectionCard title="Urgent actions">
          <ol className="wf-analysis-list wf-analysis-list--urgent">
            {urgentActions.map((action, index) => (
              <li key={`${index}-${action}`}>
                <span className="wf-analysis-index">{index + 1}</span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {facts.length > 0 && (
        <SectionCard title="Extracted facts" description="Review important values against their source before relying on them.">
          <dl className="wf-analysis-facts">
            {facts.map((fact) => (
              <div key={fact.id} className="wf-analysis-fact">
                <div className="wf-analysis-fact-copy">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
                {fact.documentName ? (
                  <SourceReference
                    documentName={fact.documentName}
                    page={fact.page}
                    excerpt={fact.source}
                    confidence={fact.confidence}
                    onOpen={fact.onOpenSource}
                  />
                ) : fact.source ? (
                  <div className="wf-analysis-source">Source: {fact.source}</div>
                ) : null}
              </div>
            ))}
          </dl>
        </SectionCard>
      )}

      {requestedActions.length > 0 && (
        <SectionCard title="Requested actions">
          <ol className="wf-analysis-list">
            {requestedActions.map((action, index) => (
              <li key={`${index}-${action}`}>
                <span className="wf-analysis-index">{index + 1}</span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {issues.length > 0 && (
        <SectionCard title="Issues found">
          <div className="wf-analysis-issues">
            {issues.map((issue) => (
              <article key={issue.id} className="wf-analysis-issue">
                <div className="wf-analysis-issue-heading">
                  <strong>{issue.title}</strong>
                  {issue.severity && <StatusPill tone={issueTone(issue.severity)} label={issue.severity} />}
                </div>
                {issue.description && <p>{issue.description}</p>}
                {issue.evidenceNeeded && issue.evidenceNeeded.length > 0 && (
                  <div className="wf-analysis-evidence-needed">
                    <span>Evidence needed</span>
                    <ul>
                      {issue.evidenceNeeded.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      {evidenceNeeded.length > 0 && (
        <SectionCard title="Evidence to gather">
          <ul className="wf-analysis-checklist">
            {evidenceNeeded.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </SectionCard>
      )}

      {uncertainties.length > 0 && (
        <SectionCard title="Uncertainties" description="These points need clarification or stronger source material.">
          <ul className="wf-analysis-checklist wf-analysis-checklist--uncertain">
            {uncertainties.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

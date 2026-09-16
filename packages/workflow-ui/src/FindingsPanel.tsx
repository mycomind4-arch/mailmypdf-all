import type { ReactNode } from "react";
import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type FindingConfidence = "high" | "medium" | "low";
export type FindingStatus = "open" | "confirmed" | "used" | "dismissed";

export interface WorkflowFinding {
  id: string;
  title: string;
  description?: string;
  category?: string;
  confidence?: FindingConfidence;
  status?: FindingStatus;
  sourceLabel?: string;
  detail?: ReactNode;
}

export interface FindingsPanelProps {
  title?: string;
  description?: string;
  findings: WorkflowFinding[];
  emptyLabel?: ReactNode;
  onStatusChange?: (findingId: string, status: FindingStatus) => void;
}

function confidenceTone(confidence?: FindingConfidence): StatusPillTone {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "warning";
  return "neutral";
}

function statusTone(status?: FindingStatus): StatusPillTone {
  if (status === "confirmed" || status === "used") return "success";
  if (status === "dismissed") return "neutral";
  return "info";
}

/**
 * Shared matter finding surface, distilled from the Appeal/Benefits X-Ray views.
 * It intentionally owns presentation only; domain logic and finding mutation
 * stay in the workflow/runtime packages.
 */
export function FindingsPanel({
  title = "Findings",
  description = "Review extracted findings and connect them to the matter record.",
  findings,
  emptyLabel = "No findings yet.",
  onStatusChange,
}: FindingsPanelProps) {
  return (
    <SectionCard title={title} description={description}>
      {findings.length === 0 ? (
        <p className="wf-empty">{emptyLabel}</p>
      ) : (
        <div className="wf-finding-list">
          {findings.map((finding) => (
            <article key={finding.id} className="wf-finding">
              <div className="wf-finding-main">
                <div className="wf-finding-meta">
                  {finding.category && <span className="wf-card-eyebrow">{finding.category}</span>}
                  {finding.confidence && (
                    <StatusPill tone={confidenceTone(finding.confidence)} label={`${finding.confidence} confidence`} />
                  )}
                  {finding.status && <StatusPill tone={statusTone(finding.status)} label={finding.status} />}
                </div>
                <h3 className="wf-finding-title">{finding.title}</h3>
                {finding.description && <p className="wf-finding-description">{finding.description}</p>}
                {finding.sourceLabel && <div className="wf-finding-source">Source: {finding.sourceLabel}</div>}
                {finding.detail && <div className="wf-finding-detail">{finding.detail}</div>}
              </div>
              {onStatusChange && (
                <div className="wf-finding-actions">
                  <button type="button" className="wf-btn wf-btn--outline" onClick={() => onStatusChange(finding.id, "confirmed")}>
                    Confirm
                  </button>
                  <button type="button" className="wf-btn wf-btn--outline" onClick={() => onStatusChange(finding.id, "used")}>
                    Use
                  </button>
                  <button type="button" className="wf-btn wf-btn--outline" onClick={() => onStatusChange(finding.id, "dismissed")}>
                    Dismiss
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

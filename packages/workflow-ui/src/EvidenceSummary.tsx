import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type EvidenceItemStatus = "verified" | "provided" | "missing" | "recommended" | "review";

export interface EvidenceSummaryItem {
  id: string;
  title: string;
  description?: string;
  status: EvidenceItemStatus;
  sourceLabels?: string[];
}

export interface EvidenceSummaryProps {
  items: EvidenceSummaryItem[];
  title?: string;
  description?: string;
}

function tone(status: EvidenceItemStatus): StatusPillTone {
  if (status === "verified" || status === "provided") return "success";
  if (status === "missing") return "danger";
  if (status === "recommended" || status === "review") return "warning";
  return "neutral";
}

/** Shared evidence requirement/list surface distilled from multiple workflows. */
export function EvidenceSummary({
  items,
  title = "Evidence",
  description = "Supporting records connected to this matter and any evidence gaps that still need attention.",
}: EvidenceSummaryProps) {
  return (
    <SectionCard title={title} description={description}>
      {items.length === 0 ? <p className="wf-empty">No evidence recorded yet.</p> : (
        <div className="wf-evidence-list">
          {items.map((item) => (
            <article key={item.id} className="wf-evidence-row">
              <StatusPill tone={tone(item.status)} label={item.status} />
              <div className="wf-evidence-copy">
                <strong>{item.title}</strong>
                {item.description && <p>{item.description}</p>}
                {item.sourceLabels && item.sourceLabels.length > 0 && (
                  <div className="wf-evidence-sources">
                    {item.sourceLabels.map((source) => <span key={source} className="wf-pill wf-pill--neutral">{source}</span>)}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

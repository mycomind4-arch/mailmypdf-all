import { useMemo, useState } from "react";
import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type CommunicationType = "draft" | "sent" | "delivered" | "reply" | "note";
export type CommunicationFilter = "all" | "drafts" | "sent" | "replies" | "notes";

export interface CommunicationItem {
  id: string;
  type: CommunicationType;
  title: string;
  date: string;
  recipient?: string;
  workflow?: string;
  trackingNumber?: string;
  proofHash?: string;
  evidenceCount?: number;
  excerpt?: string;
}

export interface CommunicationListProps {
  communications: CommunicationItem[];
  title?: string;
  description?: string;
  emptyLabel?: string;
  onSelect?: (communicationId: string) => void;
  showFilters?: boolean;
}

function communicationTone(type: CommunicationType): StatusPillTone {
  if (type === "delivered") return "success";
  if (type === "sent") return "info";
  if (type === "reply") return "warning";
  return "neutral";
}

/** Matter communication history distilled from Code Enforcement's communications center. */
export function CommunicationList({
  communications,
  title = "Communications",
  description = "Drafts, sent mail, replies, notes, and proof records linked to this matter.",
  emptyLabel = "No communications yet.",
  onSelect,
  showFilters = true,
}: CommunicationListProps) {
  const [filter, setFilter] = useState<CommunicationFilter>("all");
  const filtered = useMemo(() => communications.filter((item) => {
    if (filter === "drafts") return item.type === "draft";
    if (filter === "sent") return item.type === "sent" || item.type === "delivered";
    if (filter === "replies") return item.type === "reply";
    if (filter === "notes") return item.type === "note";
    return true;
  }), [communications, filter]);

  const filters: Array<{ id: CommunicationFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "drafts", label: "Drafts" },
    { id: "sent", label: "Sent" },
    { id: "replies", label: "Replies" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <SectionCard title={title} description={description}>
      {showFilters && communications.length > 0 && (
        <div className="wf-filter-row" role="group" aria-label="Communication filters">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`wf-filter-chip${filter === item.id ? " is-active" : ""}`}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="wf-empty">{emptyLabel}</p>
      ) : (
        <div className="wf-communication-list">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className="wf-communication-row"
              onClick={() => onSelect?.(item.id)}
              disabled={!onSelect}
            >
              <div className="wf-communication-top">
                <div className="wf-finding-meta">
                  <StatusPill tone={communicationTone(item.type)} label={item.type} />
                  {item.workflow && <span className="wf-pill wf-pill--info">{item.workflow}</span>}
                  {item.proofHash && <span className="wf-pill wf-pill--success">Proof on file</span>}
                </div>
                <time>{item.date}</time>
              </div>
              <strong className="wf-communication-title">{item.title}</strong>
              {item.recipient && <span className="wf-communication-recipient">To: {item.recipient}</span>}
              {item.excerpt && <span className="wf-communication-excerpt">{item.excerpt}</span>}
              <span className="wf-communication-meta">
                {item.trackingNumber && <span>Tracking: {item.trackingNumber}</span>}
                {item.evidenceCount !== undefined && item.evidenceCount > 0 && <span>{item.evidenceCount} evidence link{item.evidenceCount === 1 ? "" : "s"}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

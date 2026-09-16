import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export interface PacketSummaryItem {
  id: string;
  title: string;
  meta?: string;
  description?: string;
  status?: string;
  tone?: StatusPillTone;
}

export interface PacketSummaryProps {
  items: PacketSummaryItem[];
  title?: string;
  description?: string;
  totalPages?: number;
}

/** Shared final-packet inventory extracted from vertical review steps. */
export function PacketSummary({
  items,
  title = "Packet contents",
  description = "These are the documents currently included in the outgoing packet.",
  totalPages,
}: PacketSummaryProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      headerAside={totalPages !== undefined ? <StatusPill tone="info" label={`${totalPages} pages`} /> : undefined}
    >
      {items.length === 0 ? (
        <p className="wf-empty">No packet documents yet.</p>
      ) : (
        <div className="wf-packet-grid">
          {items.map((item) => (
            <article key={item.id} className="wf-packet-item">
              <div className="wf-packet-item-header">
                <strong>{item.title}</strong>
                {item.status && <StatusPill tone={item.tone ?? "success"} label={item.status} />}
              </div>
              {item.meta && <div className="wf-packet-meta">{item.meta}</div>}
              {item.description && <p className="wf-packet-description">{item.description}</p>}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

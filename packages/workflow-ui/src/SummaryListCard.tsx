import type { ReactNode } from "react";

export interface SummaryListItem {
  icon?: ReactNode;
  label: string;
}

export interface SummaryListCardProps {
  title: string;
  items: SummaryListItem[];
  note?: string;
}

/** The right-rail "Estimated mailing package" style summary list. */
export function SummaryListCard({ title, items, note }: SummaryListCardProps) {
  return (
    <div className="wf-card wf-summary-list">
      <div className="wf-card-eyebrow">{title}</div>
      <ul className="wf-summary-list-items">
        {items.map((item, index) => (
          <li key={index} className="wf-summary-list-item">
            {item.icon && <span className="wf-summary-list-icon">{item.icon}</span>}
            {item.label}
          </li>
        ))}
      </ul>
      {note && <p className="wf-summary-list-note">{note}</p>}
    </div>
  );
}

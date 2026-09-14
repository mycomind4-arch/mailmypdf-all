import type { ReactNode } from "react";

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  tag?: string;
  linkedFiles?: string[];
  onEdit?: () => void;
}

export interface TimelineListProps {
  events: TimelineEvent[];
  emptyLabel?: ReactNode;
}

/** Dated event list with a connecting line — used by the Timeline builder step. */
export function TimelineList({ events, emptyLabel }: TimelineListProps) {
  if (events.length === 0) {
    return <p className="wf-timeline-empty">{emptyLabel ?? "No events yet."}</p>;
  }
  return (
    <ol className="wf-timeline">
      {events.map((event) => (
        <li key={event.id} className="wf-timeline-item">
          <span className="wf-timeline-dot" aria-hidden="true" />
          <div className="wf-timeline-content">
            <div className="wf-timeline-row">
              <span className="wf-timeline-date">{event.date}</span>
              {event.tag && <span className="wf-pill wf-pill--neutral">{event.tag}</span>}
              {event.onEdit && (
                <button type="button" className="wf-timeline-edit" onClick={event.onEdit} aria-label={`Edit ${event.title}`}>
                  ✎
                </button>
              )}
            </div>
            <div className="wf-timeline-title">{event.title}</div>
            {event.description && <p className="wf-timeline-description">{event.description}</p>}
            {event.linkedFiles && event.linkedFiles.length > 0 && (
              <div className="wf-timeline-files">
                {event.linkedFiles.map((file) => (
                  <span key={file} className="wf-pill wf-pill--neutral">
                    {file}
                  </span>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

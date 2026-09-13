import type { ReactNode } from "react";

export interface FileRowItem {
  id: string;
  name: string;
  meta?: string;
  category?: string;
  icon?: ReactNode;
}

export interface FileListProps {
  items: FileRowItem[];
  onRemove?: (id: string) => void;
}

/** Uploaded-document row list: type icon, name, meta, category badge, remove action. */
export function FileList({ items, onRemove }: FileListProps) {
  if (items.length === 0) {
    return <p className="wf-file-list-empty">No files uploaded yet.</p>;
  }
  return (
    <ul className="wf-file-list">
      {items.map((item) => (
        <li key={item.id} className="wf-file-row">
          <span className="wf-file-row-icon">{item.icon ?? "📄"}</span>
          <span className="wf-file-row-name">{item.name}</span>
          {item.meta && <span className="wf-file-row-meta">{item.meta}</span>}
          {item.category && <span className="wf-pill wf-pill--neutral">{item.category}</span>}
          {onRemove && (
            <button
              type="button"
              className="wf-file-row-remove"
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemove(item.id)}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

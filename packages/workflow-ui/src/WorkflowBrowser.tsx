import { useMemo, useState } from "react";
import { StatusPill } from "./StatusPill";

export type WorkflowAvailabilityFilter = "all" | "ready" | "not-connected";

export interface WorkflowBrowserItem {
  id: string;
  title: string;
  sectionId: string;
  sectionLabel: string;
  href: string;
  ready: boolean;
  description?: string;
  meta?: string;
}

export interface WorkflowBrowserProps {
  items: WorkflowBrowserItem[];
  title?: string;
  eyebrow?: string;
  description?: string;
  initialQuery?: string;
  emptyLabel?: string;
  readyLabel?: string;
  unavailableLabel?: string;
}

/**
 * Router- and registry-agnostic authenticated workflow browser.
 *
 * Apps provide canonical workflow rows; this package owns only search/filter
 * state and presentation. This keeps authority/runtime lookup out of shared UI.
 */
export function WorkflowBrowser({
  items,
  title = "Workflows",
  eyebrow = "Workspace",
  description = "Choose the workflow that matches the matter you are working on.",
  initialQuery = "",
  emptyLabel = "No workflows match the current filters.",
  readyLabel = "Ready",
  unavailableLabel = "Not connected",
}: WorkflowBrowserProps) {
  const [query, setQuery] = useState(initialQuery);
  const [availability, setAvailability] = useState<WorkflowAvailabilityFilter>("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        item.sectionLabel.toLowerCase().includes(needle) ||
        item.id.toLowerCase().includes(needle) ||
        item.description?.toLowerCase().includes(needle);

      const matchesAvailability =
        availability === "all" ||
        (availability === "ready" && item.ready) ||
        (availability === "not-connected" && !item.ready);

      return matchesQuery && matchesAvailability;
    });
  }, [availability, items, query]);

  return (
    <section className="wf-browser">
      <header className="wf-browser-header">
        <div>
          <div className="wf-card-eyebrow">{eyebrow}</div>
          <h1 className="wf-browser-title">{title}</h1>
          {description && <p className="wf-browser-description">{description}</p>}
        </div>
        <div className="wf-browser-count">{rows.length} of {items.length}</div>
      </header>

      <div className="wf-browser-tools">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          className="wf-browser-search"
          placeholder="Search workflows…"
          aria-label="Search workflows"
        />
        <div className="wf-filter-row wf-browser-filters" role="group" aria-label="Workflow availability">
          {([
            ["all", "All"],
            ["ready", readyLabel],
            ["not-connected", unavailableLabel],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`wf-filter-chip${availability === value ? " is-active" : ""}`}
              onClick={() => setAvailability(value)}
              aria-pressed={availability === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="wf-state-panel wf-browser-empty">
          <div className="wf-state-title">{emptyLabel}</div>
        </div>
      ) : (
        <div className="wf-browser-list">
          {rows.map((item) => (
            <a key={item.id} href={item.href} className="wf-browser-row">
              <div className="wf-browser-row-main">
                <div className="wf-browser-row-top">
                  <span className="wf-card-eyebrow">{item.sectionLabel}</span>
                  <StatusPill tone={item.ready ? "success" : "neutral"} label={item.ready ? readyLabel : unavailableLabel} />
                </div>
                <strong className="wf-browser-row-title">{item.title}</strong>
                {item.description && <p className="wf-browser-row-description">{item.description}</p>}
                {item.meta && <div className="wf-browser-row-meta">{item.meta}</div>}
              </div>
              <span className="wf-browser-row-arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

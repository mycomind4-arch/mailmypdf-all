import { useMemo, useState } from "react";
import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export interface MatterListItem {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  statusTone?: StatusPillTone;
  updatedAt?: string;
  deadline?: string;
  count?: number;
  countLabel?: string;
  badges?: Array<{ label: string; tone?: StatusPillTone }>;
  searchText?: string;
}

export interface MatterListProps {
  matters: MatterListItem[];
  selectedMatterId?: string | null;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  onSelect: (matterId: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** Searchable matter list distilled from Code Enforcement's pipeline case list. */
export function MatterList({
  matters,
  selectedMatterId = null,
  title = "Matters",
  description = "Your active and completed matters.",
  searchPlaceholder = "Search matters…",
  emptyLabel = "No matters yet.",
  onSelect,
  onRefresh,
  refreshing = false,
}: MatterListProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return matters;
    return matters.filter((matter) =>
      [matter.title, matter.subtitle, matter.status, matter.searchText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [matters, query]);

  return (
    <SectionCard
      title={title}
      description={description}
      headerAside={
        <div className="wf-matter-list-tools">
          <input
            className="wf-matter-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {onRefresh && (
            <button type="button" className="wf-btn wf-btn--outline" disabled={refreshing} onClick={onRefresh}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <p className="wf-empty">{matters.length === 0 ? emptyLabel : "No matters match your search."}</p>
      ) : (
        <div className="wf-matter-list">
          {filtered.map((matter) => (
            <button
              key={matter.id}
              type="button"
              className={`wf-matter-row${selectedMatterId === matter.id ? " is-selected" : ""}`}
              onClick={() => onSelect(matter.id)}
            >
              <span className="wf-matter-main">
                <span className="wf-matter-title-row">
                  <strong>{matter.title}</strong>
                  {matter.badges?.map((badge) => (
                    <StatusPill key={badge.label} tone={badge.tone ?? "neutral"} label={badge.label} />
                  ))}
                </span>
                {matter.subtitle && <span className="wf-matter-subtitle">{matter.subtitle}</span>}
              </span>
              <span className="wf-matter-side">
                {matter.count !== undefined && matter.count > 0 && (
                  <span className="wf-matter-count">
                    {matter.count} {matter.countLabel ?? "item"}{matter.count === 1 ? "" : "s"}
                  </span>
                )}
                {matter.deadline && <span className="wf-matter-deadline">Due {matter.deadline}</span>}
                {matter.updatedAt && <span className="wf-matter-updated">{matter.updatedAt}</span>}
                <StatusPill tone={matter.statusTone ?? "neutral"} label={matter.status} />
              </span>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

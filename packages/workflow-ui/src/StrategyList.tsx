import { SectionCard } from "./SectionCard";

export interface StrategyItem {
  id: string;
  title?: string;
  description: string;
}

export interface StrategyListProps {
  items: Array<string | StrategyItem>;
  title?: string;
  description?: string;
}

/** Shared recommendations/strategy presentation; strategy generation lives elsewhere. */
export function StrategyList({
  items,
  title = "Recommended next steps",
  description = "Review the current recommendations before moving to drafting or fulfillment.",
}: StrategyListProps) {
  return (
    <SectionCard title={title} description={description}>
      {items.length === 0 ? <p className="wf-empty">No recommendations yet.</p> : (
        <ol className="wf-strategy-list">
          {items.map((item, index) => {
            const normalized = typeof item === "string" ? { id: String(index), description: item } : item;
            return (
              <li key={normalized.id} className="wf-strategy-item">
                <span className="wf-recommended-steps-number">{index + 1}</span>
                <div>
                  {"title" in normalized && normalized.title && <strong>{normalized.title}</strong>}
                  <p>{normalized.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}

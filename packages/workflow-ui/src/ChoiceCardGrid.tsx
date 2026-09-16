import type { ReactNode } from "react";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export interface ChoiceCardOption {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  badgeTone?: StatusPillTone;
  meta?: ReactNode;
  disabled?: boolean;
}

export interface ChoiceCardGridProps {
  options: ChoiceCardOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  mode?: "single" | "multiple";
  columns?: 1 | 2 | 3;
  ariaLabel?: string;
}

/** Card-based single/multi-select control distilled from Records Request builders. */
export function ChoiceCardGrid({
  options,
  selected,
  onChange,
  mode = "multiple",
  columns = 2,
  ariaLabel = "Choices",
}: ChoiceCardGridProps) {
  function toggle(id: string) {
    if (mode === "single") {
      onChange(selected.includes(id) ? [] : [id]);
      return;
    }
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  }

  return (
    <div className={`wf-choice-grid wf-choice-grid--${columns}`} role={mode === "single" ? "radiogroup" : "group"} aria-label={ariaLabel}>
      {options.map((option) => {
        const active = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            className={`wf-choice-card${active ? " wf-choice-card--selected" : ""}`}
            role={mode === "single" ? "radio" : undefined}
            aria-checked={mode === "single" ? active : undefined}
            aria-pressed={mode === "multiple" ? active : undefined}
            disabled={option.disabled}
            onClick={() => toggle(option.id)}
          >
            <span className="wf-choice-control" aria-hidden="true">{active ? "✓" : ""}</span>
            <span className="wf-choice-copy">
              <span className="wf-choice-title-row">
                <strong>{option.title}</strong>
                {option.badge && <StatusPill tone={option.badgeTone ?? "neutral"} label={option.badge} />}
              </span>
              {option.description && <span className="wf-choice-description">{option.description}</span>}
              {option.meta && <span className="wf-choice-meta">{option.meta}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

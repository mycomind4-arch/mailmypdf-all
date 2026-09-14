export type StatusPillTone = "success" | "info" | "warning" | "neutral" | "danger";

export interface StatusPillProps {
  tone: StatusPillTone;
  label: string;
  className?: string;
}

/**
 * A tone-mapped pill for step/checklist/gate status labels — "Strong",
 * "Good", "Needs review", "Optional", "Ready", "In progress", "Approval
 * required", etc. Any workflow can invent its own labels; the tone drives
 * the color.
 */
export function StatusPill({ tone, label, className }: StatusPillProps) {
  return (
    <span className={["wf-pill", `wf-pill--${tone}`, className].filter(Boolean).join(" ")}>
      {label}
    </span>
  );
}

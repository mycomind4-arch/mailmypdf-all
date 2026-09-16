import type { ReactNode } from "react";

export type StatePanelTone = "loading" | "processing" | "error" | "empty" | "waiting" | "success";

export interface StatePanelProps {
  tone: StatePanelTone;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

/** Generic loading/error/empty/provider-wait surface promoted from app-local shared states. */
export function StatePanel({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: StatePanelProps) {
  return (
    <div className={`wf-state-panel wf-state-panel--${tone}`} role={tone === "error" ? "alert" : undefined}>
      {(tone === "loading" || tone === "processing") && <span className="wf-state-spinner" aria-hidden="true" />}
      {tone === "success" && <span className="wf-state-icon" aria-hidden="true">✓</span>}
      {tone === "error" && <span className="wf-state-icon" aria-hidden="true">!</span>}
      {tone === "waiting" && <span className="wf-state-icon" aria-hidden="true">◷</span>}
      <div className="wf-state-title">{title}</div>
      {description && <p className="wf-state-description">{description}</p>}
      {children}
      {actionLabel && onAction && (
        <button type="button" className="wf-btn wf-btn--outline" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

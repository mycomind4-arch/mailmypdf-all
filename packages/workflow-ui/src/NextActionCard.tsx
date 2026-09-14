import type { ReactNode } from "react";

export interface NextActionCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
  href?: string;
}

/** The right-rail "Next recommended action" card. */
export function NextActionCard({ icon, title, description, actionLabel, onAction, href }: NextActionCardProps) {
  return (
    <div className="wf-card wf-next-action">
      <div className="wf-card-eyebrow">Next recommended action</div>
      <div className="wf-next-action-title">
        {icon && <span className="wf-next-action-icon">{icon}</span>}
        {title}
      </div>
      <p className="wf-next-action-description">{description}</p>
      {href ? (
        <a href={href} className="wf-btn wf-btn--outline wf-btn--block">
          {actionLabel}
        </a>
      ) : (
        <button type="button" onClick={onAction} className="wf-btn wf-btn--outline wf-btn--block">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

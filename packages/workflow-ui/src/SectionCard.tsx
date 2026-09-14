import type { ReactNode } from "react";

export interface SectionCardProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Rendered top-right of the header, e.g. a "Structured record" badge. */
  headerAside?: ReactNode;
  children?: ReactNode;
  /** Rendered as a bordered-off footer row, typically a primary CTA. */
  footer?: ReactNode;
  className?: string;
}

/**
 * The bordered white card used for every major content block — Matter
 * analysis, Evidence builder, Timeline builder, Draft notice, etc.
 */
export function SectionCard({ icon, title, description, headerAside, children, footer, className }: SectionCardProps) {
  return (
    <div className={["wf-card wf-section-card", className].filter(Boolean).join(" ")}>
      <div className="wf-section-card-header">
        <div className="wf-section-card-heading">
          {icon && <span className="wf-section-card-icon">{icon}</span>}
          <span className="wf-section-card-title">{title}</span>
        </div>
        {headerAside}
      </div>
      {description && <p className="wf-section-card-description">{description}</p>}
      {children && <div className="wf-section-card-body">{children}</div>}
      {footer && <div className="wf-section-card-footer">{footer}</div>}
    </div>
  );
}

import type { ReactNode } from "react";
import { Stepper, type StepperStep } from "./Stepper";

export interface StepShellBreadcrumbItem {
  label: string;
  href?: string;
}

export interface StepShellProps {
  breadcrumb: StepShellBreadcrumbItem[];
  title: string;
  subtitle?: string;
  lastSavedLabel?: string;
  actions?: ReactNode;
  steps: StepperStep[];
  currentStepId: string;
  completedStepIds: string[];
  onStepClick?: (stepId: string) => void;
  /** Optional left sidebar (matter title/address, in-page nav). */
  sidebar?: ReactNode;
  /** Main step content. */
  children: ReactNode;
  /** Right rail: status card, readiness checklist, next action, summary. */
  rail?: ReactNode;
}

/**
 * The shared page layout for every step in a step-matter workflow: optional
 * left sidebar, breadcrumb + title + actions masthead, the Stepper, then a
 * two-column body (main content + right rail).
 */
export function StepShell({
  breadcrumb,
  title,
  subtitle,
  lastSavedLabel,
  actions,
  steps,
  currentStepId,
  completedStepIds,
  onStepClick,
  sidebar,
  children,
  rail,
}: StepShellProps) {
  return (
    <div className="wf-shell">
      {sidebar && <aside className="wf-shell-sidebar">{sidebar}</aside>}
      <div className="wf-shell-main">
        <div className="wf-shell-masthead">
          <nav className="wf-breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((item, index) => (
              <span key={index}>
                {index > 0 && <span className="wf-breadcrumb-sep">›</span>}
                {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
              </span>
            ))}
          </nav>
          <div className="wf-shell-masthead-row">
            <div>
              <h1 className="wf-shell-title">{title}</h1>
              {subtitle && <p className="wf-shell-subtitle">{subtitle}</p>}
            </div>
            <div className="wf-shell-masthead-actions">
              {lastSavedLabel && <span className="wf-shell-last-saved">{lastSavedLabel}</span>}
              {actions}
            </div>
          </div>
        </div>
        <Stepper
          steps={steps}
          currentStepId={currentStepId}
          completedStepIds={completedStepIds}
          onStepClick={onStepClick}
          className="wf-shell-stepper"
        />
        <div className="wf-shell-body">
          <div className="wf-shell-content">{children}</div>
          {rail && <div className="wf-shell-rail">{rail}</div>}
        </div>
      </div>
    </div>
  );
}

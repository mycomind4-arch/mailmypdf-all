import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type WorkflowActionPriority = "low" | "medium" | "high" | "critical";
export type WorkflowActionStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface WorkflowActionItem {
  id: string;
  title: string;
  description?: string;
  priority?: WorkflowActionPriority;
  status: WorkflowActionStatus;
  sourceLabel?: string;
  dueDate?: string;
  relatedWorkflow?: string;
}

export interface ActionListProps {
  actions: WorkflowActionItem[];
  title?: string;
  description?: string;
  emptyLabel?: string;
  onAction?: (actionId: string) => void;
}

function priorityTone(priority?: WorkflowActionPriority): StatusPillTone {
  if (priority === "critical") return "danger";
  if (priority === "high" || priority === "medium") return "warning";
  return "neutral";
}

function statusTone(status: WorkflowActionStatus): StatusPillTone {
  if (status === "completed") return "success";
  if (status === "blocked") return "danger";
  if (status === "in_progress") return "info";
  return "neutral";
}

/** Case-wide action queue distilled from Code Enforcement's ActionCenter. */
export function ActionList({
  actions,
  title = "Actions",
  description = "Recommended and required actions for this matter.",
  emptyLabel = "No actions pending.",
  onAction,
}: ActionListProps) {
  const order: Record<WorkflowActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...actions].sort((a, b) => order[a.priority ?? "low"] - order[b.priority ?? "low"]);

  return (
    <SectionCard title={title} description={description}>
      {sorted.length === 0 ? (
        <p className="wf-empty">{emptyLabel}</p>
      ) : (
        <div className="wf-action-list">
          {sorted.map((action) => (
            <article key={action.id} className={`wf-action-row wf-action-row--${action.priority ?? "low"}`}>
              <div className="wf-action-main">
                <div className="wf-finding-meta">
                  {action.priority && <StatusPill tone={priorityTone(action.priority)} label={action.priority} />}
                  <StatusPill tone={statusTone(action.status)} label={action.status.replace(/_/g, " ")} />
                  {action.relatedWorkflow && <span className="wf-pill wf-pill--info">{action.relatedWorkflow}</span>}
                </div>
                <h3 className="wf-finding-title">{action.title}</h3>
                {action.description && <p className="wf-finding-description">{action.description}</p>}
                {(action.sourceLabel || action.dueDate) && (
                  <div className="wf-action-meta">
                    {action.sourceLabel && <span>Source: {action.sourceLabel}</span>}
                    {action.dueDate && <span>Due: {action.dueDate}</span>}
                  </div>
                )}
              </div>
              {onAction && action.status !== "completed" && (
                <button type="button" className="wf-btn wf-btn--outline" onClick={() => onAction(action.id)}>
                  Take action
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

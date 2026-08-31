export type TriggerType = "invoice.overdue" | "document.received" | "schedule.due" | "mail.delivered" | "manual";
export type ConditionOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "days_since";
export type WorkflowCondition = { field: string; operator: ConditionOperator; value: string | number | boolean };
export type WorkflowAction = { type: "draft" | "create_mailing" | "schedule" | "request_approval" | "notify"; config: Record<string, unknown> };
export type Workflow = { id: string; businessId: string; name: string; enabled: boolean; trigger: { type: TriggerType; config: Record<string, unknown> }; conditions: WorkflowCondition[]; actions: WorkflowAction[]; createdAt: string; updatedAt: string };

export function evaluateCondition(actual: unknown, condition: WorkflowCondition): boolean {
  switch (condition.operator) {
    case "equals": return actual === condition.value;
    case "not_equals": return actual !== condition.value;
    case "contains": return String(actual ?? "").toLowerCase().includes(String(condition.value).toLowerCase());
    case "greater_than": return Number(actual) > Number(condition.value);
    case "less_than": return Number(actual) < Number(condition.value);
    case "days_since": return (Date.now() - new Date(String(actual)).getTime()) / 86400000 >= Number(condition.value);
  }
}

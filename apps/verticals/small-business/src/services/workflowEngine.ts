import { z } from "zod";

export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "exists", "gt", "gte", "lt", "lte"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export type Condition = z.infer<typeof conditionSchema>;

export function evaluateCondition(condition: Condition, data: Record<string, unknown>): boolean {
  const actual = data[condition.field];
  switch (condition.operator) {
    case "exists": return actual !== undefined && actual !== null;
    case "equals": return actual === condition.value;
    case "not_equals": return actual !== condition.value;
    case "contains": return typeof actual === "string" && actual.toLowerCase().includes(String(condition.value ?? "").toLowerCase());
    case "gt": return Number(actual) > Number(condition.value);
    case "gte": return Number(actual) >= Number(condition.value);
    case "lt": return Number(actual) < Number(condition.value);
    case "lte": return Number(actual) <= Number(condition.value);
  }
}

export type WorkflowStep =
  | { type: "wait"; days: number }
  | { type: "approval"; role: string }
  | { type: "send"; mailClass: "standard" | "certified" | "registered" }
  | { type: "stop"; reason: string };

export function shouldContinue(conditions: Condition[], data: Record<string, unknown>): boolean {
  return conditions.every((condition) => evaluateCondition(condition, data));
}

import type { CapabilityId } from "./capability-registry.js";
import type { CapabilityExecutionResult } from "./capability-runtime.js";
import type {
  WorkflowConditionPrimitive,
  WorkflowStepCondition,
} from "./workflow-manifest.js";

const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);

function readInputPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const segment of path.split(".")) {
    if (FORBIDDEN.has(segment)) return undefined;
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function primitiveEqual(
  actual: unknown,
  expected: WorkflowConditionPrimitive,
): boolean {
  return (
    actual === expected &&
    (actual === null ||
      typeof actual === "string" ||
      typeof actual === "number" ||
      typeof actual === "boolean")
  );
}

export function evaluateWorkflowStepCondition(
  condition: WorkflowStepCondition | undefined,
  input: {
    rootInput: unknown;
    prior: ReadonlyMap<CapabilityId, CapabilityExecutionResult>;
  },
): boolean {
  if (!condition) return true;

  switch (condition.kind) {
    case "all":
      return condition.conditions.every((nested) =>
        evaluateWorkflowStepCondition(nested, input),
      );
    case "any":
      return condition.conditions.some((nested) =>
        evaluateWorkflowStepCondition(nested, input),
      );
    case "capability_status":
      return input.prior.get(condition.capability)?.status === condition.status;
    case "input_truthy":
      return Boolean(readInputPath(input.rootInput, condition.path));
    case "input_falsy":
      return !readInputPath(input.rootInput, condition.path);
    case "input_equals":
      return primitiveEqual(
        readInputPath(input.rootInput, condition.path),
        condition.value,
      );
    case "input_not_equals":
      return !primitiveEqual(
        readInputPath(input.rootInput, condition.path),
        condition.value,
      );
  }
}

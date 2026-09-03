/** Deterministic prerequisite evaluator for the capability graph. */

export interface RequirementContext {
  completed: ReadonlySet<string>;
  facts?: Readonly<Record<string, unknown>>;
}

export type RequirementRule =
  | { type: "capability"; capabilityId: string }
  | { type: "all"; rules: RequirementRule[] }
  | { type: "any"; rules: RequirementRule[] }
  | { type: "threshold"; minimum: number; rules: RequirementRule[] }
  | { type: "fact"; path: string; equals?: unknown; exists?: boolean };

export interface RequirementEvaluation {
  satisfied: boolean;
  missing: string[];
}

function readFact(facts: Readonly<Record<string, unknown>>, path: string): unknown {
  let current: unknown = facts;
  for (const segment of path.split(".")) {
    if (typeof current !== "object" || current === null || !(segment in current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function evaluateRequirement(
  rule: RequirementRule,
  context: RequirementContext,
): RequirementEvaluation {
  switch (rule.type) {
    case "capability": {
      const satisfied = context.completed.has(rule.capabilityId);
      return { satisfied, missing: satisfied ? [] : [rule.capabilityId] };
    }
    case "all": {
      const results = rule.rules.map((child) => evaluateRequirement(child, context));
      return {
        satisfied: results.every((result) => result.satisfied),
        missing: unique(results.flatMap((result) => result.missing)),
      };
    }
    case "any": {
      const results = rule.rules.map((child) => evaluateRequirement(child, context));
      if (results.some((result) => result.satisfied)) return { satisfied: true, missing: [] };
      return { satisfied: false, missing: unique(results.flatMap((result) => result.missing)) };
    }
    case "threshold": {
      const results = rule.rules.map((child) => evaluateRequirement(child, context));
      const satisfiedCount = results.filter((result) => result.satisfied).length;
      return {
        satisfied: satisfiedCount >= rule.minimum,
        missing: satisfiedCount >= rule.minimum
          ? []
          : unique(results.flatMap((result) => result.missing)),
      };
    }
    case "fact": {
      const value = readFact(context.facts ?? {}, rule.path);
      const satisfied = rule.exists === true
        ? value !== undefined && value !== null
        : rule.equals !== undefined
          ? Object.is(value, rule.equals)
          : value !== undefined;
      return { satisfied, missing: satisfied ? [] : [
        rule.equals !== undefined
          ? `fact:${rule.path}=${String(rule.equals)}`
          : `fact:${rule.path}`,
      ] };
    }
  }
}

export function allOf(...capabilityIds: string[]): RequirementRule {
  return { type: "all", rules: capabilityIds.map((capabilityId) => ({ type: "capability", capabilityId })) };
}

export function anyOf(...capabilityIds: string[]): RequirementRule {
  return { type: "any", rules: capabilityIds.map((capabilityId) => ({ type: "capability", capabilityId })) };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

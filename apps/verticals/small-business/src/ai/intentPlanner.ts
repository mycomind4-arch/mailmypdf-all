import { findCapabilities, type Capability } from "./capabilities";

export type IntentPlan = {
  goal: string;
  capabilities: Capability[];
  requiresApproval: boolean;
  proposedSteps: string[];
};

/** Deterministic planning boundary. An LLM can later produce the normalized intent,
 * but execution must consume this validated structure rather than free-form model output. */
export function planIntent(input: { goal: string; requireApproval?: boolean }): IntentPlan {
  const goal = input.goal.trim();
  if (!goal) throw new Error("A business goal is required");
  const normalized = goal.toLowerCase();
  const capabilities = [
    ...findCapabilities(normalized.includes("draft") || normalized.includes("letter") ? "correspondence" : "mail"),
  ];
  const unique = [...new Map(capabilities.map((capability) => [capability.id, capability])).values()];
  const proposedSteps = [
    "Resolve qualifying business records",
    "Prepare correspondence using approved templates or a draft skill",
    "Validate recipients, addresses, documents, and policy constraints",
    "Request approval when required",
    "Schedule or execute the resulting mailing",
    "Track delivery and archive proof",
  ];
  return { goal, capabilities: unique, requiresApproval: input.requireApproval ?? true, proposedSteps };
}

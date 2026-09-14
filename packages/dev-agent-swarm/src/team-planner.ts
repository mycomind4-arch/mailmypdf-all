import type { AgentRole, AgentRunBudget } from "./types";

export type TeamPlan = {
  roles: AgentRole[];
  budget: Pick<AgentRunBudget, "maxConcurrentAgents">;
  rationale: string[];
};

type Specialty = Exclude<AgentRole, "builder" | "tester" | "reviewer" | "seo">;

const signals: Array<{ role: Specialty; pattern: RegExp; rationale: string }> = [
  { role: "visual_qa", pattern: /\b(ui|ux|visual|design|layout|page|screens?|responsive|accessib|frontend|component|brand)\b/i, rationale: "The outcome changes a user-facing experience." },
  { role: "safety_reviewer", pattern: /\b(auth|login|permission|security|privacy|upload|document|payment|stripe|medical|health|legal|personal data|email)\b/i, rationale: "The outcome handles sensitive data, access, or consequential actions." },
  { role: "release_manager", pattern: /\b(release|deploy|production|migration|database|schema|infra|observability|monitoring|performance)\b/i, rationale: "The outcome has release or operational impact." },
  { role: "documentation", pattern: /\b(doc|documentation|guide|help|onboard|instruction|runbook|readme)\b/i, rationale: "The outcome needs durable guidance or discoverability." },
  { role: "design_system", pattern: /\b(design system|token|typography|color|spacing|cohesi|consistent|brand)\b/i, rationale: "The outcome explicitly affects shared visual language." },
];

/**
 * Chooses a small, explainable quality team from the requested outcome. This
 * is deliberately deterministic: planning should be instant and reliable,
 * while the selected specialists perform the expensive model-backed review.
 */
export function planAgentTeam(outcome: string): TeamPlan {
  const roles: AgentRole[] = ["workflow_evaluator"];
  const rationale = ["Every background build gets an end-to-end workflow evaluation."];
  const text = outcome.trim();

  for (const signal of signals) {
    if (!signal.pattern.test(text) || roles.includes(signal.role)) continue;
    roles.push(signal.role);
    rationale.push(signal.rationale);
  }

  // A vague request is still likely to alter a page or workflow. Keep its
  // team narrow but protect the two failure modes users notice first.
  if (text.length < 24) {
    for (const role of ["visual_qa", "safety_reviewer"] as const) {
      if (!roles.includes(role)) roles.push(role);
    }
    rationale.push("The outcome is broad, so visual quality and safety are included by default.");
  }

  return {
    roles,
    budget: { maxConcurrentAgents: Math.min(4, Math.max(1, roles.length)) },
    rationale,
  };
}

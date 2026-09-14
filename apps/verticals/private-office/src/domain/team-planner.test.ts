import { describe, expect, it } from "vitest";
import { planAgentTeam } from "@mailmypdf/dev-agent-swarm";

describe("agent team planner", () => {
  it("keeps a routine workflow build focused", () => {
    const plan = planAgentTeam("Build the workflow intake and completion screens.");

    expect(plan.roles).toContain("workflow_evaluator");
    expect(plan.roles).toContain("visual_qa");
    expect(plan.roles).not.toContain("release_manager");
  });

  it("adds the appropriate quality gates for consequential outcomes", () => {
    const plan = planAgentTeam("Deploy a secure medical document upload workflow with production monitoring and operator documentation.");

    expect(plan.roles).toEqual(expect.arrayContaining([
      "workflow_evaluator",
      "safety_reviewer",
      "release_manager",
      "documentation",
    ]));
    expect(plan.budget.maxConcurrentAgents).toBeGreaterThan(1);
  });

  it("uses a conservative default team when the outcome is vague", () => {
    const plan = planAgentTeam("Improve it");

    expect(plan.roles).toEqual(expect.arrayContaining(["workflow_evaluator", "visual_qa", "safety_reviewer"]));
  });
});

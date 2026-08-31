import { describe, expect, it } from "vitest";
import { getWorkflowProfile, workflowProfiles } from "./workflow-profiles";
import { workflows } from "./workflows";

describe("problem-specific dispute workflow catalog", () => {
  it("has a profile for every registered workflow", () => {
    const workflowIds = Object.keys(workflows).sort();
    const profileIds = Object.keys(workflowProfiles).sort();
    expect(profileIds).toEqual(workflowIds);
  });

  it("gives every workflow a concrete customer problem and search intent", () => {
    for (const profile of Object.values(workflowProfiles)) {
      expect(profile.primaryKeyword.length).toBeGreaterThan(0);
      expect(profile.problem.length).toBeGreaterThan(20);
      expect(profile.outcome.length).toBeGreaterThan(20);
      expect(profile.requiredFacts.length).toBeGreaterThan(0);
      expect(profile.evidenceRequirements.length).toBeGreaterThan(0);
      expect(profile.deadlinePolicy.length).toBeGreaterThan(20);
      expect(profile.objectivePrompt.length).toBeGreaterThan(20);
      expect(getWorkflowProfile(profile.id)).toEqual(profile);
    }
  });

  it("does not register duplicate primary keywords or slugs", () => {
    const primaryKeywords = Object.values(workflowProfiles).map((profile) => profile.primaryKeyword);
    const slugs = Object.values(workflowProfiles).map((profile) => profile.slug);
    expect(new Set(primaryKeywords).size).toBe(primaryKeywords.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

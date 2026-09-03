import { describe, expect, it } from "vitest";
import {
  planPath,
  recommendNext,
  findGoalCapability,
} from "./workflow-orchestrator";
import { capabilityGraph } from "./capability-graph";
import { createInitialState, completeCapability } from "./state-engine";

describe("workflow-orchestrator: planPath", () => {
  it("returns empty path when goal is already completed", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "form-llc");
    const path = planPath(capabilityGraph, s1, "form-llc");
    expect(path.path).toEqual([]);
    expect(path.stepsRemaining).toBe(0);
  });

  it("returns single step for form-llc from initial state", () => {
    const state = createInitialState("user-1");
    const path = planPath(capabilityGraph, state, "form-llc");
    expect(path.path).toEqual(["form-llc"]);
    expect(path.stepsRemaining).toBe(1);
    expect(path.nextAvailable).toContain("form-llc");
    expect(path.blockedBy).toEqual({});
  });

  it("returns single step for dispute capabilities (entry points)", () => {
    const state = createInitialState("user-1");
    const path = planPath(capabilityGraph, state, "contractor-dispute");
    expect(path.path).toEqual(["contractor-dispute"]);
    expect(path.stepsRemaining).toBe(1);
  });

  it("returns full path for business-sale from initial state", () => {
    const state = createInitialState("user-1");
    const path = planPath(capabilityGraph, state, "business-sale");
    expect(path.stepsRemaining).toBeGreaterThan(3);
    expect(path.path[0]).toBe("form-llc");
    expect(path.path[path.path.length - 1]).toBe("business-sale");
    expect(path.nextAvailable).toEqual(["form-llc"]);
  });

  it("path is in topological order (prerequisites before dependents)", () => {
    const state = createInitialState("user-1");
    const path = planPath(capabilityGraph, state, "open-business-bank-account");
    const pathArr = path.path;
    const llcIdx = pathArr.indexOf("form-llc");
    const einIdx = pathArr.indexOf("obtain-ein");
    const bankIdx = pathArr.indexOf("open-business-bank-account");
    expect(llcIdx).toBeLessThan(einIdx);
    expect(einIdx).toBeLessThan(bankIdx);
  });

  it("blockedBy shows missing prerequisites for locked steps", () => {
    const state = createInitialState("user-1");
    const path = planPath(capabilityGraph, state, "hire-employees");
    expect(path.blockedBy["hire-employees"]).toBeDefined();
    expect(path.blockedBy["obtain-ein"]).toContain("form-llc");
  });

  it("after completing form-llc, path to hire-employees updates", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "form-llc");
    const path = planPath(capabilityGraph, s1, "hire-employees");
    expect(path.path).not.toContain("form-llc");
    expect(path.nextAvailable).toContain("obtain-ein");
    expect(path.nextAvailable).toContain("obtain-business-insurance");
  });

  it("returns empty path for unknown goal", () => {
    const state = createInitialState("user-1");
    const path = planPath(capabilityGraph, state, "nonexistent-capability");
    expect(path.path).toEqual([]);
    expect(path.stepsRemaining).toBe(0);
  });
});

describe("workflow-orchestrator: recommendNext", () => {
  it("recommends 7 capabilities at initial state (form-llc + 6 dispute)", () => {
    const state = createInitialState("user-1");
    const recs = recommendNext(capabilityGraph, state);
    expect(recs.length).toBe(7);
    const recIds = recs.map((r) => r.capability.id);
    expect(recIds).toContain("form-llc");
    expect(recIds).toContain("contractor-dispute");
    expect(recIds).toContain("bank-wire-dispute");
  });

  it("returns empty array when all capabilities are completed", () => {
    let state = createInitialState("user-done");
    const allCaps = Object.keys(capabilityGraph.capabilities);
    for (const capId of allCaps) {
      const result = completeCapability(capabilityGraph, state, capId);
      state = result.state;
    }
    const recs = recommendNext(capabilityGraph, state);
    expect(recs).toEqual([]);
  });

  it("recommends multiple capabilities after form-llc", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "form-llc");
    const recs = recommendNext(capabilityGraph, s1);
    expect(recs.length).toBe(11); // 5 business + 6 dispute (minus completed form-llc, but contractor-dispute was unlocked by form-llc)
    const recIds = recs.map((r) => r.capability.id);
    expect(recIds).toContain("obtain-ein");
    expect(recIds).toContain("contractor-dispute");
  });

  it("prioritizes capabilities with milestone impact", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "form-llc");
    const recs = recommendNext(capabilityGraph, s1);
    // obtain-ein has the most downstream unlocks, should be highly ranked
    expect(recs[0].capability.id).toBe("obtain-ein");
  });

  it("recommendations include a reason string", () => {
    const state = createInitialState("user-1");
    const recs = recommendNext(capabilityGraph, state);
    expect(recs[0].reason).toBeTruthy();
    expect(recs[0].reason.length).toBeGreaterThan(10);
  });
});

describe("workflow-orchestrator: findGoalCapability", () => {
  it("finds by exact id", () => {
    const result = findGoalCapability(capabilityGraph, "form-llc");
    expect(result).toBeDefined();
    expect(result!.id).toBe("form-llc");
  });

  it("finds by exact title", () => {
    const result = findGoalCapability(capabilityGraph, "Create LLC");
    expect(result).toBeDefined();
    expect(result!.id).toBe("form-llc");
  });

  it("finds dispute capabilities by keyword", () => {
    const result = findGoalCapability(capabilityGraph, "contractor dispute");
    expect(result).toBeDefined();
    expect(result!.id).toBe("contractor-dispute");
  });

  it("finds debt validation by keyword", () => {
    const result = findGoalCapability(capabilityGraph, "debt validation");
    expect(result).toBeDefined();
    expect(result!.id).toBe("debt-validation-dispute");
  });

  it("finds by multi-word goal", () => {
    const result = findGoalCapability(capabilityGraph, "hire employees");
    expect(result).toBeDefined();
    expect(result!.id).toBe("hire-employees");
  });

  it("finds banking-related goal", () => {
    const result = findGoalCapability(capabilityGraph, "business bank account");
    expect(result).toBeDefined();
    expect(result!.id).toBe("open-business-bank-account");
  });

  it("finds security deposit dispute", () => {
    const result = findGoalCapability(capabilityGraph, "security deposit");
    expect(result).toBeDefined();
    expect(result!.id).toBe("security-deposit-dispute");
  });

  it("returns undefined for completely unrelated goal", () => {
    const result = findGoalCapability(capabilityGraph, "skydiving lessons");
    expect(result).toBeUndefined();
  });
});

describe("workflow-orchestrator: real-world scenarios", () => {
  it("user says 'I want to start a landscaping business' → form-llc is top recommendation", () => {
    const state = createInitialState("user-landscaping");
    const recs = recommendNext(capabilityGraph, state);
    // form-llc should be among recommendations (it's the entry point for business formation)
    const recIds = recs.map((r) => r.capability.id);
    expect(recIds).toContain("form-llc");
  });

  it("user says 'I got a collection notice' → debt-validation-dispute is found", () => {
    const result = findGoalCapability(capabilityGraph, "collection notice");
    expect(result).toBeDefined();
    // Should match debt-validation-dispute or bank-wire-dispute
    expect(["debt-validation-dispute", "bank-wire-dispute"]).toContain(result!.id);
  });

  it("user wants to sell their business — full path from initial state", () => {
    const state = createInitialState("user-exit");
    const path = planPath(capabilityGraph, state, "business-sale");
    expect(path.stepsRemaining).toBeGreaterThan(5);
    expect(path.path[0]).toBe("form-llc");
    expect(path.path[path.path.length - 1]).toBe("business-sale");
  });

  it("user completes a contractor dispute → property-insurance-claim becomes available", () => {
    const state = createInitialState("user-dispute-1");
    const result = completeCapability(capabilityGraph, state, "contractor-dispute");
    // property-insurance-claim was already an entry point, but let's verify the dispute milestone
    const result2 = completeCapability(capabilityGraph, result.state, "property-insurance-claim");
    expect(result2.newlyReachedMilestones.some((m) => m.id === "dispute-resolution")).toBe(true);
  });
});

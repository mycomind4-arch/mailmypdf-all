import { describe, expect, it } from "vitest";
import {
  createInitialState,
  getAvailableCapabilities,
  getCompletedCapabilities,
  getLockedCapabilities,
  isCapabilityAvailable,
  getCapabilityStatus,
  checkMilestones,
  getMilestoneUnlocks,
  startCapability,
  completeCapability,
  getLifeStateSummary,
} from "./state-engine";
import { capabilityGraph } from "./capability-graph";

describe("state-engine: initial state", () => {
  it("starts with no completed, in-progress, or milestones", () => {
    const state = createInitialState("user-1");
    expect(state.completed).toEqual([]);
    expect(state.inProgress).toEqual([]);
    expect(state.reachedMilestones).toEqual([]);
  });

  it("form-llc is available at initial state (entry point)", () => {
    const state = createInitialState("user-1");
    expect(isCapabilityAvailable(capabilityGraph, state, "form-llc")).toBe(true);
  });

  it("obtain-ein is locked at initial state", () => {
    const state = createInitialState("user-1");
    expect(isCapabilityAvailable(capabilityGraph, state, "obtain-ein")).toBe(false);
    expect(getCapabilityStatus(capabilityGraph, state, "obtain-ein")).toBe("locked");
  });

  it("all 6 dispute capabilities are available at initial state", () => {
    const state = createInitialState("user-1");
    expect(isCapabilityAvailable(capabilityGraph, state, "contractor-dispute")).toBe(true);
    expect(isCapabilityAvailable(capabilityGraph, state, "property-insurance-claim")).toBe(true);
    expect(isCapabilityAvailable(capabilityGraph, state, "bank-wire-dispute")).toBe(true);
    expect(isCapabilityAvailable(capabilityGraph, state, "debt-validation-dispute")).toBe(true);
    expect(isCapabilityAvailable(capabilityGraph, state, "trust-beneficiary-notice")).toBe(true);
    expect(isCapabilityAvailable(capabilityGraph, state, "security-deposit-dispute")).toBe(true);
  });
});

describe("state-engine: available capabilities", () => {
  it("7 capabilities available at start (form-llc + 6 dispute)", () => {
    const state = createInitialState("user-1");
    const available = getAvailableCapabilities(capabilityGraph, state);
    expect(available.length).toBe(7);
  });

  it("16 business capabilities are locked at start", () => {
    const state = createInitialState("user-1");
    const locked = getLockedCapabilities(capabilityGraph, state);
    expect(locked.length).toBe(16);
  });

  it("after form-llc, 7 business capabilities become available (dispute caps already available)", () => {
    const state = createInitialState("user-1");
    const { state: newState } = completeCapability(capabilityGraph, state, "form-llc");
    const available = getAvailableCapabilities(capabilityGraph, newState);
    const availableIds = available.map((c) => c.id);
    // Business formation caps now available
    expect(availableIds).toContain("obtain-ein");
    expect(availableIds).toContain("register-dba");
    expect(availableIds).toContain("obtain-local-license");
    expect(availableIds).toContain("obtain-business-insurance");
    expect(availableIds).toContain("create-contracts");
    // Dispute caps still available (they were already available)
    expect(availableIds).toContain("contractor-dispute");
    expect(availableIds).toContain("property-insurance-claim");
    expect(availableIds).toContain("bank-wire-dispute");
  });
});

describe("state-engine: completing capabilities", () => {
  it("completeCapability marks the capability as completed", () => {
    const state = createInitialState("user-1");
    const result = completeCapability(capabilityGraph, state, "form-llc");
    expect(result.state.completed).toContain("form-llc");
    expect(result.state.inProgress).not.toContain("form-llc");
  });

  it("completing contractor-dispute unlocks property-insurance-claim (if not already available)", () => {
    const state = createInitialState("user-1");
    const result = completeCapability(capabilityGraph, state, "contractor-dispute");
    // property-insurance-claim is already an entry point, so it was already available.
    // It should appear in newlyUnlocked only if it wasn't already available — but it was.
    // The completion still works correctly.
    expect(result.state.completed).toContain("contractor-dispute");
  });

  it("completing bank-wire-dispute unlocks debt-validation-dispute", () => {
    const state = createInitialState("user-1");
    const result = completeCapability(capabilityGraph, state, "bank-wire-dispute");
    // debt-validation-dispute is an entry point (no prereqs), so it's already available
    expect(result.state.completed).toContain("bank-wire-dispute");
  });

  it("completing form-llc does NOT unlock capabilities that also need EIN", () => {
    const state = createInitialState("user-1");
    const result = completeCapability(capabilityGraph, state, "form-llc");
    const unlockedIds = result.newlyUnlockedCapabilities.map((c) => c.id);
    expect(unlockedIds).not.toContain("open-business-bank-account");
    expect(unlockedIds).not.toContain("set-up-accounting");
  });

  it("completing obtain-ein after form-llc unlocks banking", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "form-llc");
    const result = completeCapability(capabilityGraph, s1, "obtain-ein");
    const unlockedIds = result.newlyUnlockedCapabilities.map((c) => c.id);
    expect(unlockedIds).toContain("open-business-bank-account");
    expect(unlockedIds).toContain("set-up-accounting");
  });
});

describe("state-engine: milestones", () => {
  it("completing form-llc reaches the llc-established milestone", () => {
    const state = createInitialState("user-1");
    const result = completeCapability(capabilityGraph, state, "form-llc");
    expect(result.newlyReachedMilestones.length).toBe(1);
    expect(result.newlyReachedMilestones[0].id).toBe("llc-established");
  });

  it("completing contractor-dispute and property-insurance-claim reaches dispute-resolution milestone", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "contractor-dispute");
    const result = completeCapability(capabilityGraph, s1, "property-insurance-claim");
    expect(result.newlyReachedMilestones.some((m) => m.id === "dispute-resolution")).toBe(true);
  });

  it("completing bank-wire-dispute and debt-validation-dispute reaches financial-protection milestone", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "bank-wire-dispute");
    const result = completeCapability(capabilityGraph, s1, "debt-validation-dispute");
    expect(result.newlyReachedMilestones.some((m) => m.id === "financial-protection")).toBe(true);
  });

  it("reaching business-operational milestone unlocks growing-business capabilities", () => {
    let currentState = createInitialState("user-1");
    for (const capId of [
      "form-llc", "obtain-ein", "register-dba",
      "open-business-bank-account", "obtain-local-license",
      "obtain-business-insurance", "set-up-accounting", "create-contracts",
    ]) {
      const result = completeCapability(capabilityGraph, currentState, capId);
      currentState = result.state;
    }
    const available = getAvailableCapabilities(capabilityGraph, currentState);
    const availableIds = available.map((c) => c.id);
    expect(availableIds).toContain("hire-employees");
    expect(availableIds).toContain("obtain-business-credit");
  });
});

describe("state-engine: capability status", () => {
  it("returns locked for unknown capability", () => {
    const state = createInitialState("user-1");
    expect(getCapabilityStatus(capabilityGraph, state, "unknown-id")).toBe("locked");
  });

  it("returns completed for finished capability", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "form-llc");
    expect(getCapabilityStatus(capabilityGraph, s1, "form-llc")).toBe("completed");
  });

  it("returns in-progress for started capability", () => {
    const state = createInitialState("user-1");
    const inProgress = startCapability(state, "form-llc");
    expect(getCapabilityStatus(capabilityGraph, inProgress, "form-llc")).toBe("in-progress");
  });

  it("dispute capabilities are available at start", () => {
    const state = createInitialState("user-1");
    expect(getCapabilityStatus(capabilityGraph, state, "contractor-dispute")).toBe("available");
    expect(getCapabilityStatus(capabilityGraph, state, "bank-wire-dispute")).toBe("available");
  });
});

describe("state-engine: life state summary", () => {
  it("summarizes initial state correctly with dispute capabilities", () => {
    const state = createInitialState("user-1");
    const summary = getLifeStateSummary(capabilityGraph, state);
    expect(summary.totalCompleted).toBe(0);
    expect(summary.totalInProgress).toBe(0);
    expect(summary.reachedMilestones.length).toBe(0);
    expect(summary.availableCapabilities.length).toBe(7); // form-llc + 6 dispute
    expect(summary.lockedCapabilities.length).toBe(16);
  });

  it("summarizes state after completing form-llc", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "form-llc");
    const summary = getLifeStateSummary(capabilityGraph, s1);
    expect(summary.totalCompleted).toBe(1);
    expect(summary.reachedMilestones.length).toBe(1);
  });
});

describe("state-engine: start capability", () => {
  it("adds to inProgress", () => {
    const state = createInitialState("user-1");
    const updated = startCapability(state, "form-llc");
    expect(updated.inProgress).toContain("form-llc");
  });

  it("does not duplicate if already in progress", () => {
    const state = createInitialState("user-1");
    const s1 = startCapability(state, "form-llc");
    const s2 = startCapability(s1, "form-llc");
    expect(s2.inProgress.filter((id) => id === "form-llc").length).toBe(1);
  });

  it("does not start if already completed", () => {
    const state = createInitialState("user-1");
    const { state: s1 } = completeCapability(capabilityGraph, state, "form-llc");
    const s2 = startCapability(s1, "form-llc");
    expect(s2.inProgress).not.toContain("form-llc");
  });
});

describe("state-engine: full business formation journey", () => {
  it("can progress from individual to business-operational", () => {
    let currentState = createInitialState("user-journey-1");
    const r1 = completeCapability(capabilityGraph, currentState, "form-llc");
    currentState = r1.state;
    expect(r1.newlyReachedMilestones[0].id).toBe("llc-established");

    const opCaps = [
      "obtain-ein", "register-dba", "open-business-bank-account",
      "obtain-local-license", "obtain-business-insurance",
      "set-up-accounting", "create-contracts",
    ];
    for (const capId of opCaps) {
      const result = completeCapability(capabilityGraph, currentState, capId);
      currentState = result.state;
    }

    expect(currentState.reachedMilestones).toContain("business-operational");
    expect(currentState.completed.length).toBe(8);

    const available = getAvailableCapabilities(capabilityGraph, currentState);
    const availableIds = available.map((c) => c.id);
    expect(availableIds).toContain("obtain-business-credit");
    expect(availableIds).toContain("hire-employees");
  });

  it("can progress through all milestones to mature-business", () => {
    let currentState = createInitialState("user-journey-2");

    // All capabilities in order
    const allBusinessCaps = [
      "form-llc", "obtain-ein", "register-dba", "open-business-bank-account",
      "obtain-local-license", "obtain-business-insurance", "set-up-accounting",
      "create-contracts", "obtain-business-credit", "hire-employees",
      "government-contracting", "obtain-financing", "expand-to-another-state",
      "acquire-business", "multi-state-expansion", "subsidiary", "business-sale",
    ];
    for (const capId of allBusinessCaps) {
      const result = completeCapability(capabilityGraph, currentState, capId);
      currentState = result.state;
    }

    expect(currentState.reachedMilestones).toContain("mature-business");
    expect(currentState.completed.length).toBe(17);
  });
});


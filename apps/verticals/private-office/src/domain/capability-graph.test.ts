import { describe, expect, it } from "vitest";
import {
  capabilityGraph,
  validateGraph,
  getCapability,
  getCapabilitiesByVertical,
  getMilestone,
  getReactiveCapabilities,
  getProactiveCapabilities,
} from "./capability-graph";

describe("capability-graph: graph integrity", () => {
  it("has no validation errors", () => {
    const errors = validateGraph(capabilityGraph);
    expect(errors).toEqual([]);
  });

  it("has entry points with no prerequisites", () => {
    expect(capabilityGraph.entryPoints.length).toBeGreaterThan(0);
    for (const id of capabilityGraph.entryPoints) {
      const cap = getCapability(capabilityGraph, id);
      expect(cap).toBeDefined();
      expect(cap!.prerequisites).toEqual([]);
    }
  });

  it("form-llc is an entry point", () => {
    expect(capabilityGraph.entryPoints).toContain("form-llc");
  });

  it("all 6 dispute/defense workflows are entry points", () => {
    expect(capabilityGraph.entryPoints).toContain("contractor-dispute");
    expect(capabilityGraph.entryPoints).toContain("property-insurance-claim");
    expect(capabilityGraph.entryPoints).toContain("bank-wire-dispute");
    expect(capabilityGraph.entryPoints).toContain("debt-validation-dispute");
    expect(capabilityGraph.entryPoints).toContain("trust-beneficiary-notice");
    expect(capabilityGraph.entryPoints).toContain("security-deposit-dispute");
  });
});

describe("capability-graph: total graph size", () => {
  it("has 23 total capabilities (17 business + 6 dispute)", () => {
    expect(Object.keys(capabilityGraph.capabilities).length).toBe(23);
  });

  it("has 6 milestones (4 business + 2 dispute)", () => {
    expect(Object.keys(capabilityGraph.milestones).length).toBe(6);
  });
});

describe("capability-graph: business formation vertical", () => {
  it("form-llc unlocks the post-LLC capability set including contractor-dispute", () => {
    const llc = getCapability(capabilityGraph, "form-llc");
    expect(llc).toBeDefined();
    expect(llc!.unlocks).toContain("obtain-ein");
    expect(llc!.unlocks).toContain("open-business-bank-account");
    expect(llc!.unlocks).toContain("contractor-dispute");
  });

  it("obtain-ein requires form-llc", () => {
    const ein = getCapability(capabilityGraph, "obtain-ein");
    expect(ein!.prerequisites).toContain("form-llc");
  });

  it("open-business-bank-account requires obtain-ein (transitive dependency)", () => {
    const bank = getCapability(capabilityGraph, "open-business-bank-account");
    expect(bank!.prerequisites).toContain("obtain-ein");
    expect(bank!.prerequisites).not.toContain("form-llc");
  });

  it("hire-employees requires both EIN and insurance", () => {
    const hire = getCapability(capabilityGraph, "hire-employees");
    expect(hire!.prerequisites).toContain("obtain-ein");
    expect(hire!.prerequisites).toContain("obtain-business-insurance");
  });

  it("business-sale requires acquire-business", () => {
    const sale = getCapability(capabilityGraph, "business-sale");
    expect(sale!.prerequisites).toContain("acquire-business");
  });
});

describe("capability-graph: dispute & defense vertical", () => {
  it("contractor-dispute is reactive and links to workflow", () => {
    const cap = getCapability(capabilityGraph, "contractor-dispute");
    expect(cap).toBeDefined();
    expect(cap!.reactive).toBe(true);
    expect(cap!.workflowId).toBe("contractor-dispute");
    expect(cap!.prerequisites).toEqual([]);
  });

  it("debt-validation-dispute links to the debt-validation-dispute workflow", () => {
    const cap = getCapability(capabilityGraph, "debt-validation-dispute");
    expect(cap).toBeDefined();
    expect(cap!.workflowId).toBe("debt-validation-dispute");
  });

  it("bank-wire-dispute unlocks debt-validation-dispute", () => {
    const cap = getCapability(capabilityGraph, "bank-wire-dispute");
    expect(cap!.unlocks).toContain("debt-validation-dispute");
  });

  it("contractor-dispute unlocks property-insurance-claim", () => {
    const cap = getCapability(capabilityGraph, "contractor-dispute");
    expect(cap!.unlocks).toContain("property-insurance-claim");
  });

  it("all 6 dispute capabilities have workflowId links", () => {
    const disputeIds = [
      "contractor-dispute",
      "property-insurance-claim",
      "bank-wire-dispute",
      "debt-validation-dispute",
      "trust-beneficiary-notice",
      "security-deposit-dispute",
    ];
    for (const id of disputeIds) {
      const cap = getCapability(capabilityGraph, id);
      expect(cap).toBeDefined();
      expect(cap!.workflowId).toBeDefined();
    }
  });

  it("trust-beneficiary-notice has no milestone", () => {
    const cap = getCapability(capabilityGraph, "trust-beneficiary-notice");
    expect(cap!.milestoneId).toBeUndefined();
  });

  it("security-deposit-dispute has no milestone", () => {
    const cap = getCapability(capabilityGraph, "security-deposit-dispute");
    expect(cap!.milestoneId).toBeUndefined();
  });
});

describe("capability-graph: milestones", () => {
  it("has 6 milestones", () => {
    expect(Object.keys(capabilityGraph.milestones).length).toBe(6);
  });

  it("business-operational milestone requires 7 capabilities", () => {
    const ms = getMilestone(capabilityGraph, "business-operational");
    expect(ms).toBeDefined();
    expect(ms!.capabilities.length).toBe(7);
  });

  it("dispute-resolution milestone includes contractor-dispute and property-insurance-claim", () => {
    const ms = getMilestone(capabilityGraph, "dispute-resolution");
    expect(ms).toBeDefined();
    expect(ms!.capabilities).toContain("contractor-dispute");
    expect(ms!.capabilities).toContain("property-insurance-claim");
  });

  it("financial-protection milestone includes bank-wire-dispute and debt-validation-dispute", () => {
    const ms = getMilestone(capabilityGraph, "financial-protection");
    expect(ms).toBeDefined();
    expect(ms!.capabilities).toContain("bank-wire-dispute");
    expect(ms!.capabilities).toContain("debt-validation-dispute");
  });

  it("each capability with a milestoneId references a valid milestone", () => {
    for (const cap of Object.values(capabilityGraph.capabilities)) {
      if (cap.milestoneId) {
        expect(capabilityGraph.milestones[cap.milestoneId]).toBeDefined();
      }
    }
  });
});

describe("capability-graph: verticals", () => {
  it("capabilities span multiple verticals", () => {
    const verticals = new Set(
      Object.values(capabilityGraph.capabilities).map((c) => c.vertical),
    );
    expect(verticals.size).toBeGreaterThanOrEqual(2);
    expect(verticals.has("small-business")).toBe(true);
    expect(verticals.has("private-office")).toBe(true);
    expect(verticals.has("gov-reply")).toBe(true);
  });

  it("getCapabilitiesByVertical returns correct set", () => {
    const smallBiz = getCapabilitiesByVertical(capabilityGraph, "small-business");
    expect(smallBiz.length).toBeGreaterThan(0);
    expect(smallBiz.every((c) => c.vertical === "small-business")).toBe(true);
  });

  it("private-office vertical includes dispute capabilities and contracts", () => {
    const po = getCapabilitiesByVertical(capabilityGraph, "private-office");
    const poIds = po.map((c) => c.id);
    expect(poIds).toContain("contractor-dispute");
    expect(poIds).toContain("create-contracts");
    expect(poIds).toContain("bank-wire-dispute");
  });
});

describe("capability-graph: reactive vs proactive", () => {
  it("getReactiveCapabilities returns 6 dispute capabilities", () => {
    const reactive = getReactiveCapabilities(capabilityGraph);
    expect(reactive.length).toBe(6);
    expect(reactive.every((c) => c.reactive === true)).toBe(true);
  });

  it("getProactiveCapabilities returns 17 business formation capabilities", () => {
    const proactive = getProactiveCapabilities(capabilityGraph);
    expect(proactive.length).toBe(17);
    expect(proactive.every((c) => c.reactive !== true)).toBe(true);
  });

  it("form-llc is proactive", () => {
    const proactive = getProactiveCapabilities(capabilityGraph);
    expect(proactive.some((c) => c.id === "form-llc")).toBe(true);
  });

  it("contractor-dispute is reactive", () => {
    const reactive = getReactiveCapabilities(capabilityGraph);
    expect(reactive.some((c) => c.id === "contractor-dispute")).toBe(true);
  });
});

describe("capability-graph: no circular dependencies", () => {
  it("validateGraph does not report circular dependencies", () => {
    const errors = validateGraph(capabilityGraph);
    expect(errors.filter((e) => e.includes("Circular"))).toEqual([]);
  });
});


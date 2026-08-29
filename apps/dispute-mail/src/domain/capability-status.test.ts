import { describe, expect, it } from "vitest";
import { getWorkflowCapabilityStatuses, isWorkflowGoldEligible } from "./capability-status";

describe("workflow capability status", () => {
  it("credits credit-report as gold with pipeline executor", () => {
    const statuses = getWorkflowCapabilityStatuses();
    expect(statuses).toHaveLength(26);

    const credit = statuses.find((s) => s.workflowId === "credit-report");
    const debt = statuses.find((s) => s.workflowId === "debt-validation");
    const billing = statuses.find((s) => s.workflowId === "billing-error");
    const unauthorized = statuses.find((s) => s.workflowId === "unauthorized-charge");

    expect(credit?.lifecycle).toBe("gold");
    expect(credit?.implementedDomainAnalysis).toBe(true);
    expect(credit?.hasPipelineExecutor).toBe(true);
    expect(credit?.readyForMailingGate).toBe(true);
    expect(isWorkflowGoldEligible("credit-report")).toBe(true);

    expect(debt?.implementedDomainAnalysis).toBe(false);
    expect(debt?.hasPipelineExecutor).toBe(false);
    expect(isWorkflowGoldEligible("debt-validation")).toBe(false);

    expect(billing?.implementedDomainAnalysis).toBe(false);
    expect(billing?.hasPipelineExecutor).toBe(false);
    expect(isWorkflowGoldEligible("billing-error")).toBe(false);

    expect(unauthorized?.implementedDomainAnalysis).toBe(false);
    expect(unauthorized?.hasPipelineExecutor).toBe(false);
    expect(isWorkflowGoldEligible("unauthorized-charge")).toBe(false);
  });
});

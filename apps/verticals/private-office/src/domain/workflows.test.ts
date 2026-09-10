import { describe, expect, it } from "vitest";
import { workflows, workflowList, type WorkflowId } from "./workflows";

const expectedWorkflows: Array<[WorkflowId, string]> = [
  ["contractor-dispute", "Contractor Dispute"],
  ["property-insurance-claim", "Property Insurance Claim"],
  ["bank-wire-dispute", "Bank & Wire Transfer Dispute"],
  ["trust-beneficiary-notice", "Trust Beneficiary Notice"],
  ["security-deposit-dispute", "Security Deposit Dispute"],
  ["debt-validation-dispute", "Debt Validation Dispute"],
];

describe("workflow registry", () => {
  for (const [id, title] of expectedWorkflows) {
    it(`registers ${id} as a Gold Standard workflow`, () => {
      expect(workflows[id]).toBeDefined();
      expect(workflows[id].lifecycle).toBe("gold");
      expect(workflows[id].title).toBe(title);
    });
  }

  it("defines the canonical 18 Gold Standard stages for all workflows", () => {
    for (const id of Object.keys(workflows) as WorkflowId[]) {
      const stages = workflows[id].goldStandardStages;
      expect(stages).toHaveLength(18);
      expect(stages[0]).toBe("secure-ingest");
      expect(stages[stages.length - 1]).toBe("prove-audit");
    }
  });

  it("assigns P06 and P10 pipeline archetypes to all workflows", () => {
    for (const id of Object.keys(workflows) as WorkflowId[]) {
      expect(workflows[id].pipelineArchetypes).toContain("P06");
      expect(workflows[id].pipelineArchetypes).toContain("P10");
    }
  });

  it("includes standard workflow steps for all workflows", () => {
    for (const id of Object.keys(workflows) as WorkflowId[]) {
      const steps = workflows[id].steps;
      expect(steps).toContain("intro");
      expect(steps).toContain("draft");
      expect(steps).toContain("review");
      expect(steps).toContain("mailing");
      expect(steps).toContain("submitted");
    }
  });

  it("includes a disclaimer for all workflows", () => {
    for (const id of Object.keys(workflows) as WorkflowId[]) {
      expect(workflows[id].disclaimer).toContain("not a law firm");
    }
  });

  it("exposes the six canonical Private Office workflows", () => {
    expect(workflowList).toHaveLength(6);
    for (const [id] of expectedWorkflows) {
      expect(workflowList.map((workflow) => workflow.id)).toContain(id);
    }
  });

  it("workflow IDs remain valid string literals", () => {
    for (const [id] of expectedWorkflows) {
      const typedId: WorkflowId = id;
      expect(workflows[typedId]).toBeDefined();
    }
  });

  it("workflow descriptions retain their domain identity", () => {
    expect(workflows["property-insurance-claim"].description).toContain("insurance claim");
    expect(workflows["bank-wire-dispute"].description).toContain("wire transfer");
    expect(workflows["trust-beneficiary-notice"].description).toContain("trust beneficiary");
    expect(workflows["security-deposit-dispute"].description).toContain("security deposit");
    expect(workflows["debt-validation-dispute"].description).toContain("debt validation");
  });

  it("specialized disclaimers retain important boundaries", () => {
    expect(workflows["security-deposit-dispute"].disclaimer).toContain("landlord-tenant court");
    expect(workflows["security-deposit-dispute"].disclaimer).toContain("housing authority");
    expect(workflows["bank-wire-dispute"].disclaimer).toContain("bank");
    expect(workflows["trust-beneficiary-notice"].disclaimer).toContain("fiduciary");
    expect(workflows["trust-beneficiary-notice"].disclaimer).toContain("trustee");
    expect(workflows["debt-validation-dispute"].disclaimer).toContain("debt collector");
    expect(workflows["debt-validation-dispute"].disclaimer).toContain("credit bureau");
  });
});

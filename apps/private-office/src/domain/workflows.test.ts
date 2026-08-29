import { describe, expect, it } from "vitest";
import { workflows, workflowList, type WorkflowId } from "./workflows";

describe("workflow registry", () => {
  it("registers contractor-dispute as a Gold Standard workflow", () => {
    expect(workflows["contractor-dispute"]).toBeDefined();
    expect(workflows["contractor-dispute"].lifecycle).toBe("gold");
    expect(workflows["contractor-dispute"].title).toBe("Contractor Dispute");
  });

  it("registers property-insurance-claim as a Gold Standard workflow", () => {
    expect(workflows["property-insurance-claim"]).toBeDefined();
    expect(workflows["property-insurance-claim"].lifecycle).toBe("gold");
    expect(workflows["property-insurance-claim"].title).toBe("Property Insurance Claim");
  });

  it("registers bank-wire-dispute as a Gold Standard workflow", () => {
    expect(workflows["bank-wire-dispute"]).toBeDefined();
    expect(workflows["bank-wire-dispute"].lifecycle).toBe("gold");
    expect(workflows["bank-wire-dispute"].title).toBe("Bank & Wire Transfer Dispute");
  });

  it("registers trust-beneficiary-notice as a Gold Standard workflow", () => {
    expect(workflows["trust-beneficiary-notice"]).toBeDefined();
    expect(workflows["trust-beneficiary-notice"].lifecycle).toBe("gold");
    expect(workflows["trust-beneficiary-notice"].title).toBe("Trust Beneficiary Notice");
  });

  it("registers security-deposit-dispute as a Gold Standard workflow", () => {
    expect(workflows["security-deposit-dispute"]).toBeDefined();
    expect(workflows["security-deposit-dispute"].lifecycle).toBe("gold");
    expect(workflows["security-deposit-dispute"].title).toBe("Security Deposit Dispute");
  });

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
      const archetypes = workflows[id].pipelineArchetypes;
      expect(archetypes).toContain("P06");
      expect(archetypes).toContain("P10");
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

  it("exposes a workflow list with all five workflows", () => {
    expect(workflowList).toHaveLength(5);
    expect(workflowList.map((w) => w.id)).toContain("contractor-dispute");
    expect(workflowList.map((w) => w.id)).toContain("property-insurance-claim");
    expect(workflowList.map((w) => w.id)).toContain("bank-wire-dispute");
    expect(workflowList.map((w) => w.id)).toContain("trust-beneficiary-notice");
    expect(workflowList.map((w) => w.id)).toContain("security-deposit-dispute");
  });

  it("workflow IDs are string literals", () => {
    const contractorId: WorkflowId = "contractor-dispute";
    const insuranceId: WorkflowId = "property-insurance-claim";
    const bankId: WorkflowId = "bank-wire-dispute";
    const trustId: WorkflowId = "trust-beneficiary-notice";
    const depositId: WorkflowId = "security-deposit-dispute";
    expect(workflows[contractorId]).toBeDefined();
    expect(workflows[insuranceId]).toBeDefined();
    expect(workflows[bankId]).toBeDefined();
    expect(workflows[trustId]).toBeDefined();
    expect(workflows[depositId]).toBeDefined();
  });

  it("property-insurance-claim has a description mentioning insurance claims", () => {
    expect(workflows["property-insurance-claim"].description).toContain("insurance claim");
  });

  it("bank-wire-dispute has a description mentioning wire transfer", () => {
    expect(workflows["bank-wire-dispute"].description).toContain("wire transfer");
  });

  it("trust-beneficiary-notice has a description mentioning trust beneficiary", () => {
    expect(workflows["trust-beneficiary-notice"].description).toContain("trust beneficiary");
  });

  it("security-deposit-dispute has a description mentioning security deposit", () => {
    expect(workflows["security-deposit-dispute"].description).toContain("security deposit");
  });

  it("security-deposit-dispute disclaimer mentions not a landlord-tenant court or housing authority", () => {
    expect(workflows["security-deposit-dispute"].disclaimer).toContain("not a law firm");
    expect(workflows["security-deposit-dispute"].disclaimer).toContain("landlord-tenant court");
    expect(workflows["security-deposit-dispute"].disclaimer).toContain("housing authority");
  });

  it("bank-wire-dispute disclaimer mentions not a bank or regulator", () => {
    expect(workflows["bank-wire-dispute"].disclaimer).toContain("not a law firm");
    expect(workflows["bank-wire-dispute"].disclaimer).toContain("bank");
  });

  it("trust-beneficiary-notice disclaimer mentions not a fiduciary or trustee", () => {
    expect(workflows["trust-beneficiary-notice"].disclaimer).toContain("not a law firm");
    expect(workflows["trust-beneficiary-notice"].disclaimer).toContain("fiduciary");
    expect(workflows["trust-beneficiary-notice"].disclaimer).toContain("trustee");
  });
});

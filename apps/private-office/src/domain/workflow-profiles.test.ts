import { describe, expect, it } from "vitest";
import { workflowProfiles } from "./workflow-profiles";

describe("contractor-dispute workflow profile", () => {
  const profile = workflowProfiles["contractor-dispute"];

  it("defines SEO keywords targeting contractor dispute intent", () => {
    expect(profile.primaryKeyword).toBe("contractor dispute letter");
    expect(profile.supportingKeywords).toContain("construction defect notice");
    expect(profile.supportingKeywords).toContain("letter to contractor for defective work");
    expect(profile.supportingKeywords).toContain("contractor demand letter");
    expect(profile.supportingKeywords).toContain("how to document contractor dispute");
  });

  it("belongs to the Property family", () => {
    expect(profile.family).toBe("Property");
  });

  it("defines required facts for intake", () => {
    expect(profile.requiredFacts).toContain("property address");
    expect(profile.requiredFacts).toContain("contractor name");
    expect(profile.requiredFacts).toContain("agreement reference");
    expect(profile.requiredFacts).toContain("dispute description");
  });

  it("defines evidence requirements", () => {
    expect(profile.evidenceRequirements).toContain("contract or written agreement");
    expect(profile.evidenceRequirements).toContain("invoices or billing records");
    expect(profile.evidenceRequirements).toContain("photos of defects or incomplete work");
  });

  it("includes a pricing profile", () => {
    expect(profile.pricing.preparationFee).toBeGreaterThan(0);
    expect(profile.pricing.includedResponsePages).toBeGreaterThan(0);
    expect(profile.pricing.certifiedMail).toBeGreaterThan(profile.pricing.standardMail);
    expect(profile.pricing.certifiedReturnReceipt).toBeGreaterThan(profile.pricing.certifiedMail);
  });

  it("includes a deadline policy that does not invent deadlines", () => {
    expect(profile.deadlinePolicy).toContain("Do not invent");
  });

  it("includes a disclaimer stating it is not a law firm", () => {
    expect(profile.disclaimer).toContain("not a law firm");
  });
});

describe("property-insurance-claim workflow profile", () => {
  const profile = workflowProfiles["property-insurance-claim"];

  it("is registered in the profile registry", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe("property-insurance-claim");
  });

  it("belongs to the Property family", () => {
    expect(profile.family).toBe("Property");
  });

  it("defines SEO keywords targeting property insurance claim intent", () => {
    expect(profile.primaryKeyword).toBe("property insurance claim letter");
    expect(profile.supportingKeywords).toContain("insurance claim dispute letter");
    expect(profile.supportingKeywords).toContain("denied insurance claim letter");
    expect(profile.supportingKeywords).toContain("insurance claim reconsideration letter");
    expect(profile.supportingKeywords).toContain("insurance supplemental claim letter");
    expect(profile.supportingKeywords).toContain("insurance claim underpayment");
    expect(profile.supportingKeywords).toContain("property damage insurance claim");
  });

  it("has commercial search intent", () => {
    expect(profile.searchIntent).toBe("commercial");
  });

  it("defines required facts for insurance claim intake", () => {
    expect(profile.requiredFacts).toContain("property address");
    expect(profile.requiredFacts).toContain("insurer name");
    expect(profile.requiredFacts).toContain("claim number");
    expect(profile.requiredFacts).toContain("date of loss");
    expect(profile.requiredFacts).toContain("description of damage");
    expect(profile.requiredFacts).toContain("insurer position");
  });

  it("requires exactly 6 facts (not including requested resolution, which is the objective)", () => {
    expect(profile.requiredFacts).toHaveLength(6);
  });

  it("does not include requested resolution as a required fact (objective covers it)", () => {
    expect(profile.requiredFacts).not.toContain("requested resolution");
  });

  it("defines evidence requirements for insurance claims", () => {
    expect(profile.evidenceRequirements).toContain("policy documents or declarations page");
    expect(profile.evidenceRequirements).toContain("claim correspondence from insurer");
    expect(profile.evidenceRequirements).toContain("denial letter or explanation of benefits");
    expect(profile.evidenceRequirements).toContain("repair estimates or contractor bids");
    expect(profile.evidenceRequirements).toContain("photographs of property damage");
    expect(profile.evidenceRequirements).toContain("inspection reports or engineer reports");
    expect(profile.evidenceRequirements).toContain("receipts for repairs or temporary mitigation");
  });

  it("targets the insurer as recipient", () => {
    expect(profile.recipientRole).toBe("insurer");
  });

  it("includes a pricing profile", () => {
    expect(profile.pricing.preparationFee).toBeGreaterThan(0);
    expect(profile.pricing.includedResponsePages).toBeGreaterThan(0);
    expect(profile.pricing.certifiedMail).toBeGreaterThan(profile.pricing.standardMail);
    expect(profile.pricing.certifiedReturnReceipt).toBeGreaterThan(profile.pricing.certifiedMail);
  });

  it("includes a deadline policy that does not invent deadlines", () => {
    expect(profile.deadlinePolicy).toContain("Do not invent");
  });

  it("deadline policy distinguishes known deadlines from potential deadlines", () => {
    expect(profile.deadlinePolicy).toContain("known deadlines");
    expect(profile.deadlinePolicy).toContain("potential deadlines");
  });

  it("deadline policy includes verification language for uncertain deadlines", () => {
    expect(profile.deadlinePolicy).toContain("verify against the applicable policy and jurisdiction");
  });

  it("deadline policy mentions proof-of-loss", () => {
    expect(profile.deadlinePolicy).toContain("proof-of-loss");
  });

  it("includes a disclaimer stating it is not a law firm", () => {
    expect(profile.disclaimer).toContain("not a law firm");
  });

  it("has a draft subject for insurance claim correspondence", () => {
    expect(profile.draftSubject).toContain("Insurance Claim");
  });

  it("has an objective prompt about requested resolution from the insurer", () => {
    expect(profile.objectivePrompt).toContain("insurer");
    expect(profile.objectivePrompt).toContain("resolution");
  });

  it("describes the problem involving denied, underpaid, or delayed claims", () => {
    expect(profile.problem).toContain("denied");
    expect(profile.problem).toContain("underpaid");
    expect(profile.problem).toContain("delayed");
  });
});

describe("bank-wire-dispute workflow profile", () => {
  const profile = workflowProfiles["bank-wire-dispute"];

  it("is registered in the profile registry", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe("bank-wire-dispute");
  });

  it("belongs to the Financial family", () => {
    expect(profile.family).toBe("Financial");
  });

  it("defines SEO keywords targeting bank wire dispute intent", () => {
    expect(profile.primaryKeyword).toBe("bank wire transfer dispute letter");
    expect(profile.supportingKeywords).toContain("wire transfer dispute");
    expect(profile.supportingKeywords).toContain("unauthorized wire transfer letter");
    expect(profile.supportingKeywords).toContain("bank transfer dispute letter");
    expect(profile.supportingKeywords).toContain("wire transfer recall request");
    expect(profile.supportingKeywords).toContain("bank reimbursement request");
    expect(profile.supportingKeywords).toContain("wire fraud documentation");
    expect(profile.supportingKeywords).toContain("disputed transaction letter");
  });

  it("has commercial search intent", () => {
    expect(profile.searchIntent).toBe("commercial");
  });

  it("defines required facts for bank/wire dispute intake", () => {
    expect(profile.requiredFacts).toContain("financial institution");
    expect(profile.requiredFacts).toContain("account holder name");
    expect(profile.requiredFacts).toContain("transaction date");
    expect(profile.requiredFacts).toContain("transaction amount");
    expect(profile.requiredFacts).toContain("dispute description");
    expect(profile.requiredFacts).toContain("bank response");
  });

  it("requires exactly 6 facts (not including requested resolution, which is the objective)", () => {
    expect(profile.requiredFacts).toHaveLength(6);
  });

  it("does not include requested resolution as a required fact (objective covers it)", () => {
    expect(profile.requiredFacts).not.toContain("requested resolution");
  });

  it("does not require full account numbers (data minimization)", () => {
    expect(profile.requiredFacts).not.toContain("account number");
    expect(profile.requiredFacts).not.toContain("full account number");
  });

  it("does not require passwords, PINs, or credentials", () => {
    const allFacts = profile.requiredFacts.join(" ").toLowerCase();
    expect(allFacts).not.toContain("password");
    expect(allFacts).not.toContain("pin");
    expect(allFacts).not.toContain("credential");
  });

  it("defines evidence requirements for bank/wire disputes", () => {
    expect(profile.evidenceRequirements).toContain("bank statement showing the transaction");
    expect(profile.evidenceRequirements).toContain("wire transfer confirmation or receipt");
    expect(profile.evidenceRequirements).toContain("bank correspondence regarding the dispute");
    expect(profile.evidenceRequirements).toContain("dispute or recall request documentation");
    expect(profile.evidenceRequirements).toContain("bank investigation response or status update");
    expect(profile.evidenceRequirements).toContain("beneficiary or recipient information");
    expect(profile.evidenceRequirements).toContain("supporting communications email chat or phone logs");
  });

  it("targets the bank as recipient", () => {
    expect(profile.recipientRole).toBe("bank");
  });

  it("includes a pricing profile", () => {
    expect(profile.pricing.preparationFee).toBeGreaterThan(0);
    expect(profile.pricing.includedResponsePages).toBeGreaterThan(0);
    expect(profile.pricing.certifiedMail).toBeGreaterThan(profile.pricing.standardMail);
    expect(profile.pricing.certifiedReturnReceipt).toBeGreaterThan(profile.pricing.certifiedMail);
  });

  it("includes a deadline policy that does not invent deadlines", () => {
    expect(profile.deadlinePolicy).toContain("Do not invent");
  });

  it("deadline policy distinguishes known deadlines from potential deadlines", () => {
    expect(profile.deadlinePolicy).toContain("known deadlines");
    expect(profile.deadlinePolicy).toContain("potential deadlines");
  });

  it("deadline policy includes verification language for uncertain deadlines", () => {
    expect(profile.deadlinePolicy).toContain("verify against the applicable account agreement");
  });

  it("deadline policy mentions jurisdiction and transaction type variability", () => {
    expect(profile.deadlinePolicy).toContain("jurisdiction");
    expect(profile.deadlinePolicy).toContain("transaction type");
  });

  it("includes a disclaimer stating it is not a law firm", () => {
    expect(profile.disclaimer).toContain("not a law firm");
  });

  it("includes a disclaimer stating it is not a bank or regulator", () => {
    expect(profile.disclaimer).toContain("bank");
    expect(profile.disclaimer).toContain("regulator");
  });

  it("disclaimer does not guarantee recovery", () => {
    expect(profile.disclaimer).toContain("does not");
    expect(profile.disclaimer.toLowerCase()).toContain("recovery");
  });

  it("has a draft subject for bank wire dispute correspondence", () => {
    expect(profile.draftSubject).toContain("Wire Transfer");
  });

  it("has an objective prompt about requested resolution from the bank", () => {
    expect(profile.objectivePrompt).toContain("financial institution");
    expect(profile.objectivePrompt).toContain("resolution");
  });

  it("objective prompt includes investigation, recall, and reimbursement options", () => {
    expect(profile.objectivePrompt).toContain("investigation");
    expect(profile.objectivePrompt).toContain("recall");
    expect(profile.objectivePrompt).toContain("reimbursement");
  });

  it("describes the problem involving disputed transfers", () => {
    expect(profile.problem).toContain("disputed");
    expect(profile.problem).toContain("wire");
  });
});

describe("trust-beneficiary-notice workflow profile", () => {
  const profile = workflowProfiles["trust-beneficiary-notice"];

  it("is registered in the profile registry", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe("trust-beneficiary-notice");
  });

  it("belongs to the Trust & Estate family", () => {
    expect(profile.family).toBe("Trust & Estate");
  });

  it("defines SEO keywords targeting trust beneficiary intent", () => {
    expect(profile.primaryKeyword).toBe("trust beneficiary notice");
    expect(profile.supportingKeywords).toContain("beneficiary letter to trustee");
    expect(profile.supportingKeywords).toContain("request trust accounting");
    expect(profile.supportingKeywords).toContain("beneficiary information request");
    expect(profile.supportingKeywords).toContain("trustee communication letter");
    expect(profile.supportingKeywords).toContain("trust distribution request");
    expect(profile.supportingKeywords).toContain("beneficiary request for trust documents");
  });

  it("has commercial search intent", () => {
    expect(profile.searchIntent).toBe("commercial");
  });

  it("defines required facts for trust beneficiary intake", () => {
    expect(profile.requiredFacts).toContain("trust name");
    expect(profile.requiredFacts).toContain("trustee name");
    expect(profile.requiredFacts).toContain("beneficiary name");
    expect(profile.requiredFacts).toContain("relevant date");
    expect(profile.requiredFacts).toContain("matter description");
    expect(profile.requiredFacts).toContain("trustee position");
  });

  it("requires exactly 6 facts (not including requested resolution, which is the objective)", () => {
    expect(profile.requiredFacts).toHaveLength(6);
  });

  it("does not include requested resolution as a required fact (objective covers it)", () => {
    expect(profile.requiredFacts).not.toContain("requested resolution");
  });

  it("does not require SSN, passwords, or credentials", () => {
    const allFacts = profile.requiredFacts.join(" ").toLowerCase();
    expect(allFacts).not.toContain("social security");
    expect(allFacts).not.toContain("ssn");
    expect(allFacts).not.toContain("password");
    expect(allFacts).not.toContain("credential");
  });

  it("does not require full bank account numbers", () => {
    const allFacts = profile.requiredFacts.join(" ").toLowerCase();
    expect(allFacts).not.toContain("account number");
  });

  it("defines evidence requirements for trust matters", () => {
    expect(profile.evidenceRequirements).toContain("trust instrument or trust document");
    expect(profile.evidenceRequirements).toContain("amendments or restatements");
    expect(profile.evidenceRequirements).toContain("trustee correspondence");
    expect(profile.evidenceRequirements).toContain("accounting or financial records");
    expect(profile.evidenceRequirements).toContain("distribution records");
    expect(profile.evidenceRequirements).toContain("court documents when applicable");
    expect(profile.evidenceRequirements).toContain("death certificate when relevant");
    expect(profile.evidenceRequirements).toContain("supporting communications");
  });

  it("targets the trustee as recipient", () => {
    expect(profile.recipientRole).toBe("trustee");
  });

  it("includes a pricing profile", () => {
    expect(profile.pricing.preparationFee).toBeGreaterThan(0);
    expect(profile.pricing.includedResponsePages).toBeGreaterThan(0);
    expect(profile.pricing.certifiedMail).toBeGreaterThan(profile.pricing.standardMail);
    expect(profile.pricing.certifiedReturnReceipt).toBeGreaterThan(profile.pricing.certifiedMail);
  });

  it("includes a deadline policy that does not invent deadlines", () => {
    expect(profile.deadlinePolicy).toContain("Do not invent");
  });

  it("deadline policy distinguishes known deadlines from potential deadlines", () => {
    expect(profile.deadlinePolicy).toContain("known deadlines");
    expect(profile.deadlinePolicy).toContain("potential deadlines");
  });

  it("deadline policy includes verification language referencing trust documents and jurisdiction", () => {
    expect(profile.deadlinePolicy).toContain("trust documents");
    expect(profile.deadlinePolicy).toContain("jurisdiction");
    expect(profile.deadlinePolicy).toContain("professional guidance");
  });

  it("deadline policy mentions trust-code deadlines", () => {
    expect(profile.deadlinePolicy).toContain("trust-code");
  });

  it("includes a disclaimer stating it is not a law firm", () => {
    expect(profile.disclaimer).toContain("not a law firm");
  });

  it("includes a disclaimer stating it is not a fiduciary, trustee, court, or government agency", () => {
    expect(profile.disclaimer).toContain("fiduciary");
    expect(profile.disclaimer).toContain("trustee");
    expect(profile.disclaimer).toContain("court");
    expect(profile.disclaimer).toContain("government agency");
  });

  it("disclaimer does not determine beneficiary status", () => {
    expect(profile.disclaimer).toContain("does not");
    expect(profile.disclaimer.toLowerCase()).toContain("beneficiary status");
  });

  it("disclaimer does not interpret trust instruments as legal conclusions", () => {
    expect(profile.disclaimer).toContain("interpret trust instruments");
  });

  it("disclaimer does not determine fiduciary breach", () => {
    expect(profile.disclaimer).toContain("fiduciary duties");
  });

  it("disclaimer does not guarantee inheritance or distribution", () => {
    expect(profile.disclaimer.toLowerCase()).toContain("inheritance");
    expect(profile.disclaimer.toLowerCase()).toContain("distribution");
  });

  it("has a draft subject for trust beneficiary correspondence", () => {
    expect(profile.draftSubject).toContain("Trust Beneficiary");
  });

  it("has an objective prompt about requested resolution from the trustee", () => {
    expect(profile.objectivePrompt).toContain("trustee");
    expect(profile.objectivePrompt).toContain("resolution");
  });

  it("objective prompt includes accounting, distribution, and information request options", () => {
    expect(profile.objectivePrompt).toContain("accounting");
    expect(profile.objectivePrompt).toContain("distribute");
    expect(profile.objectivePrompt).toContain("information request");
  });

  it("describes the problem involving trust beneficiary matters", () => {
    expect(profile.problem).toContain("trust beneficiary");
    expect(profile.problem).toContain("trustee");
  });
});

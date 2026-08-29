import { describe, expect, it } from "vitest";
import { runWorkflowContracts } from "./workflow-contracts";
import { workflowProfiles } from "./workflow-profiles";

/**
 * Factory contract tests — verify that every registered Gold Standard workflow
 * satisfies the same correctness contracts.
 *
 * These tests are parameterized over the workflow registry. A new workflow
 * that registers a profile and complete fixtures inherits these tests
 * automatically by adding an entry below.
 *
 * Domain-specific tests (legal-conclusion safety, bespoke intake logic,
 * workflow-specific contradictions) remain in each workflow's own test file.
 */

function buildEvidenceStatuses(
  workflowId: Parameters<typeof workflowProfiles[never]> extends never
    ? string
    : keyof typeof workflowProfiles,
  status: "provided" = "provided",
): Record<string, "provided"> {
  const profile = workflowProfiles[workflowId as keyof typeof workflowProfiles];
  const evidenceStatuses: Record<string, "provided"> = {};
  for (const req of profile.evidenceRequirements) {
    const slug = req
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    evidenceStatuses[`evidence-${slug}`] = status;
  }
  return evidenceStatuses;
}

// ── Contractor Dispute ────────────────────────────────────────────────────

runWorkflowContracts("contractor-dispute", {
  completeFacts: {
    propertyAddress: "123 Oak Street, Springfield, IL 62701",
    contractorName: "ABC Construction LLC",
    agreementReference: "Contract dated March 1, 2026",
    disputeDescription:
      "Contractor performed defective work — cracked foundation, incomplete framing, and unauthorized charges.",
  },
  buildEvidenceStatuses: () => buildEvidenceStatuses("contractor-dispute"),
  validObjective: "Repair all defects and refund unauthorized charges.",
});

// ── Property Insurance Claim ─────────────────────────────────────────────

runWorkflowContracts("property-insurance-claim", {
  completeFacts: {
    propertyAddress: "456 Elm Avenue, Portland, OR 97201",
    insurerName: "State Farm Fire and Casualty",
    claimNumber: "SF-2026-001234",
    dateOfLoss: "February 14, 2026",
    descriptionOfDamage:
      "Wind and hail damage to roof, broken windows, and water intrusion damaging interior.",
    insurerPosition:
      "Insurer denied claim citing wear and tear exclusion despite pre-loss inspection showing no issues.",
  },
  buildEvidenceStatuses: () => buildEvidenceStatuses("property-insurance-claim"),
  validObjective: "Reconsider denial and pay the full claim amount.",
});

// ── Bank & Wire Transfer Dispute ────────────────────────────────────────

runWorkflowContracts("bank-wire-dispute", {
  completeFacts: {
    financialInstitution: "First National Bank",
    accountHolderName: "Jane Q. Public",
    transactionDate: "March 10, 2026",
    transactionAmount: "$25,000.00 USD",
    disputeDescription:
      "Unauthorized wire transfer initiated from account. Account holder did not authorize this transaction.",
    bankResponse:
      "Bank denied recall request citing completed wire. Investigation opened but no update in 30 days.",
  },
  buildEvidenceStatuses: () => buildEvidenceStatuses("bank-wire-dispute"),
  validObjective: "Request investigation and recall of the unauthorized wire.",
});

// ── Trust Beneficiary Notice ────────────────────────────────────────────

runWorkflowContracts("trust-beneficiary-notice", {
  completeFacts: {
    trustName: "The Smith Family Trust dated January 15, 2020",
    trusteeName: "John A. Smith",
    beneficiaryName: "Jane B. Smith",
    relevantDate: "June 1, 2026",
    matterDescription:
      "Requested accounting of trust assets and distributions. Trustee has not provided a full accounting despite multiple requests.",
    trusteePosition:
      "Trustee stated accounting would be provided but has not responded in 60 days. No accounting received.",
  },
  buildEvidenceStatuses: () => buildEvidenceStatuses("trust-beneficiary-notice"),
  validObjective: "Request a full accounting of trust assets and distributions.",
});

// ── Security Deposit Dispute ──────────────────────────────────────────────

runWorkflowContracts("security-deposit-dispute", {
  completeFacts: {
    rentalPropertyAddress: "789 Pine Court, Denver, CO 80202",
    landlordOrPropertyManagerName: "Mountain View Properties LLC",
    leaseOrRentalAgreementReference: "Lease dated September 1, 2025, 12-month term",
    depositAmount: "$2,500.00",
    disputeDescription:
      "Landlord retained $1,800 of the $2,500 security deposit for damages that existed at move-in and were documented in the move-in inspection report. No itemized statement was provided within the statutory deadline.",
    landlordResponse:
      "Landlord claims carpet replacement and painting costs but did not provide receipts or an itemized deduction list within 30 days of move-out.",
  },
  buildEvidenceStatuses: () => buildEvidenceStatuses("security-deposit-dispute"),
  validObjective: "Return the full security deposit and provide an itemized statement.",
});

// ── Meta-test: verify all registered workflows have contract tests ───────

describe("factory contract coverage", () => {
  it("every registered workflow has a profile", async () => {
    const { workflows } = await import("./workflows");
    const { workflowProfiles } = await import("./workflow-profiles");
    for (const id of Object.keys(workflows) as Array<keyof typeof workflows>) {
      expect(workflowProfiles[id]).toBeDefined();
      expect(workflowProfiles[id].id).toBe(id);
    }
  });
});

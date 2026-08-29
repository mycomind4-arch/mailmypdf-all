/**
 * Reusable contract tests for any Private Office Gold Standard workflow.
 *
 * Every workflow must satisfy these contracts. A new workflow can inherit
 * most correctness guarantees by running these tests against its profile
 * instead of duplicating the same test structure.
 *
 * Usage:
 *   import { runWorkflowContracts } from "./workflow-contracts";
 *   runWorkflowContracts("trust-beneficiary-notice", completeFacts, buildEvidenceStatuses);
 *
 * Domain-specific tests (legal-conclusion safety, bespoke intake logic) remain
 * in the workflow's own test file.
 */

import { describe, expect, it } from "vitest";
import { runPrivateOfficeWorkflow } from "./private-office-workflow";
import { workflows, type WorkflowId } from "./workflows";
import { workflowProfiles } from "./workflow-profiles";
import { canApproveMatter, canAuthorizeMatterMail } from "./gold-standard";
import { isApprovalValid } from "./draft-provenance";
import { transitionMatter, type PrivateOfficeMatter } from "./matter";

export interface WorkflowContractFixtures {
  /** Complete intake facts that satisfy all requiredFacts. */
  completeFacts: Record<string, string>;
  /** Build evidence statuses with all items at the given status. */
  buildEvidenceStatuses: (status?: "provided") => Record<string, "provided">;
  /** A valid objective string. */
  validObjective: string;
}

/**
 * Run the standard contract test suite for a Private Office workflow.
 *
 * These tests verify:
 *   - registry validity
 *   - profile validity
 *   - required fact validation (each fact individually)
 *   - evidence generation and blocking
 *   - timeline extraction
 *   - analysis findings
 *   - risk assessment
 *   - strategy generation
 *   - draft generation and structure
 *   - draft hash behavior
 *   - approval version integrity
 *   - authorization gates
 *   - matter lifecycle transitions
 *   - privacy (no SSN, password, credential requirements)
 */
export function runWorkflowContracts(
  workflowId: WorkflowId,
  fixtures: WorkflowContractFixtures,
) {
  const profile = workflowProfiles[workflowId];

  describe(`factory contracts: ${workflowId}`, () => {
    // ── Registry validity ──────────────────────────────────────────────

    describe("registry validity", () => {
      it("is registered in the workflow registry", () => {
        expect(workflows[workflowId]).toBeDefined();
      });

      it("has gold standard lifecycle", () => {
        expect(workflows[workflowId].lifecycle).toBe("gold");
      });

      it("has the canonical 18 Gold Standard stages", () => {
        const stages = workflows[workflowId].goldStandardStages;
        expect(stages).toHaveLength(18);
        expect(stages[0]).toBe("secure-ingest");
        expect(stages[stages.length - 1]).toBe("prove-audit");
      });

      it("has P06 and P10 pipeline archetypes", () => {
        expect(workflows[workflowId].pipelineArchetypes).toContain("P06");
        expect(workflows[workflowId].pipelineArchetypes).toContain("P10");
      });

      it("has standard workflow steps", () => {
        const steps = workflows[workflowId].steps;
        expect(steps).toContain("intro");
        expect(steps).toContain("draft");
        expect(steps).toContain("review");
        expect(steps).toContain("mailing");
        expect(steps).toContain("submitted");
      });
    });

    // ── Profile validity ───────────────────────────────────────────────

    describe("profile validity", () => {
      it("is registered in the profile registry", () => {
        expect(profile).toBeDefined();
        expect(profile.id).toBe(workflowId);
      });

      it("has a non-empty family", () => {
        expect(profile.family.length).toBeGreaterThan(0);
      });

      it("has a non-empty primary keyword", () => {
        expect(profile.primaryKeyword.length).toBeGreaterThan(0);
      });

      it("has supporting keywords", () => {
        expect(profile.supportingKeywords.length).toBeGreaterThanOrEqual(3);
      });

      it("has required facts", () => {
        expect(profile.requiredFacts.length).toBeGreaterThanOrEqual(4);
      });

      it("has evidence requirements", () => {
        expect(profile.evidenceRequirements.length).toBeGreaterThanOrEqual(5);
      });

      it("has a recipient role", () => {
        expect(profile.recipientRole.length).toBeGreaterThan(0);
      });

      it("has a deadline policy that does not invent deadlines", () => {
        expect(profile.deadlinePolicy).toContain("Do not invent");
      });

      it("distinguishes known from potential deadlines (when applicable)", () => {
        // The contractor-dispute profile uses a simpler deadline policy.
        // Only assert the known/potential distinction for workflows that
        // adopt the structured deadline model.
        if (profile.deadlinePolicy.includes("known deadlines")) {
          expect(profile.deadlinePolicy).toContain("potential deadlines");
        }
      });

      it("has an objective prompt", () => {
        expect(profile.objectivePrompt.length).toBeGreaterThan(0);
      });

      it("has a draft subject", () => {
        expect(profile.draftSubject.length).toBeGreaterThan(0);
      });

      it("has a disclaimer stating it is not a law firm", () => {
        expect(profile.disclaimer).toContain("not a law firm");
      });

      it("has valid pricing", () => {
        expect(profile.pricing.preparationFee).toBeGreaterThan(0);
        expect(profile.pricing.includedResponsePages).toBeGreaterThan(0);
        expect(profile.pricing.certifiedMail).toBeGreaterThan(profile.pricing.standardMail);
        if (profile.pricing.certifiedReturnReceipt) {
          expect(profile.pricing.certifiedReturnReceipt).toBeGreaterThan(
            profile.pricing.certifiedMail,
          );
        }
      });
    });

    // ── Required fact validation ───────────────────────────────────────

    describe("required fact validation", () => {
      it("blocks when all required facts are missing", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source document text.",
          facts: {},
          objective: fixtures.validObjective,
        });
        expect(result.blocked).toBe(true);
        const requiredBlocking = result.errors.filter((e) =>
          profile.requiredFacts.some((req) => e.includes(req)),
        );
        expect(requiredBlocking.length).toBe(profile.requiredFacts.length);
      });

      // Test each required fact individually
      for (const fact of profile.requiredFacts) {
        it(`blocks when ${fact} is missing`, () => {
          // Find the camelCase key for this fact
          const camelKey = fact
            .toLowerCase()
            .replace(/[^a-z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, "");

          const factsWithMissing = { ...fixtures.completeFacts };
          // Try to find and clear the matching key
          for (const key of Object.keys(factsWithMissing)) {
            const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (
              normalized === camelKey.toLowerCase() ||
              normalized.includes(camelKey.toLowerCase()) ||
              camelKey.toLowerCase().includes(normalized)
            ) {
              factsWithMissing[key] = "";
            }
          }
          const result = runPrivateOfficeWorkflow({
            workflowId,
            documentId: "doc-1",
            text: "Source text.",
            facts: factsWithMissing,
            objective: fixtures.validObjective,
          });
          expect(result.blocked).toBe(true);
          expect(result.errors.some((e) => e.includes(fact))).toBe(true);
        });
      }

      it("blocks when objective is missing", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          objective: "",
        });
        expect(result.blocked).toBe(true);
        expect(result.errors.some((e) => e.includes("resolution"))).toBe(true);
      });

      it("passes when all required facts and objective are provided", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(result.blocked).toBe(false);
      });
    });

    // ── Privacy ────────────────────────────────────────────────────────

    describe("privacy", () => {
      it("does not require SSN as a required fact", () => {
        const allFacts = profile.requiredFacts.join(" ").toLowerCase();
        expect(allFacts).not.toContain("social security");
        expect(allFacts).not.toContain("ssn");
      });

      it("does not require passwords or credentials", () => {
        const allFacts = profile.requiredFacts.join(" ").toLowerCase();
        expect(allFacts).not.toContain("password");
        expect(allFacts).not.toContain("credential");
      });

      it("does not require full bank account numbers", () => {
        const allFacts = profile.requiredFacts.join(" ").toLowerCase();
        expect(allFacts).not.toContain("account number");
      });
    });

    // ── Evidence ───────────────────────────────────────────────────────

    describe("evidence", () => {
      it("generates evidence items matching profile requirements", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          objective: fixtures.validObjective,
        });
        expect(result.analysis.evidence.length).toBe(
          profile.evidenceRequirements.length,
        );
      });

      it("blocks when evidence is not provided", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: {},
          objective: fixtures.validObjective,
        });
        expect(result.blocked).toBe(true);
      });

      it("passes when all evidence is provided", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses("provided"),
          objective: fixtures.validObjective,
        });
        expect(result.blocked).toBe(false);
      });
    });

    // ── Timeline ───────────────────────────────────────────────────────

    describe("timeline", () => {
      it("extracts dates from source documents", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Event occurred January 15, 2026. Follow-up on March 10, 2026.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(result.analysis.timeline.length).toBeGreaterThan(0);
      });

      it("returns empty timeline when source has no dates", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Document with no dates.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(result.analysis.timeline).toHaveLength(0);
      });
    });

    // ── Analysis ───────────────────────────────────────────────────────

    describe("analysis", () => {
      it("classifies correctly by workflow ID", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(result.analysis.classification.type).toBe(workflowId);
      });

      it("flags incomplete intake as a high-severity risk", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: {},
          objective: "",
        });
        expect(result.analysis.risks.length).toBeGreaterThan(0);
        expect(result.analysis.risks[0].severity).toBe("high");
        expect(result.analysis.risks[0].title).toContain("Incomplete intake");
      });

      it("generates strategy referencing the recipient role", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(
          result.analysis.strategy.some((s) =>
            s.includes(profile.recipientRole),
          ),
        ).toBe(true);
      });
    });

    // ── Draft ──────────────────────────────────────────────────────────

    describe("draft generation", () => {
      it("generates a draft with [DRAFT — REVIEW BEFORE SENDING] marker", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(result.draft).toContain("[DRAFT — REVIEW BEFORE SENDING]");
      });

      it("generates a draft with the profile draft subject", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(result.draft).toContain(profile.draftSubject);
      });

      it("includes the disclaimer in the draft", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(result.draft).toContain("Disclaimer:");
        expect(result.draft).toContain("not a law firm");
      });

      it("returns null draftHash (computed by caller)", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(result.draftHash).toBe(null);
      });
    });

    // ── Approval integrity ─────────────────────────────────────────────

    describe("approval version integrity", () => {
      it("blocks when approvedDraftHash is null in consequential state", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
          consequential: {
            draftValidated: true,
            humanApproved: true,
            recipientComplete: true,
            paymentComplete: true,
            mailingSubmitted: true,
            trackingNumber: "TRK-TEST",
            proofReady: true,
            approvedDraftHash: null,
          },
        });
        expect(result.blocked).toBe(true);
      });

      it("isApprovalValid rejects mismatched hashes", () => {
        expect(isApprovalValid("hash-a", "hash-b")).toBe(false);
      });

      it("isApprovalValid accepts matching hashes", () => {
        expect(isApprovalValid("same", "same")).toBe(true);
      });

      it("isApprovalValid rejects null hashes", () => {
        expect(isApprovalValid(null, "hash")).toBe(false);
        expect(isApprovalValid("hash", null)).toBe(false);
        expect(isApprovalValid(null, null)).toBe(false);
      });
    });

    // ── Authorization gates ────────────────────────────────────────────

    describe("authorization gates", () => {
      it("canAuthorizeMatterMail fails when analysis has blocking issues", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: {},
          objective: "",
        });
        expect(
          canAuthorizeMatterMail({
            analysis: result.analysis,
            draftValidated: true,
            humanApproved: true,
            recipientComplete: true,
            paymentComplete: true,
          }),
        ).toBe(false);
      });

      it("canAuthorizeMatterMail fails when human approval is missing", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(
          canAuthorizeMatterMail({
            analysis: result.analysis,
            draftValidated: true,
            humanApproved: false,
            recipientComplete: true,
            paymentComplete: true,
          }),
        ).toBe(false);
      });

      it("canAuthorizeMatterMail fails when payment is not complete", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(
          canAuthorizeMatterMail({
            analysis: result.analysis,
            draftValidated: true,
            humanApproved: true,
            recipientComplete: true,
            paymentComplete: false,
          }),
        ).toBe(false);
      });

      it("canApproveMatter passes when all blocking issues resolved", () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-1",
          text: "Source text.",
          facts: fixtures.completeFacts,
          evidenceStatuses: fixtures.buildEvidenceStatuses(),
          objective: fixtures.validObjective,
        });
        expect(canApproveMatter(result.analysis)).toBe(true);
      });
    });

    // ── Matter lifecycle ──────────────────────────────────────────────

    describe("matter lifecycle", () => {
      it("transitions through draft → validated → review → approved", () => {
        const matter: PrivateOfficeMatter = {
          id: "matter-1",
          ownerId: "user-1",
          workflowId,
          documentId: "doc-1",
          title: `Test matter — ${workflowId}`,
          status: "draft",
          version: 1,
          createdAt: "2026-08-23T00:00:00.000Z",
          updatedAt: "2026-08-23T00:00:00.000Z",
          approvedAt: null,
          approvedDraftHash: null,
          draftHash: null,
          submittedAt: null,
          providerOrderId: null,
          trackingNumber: null,
          proofHash: null,
        };

        const validated = transitionMatter(matter, "validated");
        expect(validated.status).toBe("validated");

        const reviewed = transitionMatter(validated, "review");
        expect(reviewed.status).toBe("review");

        const approved = transitionMatter(reviewed, "approved", undefined, {
          draftHash: "hash-test",
        });
        expect(approved.status).toBe("approved");
        expect(approved.approvedDraftHash).toBe("hash-test");
      });

      it("rejects invalid transitions from terminal states", () => {
        const matter: PrivateOfficeMatter = {
          id: "matter-1",
          ownerId: "user-1",
          workflowId,
          documentId: "doc-1",
          title: "Test",
          status: "completed",
          version: 1,
          createdAt: "2026-08-23T00:00:00.000Z",
          updatedAt: "2026-08-23T00:00:00.000Z",
          approvedAt: null,
          approvedDraftHash: null,
          draftHash: null,
          submittedAt: null,
          providerOrderId: null,
          trackingNumber: null,
          proofHash: "proof-hash",
        };
        expect(() => transitionMatter(matter, "draft")).toThrow(
          /Invalid matter transition/,
        );
      });
    });
  });
}

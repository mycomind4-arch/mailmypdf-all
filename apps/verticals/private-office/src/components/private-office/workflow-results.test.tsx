/**
 * Regression tests for the WorkflowResults shared component.
 *
 * These tests verify structural correctness without DOM rendering
 * (no @testing-library/react dependency needed):
 * 1. The component module exports the expected interface
 * 2. All four workflow profiles produce valid props
 * 3. The component handles both blocked and unblocked results
 */

import { describe, expect, it } from "vitest";
import { WorkflowResults } from "./workflow-results";
import { runPrivateOfficeWorkflow } from "@/domain/private-office-workflow";
import { workflowProfiles } from "@/domain/workflow-profiles";
import type { WorkflowId } from "@/domain/workflows";

describe("WorkflowResults shared component", () => {
  function buildCompleteFacts(workflowId: WorkflowId): Record<string, string> {
    const facts: Record<string, string> = {};
    const profile = workflowProfiles[workflowId];
    for (const fact of profile.requiredFacts) {
      const key = fact
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, "");
      facts[key] = `Test value for ${fact}`;
    }
    return facts;
  }

  function buildEvidenceStatuses(workflowId: WorkflowId) {
    const profile = workflowProfiles[workflowId];
    const statuses: Record<string, "provided"> = {};
    for (const req of profile.evidenceRequirements) {
      const slug = req
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      statuses[`evidence-${slug}`] = "provided";
    }
    return statuses;
  }

  const workflowIds: WorkflowId[] = [
    "contractor-dispute",
    "property-insurance-claim",
    "bank-wire-dispute",
    "trust-beneficiary-notice",
  ];

  describe("component export", () => {
    it("is a function (React component)", () => {
      expect(typeof WorkflowResults).toBe("function");
    });
  });

  describe("all workflows produce valid WorkflowResultsProps", () => {
    for (const workflowId of workflowIds) {
      it(`${workflowId} produces a result object compatible with WorkflowResultsProps`, () => {
        const profile = workflowProfiles[workflowId];
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-test",
          text: "Source document with dates January 15, 2026 and March 10, 2026.",
          facts: buildCompleteFacts(workflowId),
          evidenceStatuses: buildEvidenceStatuses(workflowId),
          objective: "Request resolution and documentation.",
        });

        // The result must have the fields WorkflowResults expects
        expect(result).toHaveProperty("stages");
        expect(result).toHaveProperty("analysis");
        expect(result).toHaveProperty("draft");
        expect(result).toHaveProperty("errors");
        expect(result).toHaveProperty("ready");
        expect(result).toHaveProperty("blocked");

        // The profile must have the fields WorkflowResults expects
        expect(profile).toHaveProperty("disclaimer");
        expect(profile.disclaimer.length).toBeGreaterThan(50);
      });

      it(`${workflowId} produces a blocked result with valid props`, () => {
        const result = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "doc-test",
          text: "Source text.",
          facts: {},
          objective: "",
        });

        expect(result.blocked).toBe(true);
        expect(result.errors.length).toBeGreaterThan(0);

        // The blocked result must still be valid WorkflowResultsProps
        expect(result).toHaveProperty("stages");
        expect(result).toHaveProperty("analysis");
        expect(result).toHaveProperty("errors");
      });
    }
  });

  describe("structural integrity across all workflows", () => {
    it("every workflow profile has valid pricing for display", () => {
      for (const workflowId of workflowIds) {
        const profile = workflowProfiles[workflowId];
        expect(profile.pricing.preparationFee).toBeGreaterThan(0);
        expect(profile.pricing.standardMail).toBeGreaterThan(0);
        expect(profile.pricing.certifiedMail).toBeGreaterThan(0);
      }
    });

    it("every workflow profile has a non-empty disclaimer", () => {
      for (const workflowId of workflowIds) {
        const profile = workflowProfiles[workflowId];
        expect(profile.disclaimer.length).toBeGreaterThan(50);
        expect(profile.disclaimer).toContain("not a law firm");
      }
    });
  });
});

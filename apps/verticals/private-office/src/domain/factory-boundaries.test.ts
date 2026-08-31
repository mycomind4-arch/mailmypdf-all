/**
 * Factory boundary regression tests.
 *
 * These tests prove that adding a new workflow does NOT require changes to:
 * - fulfillment
 * - authorization
 * - event infrastructure
 * - LLM adapter
 * - matter lifecycle
 * - MailMyPDF provider
 * - mailing-intent repository
 *
 * They verify structural isolation: no workflow imports infrastructure
 * directly, and all infrastructure is shared across all workflows.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("factory boundary: no workflow-specific infrastructure", () => {
  const routeDir = "src/routes/workflows";
  const routeFiles = readdirSync(routeDir).filter(
    (f) => f.endsWith(".tsx") && f !== "index.tsx",
  );

  for (const file of routeFiles) {
    const content = readFileSync(join(routeDir, file), "utf-8");

    it(`${file} does not import fulfillment`, () => {
      expect(content).not.toContain("fulfillment");
    });

    it(`${file} does not import authorization`, () => {
      expect(content).not.toContain("authorization");
      expect(content).not.toContain("canAuthorize");
      expect(content).not.toContain("canApproveMatter");
    });

    it(`${file} does not import mailing intent repository`, () => {
      expect(content).not.toContain("mailing-intent");
      expect(content).not.toContain("mailingIntent");
    });

    it(`${file} does not import MailMyPDF provider`, () => {
      expect(content).not.toContain("mailmypdf");
      expect(content).not.toContain("MailMyPDF");
    });

    it(`${file} does not import Gemini`, () => {
      expect(content).not.toContain("gemini");
      expect(content).not.toContain("Gemini");
    });

    it(`${file} does not import LLM adapter`, () => {
      expect(content).not.toContain("llm-adapter");
      expect(content).not.toContain("LLMAdapter");
    });

    it(`${file} does not import event repository`, () => {
      expect(content).not.toContain("event-repository");
      expect(content).not.toContain("EventRepository");
    });

    it(`${file} does not import matter repository`, () => {
      expect(content).not.toContain("matter-repository");
      expect(content).not.toContain("MatterRepository");
    });

    it(`${file} does not import draft provenance directly`, () => {
      expect(content).not.toContain("draft-provenance");
      expect(content).not.toContain("isApprovalValid");
    });

    it(`${file} does not import Supabase repositories`, () => {
      expect(content).not.toContain("supabase");
      expect(content).not.toContain("Supabase");
    });

    it(`${file} uses the shared workflow engine`, () => {
      expect(content).toContain("runPrivateOfficeWorkflow");
    });

    it(`${file} uses the shared WorkflowResults component`, () => {
      expect(content).toContain("WorkflowResults");
    });

    it(`${file} uses the shared profile registry`, () => {
      expect(content).toContain("workflowProfiles");
    });
  }
});

describe("factory boundary: workflow profiles do not import infrastructure", () => {
  it("workflow-profiles.ts does not import fulfillment", () => {
    const content = readFileSync("src/domain/workflow-profiles.ts", "utf-8");
    expect(content).not.toContain("fulfillment");
  });

  it("workflow-profiles.ts does not import Gemini", () => {
    const content = readFileSync("src/domain/workflow-profiles.ts", "utf-8");
    expect(content).not.toContain("gemini");
    expect(content).not.toContain("Gemini");
  });

  it("workflows.ts does not import Gemini", () => {
    const content = readFileSync("src/domain/workflows.ts", "utf-8");
    expect(content).not.toContain("gemini");
    expect(content).not.toContain("Gemini");
  });

  it("private-office-workflow.ts does not import Gemini", () => {
    const content = readFileSync("src/domain/private-office-workflow.ts", "utf-8");
    expect(content).not.toContain("gemini");
    expect(content).not.toContain("Gemini");
  });
});

describe("factory boundary: shared infrastructure is workflow-agnostic", () => {
  it("fulfillment.ts does not reference any specific workflow ID", () => {
    const content = readFileSync("src/services/fulfillment.ts", "utf-8");
    expect(content).not.toContain("contractor-dispute");
    expect(content).not.toContain("property-insurance-claim");
    expect(content).not.toContain("bank-wire-dispute");
    expect(content).not.toContain("trust-beneficiary-notice");
  });

  it("gold-standard.ts does not reference any specific workflow ID", () => {
    const content = readFileSync("src/domain/gold-standard.ts", "utf-8");
    expect(content).not.toContain("contractor-dispute");
    expect(content).not.toContain("property-insurance-claim");
    expect(content).not.toContain("bank-wire-dispute");
    expect(content).not.toContain("trust-beneficiary-notice");
  });

  it("workflow-executor.ts does not reference specific workflow IDs", () => {
    const content = readFileSync("src/domain/workflow-executor.ts", "utf-8");
    // The executor dispatches by workflow ID generically; it should not
    // hard-code behavior for specific workflows
    expect(content).not.toContain("contractor-dispute");
    expect(content).not.toContain("property-insurance-claim");
    expect(content).not.toContain("bank-wire-dispute");
    expect(content).not.toContain("trust-beneficiary-notice");
  });

  it("llm-adapter.ts imports Gemini only as the default factory adapter (not leaked to domain)", () => {
    const content = readFileSync("src/platform/llm-adapter.ts", "utf-8");
    // The factory legitimately imports the Gemini adapter as the default
    expect(content).toContain("GeminiAdapter");
    // But does not import workflow/domain code
    expect(content).not.toContain("workflow-profiles");
    expect(content).not.toContain("gold-standard");
    expect(content).not.toContain("workflow-executor");
  });

  it("Gemini is isolated to its own adapter file", () => {
    const content = readFileSync("src/platform/gemini-adapter.ts", "utf-8");
    expect(content).toContain("GeminiAdapter");
    // Should not import workflow/domain code
    expect(content).not.toContain("workflow-profiles");
    expect(content).not.toContain("gold-standard");
    expect(content).not.toContain("workflow-executor");
  });
});

import { describe, expect, it } from "vitest";
import {
  NOTICE_RESPONSE_RUNTIME_WORKFLOW_IDS,
  getNoticeResponseRuntimePolicy,
  platformWorkflowRuntimePolicyFor,
} from "@mailmypdf/workflows";
import {
  noticeRespondRuntimePolicyFor,
  noticeRespondStartRouteFor,
  noticeRespondStartRoutes,
} from "../runtime";

const coreIds = [
  "cp14-response",
  "cp2000-response",
  "cp504-response",
  "irs-balance-due-notice-response",
  "irs-penalty-notice-response",
] as const;

describe("Notice Respond runtime registration", () => {
  it("keeps core static routes registered and every reviewed profile runtime-bound exactly once", () => {
    expect(noticeRespondStartRoutes).toHaveLength(coreIds.length);
    expect(
      new Set(noticeRespondStartRoutes.map((route) => route.workflowId)).size,
    ).toBe(coreIds.length);

    const runtimeIds = [...NOTICE_RESPONSE_RUNTIME_WORKFLOW_IDS];
    expect(new Set(runtimeIds).size).toBe(runtimeIds.length);
    for (const workflowId of coreIds) {
      expect(runtimeIds).toContain(workflowId);
      expect(noticeRespondStartRouteFor(workflowId)?.path).toBe(
        `/notice-respond/workflows/${workflowId}/start/`,
      );
    }

    for (const workflowId of runtimeIds) {
      expect(noticeRespondRuntimePolicyFor(workflowId)).not.toBeNull();
      expect(getNoticeResponseRuntimePolicy(workflowId)).not.toBeNull();
      expect(platformWorkflowRuntimePolicyFor(workflowId)).not.toBeNull();
    }

    expect(noticeRespondStartRouteFor("not-real")).toBeNull();
    expect(noticeRespondRuntimePolicyFor("not-real")).toBeNull();
  });

  it("binds runtime identity to Notice Respond for core and generated profiles", () => {
    for (const workflowId of NOTICE_RESPONSE_RUNTIME_WORKFLOW_IDS) {
      const policy = noticeRespondRuntimePolicyFor(workflowId)!;
      expect(() =>
        policy.validateMatter({
          workflowId,
          verticalId: "notice-respond",
        }),
      ).not.toThrow();

      expect(() =>
        policy.validateMatter({
          workflowId,
          verticalId: "appeal-mail",
        }),
      ).toThrow(/identity does not match/i);
    }
  });

  it("requires explanatory facts for disagreement modes", () => {
    const cp2000 = noticeRespondRuntimePolicyFor("cp2000-response")!;
    const matter = {
      matter: {
        id: "matter-1",
        workflowId: "cp2000-response",
        verticalId: "notice-respond",
        status: "active",
        createdAt: "2026-09-17T00:00:00.000Z",
        updatedAt: "2026-09-17T00:00:00.000Z",
      },
      documents: [],
    };

    expect(() =>
      cp2000.validateInput(
        {
          taxpayerName: "Jane Doe",
          taxpayerAddress: "1 Main St",
          responseMode: "disagree",
          responseExplanation: "",
          requestedAction: "Please review the proposed changes.",
        },
        null,
        matter,
      ),
    ).toThrow(/response explanation is required/i);
  });
});

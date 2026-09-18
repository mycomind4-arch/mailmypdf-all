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

const ids = ["cp14-response", "cp2000-response"] as const;

describe("Notice Respond runtime registration", () => {
  it("registers every executable notice workflow exactly once", () => {
    expect(noticeRespondStartRoutes).toHaveLength(ids.length);
    expect(new Set(noticeRespondStartRoutes.map((route) => route.workflowId)).size).toBe(ids.length);
    expect(new Set(NOTICE_RESPONSE_RUNTIME_WORKFLOW_IDS)).toEqual(new Set(ids));

    for (const workflowId of ids) {
      expect(noticeRespondStartRouteFor(workflowId)?.path).toBe(
        `/notice-respond/workflows/${workflowId}/start/`,
      );
      expect(noticeRespondRuntimePolicyFor(workflowId)).not.toBeNull();
      expect(getNoticeResponseRuntimePolicy(workflowId)).not.toBeNull();
      expect(platformWorkflowRuntimePolicyFor(workflowId)).not.toBeNull();
    }

    expect(noticeRespondStartRouteFor("not-real")).toBeNull();
    expect(noticeRespondRuntimePolicyFor("not-real")).toBeNull();
  });

  it("binds runtime identity to Notice Respond", () => {
    for (const workflowId of ids) {
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

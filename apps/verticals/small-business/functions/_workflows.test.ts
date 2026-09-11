import { describe, expect, it } from "vitest";
import { isAllowedWorkflowId, SMALL_BUSINESS_VERTICAL_ID } from "./_workflows";
import { getPricingProfilesByVertical } from "@mailmypdf/pricing";

describe("isAllowedWorkflowId", () => {
  it("accepts every workflow registered for this vertical in the pricing catalog", () => {
    const profiles = getPricingProfilesByVertical(SMALL_BUSINESS_VERTICAL_ID);
    expect(profiles.length).toBeGreaterThan(0);
    for (const profile of profiles) {
      expect(isAllowedWorkflowId(profile.workflowId)).toBe(true);
    }
  });

  it("rejects arbitrary client-supplied workflow ids", () => {
    expect(isAllowedWorkflowId("some-other-verticals-internal-task")).toBe(false);
    expect(isAllowedWorkflowId("../admin-task")).toBe(false);
    expect(isAllowedWorkflowId("")).toBe(false);
    expect(isAllowedWorkflowId(undefined)).toBe(false);
    expect(isAllowedWorkflowId(null)).toBe(false);
  });
});

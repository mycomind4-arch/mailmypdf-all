import { describe, expect, it } from "vitest";
import { isWorkflowBuildAdmin, requireWorkflowBuildAdmin } from "./workflow-build-admin";

describe("workflow builder administrator authorization", () => {
  it("accepts a server-configured administrator", () => {
    expect(isWorkflowBuildAdmin(
      { id: "operator-1" },
      { PRIVATE_OFFICE_WORKFLOW_BUILD_ADMIN_IDS: "operator-1,operator-2" },
    )).toBe(true);
  });

  it("accepts only administrator roles from app metadata", () => {
    expect(isWorkflowBuildAdmin({ id: "operator-1", app_metadata: { roles: ["admin"] } }, {})).toBe(true);
    expect(isWorkflowBuildAdmin({ id: "operator-1", app_metadata: { role: "super_admin" } }, {})).toBe(true);
    expect(isWorkflowBuildAdmin({ id: "operator-1", app_metadata: { role: "customer" } }, {})).toBe(false);
  });

  it("denies untrusted or absent role data", () => {
    expect(isWorkflowBuildAdmin({ id: "customer-1" }, {})).toBe(false);
    expect(() => requireWorkflowBuildAdmin({ id: "customer-1" }, {})).toThrow(/administrator access/);
  });
});

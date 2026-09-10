import { describe, expect, it } from "vitest";
import {
  CASE_WORKSPACE_STAGES,
  canAdvanceCaseWorkspace,
  type CaseWorkspaceState,
} from "./case-workspace-contract";

const baseState: CaseWorkspaceState = {
  caseId: "case-1",
  ownerId: "owner-1",
  stage: "overview",
  sourceDocumentIds: [],
  evidenceDocumentIds: [],
  analysisStatus: "not_started",
  draftStatus: "not_started",
  packetStatus: "not_started",
  mailingStatus: "not_ready",
};

describe("case workspace contract", () => {
  it("keeps the standalone stage sequence", () => {
    expect(CASE_WORKSPACE_STAGES).toEqual([
      "overview",
      "documents",
      "analysis",
      "response",
      "packet",
      "mail",
    ]);
  });

  it("does not allow response before analysis", () => {
    expect(canAdvanceCaseWorkspace(baseState, "response")).toBe(false);
    expect(
      canAdvanceCaseWorkspace({ ...baseState, analysisStatus: "needs_review" }, "response"),
    ).toBe(true);
  });

  it("does not allow packet before a draft", () => {
    expect(canAdvanceCaseWorkspace(baseState, "packet")).toBe(false);
    expect(canAdvanceCaseWorkspace({ ...baseState, draftStatus: "revised" }, "packet")).toBe(true);
  });

  it("does not allow mail until the packet is locked", () => {
    expect(canAdvanceCaseWorkspace(baseState, "mail")).toBe(false);
    expect(canAdvanceCaseWorkspace({ ...baseState, packetStatus: "assembled" }, "mail")).toBe(false);
    expect(canAdvanceCaseWorkspace({ ...baseState, packetStatus: "locked" }, "mail")).toBe(true);
  });
});

export const CASE_WORKSPACE_STAGES = [
  "overview",
  "documents",
  "analysis",
  "response",
  "packet",
  "mail",
] as const;

export type CaseWorkspaceStage = (typeof CASE_WORKSPACE_STAGES)[number];

export type CaseWorkspaceState = {
  caseId: string;
  ownerId: string;
  stage: CaseWorkspaceStage;
  sourceDocumentIds: string[];
  evidenceDocumentIds: string[];
  analysisStatus: "not_started" | "running" | "complete" | "needs_review";
  draftStatus: "not_started" | "drafted" | "revised" | "approved";
  packetStatus: "not_started" | "assembled" | "locked";
  mailingStatus: "not_ready" | "ready" | "paid" | "submitted" | "mailed";
};

export function canAdvanceCaseWorkspace(
  state: CaseWorkspaceState,
  target: CaseWorkspaceStage,
) {
  if (target === "overview" || target === "documents" || target === "analysis") return true;
  if (target === "response") {
    return state.analysisStatus === "complete" || state.analysisStatus === "needs_review";
  }
  if (target === "packet") {
    return (
      state.draftStatus === "drafted" ||
      state.draftStatus === "revised" ||
      state.draftStatus === "approved"
    );
  }
  if (target === "mail") return state.packetStatus === "locked";
  return false;
}

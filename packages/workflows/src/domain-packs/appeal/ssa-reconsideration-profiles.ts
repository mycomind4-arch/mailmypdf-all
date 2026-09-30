export type SsaReconsiderationProgram = "SSDI" | "SSI";

export interface SsaReconsiderationWorkflowProfile {
  workflowId: "appeal-ssdi-denial" | "appeal-ssi-denial";
  program: SsaReconsiderationProgram;
  title: string;
  primaryDocumentId: string;
  primaryDocumentLabel: string;
  extractionSchema: string;
  requestedOutcomeDefault: string;
}

export const SSA_RECONSIDERATION_WORKFLOW_PROFILES = Object.freeze([
  {
    workflowId: "appeal-ssdi-denial",
    program: "SSDI",
    title: "Appeal SSDI Denial",
    primaryDocumentId: "ssdi-denial-notice",
    primaryDocumentLabel: "SSDI denial notice",
    extractionSchema: "ssdi-denial-notice-v1",
    requestedOutcomeDefault:
      "Reconsider the SSDI denial using the submitted information and evidence.",
  },
  {
    workflowId: "appeal-ssi-denial",
    program: "SSI",
    title: "Appeal SSI Denial",
    primaryDocumentId: "ssi-denial-notice",
    primaryDocumentLabel: "SSI denial notice",
    extractionSchema: "ssi-denial-notice-v1",
    requestedOutcomeDefault:
      "Reconsider the SSI denial using the submitted information and evidence.",
  },
] as const satisfies readonly SsaReconsiderationWorkflowProfile[]);

export type SsaReconsiderationProfileWorkflowId =
  (typeof SSA_RECONSIDERATION_WORKFLOW_PROFILES)[number]["workflowId"];

export function getSsaReconsiderationWorkflowProfile(
  workflowId: string,
): SsaReconsiderationWorkflowProfile | null {
  return (
    SSA_RECONSIDERATION_WORKFLOW_PROFILES.find(
      (profile) => profile.workflowId === workflowId,
    ) ?? null
  );
}

import type {
  SsaReconsiderationProgram,
  SsaReconsiderationWorkflowId,
} from "./ssa-reconsideration-runtime-policy.js";

export type SsaReconsiderationWorkflowProfile = Readonly<{
  workflowId: SsaReconsiderationWorkflowId;
  program: SsaReconsiderationProgram;
  title: string;
  primaryDocumentId: string;
  primaryDocumentLabel: string;
  extractionSchema: string;
}>;

export const SSA_RECONSIDERATION_WORKFLOW_PROFILES: readonly SsaReconsiderationWorkflowProfile[] =
  Object.freeze([
    Object.freeze({
      workflowId: "appeal-ssdi-denial",
      program: "SSDI",
      title: "Appeal SSDI Denial",
      primaryDocumentId: "ssdi-denial-notice",
      primaryDocumentLabel: "SSDI denial notice",
      extractionSchema: "ssdi-denial-notice-v1",
    }),
    Object.freeze({
      workflowId: "appeal-ssi-denial",
      program: "SSI",
      title: "Appeal SSI Denial",
      primaryDocumentId: "ssi-denial-notice",
      primaryDocumentLabel: "SSI denial notice",
      extractionSchema: "ssi-denial-notice-v1",
    }),
  ] as const);

export function getSsaReconsiderationWorkflowProfile(
  workflowId: string,
): SsaReconsiderationWorkflowProfile | null {
  return (
    SSA_RECONSIDERATION_WORKFLOW_PROFILES.find(
      (profile) => profile.workflowId === workflowId,
    ) ?? null
  );
}

import { GENERATED_SSA_RECONSIDERATION_WORKFLOW_PROFILES } from "./generated-ssa-reconsideration-profiles.js";
import type {
  SsaReconsiderationProgram,
} from "./ssa-reconsideration-runtime-policy.js";

export type SsaReconsiderationWorkflowProfile = Readonly<{
  workflowId: string;
  program: SsaReconsiderationProgram;
  title: string;
  primaryDocumentId: string;
  primaryDocumentLabel: string;
  extractionSchema: string;
}>;

export const CORE_SSA_RECONSIDERATION_WORKFLOW_PROFILES: readonly SsaReconsiderationWorkflowProfile[] =
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

export const SSA_RECONSIDERATION_WORKFLOW_PROFILES =
  Object.freeze([
    ...CORE_SSA_RECONSIDERATION_WORKFLOW_PROFILES,
    ...GENERATED_SSA_RECONSIDERATION_WORKFLOW_PROFILES,
  ] as const satisfies readonly SsaReconsiderationWorkflowProfile[]);

export function getSsaReconsiderationWorkflowProfile(
  workflowId: string,
): SsaReconsiderationWorkflowProfile | null {
  return (
    SSA_RECONSIDERATION_WORKFLOW_PROFILES.find(
      (profile) => profile.workflowId === workflowId,
    ) ?? null
  );
}

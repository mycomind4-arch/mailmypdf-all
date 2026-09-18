import { getInsuranceAppealRuntimePolicy } from "./domain-packs/appeal/insurance-runtime-policy.js";
import { getRecordsRequestRuntimePolicy } from "./domain-packs/records-request/runtime-policy.js";
import { getNoticeResponseRuntimePolicy } from "./domain-packs/notice-response/runtime-policy.js";
import { createWorkflowRuntimePolicyResolver } from "./runtime-policy-registry.js";

/**
 * Canonical host-facing runtime policy resolver for workflows migrated into the
 * new shared architecture. Add new vertical/domain providers here as they are
 * migrated; hosts should not hard-code workflow IDs themselves.
 */
export const platformWorkflowRuntimePolicyFor = createWorkflowRuntimePolicyResolver(
  getInsuranceAppealRuntimePolicy,
  getRecordsRequestRuntimePolicy,
  getNoticeResponseRuntimePolicy,
);

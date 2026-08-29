import type { AdapterId } from "./adapter-registry.js";
import type { PipelineId } from "./pipeline-registry.js";

/**
 * Supported primary pipeline/domain-adapter pairings.
 * A workflow may add secondary adapters through adapter composition rules.
 */
export const PIPELINE_ADAPTER_MATRIX: Readonly<Record<PipelineId, readonly AdapterId[]>> = {
  P01_CORE_MAIL: ["business", "consumer-billing", "government"],
  P02_OFFICIAL_RESPONSE: ["government", "tax", "benefits", "immigration", "records", "business"],
  P03_APPEAL: ["government", "tax", "insurance", "healthcare", "benefits", "education", "dmv-licensing", "immigration"],
  P04_COURT: ["court-procedure", "government", "immigration", "records", "housing"],
  P05_IMMIGRATION: ["immigration", "government", "court-procedure"],
  P06_DISPUTE: ["credit-debt", "consumer-billing", "insurance", "healthcare", "business"],
  P07_BUSINESS_AUTOMATION: ["business", "consumer-billing", "government", "permits-regulatory"],
  P08_RECORDS: ["records", "government", "court-procedure"],
  P09_REGULATORY: ["government", "housing", "dmv-licensing", "permits-regulatory", "business"],
  P10_CLAIM_PROOF: ["insurance", "healthcare", "benefits", "records", "government", "business"],
};

export function isAdapterCompatible(pipeline: PipelineId, adapter: AdapterId): boolean {
  return PIPELINE_ADAPTER_MATRIX[pipeline].includes(adapter);
}

export function invalidAdapterPairings(pipeline: PipelineId, adapters: readonly AdapterId[]): AdapterId[] {
  return adapters.filter((adapter) => !isAdapterCompatible(pipeline, adapter));
}

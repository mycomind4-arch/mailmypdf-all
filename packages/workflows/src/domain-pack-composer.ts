import type { DomainPack, GoldStandardInput, PipelineStage, StageResult } from "./gold-standard-pipeline.js";

/**
 * Compose domain intelligence from multiple concrete packs.
 * The first pack that implements a stage owns it; missing stages fail closed.
 * This prevents a generic adapter from silently pretending to understand a domain.
 */

const STAGES: readonly PipelineStage[] = [
  "security", "classification", "extraction", "understand", "facts", "provenance",
  "timeline", "deadline", "requirements", "contradiction", "findings", "discrepancy",
  "evidence", "research", "risk", "strategy", "draft", "draftProvenance", "validation",
  "review", "approval", "mailing", "tracking", "proofAudit",
];

const methods: Readonly<Record<PipelineStage, keyof DomainPack>> = {
  security: "security", classification: "classify", extraction: "extract", understand: "understand",
  facts: "facts", provenance: "provenance", timeline: "timeline", deadline: "deadlines",
  requirements: "requirements", contradiction: "contradictions", findings: "findings",
  discrepancy: "discrepancies", evidence: "evidence", research: "research", risk: "risk",
  strategy: "strategy", draft: "draft", draftProvenance: "draftProvenance", validation: "validation",
  blockingGate: "validation", review: "review", approval: "approval", mailing: "mailing",
  tracking: "tracking", proofAudit: "proofAudit",
};

function unavailable(packIds: readonly string[], stage: PipelineStage): StageResult {
  return {
    stage,
    status: "failed",
    messages: [`No registered domain pack implements required stage '${stage}'. Packs checked: ${packIds.join(", ") || "none"}.`],
  };
}

export function composeDomainPack(packs: readonly DomainPack[]): DomainPack {
  if (packs.length === 0) throw new Error("At least one domain pack is required.");

  const packIds = packs.map((pack) => pack.id);
  const resolve = (stage: PipelineStage): ((input: GoldStandardInput, prior: readonly StageResult[]) => Promise<StageResult>) => {
    const method = methods[stage];
    return async (input, prior) => {
      for (const pack of packs) {
        const candidate = pack[method] as unknown;
        if (typeof candidate === "function") {
          if (stage === "security" || stage === "classification" || stage === "extraction") {
            return (candidate as (input: GoldStandardInput) => Promise<StageResult>).call(pack, input);
          }
          return (candidate as (input: GoldStandardInput, prior: readonly StageResult[]) => Promise<StageResult>).call(pack, input, prior);
        }
      }
      return unavailable(packIds, stage);
    };
  };

  return {
    id: packs.map((pack) => pack.id).join("+") ,
    security: (input) => resolve("security")(input, []),
    classify: (input) => resolve("classification")(input, []),
    extract: (input) => resolve("extraction")(input, []),
    understand: resolve("understand"),
    facts: resolve("facts"),
    provenance: resolve("provenance"),
    timeline: resolve("timeline"),
    deadlines: resolve("deadline"),
    requirements: resolve("requirements"),
    contradictions: resolve("contradiction"),
    findings: resolve("findings"),
    discrepancies: resolve("discrepancy"),
    evidence: resolve("evidence"),
    research: resolve("research"),
    risk: resolve("risk"),
    strategy: resolve("strategy"),
    draft: resolve("draft"),
    draftProvenance: resolve("draftProvenance"),
    validation: resolve("validation"),
    review: resolve("review"),
    approval: resolve("approval"),
    mailing: resolve("mailing"),
    tracking: resolve("tracking"),
    proofAudit: resolve("proofAudit"),
  };
}

export function implementedDomainStages(pack: DomainPack): readonly PipelineStage[] {
  return STAGES.filter((stage) => typeof pack[methods[stage]] === "function");
}

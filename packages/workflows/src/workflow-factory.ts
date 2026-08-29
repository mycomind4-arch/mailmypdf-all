import { getAdapter, type AdapterId } from "./adapter-registry.js";
import { invalidAdapterPairings } from "./pipeline-adapter-matrix.js";
import { getPipeline } from "./pipeline-registry.js";
import { type WorkflowCapability, type WorkflowManifest, validateManifestShape } from "./workflow-manifest.js";

export type FactoryDiagnosticSeverity = "error" | "warning";
export type FactoryDiagnostic = { severity: FactoryDiagnosticSeverity; code: string; message: string };
export type WorkflowFactoryResult = { executable: boolean; manifest: WorkflowManifest; pipeline: ReturnType<typeof getPipeline>; adapters: ReturnType<typeof getAdapter>[]; diagnostics: readonly FactoryDiagnostic[] };

const PIPELINE_STAGE_TO_CAPABILITY: Readonly<Record<string, WorkflowCapability>> = {
  security: "security", classification: "classification", extraction: "extraction", understand: "understand", facts: "facts",
  provenance: "provenance", deadline: "deadlines", timeline: "timeline", requirements: "requirements", contradiction: "contradictions",
  findings: "findings", discrepancy: "discrepancies", evidence: "evidence", research: "research", risk: "risk", strategy: "strategy",
  draft: "draft", draftProvenance: "draftProvenance", validation: "validation", blockingGate: "blockingGate", review: "humanReview",
  approval: "approval", mailing: "mailing", tracking: "tracking", proofAudit: "proofAudit",
};

export function composeWorkflow(manifest: WorkflowManifest): WorkflowFactoryResult {
  const diagnostics: FactoryDiagnostic[] = validateManifestShape(manifest).map((message) => ({ severity: "error", code: "INVALID_MANIFEST", message }));
  let pipeline: ReturnType<typeof getPipeline>;
  try { pipeline = getPipeline(manifest.pipeline); }
  catch (error) { diagnostics.push({ severity: "error", code: "UNKNOWN_PIPELINE", message: error instanceof Error ? error.message : String(error) }); pipeline = getPipeline("P01_CORE_MAIL"); }

  const adapters: ReturnType<typeof getAdapter>[] = [];
  for (const adapterId of manifest.adapters) {
    try { adapters.push(getAdapter(adapterId)); }
    catch (error) { diagnostics.push({ severity: "error", code: "UNKNOWN_ADAPTER", message: error instanceof Error ? error.message : String(error) }); }
  }
  for (const adapterId of invalidAdapterPairings(manifest.pipeline, manifest.adapters)) diagnostics.push({ severity: "error", code: "INCOMPATIBLE_ADAPTER", message: `Adapter ${adapterId} is not an approved pairing for ${manifest.pipeline}.` });

  const declared = new Set([...manifest.requiredCapabilities, ...manifest.optionalCapabilities, ...manifest.notApplicableCapabilities]);
  for (const stage of pipeline.requiredStages) {
    const capability = PIPELINE_STAGE_TO_CAPABILITY[stage];
    if (capability && !declared.has(capability)) diagnostics.push({ severity: "error", code: "PIPELINE_CAPABILITY_UNDECLARED", message: `Pipeline ${pipeline.id} requires ${capability}, but workflow ${manifest.id} does not declare it.` });
  }

  const notApplicable = new Set(manifest.notApplicableCapabilities);
  for (const stage of pipeline.requiredStages) {
    const capability = PIPELINE_STAGE_TO_CAPABILITY[stage];
    if (capability && notApplicable.has(capability)) diagnostics.push({ severity: "error", code: "REQUIRED_STAGE_NOT_APPLICABLE", message: `Pipeline ${pipeline.id} requires ${capability}, but workflow ${manifest.id} declares it not applicable.` });
  }

  if (manifest.allowsConsequentialAction && !manifest.requiresHumanReview) diagnostics.push({ severity: "error", code: "MISSING_HUMAN_REVIEW", message: "Consequential workflows require explicit human review." });
  if (manifest.maturity === "production-verified" && diagnostics.some((d) => d.severity === "error")) diagnostics.push({ severity: "error", code: "PRODUCTION_STATUS_INVALID", message: "A production-verified workflow cannot have factory errors." });

  return { executable: diagnostics.every((d) => d.severity !== "error"), manifest, pipeline, adapters, diagnostics };
}

export function composeWorkflowOrThrow(manifest: WorkflowManifest): WorkflowFactoryResult {
  const result = composeWorkflow(manifest);
  const errors = result.diagnostics.filter((d) => d.severity === "error");
  if (errors.length > 0) throw new Error(errors.map((d) => `${d.code}: ${d.message}`).join("\n"));
  return result;
}

export function adapterIdsForComposition(manifest: WorkflowManifest): readonly AdapterId[] { return manifest.adapters; }

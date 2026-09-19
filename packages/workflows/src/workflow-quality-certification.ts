import { certifyWorkflowCapabilities } from "./capability-certification.js";
import { certifyWorkflowDomain, type WorkflowDomainSpec } from "./workflow-domain-spec.js";
import { composeWorkflow } from "./workflow-factory.js";
import { validateManifestShape, type WorkflowManifest } from "./workflow-manifest.js";
import type { CapabilityId } from "./capability-registry.js";

export interface WorkflowAcceptanceEvidence {
  scenarioId: string;
  status: "passed" | "failed" | "blocked" | "skipped";
  runId?: string;
}

export interface WorkflowQualityCertificationInput {
  manifest: WorkflowManifest;
  domain: WorkflowDomainSpec;
  runtimeCapabilities?: readonly CapabilityId[];
  acceptance?: readonly WorkflowAcceptanceEvidence[];
  now?: string | Date;
}

export interface WorkflowQualityIssue {
  stage: "definition" | "runtime" | "acceptance" | "production";
  code: string;
  message: string;
}

export interface WorkflowQualityCertification {
  workflowId: string;
  definitionReady: boolean;
  runtimeReady: boolean;
  acceptanceReady: boolean;
  productionReady: boolean;
  requiredRuntimeCapabilities: readonly CapabilityId[];
  missingRuntimeCapabilities: readonly CapabilityId[];
  missingAcceptanceScenarios: readonly string[];
  failedAcceptanceScenarios: readonly string[];
  issues: readonly WorkflowQualityIssue[];
}

export function runtimeCapabilitiesForManifest(
  manifest: WorkflowManifest,
): readonly CapabilityId[] {
  const required = new Set(manifest.requiredCapabilities);
  return [
    ...new Set(
      (manifest.steps ?? [])
        .flatMap((step) => step.uses)
        .filter((capability) => required.has(capability)),
    ),
  ];
}

export function certifyWorkflowQuality(
  input: WorkflowQualityCertificationInput,
): WorkflowQualityCertification {
  const { manifest, domain } = input;
  const issues: WorkflowQualityIssue[] = [];

  const shapeErrors = validateManifestShape(manifest);
  for (const message of shapeErrors) {
    issues.push({
      stage: "definition",
      code: "manifest_shape",
      message,
    });
  }

  const composition = composeWorkflow(manifest);
  for (const diagnostic of composition.diagnostics.filter(
    (item) => item.severity === "error",
  )) {
    issues.push({
      stage: "definition",
      code: diagnostic.code,
      message: diagnostic.message,
    });
  }

  // Capability certification is a production-readiness concern, not a
  // static-shape concern: a manifest can be perfectly well-formed while
  // requiring capabilities that are not yet certified production (see
  // capability-registry.ts's maturity model). Filing these under
  // "definition" would make definitionReady false for every manifest that
  // requires any not-yet-production capability, which conflates "is this
  // manifest valid" with "is this manifest production-ready" — two
  // different facts. Filed under "production" instead, and folded into
  // productionReady explicitly below.
  const capabilities = certifyWorkflowCapabilities(manifest);
  for (const issue of capabilities.issues) {
    issues.push({
      stage: "production",
      code: issue.code,
      message: issue.message,
    });
  }

  const domainCertification = certifyWorkflowDomain(
    manifest,
    domain,
    input.now ?? new Date(),
  );
  for (const issue of domainCertification.issues) {
    issues.push({
      stage: "definition",
      code: issue.code,
      message: issue.message,
    });
  }

  const definitionReady = !issues.some((issue) => issue.stage === "definition");

  const requiredRuntimeCapabilities = runtimeCapabilitiesForManifest(manifest);
  const bound = new Set(input.runtimeCapabilities ?? []);
  const missingRuntimeCapabilities = requiredRuntimeCapabilities.filter(
    (capability) => !bound.has(capability),
  );

  if (!input.runtimeCapabilities) {
    issues.push({
      stage: "runtime",
      code: "runtime_not_evaluated",
      message: "Runtime capability bindings were not supplied.",
    });
  } else {
    for (const capability of missingRuntimeCapabilities) {
      issues.push({
        stage: "runtime",
        code: "runtime_capability_missing",
        message: `Runtime handler is missing for executable capability ${capability}.`,
      });
    }
  }

  const runtimeReady =
    Boolean(input.runtimeCapabilities) &&
    missingRuntimeCapabilities.length === 0;

  const evidenceByScenario = new Map(
    (input.acceptance ?? []).map((evidence) => [evidence.scenarioId, evidence]),
  );
  const requiredScenarios = (manifest.acceptanceScenarios ?? [])
    .filter((scenario) => scenario.required)
    .map((scenario) => scenario.id);

  const missingAcceptanceScenarios = requiredScenarios.filter(
    (scenarioId) => !evidenceByScenario.has(scenarioId),
  );
  const failedAcceptanceScenarios = requiredScenarios.filter((scenarioId) => {
    const evidence = evidenceByScenario.get(scenarioId);
    return Boolean(evidence && evidence.status !== "passed");
  });

  if (!input.acceptance) {
    issues.push({
      stage: "acceptance",
      code: "acceptance_not_evaluated",
      message: "Acceptance evidence was not supplied.",
    });
  } else {
    for (const scenarioId of missingAcceptanceScenarios) {
      issues.push({
        stage: "acceptance",
        code: "acceptance_missing",
        message: `Required acceptance scenario has no evidence: ${scenarioId}.`,
      });
    }
    for (const scenarioId of failedAcceptanceScenarios) {
      issues.push({
        stage: "acceptance",
        code: "acceptance_not_passed",
        message: `Required acceptance scenario did not pass: ${scenarioId}.`,
      });
    }
  }

  const acceptanceReady =
    Boolean(input.acceptance) &&
    missingAcceptanceScenarios.length === 0 &&
    failedAcceptanceScenarios.length === 0;

  const productionReady =
    manifest.maturity === "production-verified" &&
    definitionReady &&
    capabilities.productionReady &&
    runtimeReady &&
    acceptanceReady;

  if (manifest.maturity === "production-verified" && !productionReady) {
    issues.push({
      stage: "production",
      code: "production_evidence_incomplete",
      message:
        "A production-verified workflow must pass definition, runtime, and acceptance certification.",
    });
  }

  return {
    workflowId: manifest.id,
    definitionReady,
    runtimeReady,
    acceptanceReady,
    productionReady,
    requiredRuntimeCapabilities,
    missingRuntimeCapabilities,
    missingAcceptanceScenarios,
    failedAcceptanceScenarios,
    issues,
  };
}

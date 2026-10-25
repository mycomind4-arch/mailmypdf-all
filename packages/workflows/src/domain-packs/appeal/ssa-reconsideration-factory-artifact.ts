import {
  workflowById,
  type WorkflowDefinition,
} from "../../canonical-workflow-registry.js";
import {
  composeWorkflow,
  composeWorkflowForChat,
  type FactoryDiagnostic,
} from "../../workflow-factory.js";
import type { DefinedWorkflow } from "../../define-workflow.js";
import type { WorkflowManifest } from "../../workflow-manifest.js";
import type { WorkflowRuntimePolicy } from "../../matter-runtime-server.js";
import {
  createSsaReconsiderationManifest,
} from "./ssa-reconsideration-manifest.js";
import {
  getSsaReconsiderationWorkflowProfile,
  type SsaReconsiderationWorkflowProfile,
} from "./ssa-reconsideration-profiles.js";
import {
  getSsaReconsiderationRuntimePolicy,
  type SsaReconsiderationWorkflowId,
} from "./ssa-reconsideration-runtime-policy.js";

export type SsaReconsiderationStartConfig = Readonly<{
  workflowId: SsaReconsiderationWorkflowId;
  program: "SSDI" | "SSI";
  title: string;
  backHref: string;
  subtitle: string;
}>;

export type SsaReconsiderationFactoryArtifact = Readonly<{
  family: "ssa-reconsideration";
  workflowId: SsaReconsiderationWorkflowId;
  canonicalId: string;
  profile: SsaReconsiderationWorkflowProfile;
  canonical: WorkflowDefinition;
  definition: DefinedWorkflow<WorkflowManifest>;
  manifest: WorkflowManifest;
  runtimePolicy: WorkflowRuntimePolicy;
  startConfig: SsaReconsiderationStartConfig;
  diagnostics: readonly FactoryDiagnostic[];
  factoryReady: boolean;
}>;

function diagnostic(code: string, message: string): FactoryDiagnostic {
  return { severity: "error", code, message };
}

export function createSsaReconsiderationFactoryArtifact(
  workflowId: SsaReconsiderationWorkflowId,
): SsaReconsiderationFactoryArtifact {
  const profile = getSsaReconsiderationWorkflowProfile(workflowId);
  if (!profile) {
    throw new Error(`Unknown SSA reconsideration workflow profile: ${workflowId}`);
  }

  const canonicalId = `appeal-mail/${workflowId}`;
  const canonical = workflowById(canonicalId);
  if (!canonical) {
    throw new Error(`Canonical workflow registry is missing ${canonicalId}`);
  }

  const definition = createSsaReconsiderationManifest(profile);
  const manifest = definition.manifest;
  const runtimePolicy = getSsaReconsiderationRuntimePolicy(workflowId);
  if (!runtimePolicy) {
    throw new Error(`SSA reconsideration runtime policy is missing ${workflowId}`);
  }

  const composition = composeWorkflow(manifest);
  const diagnostics: FactoryDiagnostic[] = [...composition.diagnostics];

  if (canonical.sectionId !== "appeal-mail") {
    diagnostics.push(
      diagnostic(
        "CANONICAL_SECTION_MISMATCH",
        `Canonical workflow ${canonical.id} is not in appeal-mail.`,
      ),
    );
  }

  if (canonical.slug !== profile.workflowId || manifest.id !== profile.workflowId) {
    diagnostics.push(
      diagnostic(
        "WORKFLOW_IDENTITY_MISMATCH",
        "Canonical identity, profile identity, and generated manifest identity must match.",
      ),
    );
  }

  if (manifest.vertical !== canonical.sectionId) {
    diagnostics.push(
      diagnostic(
        "MANIFEST_SECTION_MISMATCH",
        `Generated manifest vertical ${manifest.vertical} does not match canonical section ${canonical.sectionId}.`,
      ),
    );
  }

  if (manifest.route !== `${canonical.publicHref}/start`) {
    diagnostics.push(
      diagnostic(
        "START_ROUTE_MISMATCH",
        `Generated manifest route ${manifest.route} does not match canonical public start route ${canonical.publicHref}/start.`,
      ),
    );
  }

  if (
    canonical.execution?.kind !== "platform" ||
    canonical.execution.policyFamily !== "ssa-reconsideration"
  ) {
    diagnostics.push(
      diagnostic(
        "RUNTIME_BINDING_MISMATCH",
        `Canonical workflow ${canonical.id} is not bound to the ssa-reconsideration platform runtime.`,
      ),
    );
  }

  const primaryDocument = (manifest.documents ?? []).find(
    (document) => document.role === "primary" && document.required,
  );
  if (
    !primaryDocument ||
    primaryDocument.id !== profile.primaryDocumentId ||
    primaryDocument.extractionSchema !== profile.extractionSchema
  ) {
    diagnostics.push(
      diagnostic(
        "PRIMARY_DOCUMENT_MISMATCH",
        "Generated primary-document contract does not match the SSA reconsideration profile.",
      ),
    );
  }

  if (!runtimePolicy.chatContract) {
    diagnostics.push(
      diagnostic(
        "CHAT_CONTRACT_MISSING",
        "Generated runtime policy must declare the workflow chat contract.",
      ),
    );
  }

  return Object.freeze({
    family: "ssa-reconsideration",
    workflowId,
    canonicalId,
    profile,
    canonical,
    definition,
    manifest,
    runtimePolicy,
    startConfig: Object.freeze({
      workflowId,
      program: profile.program,
      title: profile.title,
      backHref: canonical.publicHref,
      subtitle:
        `Build a source-grounded ${profile.program} reconsideration from the actual denial notice, confirmed claimant facts, supporting evidence, required SSA forms, exact packet review, mailing, and proof.`,
    }),
    diagnostics: Object.freeze(diagnostics),
    factoryReady: diagnostics.every((item) => item.severity !== "error"),
  });
}

const artifacts = new Map<
  SsaReconsiderationWorkflowId,
  SsaReconsiderationFactoryArtifact
>();

export function getSsaReconsiderationFactoryArtifact(
  workflowId: string,
): SsaReconsiderationFactoryArtifact | null {
  const profile = getSsaReconsiderationWorkflowProfile(workflowId);
  if (!profile) return null;

  const typedId = profile.workflowId;
  let artifact = artifacts.get(typedId);
  if (!artifact) {
    artifact = createSsaReconsiderationFactoryArtifact(typedId);
    artifacts.set(typedId, artifact);
  }
  return artifact;
}

export function certifySsaReconsiderationFactoryArtifactForChat(
  artifact: SsaReconsiderationFactoryArtifact,
  availableTools: ReadonlySet<string> | readonly string[],
) {
  return composeWorkflowForChat({
    manifest: artifact.manifest,
    runtimePolicy: artifact.runtimePolicy,
    availableTools,
  });
}

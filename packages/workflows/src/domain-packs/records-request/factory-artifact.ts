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
import { createRecordsRequestManifest } from "./manifest.js";
import {
  getRecordsRequestRuntimePolicy,
} from "./runtime-policy.js";
import {
  getRecordsRequestWorkflowProfile,
  type RecordsRequestProfileWorkflowId,
  type RecordsRequestWorkflowProfile,
} from "./profiles.js";

export type RecordsRequestStartConfig = Readonly<{
  workflowId: RecordsRequestProfileWorkflowId;
  title: string;
  backHref: string;
  recordsSoughtPlaceholder: string;
}>;

export type RecordsRequestFactoryArtifact = Readonly<{
  family: "records-request";
  workflowId: RecordsRequestProfileWorkflowId;
  canonicalId: string;
  profile: RecordsRequestWorkflowProfile;
  canonical: WorkflowDefinition;
  definition: DefinedWorkflow<WorkflowManifest>;
  manifest: WorkflowManifest;
  runtimePolicy: WorkflowRuntimePolicy;
  startConfig: RecordsRequestStartConfig;
  diagnostics: readonly FactoryDiagnostic[];
  factoryReady: boolean;
}>;

function diagnostic(code: string, message: string): FactoryDiagnostic {
  return { severity: "error", code, message };
}

export function createRecordsRequestFactoryArtifact(
  workflowId: RecordsRequestProfileWorkflowId,
): RecordsRequestFactoryArtifact {
  const profile = getRecordsRequestWorkflowProfile(workflowId);
  if (!profile) {
    throw new Error(`Unknown Records Request workflow profile: ${workflowId}`);
  }

  const canonicalId = `records-request/${workflowId}`;
  const canonical = workflowById(canonicalId);
  if (!canonical) {
    throw new Error(`Canonical workflow registry is missing ${canonicalId}`);
  }

  const definition = createRecordsRequestManifest({
    workflowId,
    title: profile.title,
    contextDocumentLabel: profile.contextDocumentLabel,
    supportingContextLabel: profile.supportingContextLabel,
  });
  const manifest = definition.manifest;
  const runtimePolicy = getRecordsRequestRuntimePolicy(workflowId);
  if (!runtimePolicy) {
    throw new Error(`Records Request runtime policy is missing ${workflowId}`);
  }

  const composition = composeWorkflow(manifest);
  const diagnostics: FactoryDiagnostic[] = [...composition.diagnostics];

  if (canonical.sectionId !== "records-request") {
    diagnostics.push(
      diagnostic(
        "CANONICAL_SECTION_MISMATCH",
        `Canonical workflow ${canonical.id} is not in records-request.`,
      ),
    );
  }
  if (canonical.slug !== workflowId || manifest.id !== workflowId) {
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
    canonical.execution.policyFamily !== "records-request"
  ) {
    diagnostics.push(
      diagnostic(
        "RUNTIME_BINDING_MISMATCH",
        `Canonical workflow ${canonical.id} is not bound to the records-request platform runtime.`,
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
    family: "records-request",
    workflowId,
    canonicalId,
    profile,
    canonical,
    definition,
    manifest,
    runtimePolicy,
    startConfig: Object.freeze({
      workflowId,
      title: profile.title,
      backHref: canonical.publicHref,
      recordsSoughtPlaceholder: profile.recordsSoughtPlaceholder,
    }),
    diagnostics: Object.freeze(diagnostics),
    factoryReady: diagnostics.every((item) => item.severity !== "error"),
  });
}

const artifacts = new Map<
  RecordsRequestProfileWorkflowId,
  RecordsRequestFactoryArtifact
>();

export function getRecordsRequestFactoryArtifact(
  workflowId: string,
): RecordsRequestFactoryArtifact | null {
  const profile = getRecordsRequestWorkflowProfile(workflowId);
  if (!profile) return null;

  const typedId = profile.workflowId as RecordsRequestProfileWorkflowId;
  let artifact = artifacts.get(typedId);
  if (!artifact) {
    artifact = createRecordsRequestFactoryArtifact(typedId);
    artifacts.set(typedId, artifact);
  }
  return artifact;
}

export function certifyRecordsRequestFactoryArtifactForChat(
  artifact: RecordsRequestFactoryArtifact,
  availableTools: ReadonlySet<string> | readonly string[],
) {
  return composeWorkflowForChat({
    manifest: artifact.manifest,
    runtimePolicy: artifact.runtimePolicy,
    availableTools,
  });
}

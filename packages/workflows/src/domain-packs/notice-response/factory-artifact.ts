import { workflowById, type WorkflowDefinition } from "../../canonical-workflow-registry.js";
import { composeWorkflow, composeWorkflowForChat, type FactoryDiagnostic } from "../../workflow-factory.js";
import type { WorkflowManifest } from "../../workflow-manifest.js";
import type { WorkflowRuntimePolicy } from "../../matter-runtime-server.js";
import { createNoticeResponseManifest } from "./manifest.js";
import {
  getNoticeResponseWorkflowProfile,
  type NoticeResponseWorkflowId,
  type NoticeResponseWorkflowProfile,
} from "./profiles.js";
import { createNoticeResponseRuntimePolicy } from "./runtime-policy.js";

export type NoticeResponseStartConfig = Readonly<{
  workflowId: NoticeResponseWorkflowId;
  backHref: string;
  subtitle: string;
}>;

export type NoticeResponseFactoryArtifact = Readonly<{
  family: "notice-response";
  workflowId: NoticeResponseWorkflowId;
  canonicalId: string;
  profile: NoticeResponseWorkflowProfile;
  canonical: WorkflowDefinition;
  manifest: WorkflowManifest;
  runtimePolicy: WorkflowRuntimePolicy;
  startConfig: NoticeResponseStartConfig;
  diagnostics: readonly FactoryDiagnostic[];
  factoryReady: boolean;
}>;

function artifactDiagnostic(code: string, message: string): FactoryDiagnostic {
  return { severity: "error", code, message };
}

/**
 * Build the complete static factory artifact for one Notice Respond workflow.
 *
 * This is the family-level seam between a small authored profile and the
 * generated runtime/application contracts. It is intentionally side-effect
 * free and contains no provider clients, credentials, persistence, payments,
 * or fulfillment.
 */
export function createNoticeResponseFactoryArtifact(
  workflowId: NoticeResponseWorkflowId,
): NoticeResponseFactoryArtifact {
  const profile = getNoticeResponseWorkflowProfile(workflowId);
  if (!profile) {
    throw new Error(`Unknown Notice Respond workflow profile: ${workflowId}`);
  }

  const canonicalId = `notice-respond/${workflowId}`;
  const canonical = workflowById(canonicalId);
  if (!canonical) {
    throw new Error(`Canonical workflow registry is missing ${canonicalId}`);
  }

  const manifest = createNoticeResponseManifest({ profile });
  const runtimePolicy = createNoticeResponseRuntimePolicy(workflowId);
  const composition = composeWorkflow(manifest);
  const diagnostics: FactoryDiagnostic[] = [...composition.diagnostics];

  if (canonical.sectionId !== "notice-respond") {
    diagnostics.push(
      artifactDiagnostic(
        "CANONICAL_SECTION_MISMATCH",
        `Canonical workflow ${canonical.id} is not in notice-respond.`,
      ),
    );
  }
  if (canonical.slug !== profile.workflowId || manifest.id !== profile.workflowId) {
    diagnostics.push(
      artifactDiagnostic(
        "WORKFLOW_IDENTITY_MISMATCH",
        "Canonical identity, profile identity, and generated manifest identity must match.",
      ),
    );
  }
  if (manifest.vertical !== canonical.sectionId) {
    diagnostics.push(
      artifactDiagnostic(
        "MANIFEST_SECTION_MISMATCH",
        `Generated manifest vertical ${manifest.vertical} does not match canonical section ${canonical.sectionId}.`,
      ),
    );
  }
  if (manifest.route !== `${canonical.publicHref}/start`) {
    diagnostics.push(
      artifactDiagnostic(
        "START_ROUTE_MISMATCH",
        `Generated manifest route ${manifest.route} does not match canonical public start route ${canonical.publicHref}/start.`,
      ),
    );
  }
  if (
    canonical.execution?.kind !== "platform" ||
    canonical.execution.policyFamily !== "notice-response"
  ) {
    diagnostics.push(
      artifactDiagnostic(
        "RUNTIME_BINDING_MISMATCH",
        `Canonical workflow ${canonical.id} is not bound to the notice-response platform runtime.`,
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
      artifactDiagnostic(
        "PRIMARY_DOCUMENT_MISMATCH",
        "Generated primary-document contract does not match the Notice Respond profile.",
      ),
    );
  }

  if (!runtimePolicy.chatContract) {
    diagnostics.push(
      artifactDiagnostic(
        "CHAT_CONTRACT_MISSING",
        "Generated runtime policy must declare the workflow chat contract.",
      ),
    );
  }

  return Object.freeze({
    family: "notice-response",
    workflowId,
    canonicalId,
    profile,
    canonical,
    manifest,
    runtimePolicy,
    startConfig: Object.freeze({
      workflowId,
      backHref: canonical.publicHref,
      subtitle:
        `Build a source-grounded response from the actual ${profile.noticeLabel} notice, your confirmed facts, supporting records, exact packet review, mailing, and proof.`,
    }),
    diagnostics: Object.freeze(diagnostics),
    factoryReady: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
  });
}

const artifacts = new Map<NoticeResponseWorkflowId, NoticeResponseFactoryArtifact>();

export function getNoticeResponseFactoryArtifact(
  workflowId: string,
): NoticeResponseFactoryArtifact | null {
  const profile = getNoticeResponseWorkflowProfile(workflowId);
  if (!profile) return null;

  const typedId = profile.workflowId as NoticeResponseWorkflowId;
  let artifact = artifacts.get(typedId);
  if (!artifact) {
    artifact = createNoticeResponseFactoryArtifact(typedId);
    artifacts.set(typedId, artifact);
  }
  return artifact;
}

/**
 * Host/tool-surface certification is intentionally separate from the static
 * artifact. The same artifact can power web and chat while each host proves
 * that its actual connector surface is sufficient.
 */
export function certifyNoticeResponseFactoryArtifactForChat(
  artifact: NoticeResponseFactoryArtifact,
  availableTools: ReadonlySet<string> | readonly string[],
) {
  return composeWorkflowForChat({
    manifest: artifact.manifest,
    runtimePolicy: artifact.runtimePolicy,
    availableTools,
  });
}

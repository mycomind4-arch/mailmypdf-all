import type { WorkflowDefinition } from "./canonical-workflow-registry.js";
import type { WorkflowManifest } from "./workflow-manifest.js";
import type { WorkflowRuntimePolicy } from "./matter-runtime-server.js";
import { composeWorkflowForChat } from "./workflow-factory.js";

export const WORKFLOW_ARTIFACT_PLAN_VERSION = "mailmypdf.workflow-artifacts/v1" as const;

export type WorkflowArtifactPlan = Readonly<{
  schemaVersion: typeof WORKFLOW_ARTIFACT_PLAN_VERSION;
  canonicalId: string;
  sectionId: string;
  workflowId: string;
  title: string;
  topLevelPath: string;
  startRegistryKey: string;
  public: Readonly<{
    href: string;
    startHref: string;
    landingFiles: readonly string[];
    startFile: string;
  }>;
  workspace: Readonly<{
    href: string;
    startHref: string;
  }>;
  execution: Readonly<{
    kind: "platform" | "local" | null;
    entry: "workspace-start" | "public-start" | null;
    policyFamily: string | null;
  }>;
  manifest: Readonly<{
    route: string;
    pipeline: string;
    documentIds: readonly string[];
    stepIds: readonly string[];
    gateIds: readonly string[];
    outputIds: readonly string[];
    acceptanceScenarioIds: readonly string[];
  }>;
  chat: Readonly<{
    executable: boolean;
    certified: boolean;
    requiredTools: readonly string[];
    diagnostics: readonly string[];
  }>;
}>;

export function workflowStartRegistryKey(sectionId: string, workflowId: string): string {
  return `${sectionId}:${workflowId}`;
}

/**
 * Side-effect-free structural projection of one canonical workflow.
 *
 * The plan does not generate or publish files. It gives Studio/CI a canonical
 * checklist that can be compared with the checked-in landing, start route,
 * runtime manifest, host start registry and connector surface.
 */
export function planWorkflowArtifacts(input: {
  canonical: WorkflowDefinition;
  manifest: WorkflowManifest;
  runtimePolicy: WorkflowRuntimePolicy | null;
  availableTools: ReadonlySet<string> | readonly string[];
}): WorkflowArtifactPlan {
  const { canonical, manifest } = input;

  if (manifest.id !== canonical.slug) {
    throw new Error(
      `Factory identity mismatch: canonical ${canonical.id} uses slug ${canonical.slug}, manifest uses ${manifest.id}.`,
    );
  }
  if (manifest.vertical !== canonical.sectionId) {
    throw new Error(
      `Factory section mismatch: canonical ${canonical.id} belongs to ${canonical.sectionId}, manifest uses ${manifest.vertical}.`,
    );
  }

  const chat = composeWorkflowForChat({
    manifest,
    runtimePolicy: input.runtimePolicy,
    availableTools: input.availableTools,
  });

  const base = canonical.topLevelPath;
  const publicStartHref = `${canonical.publicHref}/start`;
  const workspaceStartHref = `${canonical.workspaceHref}/start`;

  return Object.freeze({
    schemaVersion: WORKFLOW_ARTIFACT_PLAN_VERSION,
    canonicalId: canonical.id,
    sectionId: canonical.sectionId,
    workflowId: canonical.slug,
    title: manifest.title,
    topLevelPath: canonical.topLevelPath,
    startRegistryKey: workflowStartRegistryKey(canonical.sectionId, canonical.slug),
    public: Object.freeze({
      href: canonical.publicHref,
      startHref: publicStartHref,
      landingFiles: Object.freeze([
        `${base}/index.tsx`,
        `${base}/config.ts`,
        `${base}/seo.ts`,
        `${base}/schema.ts`,
      ]),
      startFile: `${base}/start/index.tsx`,
    }),
    workspace: Object.freeze({
      href: canonical.workspaceHref,
      startHref: workspaceStartHref,
    }),
    execution: Object.freeze({
      kind: canonical.execution?.kind ?? null,
      entry: canonical.execution?.entry ?? null,
      policyFamily:
        canonical.execution?.kind === "platform"
          ? canonical.execution.policyFamily
          : null,
    }),
    manifest: Object.freeze({
      route: manifest.route,
      pipeline: manifest.pipeline,
      documentIds: Object.freeze((manifest.documents ?? []).map((document) => document.id)),
      stepIds: Object.freeze((manifest.steps ?? []).map((step) => step.id)),
      gateIds: Object.freeze((manifest.gates ?? []).map((gate) => gate.id)),
      outputIds: Object.freeze((manifest.outputs ?? []).map((output) => output.id)),
      acceptanceScenarioIds: Object.freeze(
        (manifest.acceptanceScenarios ?? []).map((scenario) => scenario.id),
      ),
    }),
    chat: Object.freeze({
      executable: chat.executable,
      certified: chat.chatReadiness.certified,
      requiredTools: Object.freeze([...chat.chatReadiness.requiredTools]),
      diagnostics: Object.freeze([
        ...chat.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
        ...chat.chatReadiness.diagnostics.map(
          (diagnostic) => `${diagnostic.code}: ${diagnostic.message}`,
        ),
      ]),
    }),
  });
}

import { assertCapabilityDependencies } from "./capability-registry.js";
import { compileWorkflowExecutionPlan } from "./capability-runtime.js";
import { composeWorkflow } from "./workflow-factory.js";
import { validateManifestShape, type WorkflowManifest } from "./workflow-manifest.js";

export type DefinedWorkflow<T extends WorkflowManifest = WorkflowManifest> = {
  readonly manifest: Readonly<T>;
  readonly plan: ReturnType<typeof compileWorkflowExecutionPlan>;
};

/**
 * Canonical workflow-definition entry point.
 *
 * This validates the static workflow contract once at registration/build time.
 * Provider clients, credentials, storage, Stripe, Lob, and AI SDKs never belong
 * in the workflow definition itself; the runtime supplies those capabilities.
 */
export function defineWorkflow<const T extends WorkflowManifest>(manifest: T): DefinedWorkflow<T> {
  const errors = validateManifestShape(manifest);
  const dependencyErrors = assertCapabilityDependencies([
    ...manifest.requiredCapabilities,
    ...manifest.optionalCapabilities,
  ]);
  const factory = composeWorkflow(manifest);
  const factoryErrors = factory.diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  const all = [
    ...errors,
    ...dependencyErrors,
    ...factoryErrors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
  ];
  if (all.length) throw new Error(`Invalid workflow ${manifest.id}:\n${all.join("\n")}`);

  const frozen = Object.freeze({ ...manifest }) as Readonly<T>;
  return Object.freeze({
    manifest: frozen,
    plan: compileWorkflowExecutionPlan(frozen),
  });
}

import {
  createWorkflowRuntimeRequestHandler,
  type WorkflowRuntimeServerDependencies,
} from "./matter-runtime-server.js";
import { platformWorkflowRuntimePolicyFor } from "./platform-runtime-policies.js";

export type PlatformWorkflowRuntimeHostDependencies =
  Omit<WorkflowRuntimeServerDependencies, "policyFor">;

/**
 * Canonical framework-independent host composition for the new architecture.
 *
 * Deployment hosts supply infrastructure adapters only. Workflow identity and
 * domain-policy selection always come from the shared platform registry so a
 * host never enables execution merely by hard-coding a workflow id.
 */
export function createPlatformWorkflowRuntimeRequestHandler(
  deps: PlatformWorkflowRuntimeHostDependencies,
  options: { basePath?: string } = {},
): (request: Request) => Promise<Response> {
  return createWorkflowRuntimeRequestHandler(
    {
      ...deps,
      policyFor: platformWorkflowRuntimePolicyFor,
    },
    options,
  );
}

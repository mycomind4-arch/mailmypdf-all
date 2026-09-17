import type { WorkflowRuntimePolicy } from "./matter-runtime-server.js";

export type WorkflowRuntimePolicyProvider = (
  workflowId: string,
) => WorkflowRuntimePolicy | null | undefined;

export class WorkflowRuntimePolicyRegistry {
  private readonly providers: WorkflowRuntimePolicyProvider[] = [];

  register(provider: WorkflowRuntimePolicyProvider): this {
    if (this.providers.includes(provider)) {
      throw new Error("Workflow runtime policy provider is already registered");
    }
    this.providers.push(provider);
    return this;
  }

  policyFor(workflowId: string): WorkflowRuntimePolicy | null {
    const normalized = workflowId.trim();
    if (!normalized) return null;

    let match: WorkflowRuntimePolicy | null = null;
    for (const provider of this.providers) {
      const candidate = provider(normalized) ?? null;
      if (!candidate) continue;
      if (match) {
        throw new Error(`Multiple runtime policy providers matched workflow ${normalized}`);
      }
      match = candidate;
    }
    return match;
  }

  resolver(): (workflowId: string) => WorkflowRuntimePolicy | null {
    return (workflowId) => this.policyFor(workflowId);
  }
}

export function createWorkflowRuntimePolicyResolver(
  ...providers: readonly WorkflowRuntimePolicyProvider[]
): (workflowId: string) => WorkflowRuntimePolicy | null {
  const registry = new WorkflowRuntimePolicyRegistry();
  for (const provider of providers) registry.register(provider);
  return registry.resolver();
}

import type { AgentRuntimeAdapter, RuntimeResult, RuntimeTask } from '@mailmypdf/agent-runtime'
import type { DeploymentAdapter, DeploymentRequest } from './deployment-gate.js'
import type { EcosystemRegistryAdapter, RegistrationRequest } from './registration-gate.js'
import type { VerticalBuildRequest, VerticalBuildResult, VerticalFactoryAdapter } from './factory-adapter.js'

/** Deterministic adapters for local/CI rehearsal. They never mutate production infrastructure. */
export class DryRunAgentRuntime implements AgentRuntimeAdapter {
  async execute(task: RuntimeTask): Promise<RuntimeResult> {
    return { taskId: task.id, status: 'SUCCEEDED', output: { dryRun: true, role: task.role, modelClass: task.modelClass } }
  }
}

export class DryRunFactory implements VerticalFactoryAdapter {
  async createBuild(request: VerticalBuildRequest): Promise<VerticalBuildResult> {
    return { repository: request.repository, branch: request.branch, status: 'CREATED' }
  }
}

export class DryRunDeployment implements DeploymentAdapter {
  async deploy(request: DeploymentRequest) {
    return { url: `https://preview.invalid/${request.repository}/${request.branch}`, status: 'PREVIEW' as const }
  }
}

export class DryRunRegistry implements EcosystemRegistryAdapter {
  async register(request: RegistrationRequest) {
    return { registered: true, verticalId: request.verticalId }
  }
}

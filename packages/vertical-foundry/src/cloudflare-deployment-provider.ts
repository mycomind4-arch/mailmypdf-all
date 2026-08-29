/**
 * Cloudflare Pages Deployment Provider — real implementation.
 *
 * Uses the Cloudflare Pages API to create preview and production deployments.
 *
 * Credentials: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
 * The provider never logs API tokens.
 */

import type { DeploymentProvider, DeploymentInfo } from './provider-contracts.js'

interface CloudflareConfig {
  apiToken: string
  accountId: string
  projectName?: string
}

const CF_API = 'https://api.cloudflare.com/client/v4'

export class CloudflareDeploymentProvider implements DeploymentProvider {
  private apiToken: string
  private accountId: string
  private projectName: string

  constructor(config: CloudflareConfig) {
    if (!config.apiToken) throw new Error('CloudflareDeploymentProvider requires an API token')
    if (!config.accountId) throw new Error('CloudflareDeploymentProvider requires an account ID')
    this.apiToken = config.apiToken
    this.accountId = config.accountId
    this.projectName = config.projectName ?? ''
  }

  private async cfApi(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) ?? {}),
    }
    return fetch(`${CF_API}${path}`, { ...init, headers })
  }

  private async ensureProject(projectName: string): Promise<void> {
    const res = await this.cfApi(`/accounts/${this.accountId}/pages/projects/${projectName}`)
    if (res.ok) return
    if (res.status !== 404) throw new Error(`Failed to check Cloudflare project: ${res.status}`)

    // Create the project
    const createRes = await this.cfApi(`/accounts/${this.accountId}/pages/projects`, {
      method: 'POST',
      body: JSON.stringify({ name: projectName, production_branch: 'main' }),
    })
    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '')
      throw new Error(`Failed to create Cloudflare project ${projectName}: ${createRes.status} ${text}`)
    }
  }

  async preview(repository: string, branch: string): Promise<{ url: string; status: 'PREVIEW'; deploymentId: string }> {
    const projectName = this.projectName || repository.split('/').pop() || 'vertical-preview'
    await this.ensureProject(projectName)

    // Trigger a deployment via GitHub integration
    // Cloudflare Pages can auto-deploy from GitHub branches when connected.
    // For manual deploy, we use the direct upload API.
    // Here we create a deployment record that links to the branch.
    const deployRes = await this.cfApi(`/accounts/${this.accountId}/pages/projects/${projectName}/deployments`, {
      method: 'POST',
      body: JSON.stringify({
        branch,
        environment: 'preview',
      }),
    })

    if (!deployRes.ok) {
      const text = await deployRes.text().catch(() => '')
      throw new Error(`Cloudflare preview deployment failed: ${deployRes.status} ${text}`)
    }

    const data = await deployRes.json() as {
      result: { id: string; url: string; latest_stage: { name: string; status: string } }
      success: boolean
    }

    if (!data.success) throw new Error('Cloudflare deployment was not successful')

    return {
      url: `https://${data.result.url}`,
      status: 'PREVIEW',
      deploymentId: data.result.id,
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentInfo> {
    const projectName = this.projectName
    if (!projectName) throw new Error('Project name required to get deployment status')

    const res = await this.cfApi(`/accounts/${this.accountId}/pages/projects/${projectName}/deployments/${deploymentId}`)
    if (!res.ok) throw new Error(`Failed to get deployment status: ${res.status}`)

    const data = await res.json() as {
      result: {
        id: string
        url: string
        environment: string
        latest_stage: { name: string; status: string }
        created_on: string
      }
    }

    const stage = data.result.latest_stage
    const isFailed = stage?.status === 'failure'
    const isComplete = stage?.name === 'deploy' && stage?.status === 'success'

    return {
      id: data.result.id,
      url: `https://${data.result.url}`,
      status: isFailed ? 'FAILED' : isComplete ? (data.result.environment === 'production' ? 'PRODUCTION' : 'PREVIEW') : 'BUILDING',
      environment: data.result.environment,
      createdAt: data.result.created_on,
    }
  }

  async deployProduction(repository: string, branch: string): Promise<{ url: string; status: 'PRODUCTION'; deploymentId: string }> {
    const projectName = this.projectName || repository.split('/').pop() || 'vertical-preview'
    await this.ensureProject(projectName)

    const deployRes = await this.cfApi(`/accounts/${this.accountId}/pages/projects/${projectName}/deployments`, {
      method: 'POST',
      body: JSON.stringify({
        branch,
        environment: 'production',
      }),
    })

    if (!deployRes.ok) {
      const text = await deployRes.text().catch(() => '')
      throw new Error(`Cloudflare production deployment failed: ${deployRes.status} ${text}`)
    }

    const data = await deployRes.json() as {
      result: { id: string; url: string }
      success: boolean
    }

    if (!data.success) throw new Error('Cloudflare production deployment was not successful')

    return {
      url: `https://${data.result.url}`,
      status: 'PRODUCTION',
      deploymentId: data.result.id,
    }
  }

  async verifyDeployment(url: string): Promise<{ reachable: boolean; statusCode: number; responseTimeMs?: number }> {
    const start = Date.now()
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(30000) })
      const responseTimeMs = Date.now() - start
      return { reachable: res.ok, statusCode: res.status, responseTimeMs }
    } catch {
      return { reachable: false, statusCode: 0 }
    }
  }

  /** Check if the Cloudflare API is accessible. */
  async healthCheck(): Promise<{ healthy: boolean }> {
    try {
      const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: { 'Authorization': 'Bearer ' + this.apiToken },
      })
      const data = await response.json() as { success: boolean }
      return { healthy: response.ok && data.success }
    } catch {
      return { healthy: false }
    }
  }
}
export class StubDeploymentProvider implements DeploymentProvider {
  async preview(repository: string, branch: string): Promise<{ url: string; status: 'PREVIEW'; deploymentId: string }> {
    return {
      url: `https://preview.pages.dev/${repository}/${branch}`,
      status: 'PREVIEW',
      deploymentId: `stub-${Date.now()}`,
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentInfo> {
    return {
      id: deploymentId,
      url: `https://preview.pages.dev/${deploymentId}`,
      status: 'PREVIEW',
      environment: 'preview',
      createdAt: new Date().toISOString(),
    }
  }

  async deployProduction(repository: string, branch: string): Promise<{ url: string; status: 'PRODUCTION'; deploymentId: string }> {
    return {
      url: `https://prod.pages.dev/${repository}`,
      status: 'PRODUCTION',
      deploymentId: `stub-prod-${Date.now()}`,
    }
  }

  async verifyDeployment(url: string): Promise<{ reachable: boolean; statusCode: number; responseTimeMs?: number }> {
    return { reachable: true, statusCode: 200, responseTimeMs: 0 }
  }

  /** Check if the stub provider is healthy (always true). */
  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true }
  }
}

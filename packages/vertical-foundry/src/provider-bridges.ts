/**
 * Provider Bridges — connect real providers to the existing gate interfaces.
 *
 * The Foundry pipeline uses DeploymentAdapter (from deployment-gate.ts) and
 * EcosystemRegistryAdapter (from registration-gate.ts). These bridges wrap
 * the real Cloudflare/Ecosystem providers to implement those interfaces,
 * so the pipeline gets real deployments without changing its call sites.
 */

import type { DeploymentAdapter } from './deployment-gate.js'
import type { PagesDeploymentAdapter, DeploymentResult } from './deployment-adapter.js'
import type { EcosystemRegistryAdapter } from './registration-gate.js'
import type { DeploymentProvider, RegistryProvider } from './provider-contracts.js'

// ── Cloudflare → DeploymentAdapter bridge ─────────────────────────────────────

export class CloudflareDeploymentBridge implements DeploymentAdapter {
  constructor(private provider: DeploymentProvider) {}

  async deploy(request: { repository: string; branch: string; preview: boolean }): Promise<{ url: string; status: 'PREVIEW' | 'PRODUCTION' }> {
    if (request.preview) {
      const result = await this.provider.preview(request.repository, request.branch)
      return { url: result.url, status: 'PREVIEW' }
    }
    const result = await this.provider.deployProduction(request.repository, request.branch)
    return { url: result.url, status: 'PRODUCTION' }
  }
}

// ── Cloudflare → PagesDeploymentAdapter bridge ────────────────────────────────

export class CloudflarePagesBridge implements PagesDeploymentAdapter {
  constructor(private provider: DeploymentProvider, private projectName: (repo: string) => string = (r) => r.split('/').pop() ?? r) {}

  async deployPreview(request: { repository: string; branch: string; projectName: string }): Promise<DeploymentResult> {
    try {
      const result = await this.provider.preview(request.repository, request.branch)
      return { status: 'PREVIEW', url: result.url, deploymentId: result.deploymentId }
    } catch (error) {
      return { status: 'FAILED', errors: [error instanceof Error ? error.message : String(error)] }
    }
  }
}

// ── Ecosystem → EcosystemRegistryAdapter bridge ────────────────────────────────

export class EcosystemRegistryBridge implements EcosystemRegistryAdapter {
  constructor(private provider: RegistryProvider) {}

  async register(request: { verticalId: string; previewUrl: string; verified: boolean }): Promise<{ registered: boolean; verticalId: string }> {
    if (!request.verified) throw new Error('Vertical must be verified before ecosystem registration')
    const result = await this.provider.register({ verticalId: request.verticalId, previewUrl: request.previewUrl })
    return { registered: result.registered, verticalId: result.verticalId }
  }
}

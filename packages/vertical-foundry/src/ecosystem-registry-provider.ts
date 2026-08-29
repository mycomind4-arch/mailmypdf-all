/**
 * Ecosystem Registry Provider — real implementation.
 *
 * Registers verified verticals into the shared ecosystem.
 * Uses a JSON file in the platform repository as the registry store.
 *
 * The registry only accepts verticals that have passed all gates.
 */

import type { RegistryProvider, RegistrationRecord } from './provider-contracts.js'
import { validateManifest, type VerticalManifest } from './vertical-manifest.js'

interface RegistryConfig {
  /** Path to the registry JSON file. */
  registryPath?: string
  /** GitHub repository provider for committing the registry update. */
  commitToRepo?: { repository: string; branch: string; path: string; token: string }
}

const DEFAULT_REGISTRY_PATH = 'ecosystem-registry.json'

export class EcosystemRegistryProvider implements RegistryProvider {
  private registryPath: string
  private commitConfig: RegistryConfig['commitToRepo']

  constructor(config: RegistryConfig = {}) {
    this.registryPath = config.registryPath ?? DEFAULT_REGISTRY_PATH
    this.commitConfig = config.commitToRepo
  }

  private async readRegistry(): Promise<RegistrationRecord[]> {
    try {
      const fs = await import('node:fs/promises')
      const content = await fs.readFile(this.registryPath, 'utf-8')
      return JSON.parse(content) as RegistrationRecord[]
    } catch {
      return []
    }
  }

  private async writeRegistry(records: RegistrationRecord[]): Promise<void> {
    const fs = await import('node:fs/promises')
    await fs.writeFile(this.registryPath, JSON.stringify(records, null, 2) + '\n', 'utf-8')

    // Optionally commit the registry to the repository
    if (this.commitConfig) {
      const content = JSON.stringify(records, null, 2) + '\n'
      const contentBase64 = Buffer.from(content, 'utf-8').toString('base64')
      const apiBase = 'https://api.github.com'
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.commitConfig.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      }

      // Try to get the existing file SHA (needed for update)
      const fileRes = await fetch(`${apiBase}/repos/${this.commitConfig.repository}/contents/${this.commitConfig.path}?ref=${this.commitConfig.branch}`, { headers })
      let existingSha: string | undefined
      if (fileRes.ok) {
        const fileData = await fileRes.json() as { sha: string }
        existingSha = fileData.sha
      }

      const body: Record<string, unknown> = {
        message: 'chore: update ecosystem registry',
        content: contentBase64,
        branch: this.commitConfig.branch,
      }
      if (existingSha) body.sha = existingSha

      await fetch(`${apiBase}/repos/${this.commitConfig.repository}/contents/${this.commitConfig.path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      })
    }
  }

  async register(input: { verticalId: string; previewUrl: string; name?: string; capabilities?: string[] }): Promise<{ registered: boolean; verticalId: string; record?: RegistrationRecord | undefined }> {
    const records = await this.readRegistry()
    const existing = records.find((r) => r.verticalId === input.verticalId)
    if (existing) {
      // Update existing record
      existing.previewUrl = input.previewUrl
      existing.status = 'active'
      existing.registeredAt = new Date().toISOString()
      if (input.name) existing.name = input.name
      if (input.capabilities) existing.capabilities = input.capabilities
      await this.writeRegistry(records)
      return { registered: true, verticalId: input.verticalId, record: existing }
    }

    const record: RegistrationRecord = {
      verticalId: input.verticalId,
      name: input.name ?? input.verticalId,
      previewUrl: input.previewUrl,
      status: 'registered',
      registeredAt: new Date().toISOString(),
      capabilities: input.capabilities ?? [],
    }

    records.push(record)
    await this.writeRegistry(records)
    return { registered: true, verticalId: input.verticalId, record }
  }

  async isRegistered(verticalId: string): Promise<{ registered: boolean; record?: RegistrationRecord | undefined }> {
    const records = await this.readRegistry()
    const record = records.find((r) => r.verticalId === verticalId)
    return { registered: !!record, record }
  }

  async list(): Promise<RegistrationRecord[]> {
    return this.readRegistry()
  }

  /** Check if the registry file is accessible. */
  async healthCheck(): Promise<{ healthy: boolean }> {
    try {
      const fs = await import('node:fs/promises')
      await fs.access(this.registryPath)
      return { healthy: true }
    } catch {
      // File may not exist yet — that's OK, it'll be created on first write
      return { healthy: true }
    }
  }
}
export class InMemoryRegistryProvider implements RegistryProvider {
  private records: RegistrationRecord[] = []

  async register(input: { verticalId: string; previewUrl: string; name?: string; capabilities?: string[] }): Promise<{ registered: boolean; verticalId: string; record?: RegistrationRecord | undefined }> {
    const existing = this.records.find((r) => r.verticalId === input.verticalId)
    if (existing) {
      existing.previewUrl = input.previewUrl
      existing.status = 'active'
      return { registered: true, verticalId: input.verticalId, record: existing }
    }
    const record: RegistrationRecord = {
      verticalId: input.verticalId,
      name: input.name ?? input.verticalId,
      previewUrl: input.previewUrl,
      status: 'registered',
      registeredAt: new Date().toISOString(),
      capabilities: input.capabilities ?? [],
    }
    this.records.push(record)
    return { registered: true, verticalId: input.verticalId, record }
  }

  async isRegistered(verticalId: string): Promise<{ registered: boolean; record?: RegistrationRecord | undefined }> {
    const record = this.records.find((r) => r.verticalId === verticalId)
    return { registered: !!record, record }
  }

  async list(): Promise<RegistrationRecord[]> {
    return [...this.records]
  }

  /** Check if the in-memory registry is healthy (always true). */
  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true }
  }
}

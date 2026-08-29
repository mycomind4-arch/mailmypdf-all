/**
 * Vertical Portfolio Manager — tracks all registered verticals across
 * the ecosystem. Provides views by status, domain, and quality score
 * for portfolio-level decision making.
 */

import type { RegistrationRecord } from './provider-contracts.js'
import type { VerticalManifest } from './vertical-manifest.js'

export type VerticalStatus = 'researching' | 'building' | 'previewing' | 'registered' | 'production' | 'disabled' | 'rejected'

export interface PortfolioEntry {
  verticalId: string
  name: string
  domain: string
  repository: string
  status: VerticalStatus
  registeredAt?: string
  productionUrl?: string
  previewUrl?: string
  gateCount: number
  allGatesPassed: boolean
  capabilities: string[]
  manifest?: VerticalManifest
  registration?: RegistrationRecord
}

export class VerticalPortfolio {
  private entries = new Map<string, PortfolioEntry>()

  add(entry: PortfolioEntry): void {
    this.entries.set(entry.verticalId, entry)
  }

  update(verticalId: string, patch: Partial<PortfolioEntry>): void {
    const existing = this.entries.get(verticalId)
    if (!existing) throw new Error(`Vertical ${verticalId} not found in portfolio`)
    this.entries.set(verticalId, { ...existing, ...patch })
  }

  get(verticalId: string): PortfolioEntry | undefined {
    return this.entries.get(verticalId)
  }

  remove(verticalId: string): boolean {
    return this.entries.delete(verticalId)
  }

  list(filter?: { status?: VerticalStatus }): PortfolioEntry[] {
    const all = [...this.entries.values()]
    if (filter?.status) return all.filter((e) => e.status === filter.status)
    return all
  }

  getByDomain(domain: string): PortfolioEntry | undefined {
    return [...this.entries.values()].find((e) => e.domain === domain)
  }

  getByRepository(repository: string): PortfolioEntry | undefined {
    return [...this.entries.values()].find((e) => e.repository === repository)
  }

  getSummary(): {
    total: number
    byStatus: Record<VerticalStatus, number>
    uniqueDomains: number
    uniqueRepositories: number
    passedGates: number
    inProduction: number
  } {
    const all = [...this.entries.values()]
    const byStatus: Record<VerticalStatus, number> = {
      researching: 0,
      building: 0,
      previewing: 0,
      registered: 0,
      production: 0,
      disabled: 0,
      rejected: 0,
    }
    for (const e of all) byStatus[e.status]++
    const domains = new Set(all.map((e) => e.domain))
    const repos = new Set(all.map((e) => e.repository))
    return {
      total: all.length,
      byStatus,
      uniqueDomains: domains.size,
      uniqueRepositories: repos.size,
      passedGates: all.filter((e) => e.allGatesPassed).length,
      inProduction: all.filter((e) => e.status === 'production').length,
    }
  }

  importFromManifest(manifest: VerticalManifest): void {
    const gateNames = ['research', 'specification', 'implementation', 'qa', 'deployment', 'registration'] as const
    const allPassed = manifest.gateHistory
      ? gateNames.every((g) => manifest.gateHistory?.some((h) => h.gate === g && h.status === 'passed'))
      : false

    const entry: PortfolioEntry = {
      verticalId: manifest.id,
      name: manifest.name,
      domain: manifest.domain,
      repository: manifest.repository,
      status: manifest.previewUrl ? 'previewing' : 'building',
      gateCount: manifest.gateHistory?.length ?? 0,
      allGatesPassed: allPassed,
      capabilities: manifest.capabilities,
    }
    if (manifest.previewUrl) entry.previewUrl = manifest.previewUrl
    if (manifest.productionUrl) entry.productionUrl = manifest.productionUrl
    entry.manifest = manifest
    this.add(entry)
  }

  markRegistered(verticalId: string, record: RegistrationRecord): void {
    const patch: Partial<PortfolioEntry> = {
      status: 'registered',
      registeredAt: record.registeredAt,
      registration: record,
    }
    if (record.productionUrl) patch.productionUrl = record.productionUrl
    this.update(verticalId, patch)
  }

  markProduction(verticalId: string, productionUrl: string): void {
    this.update(verticalId, { status: 'production', productionUrl })
  }

  markRejected(verticalId: string): void {
    this.update(verticalId, { status: 'rejected' })
  }

  disable(verticalId: string): void {
    this.update(verticalId, { status: 'disabled' })
  }
}

/**
 * Vertical Manifest — the canonical schema for a generated vertical.
 *
 * A manifest is produced at the end of the research phase and carries
 * through specification → implementation → QA → deployment → registration.
 * Each gate appends its results to the manifest's gateHistory.
 *
 * INVARIANT: The original MailMyPDF repository is never a vertical target.
 */

// ── Gate Status ─────────────────────────────────────────────────────────────

export type GateName = 'research' | 'specification' | 'implementation' | 'qa' | 'deployment' | 'registration'
export type ManifestGateStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'skipped'

export interface GateRecord {
  gate: GateName
  status: ManifestGateStatus
  startedAt: string
  completedAt?: string
  evidence?: string
  artifacts?: string[]
  notes?: string
}

// ── Build Configuration ──────────────────────────────────────────────────────

export interface BuildFile {
  path: string
  content: string
  description?: string
}

export type BuildFramework = 'next' | 'astro' | 'vite' | 'static'

export interface BuildConfig {
  framework: BuildFramework
  entryPoint: string
  files: BuildFile[]
  dependencies: Record<string, string>
  buildCommand: string
  outputDir: string
}

// ── Vertical Manifest ────────────────────────────────────────────────────────

export interface VerticalManifest {
  id: string
  name: string
  domain: string
  repository: string
  branch: string
  capabilities: string[]
  generatedAt: string

  // Extended fields (optional for backward compat with minimal manifests)
  description?: string
  targetGeography?: string
  targetLanguage?: string
  seedTopics?: string[]
  keywords?: Array<{ keyword: string; score: number; intent: string }>
  buildConfig?: BuildConfig
  gateHistory?: GateRecord[]
  previewUrl?: string
  productionUrl?: string
  registrationId?: string
  excludedRepositories?: string[]
}

// ── Validation ───────────────────────────────────────────────────────────────

const ORIGINAL_REPO = 'mycomind4-arch/mailmypdf'

export function createManifest(input: Omit<VerticalManifest, 'generatedAt'>): VerticalManifest {
  return { ...input, generatedAt: new Date().toISOString() }
}

export function validateManifest(manifest: VerticalManifest, originalRepository: string = ORIGINAL_REPO): void {
  if (!manifest.id) throw new Error('Vertical manifest missing required field: id')
  if (!manifest.name) throw new Error('Vertical manifest missing required field: name')
  if (!manifest.domain) throw new Error('Vertical manifest missing required field: domain')
  if (!manifest.repository) throw new Error('Vertical manifest missing required field: repository')
  if (!manifest.branch) throw new Error('Vertical manifest missing required field: branch')

  // The original MailMyPDF repository must never be a vertical build target.
  if (manifest.repository === originalRepository) {
    throw new Error('Cannot use the original MailMyPDF repository as a vertical target')
  }
  if (manifest.repository.includes('/mailmypdf')) {
    throw new Error('Repository path containing "mailmypdf" is outside autonomous vertical scope')
  }
  if (manifest.domain === 'mailmypdf.ai') {
    throw new Error('The mailmypdf.ai domain is outside autonomous vertical scope')
  }

  // The target repository must not be in the exclusion list (contradictory).
  if (manifest.excludedRepositories?.includes(manifest.repository)) {
    throw new Error(`Target repository ${manifest.repository} is in the exclusion list`)
  }
}

// ── Gate History Helpers ──────────────────────────────────────────────────────

export function startGate(manifest: VerticalManifest, gate: GateName): VerticalManifest {
  const record: GateRecord = { gate, status: 'in_progress', startedAt: new Date().toISOString() }
  return { ...manifest, gateHistory: [...(manifest.gateHistory ?? []), record] }
}

export function completeGate(
  manifest: VerticalManifest,
  gate: GateName,
  status: 'passed' | 'failed' | 'skipped',
  evidence?: string,
  artifacts?: string[],
): VerticalManifest {
  const history = manifest.gateHistory ?? []
  const existing = history.find((g) => g.gate === gate && g.status === 'in_progress')
  if (!existing) throw new Error(`Cannot complete gate ${gate}: no in-progress record found`)

  const updatedRecord: GateRecord = {
    ...existing,
    status,
    completedAt: new Date().toISOString(),
    ...(evidence !== undefined ? { evidence } : {}),
    ...(artifacts !== undefined ? { artifacts } : {}),
  }

  return {
    ...manifest,
    gateHistory: history.map((g) => (g === existing ? updatedRecord : g)),
  }
}

export function getLatestGateStatus(manifest: VerticalManifest, gate: GateName): ManifestGateStatus | undefined {
  const records = (manifest.gateHistory ?? []).filter((g) => g.gate === gate)
  return records[records.length - 1]?.status
}

export function allGatesPassed(manifest: VerticalManifest): boolean {
  const requiredGates: GateName[] = ['research', 'specification', 'implementation', 'qa', 'deployment', 'registration']
  return requiredGates.every((gate) => getLatestGateStatus(manifest, gate) === 'passed')
}

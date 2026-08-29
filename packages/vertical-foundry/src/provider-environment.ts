/**
 * Provider Environment — credential isolation and provider configuration.
 *
 * Credentials are NEVER embedded in source files, manifests, generated
 * repositories, logs, telemetry, prompts, or commits. They are read from
 * environment variables at runtime and passed to providers through
 * typed config objects.
 *
 * Provider scopes enforce capability boundaries:
 *   REPOSITORY_READ    — read repositories, branches, files
 *   REPOSITORY_WRITE   — create branches, files, commits, PRs
 *   MODEL_EXECUTION     — call model APIs
 *   PREVIEW_DEPLOY      — deploy to preview environment
 *   PRODUCTION_DEPLOY   — deploy to production
 *   REGISTRY_WRITE      — register verticals in the ecosystem
 */

export type ProviderCapability =
  | 'REPOSITORY_READ'
  | 'REPOSITORY_WRITE'
  | 'MODEL_EXECUTION'
  | 'PREVIEW_DEPLOY'
  | 'PRODUCTION_DEPLOY'
  | 'REGISTRY_WRITE'

export interface ProviderScope {
  provider: string
  capabilities: ProviderCapability[]
  expiresAt?: string
}

export function allows(scope: ProviderScope, capability: ProviderCapability): boolean {
  if (scope.expiresAt && Date.parse(scope.expiresAt) <= Date.now()) return false
  return scope.capabilities.includes(capability)
}

export function assertCapability(scope: ProviderScope, capability: ProviderCapability): void {
  if (!allows(scope, capability)) {
    throw new Error(`Provider ${scope.provider} lacks capability: ${capability}`)
  }
}

// ── Environment Configuration ────────────────────────────────────────────────

export interface ProviderEnv {
  githubToken: string
  githubOrg: string
  modelApiKey: string
  modelApiBase: string
  cloudflareApiToken: string
  cloudflareAccountId: string
}

export function loadProviderEnv(env: Record<string, string | undefined> = process.env): ProviderEnv {
  return {
    githubToken: env.GITHUB_ACCESS_TOKEN ?? env.GITHUB_TOKEN ?? '',
    githubOrg: env.GITHUB_ORG ?? '',
    modelApiKey: env.MODEL_API_KEY ?? env.OPENAI_API_KEY ?? '',
    modelApiBase: env.MODEL_API_BASE ?? env.OPENAI_API_BASE ?? 'https://api.openai.com/v1',
    cloudflareApiToken: env.CLOUDFLARE_API_TOKEN ?? '',
    cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID ?? '',
  }
}

export function getProviderScopes(env: ProviderEnv): Record<string, ProviderScope> {
  const scopes: Record<string, ProviderScope> = {}

  if (env.githubToken) {
    scopes.github = {
      provider: 'github',
      capabilities: ['REPOSITORY_READ', ...(env.githubToken ? ['REPOSITORY_WRITE' as ProviderCapability] : [])],
    }
  }

  if (env.modelApiKey) {
    scopes.model = {
      provider: 'model',
      capabilities: ['MODEL_EXECUTION'],
    }
  }

  if (env.cloudflareApiToken) {
    scopes.cloudflare = {
      provider: 'cloudflare',
      capabilities: ['PREVIEW_DEPLOY', 'PRODUCTION_DEPLOY'],
    }
  }

  // Registry scope is always available (writes to local file or repo)
  scopes.registry = {
    provider: 'registry',
    capabilities: ['REGISTRY_WRITE'],
  }

  return scopes
}

/**
 * Provider Contracts — the interfaces that real provider adapters implement.
 *
 * These contracts are intentionally richer than the original minimal interfaces
 * to support the full Foundry lifecycle: research → build → deploy → register.
 * The existing VerticalFactoryAdapter, DeploymentAdapter, and
 * EcosystemRegistryAdapter interfaces remain as they were; these contracts
 * extend the platform's capability surface without breaking existing code.
 */

// ── Repository Provider ─────────────────────────────────────────────────────

export interface RepositoryInfo {
  fullName: string
  url: string
  defaultBranch: string
  exists: boolean
}

export interface FileCommit {
  path: string
  content: string
}

export interface CommitResult {
  commitSha: string
  branch: string
  filesCommitted: number
}

export interface PullRequestResult {
  number: number
  url: string
  head: string
  base: string
}

export interface StatusCheck {
  context: string
  state: 'success' | 'failure' | 'pending' | 'error'
  description?: string
}

export interface RepositoryProvider {
  /** Validate that a repository exists and is accessible. */
  validateRepository(repository: string): Promise<RepositoryInfo>
  /** Create a new repository. */
  createRepository(name: string, options: { private: boolean; description: string }): Promise<RepositoryInfo>
  /** Create a branch from the default branch (or specified base). */
  createBranch(repository: string, branch: string, base?: string): Promise<{ branch: string; created: boolean }>
  /** Get the SHA of a branch tip. */
  getBranchSha(repository: string, branch: string): Promise<{ sha: string }>
  /** Create or update a single file. */
  createFile(repository: string, branch: string, path: string, content: string, message: string): Promise<CommitResult>
  /** Create a tree with multiple files in a single commit. */
  createTree(repository: string, branch: string, files: readonly FileCommit[], message: string): Promise<CommitResult>
  /** Create a pull request. */
  createPullRequest(repository: string, head: string, base: string, title: string, body: string): Promise<PullRequestResult>
  /** Get CI/commit status checks for a ref. */
  getCommitStatus(repository: string, ref: string): Promise<{ state: string; checks: StatusCheck[] }>
  /** Check if the repository provider is healthy/accessible. */
  healthCheck(): Promise<{ healthy: boolean }>
}

// ── Model Provider ──────────────────────────────────────────────────────────

export interface ModelRequest {
  role: string
  objective: string
  modelClass: string
  systemPrompt?: string
  input?: unknown
  maxTokens?: number
  temperature?: number
}

export interface ModelTokenUsage {
  inputTokens: number
  outputTokens: number
  costUsd?: number
}

export interface ModelResult {
  content: string
  structured?: unknown
  model: string
  modelClass: string
  usage?: ModelTokenUsage
  warnings?: string[]
  durationMs?: number
}

export interface ModelProvider {
  /** Run a model task with role-based routing. */
  run(request: ModelRequest): Promise<ModelResult>
  /** Check if the model provider is healthy/available. */
  healthCheck(): Promise<{ healthy: boolean; models: string[] }>
}

// ── Deployment Provider ─────────────────────────────────────────────────────

export interface DeploymentInfo {
  id: string
  url: string
  status: 'PREVIEW' | 'PRODUCTION' | 'BUILDING' | 'FAILED'
  environment: string
  createdAt: string
}

export interface DeploymentProvider {
  /** Deploy a preview. */
  preview(repository: string, branch: string): Promise<{ url: string; status: 'PREVIEW'; deploymentId: string }>
  /** Get the status of a deployment. */
  getDeploymentStatus(deploymentId: string): Promise<DeploymentInfo>
  /** Deploy to production (only after all gates pass). */
  deployProduction(repository: string, branch: string): Promise<{ url: string; status: 'PRODUCTION'; deploymentId: string }>
  /** Verify a deployment URL is reachable and responds. */
  verifyDeployment(url: string): Promise<{ reachable: boolean; statusCode: number; responseTimeMs?: number }>
  /** Check if the deployment provider is healthy/accessible. */
  healthCheck(): Promise<{ healthy: boolean }>
}

// ── Registry Provider ────────────────────────────────────────────────────────

export interface RegistrationRecord {
  verticalId: string
  name: string
  previewUrl: string
  productionUrl?: string
  status: 'registered' | 'active' | 'disabled'
  registeredAt: string
  capabilities: string[]
}

export interface RegistryProvider {
  /** Register a verified vertical into the ecosystem. */
  register(input: { verticalId: string; previewUrl: string; name?: string; capabilities?: string[] }): Promise<{ registered: boolean; verticalId: string; record?: RegistrationRecord | undefined }>
  /** Check if a vertical is already registered. */
  isRegistered(verticalId: string): Promise<{ registered: boolean; record?: RegistrationRecord | undefined }>
  /** List all registered verticals. */
  list(): Promise<RegistrationRecord[]>
  /** Check if the registry provider is healthy/accessible. */
  healthCheck(): Promise<{ healthy: boolean }>
}

// ── Provider Set ─────────────────────────────────────────────────────────────

export interface ProviderSet {
  repository: RepositoryProvider
  model: ModelProvider
  deployment: DeploymentProvider
  registry: RegistryProvider
}

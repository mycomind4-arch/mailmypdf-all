/**
 * GitHub Repository Provider — real implementation using the GitHub REST API.
 *
 * Credentials are read from the GITHUB_ACCESS_TOKEN environment variable.
 * The provider never embeds tokens in logs, commits, or generated content.
 */

import type {
  RepositoryInfo,
  RepositoryProvider,
  FileCommit,
  CommitResult,
  PullRequestResult,
  StatusCheck,
} from './provider-contracts.js'

const GITHUB_API = 'https://api.github.com'

interface GitHubConfig {
  token: string
  defaultOrg?: string
}

export class GitHubRepositoryProvider implements RepositoryProvider {
  private token: string
  private defaultOrg: string

  constructor(config: GitHubConfig) {
    if (!config.token) throw new Error('GitHubRepositoryProvider requires a token')
    this.token = config.token
    this.defaultOrg = config.defaultOrg ?? ''
  }

  private async api(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...((init.headers as Record<string, string>) ?? {}),
    }
    if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${GITHUB_API}${path}`, { ...init, headers })
    return res
  }

  private async apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.api(path, init)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`GitHub API ${path} failed: ${res.status} ${res.statusText} ${text}`)
    }
    return res.json() as Promise<T>
  }

  async validateRepository(repository: string): Promise<RepositoryInfo> {
    const res = await this.api(`/repos/${repository}`)
    if (res.status === 404) {
      return { fullName: repository, url: '', defaultBranch: '', exists: false }
    }
    if (!res.ok) throw new Error(`Failed to validate repository ${repository}: ${res.status}`)
    const data = await res.json() as { full_name: string; html_url: string; default_branch: string }
    return { fullName: data.full_name, url: data.html_url, defaultBranch: data.default_branch, exists: true }
  }

  async createRepository(name: string, options: { private: boolean; description: string }): Promise<RepositoryInfo> {
    const org = this.defaultOrg
    const path = org ? `/orgs/${org}/repos` : '/user/repos'
    const body = JSON.stringify({ name, private: options.private, description: options.description, auto_init: true })
    const data = await this.apiJson<{ full_name: string; html_url: string; default_branch: string }>(path, { method: 'POST', body })
    return { fullName: data.full_name, url: data.html_url, defaultBranch: data.default_branch, exists: true }
  }

  async createBranch(repository: string, branch: string, base?: string): Promise<{ branch: string; created: boolean }> {
    // Check if branch already exists
    const existing = await this.api(`/repos/${repository}/branches/${branch}`)
    if (existing.ok) return { branch, created: false }

    // Get the SHA of the base branch
    const baseBranch = base ?? (await this.validateRepository(repository)).defaultBranch
    const baseData = await this.apiJson<{ commit: { sha: string } }>(`/repos/${repository}/branches/${baseBranch}`)
    const sha = baseData.commit.sha

    await this.apiJson(`/repos/${repository}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    })
    return { branch, created: true }
  }

  async getBranchSha(repository: string, branch: string): Promise<{ sha: string }> {
    const data = await this.apiJson<{ commit: { sha: string } }>(`/repos/${repository}/branches/${branch}`)
    return { sha: data.commit.sha }
  }

  async createFile(repository: string, branch: string, path: string, content: string, message: string): Promise<CommitResult> {
    const contentBase64 = Buffer.from(content, 'utf-8').toString('base64')
    const data = await this.apiJson<{ commit: { sha: string } }>(`/repos/${repository}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ message, content: contentBase64, branch }),
    })
    return { commitSha: data.commit.sha, branch, filesCommitted: 1 }
  }

  async createTree(repository: string, branch: string, files: readonly FileCommit[], message: string): Promise<CommitResult> {
    // Get the current commit SHA and tree SHA
    const branchData = await this.apiJson<{ commit: { sha: string; tree: { sha: string } } }>(`/repos/${repository}/branches/${branch}`)
    const baseSha = branchData.commit.sha
    const baseTreeSha = branchData.commit.tree.sha

    // Create a tree with all file changes
    const treeEntries = files.map((f) => ({
      path: f.path,
      mode: '100644' as const,
      type: 'blob' as const,
      content: f.content,
    }))

    const treeData = await this.apiJson<{ sha: string }>(`/repos/${repository}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
    })

    // Create a commit pointing to the new tree
    const commitData = await this.apiJson<{ sha: string }>(`/repos/${repository}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: treeData.sha, parents: [baseSha] }),
    })

    // Update the branch ref to point to the new commit
    await this.apiJson(`/repos/${repository}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commitData.sha }),
    })

    return { commitSha: commitData.sha, branch, filesCommitted: files.length }
  }

  async createPullRequest(repository: string, head: string, base: string, title: string, body: string): Promise<PullRequestResult> {
    const data = await this.apiJson<{ number: number; html_url: string }>(`/repos/${repository}/pulls`, {
      method: 'POST',
      body: JSON.stringify({ title, body, head, base }),
    })
    return { number: data.number, url: data.html_url, head, base }
  }

  async getCommitStatus(repository: string, ref: string): Promise<{ state: string; checks: StatusCheck[] }> {
    const runsData = await this.apiJson<{ workflow_runs: Array<{ status: string; conclusion: string | null; name: string; html_url: string }> }>(
      `/repos/${repository}/actions/runs?branch=${ref}&per_page=20`
    ).catch(() => ({ workflow_runs: [] }))

    const checks: StatusCheck[] = runsData.workflow_runs.map((run) => ({
      context: run.name,
      state: run.conclusion === 'success' ? 'success' : run.conclusion === 'failure' ? 'failure' : run.status === 'completed' && run.conclusion === 'cancelled' ? 'error' : 'pending',
      description: `${run.status}${run.conclusion ? ` (${run.conclusion})` : ''}`,
    }))

    const allSuccess = checks.length > 0 && checks.every((c) => c.state === 'success')
    const anyFailure = checks.some((c) => c.state === 'failure' || c.state === 'error')
    const state = anyFailure ? 'failure' : allSuccess ? 'success' : 'pending'

    return { state, checks }
  }

  /** Check if the GitHub API is accessible. */
  async healthCheck(): Promise<{ healthy: boolean }> {
    try {
      const response = await fetch('https://api.github.com/zen', {
        headers: { 'Accept': 'application/vnd.github+json' },
      })
      return { healthy: response.ok }
    } catch {
      return { healthy: false }
    }
  }
}

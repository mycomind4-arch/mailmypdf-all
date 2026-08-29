export interface DeploymentRequest { repository: string; branch: string; preview: boolean }
export interface DeploymentAdapter { deploy(request: DeploymentRequest): Promise<{ url: string; status: 'PREVIEW' | 'PRODUCTION' }> }

export async function deployPreview(adapter: DeploymentAdapter, repository: string, branch: string) {
  return adapter.deploy({ repository, branch, preview: true })
}

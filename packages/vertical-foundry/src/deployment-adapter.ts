export interface DeploymentRequest { repository:string; branch:string; projectName:string }
export interface DeploymentResult { status:'PREVIEW'|'FAILED'; url?:string; deploymentId?:string; errors?:string[] }
export interface PagesDeploymentAdapter { deployPreview(request:DeploymentRequest):Promise<DeploymentResult> }
export function deploymentRequest(repository:string, branch:string, projectName:string):DeploymentRequest {
  if(!repository || !branch || !projectName) throw new Error('Deployment requires repository, branch and project name')
  return {repository,branch,projectName}
}
